#!/usr/bin/env node
/** Portable route lookup, local evidence and advice. No dependencies or network; the helper never launches a model. */
import {createHash, randomUUID} from 'node:crypto';
import {readFile, writeFile, mkdir, readdir, realpath, open, link, unlink, rm} from 'node:fs/promises';
import {resolve, join, relative, dirname} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';

const fail = message => { throw Error(message); };
export const canonical = value => {
  if (value === null || ['string','boolean'].includes(typeof value)) return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return Object.keys(value).length===value.length?`[${value.map(canonical).join(',')}]`:fail('NON_JSON_VALUE');
  if (value && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return fail('NON_JSON_VALUE');
};
export const digest = value => `sha256:${createHash('sha256').update(canonical(value)).digest('hex')}`;
const bytesDigest = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const text = v => typeof v === 'string' && v.length > 0 && v.length <= 4096;
const sha = v => typeof v === 'string' && /^sha256:[a-f0-9]{64}$/.test(v);
const iso = v => typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
const bool = v => typeof v === 'boolean';
const nonnegative = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const one = (...values) => v => values.includes(v);
const nullable = check => v => v === null || check(v);
const list = check => v => Array.isArray(v) && v.every(check);
const object = fields => v => !!v && !Array.isArray(v) && typeof v === 'object' && Object.keys(v).length === Object.keys(fields).length && Object.entries(fields).every(([k, check]) => Object.hasOwn(v,k) && check(v[k]));
const ref = object({path:text,digest:sha});
const model = object({model:nullable(text),effort:nullable(text)});
const hosts=one('codex','claude'), risks=one('low','medium','high','critical'), outcomes=one('accepted','failed','blocked','rejected');
const attempt = object({attempt_id:text,role:one('coordinator','worker','reviewer','repair'),candidate_id:nullable(text),candidate_identity:nullable(sha),evidence_tier:nullable(one('qualified','provisional')),configured:model,observed:model,outcome:outcomes,started_at:nullable(iso),completed_at:nullable(iso),evidence:list(ref)});
const checkFields = {name:text,kind:one('test','artifact','source','visual','review','calculation'),outcome:one('passed','failed','unverified'),evidence:list(ref)};
const usage = nullable(object({metric:one('attributable_cost','allowance','api_equivalent','tokens'),unit:text,value:nonnegative,source:ref,complete:bool}));
const receiptFields={task_id:text,run_id:text,session_id:text,parent_run_id:nullable(text),project_id:sha,host:hosts,host_version:text,execution_environment:one('codex','claude_code'),task_class:text,risk:risks,scope:text,research_kind:nullable(one('supplied_sources','live_web')),origin:one('production_usage','qualification_evaluation'),mode:one('direct','delegated'),started_at:iso,completed_at:iso,elapsed_ms:nonnegative,baseline_digest:nullable(sha),pack_content_digest:nullable(sha),stratum_digest:nullable(sha),skill_folder_digest:sha,attempts:list(attempt),checks:list(object(checkFields)),relevant_checks_complete:bool,acceptance:outcomes,usage};
const receiptV2=object({schema_version:one('delegate_receipt.v2'),...receiptFields});
// v3 adds the guidance digest, the host-version source and caller-asserted checks; scope becomes optional.
const receiptV3=object({schema_version:one('delegate_receipt.v3'),...receiptFields,scope:nullable(text),guidance_digest:sha,host_version_source:one('path_binary','caller','unknown'),checks:list(object({...checkFields,asserted:bool}))});
export function normalizeReceipt(value) {
  if (!value || typeof value !== 'object') fail('RECEIPT_MALFORMED');
  if (value.schema_version === 'delegate_receipt.v1') {
    const a=value.pack_content_digest, b=value.routing_pack?.content_digest;
    if (a != null && b != null && a !== b) fail('RECEIPT_PACK_DIGEST_CONFLICT');
    if ((a ?? b) != null && !sha(a ?? b)) fail('RECEIPT_PACK_DIGEST_MALFORMED');
    return {...value, pack_content_digest:a ?? b ?? null};
  }
  const v3=value.schema_version==='delegate_receipt.v3';
  if (!(v3?receiptV3:receiptV2)(value)) fail(v3?'RECEIPT_V3_MALFORMED':'RECEIPT_V2_MALFORMED');
  if (value.execution_environment !== (value.host === 'claude' ? 'claude_code' : 'codex')) fail('RECEIPT_HOST_CONFLICT');
  if (Date.parse(value.completed_at) < Date.parse(value.started_at) || value.elapsed_ms !== Date.parse(value.completed_at)-Date.parse(value.started_at)) fail('RECEIPT_TIME_CONFLICT');
  if (new Set(value.attempts.map(a=>a.attempt_id)).size !== value.attempts.length) fail('RECEIPT_DUPLICATE_ATTEMPT');
  if (!value.attempts.some(a=>a.role==='coordinator')) fail('RECEIPT_COORDINATION_MISSING');
  if (value.mode === 'delegated' && (!value.pack_content_digest || !value.stratum_digest || !value.attempts.some(a=>a.role==='worker'))) fail('RECEIPT_DELEGATION_INCOMPLETE');
  if (value.mode === 'direct' && value.attempts.some(a=>['worker','repair'].includes(a.role))) fail('RECEIPT_MODE_CONFLICT');
  for (const a of value.attempts) if (a.started_at && a.completed_at && (Date.parse(a.started_at)<Date.parse(value.started_at) || Date.parse(a.completed_at)>Date.parse(value.completed_at) || Date.parse(a.completed_at)<Date.parse(a.started_at))) fail('RECEIPT_ATTEMPT_TIME_CONFLICT');
  return structuredClone(value);
}
/** Dot-prefixed entries (editor and OS droppings) never change the digest; `exclude` names relative paths to leave out. */
export async function folderDigest(directory,exclude=[]) {
  const files={};
  async function visit(base) {
    for (const entry of (await readdir(base,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const path=join(base,entry.name), name=relative(directory,path);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) { if (!exclude.includes(name)) files[name]=bytesDigest(await readFile(path)); }
      else fail('SKILL_SYMLINK_UNSUPPORTED');
    }
  }
  await visit(directory); return digest(files);
}
export async function projectIdentity(cwd,host) {
  if (!hosts(host)) fail('HOST_REQUIRED');
  let root=await realpath(cwd);
  try { root=await realpath(execFileSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()); } catch { /* Non-Git projects use their canonical directory. */ }
  return {project_id:digest(root),host};
}
const skillDirectory=resolve(dirname(fileURLToPath(import.meta.url)),'..');
async function readJSON(path) { return JSON.parse(await readFile(path,'utf8')); }
async function optionalJSON(path) { try { return await readJSON(path); } catch(e) { if(e.code==='ENOENT') return null; throw e; } }
async function atomicEvent(directory,id,kind,data) {
  await mkdir(directory,{recursive:true,mode:0o700});
  const value={id,kind,data}, envelope={...value,content_digest:digest(value)}, path=join(directory,`${digest(id).slice(7)}.json`);
  const previous=await optionalJSON(path);
  if (previous) { if (canonical(previous)!==canonical(envelope)) fail('EVENT_CONFLICT'); return previous; }
  const temp=join(directory,`.pending-${randomUUID()}`), handle=await open(temp,'wx',0o600);
  try { await handle.writeFile(JSON.stringify(envelope)+'\n'); await handle.sync(); } finally { await handle.close(); }
  try { await link(temp,path); } catch(e) { if(e.code!=='EEXIST') throw e; if(canonical(await readJSON(path))!==canonical(envelope)) fail('EVENT_CONFLICT'); }
  finally { await unlink(temp); }
  const dir=await open(directory,'r'); try {await dir.sync();} finally {await dir.close();}
  return envelope;
}
async function events(directory) {
  let names; try {names=await readdir(directory);} catch(e) {if(e.code==='ENOENT')return []; throw e;}
  const rows=[];
  for(const name of names.filter(n=>n.endsWith('.json')).sort()) {
    const row=await readJSON(join(directory,name)), {content_digest,...body}=row;
    if(content_digest!==digest(body)||name!==`${digest(row.id).slice(7)}.json`)fail('STATE_CORRUPT');
    rows.push(row);
  }
  return rows;
}
const settingsOf=history=>Object.assign({learning:true,reminders:true,reminder_limit:1},...history.filter(e=>e.kind==='config').sort((a,b)=>a.data.sequence-b.data.sequence).map(e=>e.data.settings));
async function referencesValid(refs) {
  if (!refs.length) return false;
  for (const r of refs) { try { if(!ref(r)||bytesDigest(await readFile(r.path))!==r.digest)return false; } catch {return false;} }
  return true;
}
async function supported(r,pack,history=[]) {
  if(r.mode==='delegated') {
    const route=pack?.routes.find(x=>x.stratum_digest===r.stratum_digest && x.public_task_class===r.task_class);
    if(!route || route.stratum.worker_request.risk!==r.risk)return false;
    const environment=route.stratum.worker_request.execution_environment;
    if(environment && environment!==r.execution_environment)return false;
    for(const a of r.attempts.filter(x=>['worker','repair','reviewer'].includes(x.role))) {
      const refs=a.role==='reviewer'?route.reviewers:route.workers;
      const binding=refs.find(x=>x.candidate_identity===a.candidate_identity && x.candidate_id===a.candidate_id);
      const treatment=pack.treatments[a.candidate_identity];
      if(!binding||!treatment||binding.evidence_tier!==a.evidence_tier||a.configured.model!==(treatment.snapshot_id??treatment.model_id)||a.configured.effort!==treatment.effort)return false;
      if(treatment.provisional?.host && treatment.provisional.host!==r.host)return false;
    }
  }
  if (!r.relevant_checks_complete || !r.checks.length) return false;
  for(const c of r.checks) {
    if(c.outcome==='unverified') return false;
    // Asserted (inspected) verdicts carry the caller's trust level, like acceptance; their references are what was inspected.
    if(c.asserted) { if(c.evidence.length && !await referencesValid(c.evidence)) return false; continue; }
    if(!await referencesValid(c.evidence)) return false;
    if(!c.evidence.some(ref=>history.some(e=>e.kind==='capture' && e.data.run_id===r.run_id && e.data.reference.path===ref.path && e.data.reference.digest===ref.digest && e.data.error===null && e.data.signal===null && (c.outcome==='passed'?e.data.exit_code===0:e.data.exit_code!==0))))return false;
  }
  if(r.acceptance==='accepted'&&r.checks.some(c=>c.outcome!=='passed')) return false;
  if(r.mode==='delegated') {
    if(!r.checks.some(c=>c.kind==='review'))return false;
    if(!r.attempts.some(a=>a.role==='reviewer')) {
      const route=pack.routes.find(x=>x.stratum_digest===r.stratum_digest), a=r.attempts.find(a=>a.role==='coordinator');
      const verifier=route.reviewers.find(x=>x.candidate_identity===a.candidate_identity&&x.candidate_id===a.candidate_id), t=pack.treatments[a.candidate_identity];
      if(!verifier||!t||!t.frontier||a.evidence_tier!==verifier.evidence_tier||a.configured.model!==(t.snapshot_id??t.model_id)||a.configured.effort!==t.effort||(t.provisional?.host&&t.provisional.host!==r.host))return false;
    }
  }
  if(r.research_kind==='live_web'&&!r.checks.some(c=>c.kind==='source'))return false;
  for(const a of r.attempts) {
    // Routed attempts prove their effort against the pack above; the coordinator only needs its model.
    if (!await referencesValid(a.evidence) || !a.configured.model) return false;
    if ((a.observed.model && a.observed.model!==a.configured.model)||(a.observed.effort && a.observed.effort!==a.configured.effort))return false;
  }
  return true;
}
const median = values => {const a=[...values].sort((x,y)=>x-y), n=a.length; return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;};
function preference(rows,option) {
  const groups=new Map();
  for(const r of rows){const key=option(r); if(key===null)continue; if(!groups.has(key))groups.set(key,[]); groups.get(key).push(r);}
  if(groups.size<2||[...groups.values()].some(g=>g.length<5))return null;
  const all=[...groups.values()].flat(), comparable=all.every(r=>r.usage?.complete && ['allowance','attributable_cost'].includes(r.usage.metric) && r.usage.metric===all[0].usage?.metric && r.usage.unit===all[0].usage?.unit);
  const scored=[...groups].map(([key,g])=>({key,count:g.length,quality:g.filter(r=>r.acceptance!=='accepted'||r.corrected).length/g.length,repairs:g.filter(r=>r.attempts.some(a=>a.role==='repair'||(a.role==='worker'&&a.outcome!=='accepted'))||r.attempts.filter(a=>a.role==='worker').length>1).length/g.length,metric:median(g.map(r=>comparable?r.usage.value:r.elapsed_ms))}));
  scored.sort((a,b)=>a.quality-b.quality||a.repairs-b.repairs||a.metric-b.metric);
  const [first,second]=scored;
  if(first.quality>0)return null;
  if(first.quality===second.quality&&first.repairs===second.repairs&&first.metric===second.metric)return null;
  return {preferred:first.key,basis:comparable?`${all[0].usage.metric}:${all[0].usage.unit}`:'elapsed_time_proxy',samples:scored};
}
export function reminderDecision(input,prior=[]) {
  if(!input || !text(input.session_id))fail('REMINDER_SESSION_REQUIRED');
  const notices=prior.filter(e=>e.kind==='reminder'&&e.data.session_id===input.session_id);
  const limit=input.max_per_session??1;
  if(!Number.isInteger(limit)||limit<1)fail('REMINDER_LIMIT_INVALID');
  const milestone=digest({handoff:input.handoff??null,signal:input.signal??null});
  if(notices.some(e=>e.data.response||e.data.milestone_digest===milestone)||notices.filter(e=>e.data.basis).length>=limit)return {suggest:false,reason:'already_notified_or_dismissed'};
  if(input.enabled===false || input.safe_boundary!==true || input.remaining_work!==true || input.active_workers!==false || input.coupled_investigation!==false || input.rediscovery_required!==false) return {suggest:false,reason:'not_a_safe_useful_boundary'};
  const h=input.handoff;
  const handoffCheck=object({objective:text,constraints:list(text),decisions:list(text),checkout_state:text,completed_checks:list(text),evidence_locations:list(text),next_action:text,unresolved_risks:list(text)});
  if(!handoffCheck(h))return {suggest:false,reason:'handoff_incomplete'};
  const signal=input.signal;
  const measured=signal && (signal.context_used_tokens===undefined||nonnegative(signal.context_used_tokens)) && (signal.context_window_tokens===undefined||(nonnegative(signal.context_window_tokens)&&signal.context_window_tokens>0)) && one('host_pressure','compaction')(signal.kind) && iso(signal.observed_at) && text(signal.source) && Date.parse(signal.observed_at)<=Date.parse(input.now) && Date.parse(signal.observed_at)>=Date.parse(input.session_started_at);
  if(!measured && !(input.completed_context_dominates===true && input.next_phase_independent===true))return {suggest:false,reason:'no_useful_signal'};
  return {suggest:true,basis:measured?'host_signal':'qualitative_judgment',reason:measured?'A host context signal and a safe milestone make a compact handoff useful.':'The completed investigation dominates the history; the next phase can use a compact handoff.',handoff:h,savings:null};
}
async function packAt(path,now) {
  const p=await readJSON(path), {content_digest,...body}=p;
  if(p.schema_version!=='routing_pack.v3'||p.mode!=='production'||!sha(content_digest)||digest(body)!==content_digest)fail('PACK_INVALID');
  if(!(Date.parse(p.generated_at)<=Date.parse(now)&&Date.parse(now)<Date.parse(p.expires_at)))fail('PACK_EXPIRED_OR_NOT_YET_VALID');
  return p;
}
// Route lookup: a verbatim port of the maintainer resolver's predicates over the wire pack. src/ never imports this file.
const identityOf=t=>digest({provider:t.provider,snapshot_id:t.snapshot_id??t.model_id,effort:t.effort,serving:Object.fromEntries([...t.material_serving_settings].sort().map(k=>[k,t.serving[k]]))});
const treatmentAvailable=(c,host)=>(c.evidence_tier==='qualified'||c.provisional?.host===host.host)&&host.treatments.some(t=>t.serving.fallback==='disabled'&&t.provider===c.provider&&t.model_id===c.model_id&&t.snapshot_id===c.snapshot_id&&t.effort===c.effort&&t.substitution_observed!==true&&(t.observed_model_id===undefined||t.observed_model_id===(c.snapshot_id??c.model_id))&&(t.observed_effort===undefined||t.observed_effort===c.effort)&&c.material_serving_settings.every(key=>t.serving[key]===c.serving[key]));
const hostMeets=(route,host)=>{const q=route.requirements;return q.capabilities.every(x=>host.capabilities.includes(x))&&q.tools.every(x=>host.tools.includes(x))&&host.context_window_tokens>=q.context_window_tokens&&(!q.fresh_context||host.supports_fresh_context);};
const independent=(worker,reviewer,route,host)=>{
  const rule=route.review_rule;if(rule.fresh_context&&!host.supports_fresh_context)return false;
  if(rule.different_model&&worker.provider===reviewer.provider&&(worker.snapshot_id??worker.model_id)===(reviewer.snapshot_id??reviewer.model_id))return false;
  if(rule.different_family&&(worker.family===null||reviewer.family===null||worker.family===reviewer.family))return false;
  return true;
};
function orderProvisional(rows,taskClass,role){
  const installed=c=>{const e=c.provisional?.task_evidence;return e?.basis==='installed_acceptance'&&e.records.length>0&&e.public_task_class===taskClass&&e.role===role&&e.host===c.provisional?.host&&e.candidate_identity===c.candidate_identity;};
  const levels=[rows.filter(installed),rows.filter(r=>!installed(r))];let allComparable=true;
  for(const group of levels){
    const price=r=>r.provisional.pricing;
    const priced=group.every(r=>r.provisional!==null&&price(r).input_usd_per_million!==null&&price(r).output_usd_per_million!==null);
    const comparable=priced&&group.every(a=>group.every(b=>(price(a).input_usd_per_million-price(b).input_usd_per_million)*(price(a).output_usd_per_million-price(b).output_usd_per_million)>=0));
    if(comparable)group.sort((a,b)=>price(a).input_usd_per_million-price(b).input_usd_per_million||price(a).output_usd_per_million-price(b).output_usd_per_million);else allComparable=false;
  }
  return {treatments:levels.flat(),basis:allComparable?'task_evidence_then_advertised_token_prices':'task_evidence_then_prices_or_maintainer_order'};
}
const shapes={direct:'single worker',frontier_specify_then_delegate:'specify-then-delegate',frontier_diagnose_then_delegate:'diagnose-then-delegate',frontier_plan_then_delegate:'plan-then-delegate',decompose:'decompose'};
const taskClasses=one('repo_exploration','mechanical_work','bounded_implementation','ui_implementation','hard_debugging','complex_implementation','research','full_project');
const expandReference=(pack,reference)=>{const {task_evidence,...evidence}=reference,shared=pack.treatments[reference.candidate_identity];return {...shared,...evidence,provisional:reference.evidence_tier==='provisional'&&shared.provisional?{...shared.provisional,...(task_evidence?{task_evidence}:{})}:null};};
const routeHosts=(pack,route)=>{const found=new Set([...route.workers,...route.reviewers].map(x=>pack.treatments[x.candidate_identity]?.provisional?.host).filter(Boolean));const env=route.stratum.worker_request.execution_environment;if(env)found.add(env==='claude_code'?'claude':env);return found;};
/** Pure: reads the pack, never state. `now` is an option only; a `now` inside the input is ignored. */
export async function lookup(input,{skillRoot=skillDirectory,now=new Date().toISOString()}={}) {
  if(!input||!hosts(input.host))fail('LOOKUP_INPUT_INVALID');
  const pack=await packAt(input.pack_path??join(skillRoot,'routing-pack.json'),now), t=Date.parse(now);
  for(const [identity,treatment] of Object.entries(pack.treatments)) if(identityOf(treatment)!==identity||treatment.provider==='synthetic')fail('PACK_INVALID');
  for(const route of pack.routes) for(const reference of [...route.workers,...route.reviewers]) if(!pack.treatments[reference.candidate_identity]||reference.pinning_source==='synthetic_fixture')fail('PACK_INVALID');
  const packInfo={content_digest:pack.content_digest,refresh_due:t>=Date.parse(pack.refresh_after),refresh_after:pack.refresh_after,expires_at:pack.expires_at};
  if(input.task_class===undefined) {
    const coverage={low:[],medium:[]};
    for(const route of pack.routes){const classes=coverage[route.stratum.worker_request.risk];if(classes&&routeHosts(pack,route).has(input.host)&&!classes.includes(route.public_task_class))classes.push(route.public_task_class);}
    return {pack:packInfo,host:input.host,coverage,gap:null};
  }
  if(!taskClasses(input.task_class)||!risks(input.risk)||!(input.host_treatments===undefined||list(v=>!!v&&typeof v==='object'&&!!v.serving)(input.host_treatments)))fail('LOOKUP_INPUT_INVALID');
  const defaulted=input.host_treatments===undefined, host_verified=!defaulted;
  const gap=(code,extra={})=>({pack:packInfo,route:null,workers:[],reviewers:[],ranking_basis:null,limitations:[],coordinator_may_verify:null,coordinator_verify_reason:null,host_verified,host_checks:[],gap:code,...extra});
  if(input.task_class==='full_project')return gap('DECOMPOSITION_REQUIRED');
  const route=pack.routes.find(r=>r.public_task_class===input.task_class&&r.stratum.worker_request.risk===input.risk&&routeHosts(pack,r).has(input.host));
  if(!route)return gap('ROUTE_NOT_FOUND');
  const routeInfo={stratum_digest:route.stratum_digest,shape:shapes[pack.routing_modes[route.public_task_class]],scope:route.stratum.provisional_scope??null,review_rule:route.review_rule,tools:route.requirements.tools};
  // A defaulted roster assumes every listed treatment is selectable; host_verified:false tells the coordinator to confirm.
  const host={host:input.host,treatments:defaulted?[...route.workers,...route.reviewers].map(x=>{const s=pack.treatments[x.candidate_identity];return {provider:s.provider,model_id:s.model_id,snapshot_id:s.snapshot_id,effort:s.effort,serving:s.serving};}):input.host_treatments,tools:route.requirements.tools,capabilities:route.requirements.capabilities,context_window_tokens:Math.max(route.requirements.context_window_tokens,1),supports_fresh_context:input.supports_fresh_context??true};
  if(!hostMeets(route,host))return gap('HOST_CAPABILITIES_INSUFFICIENT',{route:routeInfo});
  const failed=new Set(input.failed_candidate_ids??[]), request=route.stratum.worker_request, requiredProvider=request.constraints.requires_provider, nativeHost=input.host==='claude'?'claude_code':input.host;
  const explicitCostCeiling=request.max_cost_usd!==undefined||request.constraints.max_cost_usd!=null;
  const capable=c=>(c.evidence_tier!=='provisional'||!explicitCostCeiling)&&(c.evidence_tier!=='qualified'||pack.policy_version<4||request.execution_environment===nativeHost)&&(requiredProvider===undefined||c.provider===requiredProvider)&&route.requirements.capabilities.every(x=>c.capabilities.includes(x))&&(route.requirements.context_window_tokens===0||(c.context_window_tokens!==null&&c.context_window_tokens>=route.requirements.context_window_tokens));
  const lane=(references,role)=>{const rows=references.map(x=>expandReference(pack,x)),ordered=orderProvisional(rows.filter(r=>r.evidence_tier==='provisional'),route.public_task_class,role);return {rows:[...rows.filter(r=>r.evidence_tier==='qualified'),...ordered.treatments],basis:ordered.basis};};
  const W=lane(route.workers,'worker'), R=lane(route.reviewers,'reviewer');
  const live=c=>t<Date.parse(c.expires_at)&&!failed.has(c.candidate_id)&&capable(c)&&treatmentAvailable(c,host);
  const basisOf=c=>c.provisional?.task_evidence?.basis??'smoke_extrapolation';
  const entry=c=>({candidate_id:c.candidate_id,candidate_identity:c.candidate_identity,model:c.snapshot_id??c.model_id,effort:c.effort,serving:{fallback:c.serving.fallback},evidence_tier:c.evidence_tier,basis:c.evidence_tier==='qualified'?'qualification':basisOf(c),expires_at:c.expires_at});
  const workers=W.rows.filter(live), pairs=workers.map(w=>[w,R.rows.find(r=>live(r)&&r.frontier&&independent(w,r,route,host))]).filter(([,r])=>r);
  if(!pairs.length)return gap(workers.length?'NO_ELIGIBLE_FRONTIER_REVIEWER':'NO_ELIGIBLE_WORKER',{route:routeInfo,workers:workers.map(entry)});
  const [baseline,reviewer]=pairs[0], advice=input.localPreferences;
  const matching=!!advice&&advice.pack_content_digest===pack.content_digest&&advice.stratum_digest===route.stratum_digest&&advice.host===input.host;
  const preferred=baseline.evidence_tier==='provisional'&&matching?W.rows.find(c=>c.candidate_identity===advice.preferred_worker_identity&&c.evidence_tier==='provisional'&&basisOf(c)===basisOf(baseline)&&live(c)&&independent(c,reviewer,route,host)):undefined;
  const selected=preferred??baseline;
  const workerList=[selected,...pairs.map(([w])=>w).filter(w=>w!==selected)], reviewerList=[reviewer,...R.rows.filter(r=>r!==reviewer&&live(r)&&r.frontier&&independent(selected,r,route,host))];
  const ranking_basis={worker:selected!==baseline?'local_preference_within_task_evidence':baseline.evidence_tier==='qualified'?route.ranking_basis.workers:W.basis,reviewer:reviewer.evidence_tier==='qualified'?route.ranking_basis.reviewers:R.basis};
  const limitations=[...new Set([...workerList,...reviewerList].flatMap(c=>[...(c.provisional?.task_evidence?.limitations??[]),...(c.provisional?.control_limitations??[])]))];
  let coordinator_may_verify=null, coordinator_verify_reason='coordinator_not_supplied';
  if(input.coordinator) {
    const c=R.rows.find(r=>(r.snapshot_id??r.model_id)===input.coordinator.model&&r.effort===input.coordinator.effort);
    const inLane=!!c&&t<Date.parse(c.expires_at)&&capable(c)&&independent(selected,c,route,host);
    // A fresh-context review rule needs a separate process; the coordinator cannot satisfy it inside its own context.
    coordinator_may_verify=(inLane&&!route.review_rule.fresh_context)||null;
    coordinator_verify_reason=coordinator_may_verify?null:inLane?'fresh_process_required':'coordinator_not_in_reviewer_lane';
  }
  const host_checks=['model selectable',...(selected.effort!=='not_applicable'?['effort expressible']:[]),...(route.review_rule.fresh_context?['fresh process available']:[])];
  return {pack:packInfo,route:routeInfo,workers:workerList.map(entry),reviewers:reviewerList.map(entry),ranking_basis,limitations,coordinator_may_verify,coordinator_verify_reason,host_verified,host_checks,gap:null};
}
const timeoutOf=v=>{const t=v??30000;if(!Number.isInteger(t)||t<1||t>600000)fail('CAPTURE_TIMEOUT_INVALID');return t;};
const tail=s=>(s??'').slice(-4096);
async function persist(base,observation) {
  const path=join(base,'evidence',`${randomUUID()}.json`);await mkdir(dirname(path),{recursive:true,mode:0o700});
  const bytes=JSON.stringify(observation)+'\n';await writeFile(path,bytes,{flag:'wx',mode:0o600});
  return {path,digest:bytesDigest(bytes)};
}
/** Runs one caller-named command once; the observation is the evidence, the event is what receipts bind to. */
async function captureOnce(base,directory,{command,cwd,run_id,timeout},now) {
  if(!list(text)(command)||!command.length)fail('CAPTURE_COMMAND_REQUIRED');
  const result=spawnSync(command[0],command.slice(1),{cwd,encoding:'utf8',timeout,maxBuffer:4*1024*1024});
  const observation={command,cwd:await realpath(cwd),run_id,observed_at:now,exit_code:result.status,signal:result.signal,error:result.error?.message??null,stdout:result.stdout??'',stderr:result.stderr??''};
  const reference=await persist(base,observation);
  const event=await atomicEvent(directory,`capture:${randomUUID()}`,'capture',{run_id,reference,exit_code:result.status,signal:result.signal,error:observation.error,at:now});
  return {event,observation};
}
async function snapshotArtifact(base,directory,cwd,run_id,now) {
  if(spawnSync('git',['rev-parse','--show-toplevel'],{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore']}).status!==0)return null;
  const run=args=>{const r=spawnSync('git',args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024});return {command:['git',...args],exit_code:r.status,signal:r.signal,error:r.error?.message??null,stdout:r.stdout??'',stderr:r.stderr??''};};
  const results=[run(['status','--porcelain']),run(['diff'])];
  const reference=await persist(base,{kind:'artifact_snapshot',cwd:await realpath(cwd),run_id,observed_at:now,results});
  return atomicEvent(directory,`capture:${randomUUID()}`,'capture',{run_id,reference,exit_code:results.every(r=>r.exit_code===0)?0:1,signal:null,error:results.find(r=>r.error)?.error??null,at:now});
}
async function adviseFor(start,input,history,{skillRoot,now}) {
  const baseline=reason=>({status:'ok',modePreference:null,workerPreference:null,localPreferences:null,reason});
  let pack=null;
  try { pack=await packAt(input.pack_path??join(skillRoot,'routing-pack.json'),now); } catch { return baseline('Baseline: current pack unavailable or expired.'); }
  if(start.host_version==='unknown')return baseline('Baseline: host version unknown.');
  const rows=[],comparableRows=[];
  for(const event of history.filter(e=>e.kind==='receipt')) {
    const r=normalizeReceipt(event.data);
    // Direct comparability keys on the guidance digest (folder minus routing-pack.json); v2 rows carry none and drop out.
    if(r.origin!=='production_usage'||r.run_id===start.run_id||r.parent_run_id||r.host_version!==start.host_version||r.host_version_source!==start.host_version_source||r.task_class!==start.task_class||r.risk!==start.risk||r.scope!==start.scope||r.research_kind!==start.research_kind||(r.guidance_digest??null)!==start.guidance_digest||Date.parse(r.completed_at)>Date.parse(now)||Date.parse(r.completed_at)<Date.parse(now)-30*86400000)continue;
    // Handoffs preserve lineage; incomplete multi-session comparisons are excluded rather than counting only the cheap tail.
    if(history.some(e=>(e.kind==='start'&&e.data.parent_run_id===r.run_id)||(e.kind==='invalidation'&&e.data.run_id===r.run_id)))continue;
    if(r.mode==='delegated'&&(!pack||r.pack_content_digest!==pack.content_digest||(input.stratum_digest && r.stratum_digest!==input.stratum_digest)))continue;
    comparableRows.push(r);
    if(!await supported(r,pack,history))return baseline('Baseline: comparable history contains incomplete or unverified work.');
    if(r.usage&&!await referencesValid([r.usage.source]))r.usage=null;
    r.corrected=history.some(e=>e.kind==='correction'&&e.data.run_id===r.run_id);rows.push(r);
  }
  if(new Set(comparableRows.map(r=>r.task_id)).size!==comparableRows.length)return baseline('Baseline: repeated task identities require a complete combined comparison.');
  const modePreference=preference(rows,r=>r.mode), workerPreference=preference(rows.filter(r=>r.mode==='delegated').map(r=>{
    const first=r.attempts.find(a=>a.role==='worker');
    const originalSucceeded=first?.outcome==='accepted' && !r.attempts.some(a=>['worker','repair'].includes(a.role)&&a.candidate_identity!==first.candidate_identity);
    return {...r,acceptance:originalSucceeded?r.acceptance:'failed'};
  }),r=>r.attempts.find(a=>a.role==='worker')?.candidate_identity??null);
  const localPreferences=workerPreference&&pack&&input.stratum_digest?{pack_content_digest:pack.content_digest,stratum_digest:input.stratum_digest,host:input.host,preferred_worker_identity:workerPreference.preferred}:null;
  return {status:'ok',modePreference,workerPreference,localPreferences,reason:modePreference||workerPreference?'Local evidence supports a preference; recheck eligibility and explicit instructions.':'Baseline: insufficient comparable evidence.',qualification_authority:false};
}
async function lookupWithState(input,{stateRoot,skillRoot,now}) {
  const first=await lookup(input,{skillRoot,now});
  if(input.localPreferences!==undefined||!text(input.cwd)||!text(input.run_id)||!first.route)return first;
  const identity=await projectIdentity(input.cwd,input.host), history=await events(join(resolve(stateRoot),identity.project_id.slice(7),identity.host,'events'));
  if(!settingsOf(history).learning)return first;
  const start=history.find(e=>e.kind==='start'&&e.data.run_id===input.run_id)?.data;if(!start)fail('RUN_NOT_STARTED');
  const advice=await adviseFor(start,{...input,stratum_digest:first.route.stratum_digest},history,{skillRoot,now});
  return advice.localPreferences?lookup({...input,localPreferences:advice.localPreferences},{skillRoot,now}):first;
}
export async function runCommand(command,input,{stateRoot=process.env.DELEGATE_STATE_HOME || (process.env.XDG_STATE_HOME?join(process.env.XDG_STATE_HOME,'delegate'):join(homedir(),'.local/state/delegate')),skillRoot=skillDirectory,now=new Date().toISOString(),hostCommand=process.env.DELEGATE_HOST_COMMAND}={}) {
  if(command==='lookup')return lookupWithState(input??{},{stateRoot,skillRoot,now});
  if(!input || !text(input.cwd))fail('CWD_REQUIRED');
  const identity=await projectIdentity(input.cwd,input.host), base=join(resolve(stateRoot),identity.project_id.slice(7),identity.host), directory=join(base,'events');
  await mkdir(base,{recursive:true,mode:0o700});
  if(command==='reset'||command==='disable') {
    // Only destructive and configuration writes take the lock; a stale lock never blocks reads or appends.
    const lock=join(base,'.lock');
    try {await mkdir(lock);} catch(e) {if(e.code==='EEXIST')fail('STATE_BUSY');throw e;}
    try {
      if(command==='reset') { for(const name of ['events','receipts','evidence']) await rm(join(base,name),{recursive:true,force:true}); return {status:'reset',...identity}; }
      const history=await events(directory), target=input.target??'learning'; if(!['learning','reminders'].includes(target))fail('SETTING_INVALID');
      const enabled=input.enabled??false;if(!bool(enabled))fail('SETTING_INVALID');
      const settingsUpdate={[target]:enabled};
      if(input.max_per_session!==undefined) {if(target!=='reminders'||!Number.isInteger(input.max_per_session)||input.max_per_session<1)fail('REMINDER_LIMIT_INVALID');settingsUpdate.reminder_limit=input.max_per_session;}
      await atomicEvent(directory,`config:${randomUUID()}`,'config',{at:now,sequence:history.length,settings:settingsUpdate});return {status:'configured',target,enabled};
    } finally { await rm(lock,{recursive:true,force:true}); }
  }
  const history=await events(directory), settings=settingsOf(history), ctx={skillRoot,now};
  const startOf=run_id=>history.find(e=>e.kind==='start'&&e.data.run_id===run_id)?.data??fail('RUN_NOT_STARTED');
  if(command==='status')return {status:'ok',...identity,settings,records:history.filter(e=>e.kind==='receipt').length,corrections:history.filter(e=>e.kind==='correction').length,reminders:history.filter(e=>e.kind==='reminder').length};
  if(command==='advise' && input.reminder) {
    const start=startOf(input.run_id);
    const request={...input.reminder,session_id:start.session_id,session_started_at:start.started_at,now,enabled:settings.reminders,max_per_session:settings.reminder_limit};
    if(one('accepted','dismissed','continued')(request.response)) {
      const id=`reminder-response:${start.session_id}:${request.response}`, prior=history.find(e=>e.id===id);
      await atomicEvent(directory,id,'reminder',{session_id:start.session_id,response:request.response,at:prior?.data.at??now});
      return {suggest:false,reason:'response_recorded'};
    }
    const result=reminderDecision(request,history);
    if(result.suggest) {
      const milestone_digest=digest({handoff:request.handoff??null,signal:request.signal??null});
      await atomicEvent(directory,`reminder:${start.session_id}:${milestone_digest}`,'reminder',{session_id:start.session_id,run_id:start.run_id,basis:result.basis,milestone_digest,signal:request.signal??null,at:now});
    }
    return result;
  }
  const disabled={status:'disabled',modePreference:null,workerPreference:null,localPreferences:null};
  if(!settings.learning && command!=='start')return disabled;
  if(command==='start') {
    const run_id=input.run_id??randomUUID(), existing=history.find(e=>e.kind==='start'&&e.data.run_id===run_id)?.data;
    const parent=input.parent_run_id?history.find(e=>e.kind==='receipt'&&e.data.run_id===input.parent_run_id)?.data:null;
    if(input.parent_run_id&&!parent)fail('HANDOFF_PARENT_MISSING');
    // The version comes from the host binary on PATH unless the caller supplies one; the two sources are never compared.
    let host_version=input.host_version, host_version_source='caller', host_version_raw=null;
    if(host_version===undefined) {
      const probe=spawnSync(hostCommand??input.host,['--version'],{encoding:'utf8',timeout:10000});
      host_version_raw=probe.stdout??null; const match=probe.status===0?/\d+\.\d+(?:\.\d+)?/.exec(probe.stdout??''):null;
      host_version=match?.[0]??'unknown'; host_version_source=match?'path_binary':'unknown';
    }
    const data={...identity,run_id,task_id:input.task_id??parent?.task_id??run_id,session_id:input.session_id,parent_run_id:parent?.run_id??null,host_version,host_version_source,host_version_raw,task_class:input.task_class,risk:input.risk,scope:input.scope??null,research_kind:input.research_kind??null,origin:input.origin??'production_usage',started_at:existing?.started_at??now,baseline_digest:input.baseline_digest??null,skill_folder_digest:await folderDigest(skillRoot),guidance_digest:await folderDigest(skillRoot,['routing-pack.json'])};
    if(!text(data.run_id)||!text(data.task_id)||!text(data.session_id)||!text(data.host_version)||!nullable(text)(data.host_version_raw)||!text(data.task_class)||!nullable(text)(data.scope)||!risks(data.risk)||!nullable(one('supplied_sources','live_web'))(data.research_kind)||!one('production_usage','qualification_evaluation')(data.origin)||!nullable(sha)(data.baseline_digest))fail('START_INVALID');
    if(parent&&(data.task_id!==parent.task_id||data.origin!==parent.origin||data.scope!==parent.scope||data.task_class!==parent.task_class))fail('HANDOFF_LINEAGE_CONFLICT');
    await atomicEvent(directory,`start:${run_id}`,'start',data);
    return {status:'started',...data,advice:settings.learning?await adviseFor(data,input,history,ctx):disabled};
  }
  if(command==='capture') {
    startOf(input.run_id);
    const {event,observation}=await captureOnce(base,directory,{command:input.command,cwd:input.cwd,run_id:input.run_id,timeout:timeoutOf(input.timeout_ms)},now);
    return {status:'captured',reference:event.data.reference,exit_code:event.data.exit_code,signal:event.data.signal,error:event.data.error,stdout_tail:tail(observation.stdout),stderr_tail:tail(observation.stderr)};
  }
  if(command==='correct') {
    if(!text(input.event_id)||!text(input.reason)||!list(ref)(input.evidence??[]))fail('CORRECTION_INVALID');
    const matched=history.find(e=>e.kind==='receipt'&&e.data.run_id===input.run_id);
    const data={run_id:matched?.data.run_id??null,requested_run_id:input.run_id??null,reason:input.reason,evidence:input.evidence??[],at:now};
    const old=history.find(e=>e.id===`correction:${input.event_id}`);if(old)data.at=old.data.at;
    await atomicEvent(directory,`correction:${input.event_id}`,'correction',data);return {status:matched?'correction_recorded':'unassigned'};
  }
  const result=async(data,pack)=>{
    const changed=history.some(e=>e.kind==='invalidation'&&e.data.run_id===data.run_id);
    return {status:'recorded',receipt:data,evidence_supported:!changed&&await supported(data,pack,history),receipt_path:join(base,'receipts',`${digest(data.run_id).slice(7)}.json`),reason:changed?'skill_changed_during_run':null};
  };
  const finalize=async(start,fields,pack,completed_at=now)=>{
    const {host_version_raw,...run}=start;
    const data=normalizeReceipt({schema_version:'delegate_receipt.v3',...run,execution_environment:identity.host==='claude'?'claude_code':'codex',completed_at,elapsed_ms:Date.parse(completed_at)-Date.parse(run.started_at),pack_content_digest:pack?.content_digest??null,...fields,stratum_digest:pack?fields.stratum_digest:null});
    await atomicEvent(directory,`receipt:${data.run_id}`,'receipt',data);
    // A folder that changed mid-run keeps its receipt for the record but never feeds advice.
    if(start.skill_folder_digest!==await folderDigest(skillRoot))history.push(await atomicEvent(directory,`invalidation:${data.run_id}`,'invalidation',{run_id:data.run_id,reason:'skill_changed_during_run',at:now}));
    const exports=join(base,'receipts'); await mkdir(exports,{recursive:true,mode:0o700});
    const receipt_path=join(exports,`${digest(data.run_id).slice(7)}.json`), exportBytes=JSON.stringify(data)+'\n', existingExport=await optionalJSON(receipt_path);
    if(existingExport && canonical(existingExport)!==canonical(data))fail('RECEIPT_EXPORT_CONFLICT');
    if(!existingExport) {
      const temp=join(exports,`.pending-${randomUUID()}`), out=await open(temp,'wx',0o600);
      try {await out.writeFile(exportBytes);await out.sync();} finally {await out.close();}
      try {await link(temp,receipt_path);} finally {await unlink(temp);}
    }
    return result(data,pack);
  };
  const routeFor=(pack,start,stratum_digest)=>{const route=pack.routes.find(r=>r.stratum_digest===stratum_digest&&r.public_task_class===start.task_class);if(!route)fail('STRATUM_MISMATCH');return route;};
  if(command==='record') {
    const start=startOf(input.run_id), previous=history.find(e=>e.kind==='receipt'&&e.data.run_id===input.run_id)?.data;
    const completed_at=previous?.completed_at??now, pack=input.mode==='delegated'?await packAt(input.pack_path,completed_at):null;
    if(pack)routeFor(pack,start,input.stratum_digest);
    // Compatibility path: a differing replay is a conflict, not a silent no-op.
    return finalize(start,{mode:input.mode,stratum_digest:input.stratum_digest,attempts:input.attempts,checks:(input.checks??[]).map(c=>({asserted:false,...c})),relevant_checks_complete:input.relevant_checks_complete,acceptance:input.acceptance,usage:input.usage??null},pack,completed_at);
  }
  if(command==='finish') {
    const start=startOf(input.run_id), previous=history.find(e=>e.kind==='receipt'&&e.data.run_id===input.run_id)?.data;
    const pack=input.mode==='delegated'?await packAt(input.pack_path,now):null, route=pack?routeFor(pack,start,input.stratum_digest):null;
    if(previous)return result(previous,pack);
    const checks=input.checks??[], inspected=input.inspected??[], coordinator=input.coordinator;
    for(const c of checks) {
      if(!c||!text(c.name)||!one('test','artifact','source','visual','review','calculation')(c.kind)||(c.command===undefined)===(c.reference===undefined))fail('CHECK_INVALID');
      // Review, visual and source verdicts are inspected and asserted; no exit code can stand in for them.
      if(['review','visual','source'].includes(c.kind))fail('CHECK_KIND_INVALID');
      if(c.reference!==undefined&&!ref(c.reference))fail('CHECK_INVALID');
      if(c.command!==undefined&&(!list(text)(c.command)||!c.command.length))fail('CAPTURE_COMMAND_REQUIRED');
      timeoutOf(c.timeout_ms);
    }
    for(const c of inspected) if(!c||!text(c.name)||!one('review','visual','source')(c.kind)||!one('passed','failed','unverified')(c.outcome)||!list(ref)(c.evidence??[]))fail('CHECK_INVALID');
    if(!coordinator||!text(coordinator.model)||!nullable(text)(coordinator.effort??null)||!list(ref)(coordinator.evidence??[]))fail('COORDINATOR_INVALID');
    const expanded=references=>references.map(x=>({...pack.treatments[x.candidate_identity],candidate_id:x.candidate_id,candidate_identity:x.candidate_identity,evidence_tier:x.evidence_tier}));
    const attempts=(input.attempts??[]).map((a,i)=>{
      if(!a||!one('worker','reviewer','repair')(a.role))fail('ATTEMPT_ROLE_INVALID');
      const compact=a.candidate_id===undefined;
      const outcome=compact?(a.outcome==='unavailable'?'blocked':(a.outcome===undefined?input.acceptance:a.outcome)):a.outcome;
      if(!outcomes(outcome))fail('ATTEMPT_OUTCOME_INVALID');
      if(a.candidate_id!==undefined)return a;
      const code=a.role==='reviewer'?'REVIEWER_NOT_IN_ROUTE':'WORKER_NOT_IN_ROUTE';
      const matches=route?expanded(a.role==='reviewer'?route.reviewers:route.workers).filter(r=>(r.snapshot_id??r.model_id)===a.model&&r.effort===a.effort):[];
      if(matches.length!==1)fail(code);
      const [m]=matches;
      return {attempt_id:a.attempt_id??`${a.role}-${i+1}`,role:a.role,candidate_id:m.candidate_id,candidate_identity:m.candidate_identity,evidence_tier:m.evidence_tier,configured:{model:a.model,effort:a.effort},observed:{model:a.observed?.model??null,effort:a.observed?.effort??null},outcome,started_at:a.started_at??null,completed_at:a.completed_at??null,evidence:a.evidence??[]};
    });
    const verifier=route?expanded(route.reviewers).find(r=>(r.snapshot_id??r.model_id)===coordinator.model&&r.effort===(coordinator.effort??null)):undefined;
    const snapshot=await snapshotArtifact(base,directory,input.artifact_cwd??input.cwd,input.run_id,now);
    if(snapshot)history.push(snapshot);
    const artifact=snapshot?[snapshot.data.reference]:[];
    const results=[];
    for(const c of checks) {
      let capture;
      if(c.command){const {event}=await captureOnce(base,directory,{command:c.command,cwd:input.cwd,run_id:input.run_id,timeout:timeoutOf(c.timeout_ms)},now);history.push(event);capture=event.data;}
      else capture=history.find(e=>e.kind==='capture'&&e.data.run_id===input.run_id&&e.data.reference.path===c.reference.path&&e.data.reference.digest===c.reference.digest)?.data??fail('CHECK_REFERENCE_UNKNOWN');
      results.push({name:c.name,kind:c.kind,outcome:capture.error===null&&capture.signal===null?(capture.exit_code===0?'passed':'failed'):'unverified',asserted:false,evidence:[capture.reference]});
    }
    for(const c of inspected)results.push({name:c.name,kind:c.kind,outcome:c.outcome,asserted:true,evidence:[...artifact,...(c.evidence??[])]});
    const coordinatorAttempt={attempt_id:'coordinator',role:'coordinator',candidate_id:verifier?.candidate_id??null,candidate_identity:verifier?.candidate_identity??null,evidence_tier:verifier?.evidence_tier??null,configured:{model:coordinator.model,effort:coordinator.effort??null},observed:{model:coordinator.observed?.model??null,effort:coordinator.observed?.effort??null},outcome:input.acceptance,started_at:start.started_at,completed_at:now,evidence:[...artifact,...(coordinator.evidence??[])]};
    return finalize(start,{mode:input.mode,stratum_digest:input.stratum_digest,attempts:[coordinatorAttempt,...attempts],checks:results,relevant_checks_complete:input.relevant_checks_complete,acceptance:input.acceptance,usage:input.usage??null},pack);
  }
  if(command==='advise')return adviseFor(startOf(input.run_id),input,history,ctx);
  fail('UNKNOWN_COMMAND');
}
let invokedDirectly=false;
try { invokedDirectly=!!process.argv[1] && import.meta.url===pathToFileURL(await realpath(resolve(process.argv[1]))).href; } catch { /* Imports from stdin have no executable file. */ }
if(invokedDirectly) {
  const stdin=async()=>{let s='';process.stdin.setEncoding('utf8');for await(const chunk of process.stdin)s+=chunk;return s;};
  // The CLI always uses the wall clock; a `now` inside the input file is never read.
  try { if(!process.argv[3])fail('Usage: local-learning.mjs command input.json|-'); const input=JSON.parse(process.argv[3]==='-'?await stdin():await readFile(process.argv[3],'utf8')); console.log(JSON.stringify(await runCommand(process.argv[2],input))); }
  catch(error) { console.log(JSON.stringify({status:'unavailable',reason:error.message,localPreferences:null})); process.exitCode=1; }
}
