#!/usr/bin/env node
/** Portable local evidence and advice. No dependencies, network, or model calls. */
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
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
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
const attempt = object({attempt_id:text,role:one('coordinator','worker','reviewer','repair'),candidate_id:nullable(text),candidate_identity:nullable(sha),evidence_tier:nullable(one('qualified','provisional')),configured:model,observed:model,outcome:one('accepted','failed','blocked','rejected'),started_at:nullable(iso),completed_at:nullable(iso),evidence:list(ref)});
const check = object({name:text,kind:one('test','artifact','source','visual','review','calculation'),outcome:one('passed','failed','unverified'),evidence:list(ref)});
const usage = nullable(object({metric:one('attributable_cost','allowance','api_equivalent','tokens'),unit:text,value:nonnegative,source:ref,complete:bool}));
const receiptCheck = object({schema_version:one('delegate_receipt.v2'),task_id:text,run_id:text,session_id:text,parent_run_id:nullable(text),project_id:sha,host:one('codex','claude'),host_version:text,execution_environment:one('codex','claude_code'),task_class:text,risk:one('low','medium','high','critical'),scope:text,research_kind:nullable(one('supplied_sources','live_web')),origin:one('production_usage','qualification_evaluation'),mode:one('direct','delegated'),started_at:iso,completed_at:iso,elapsed_ms:nonnegative,baseline_digest:nullable(sha),pack_content_digest:nullable(sha),stratum_digest:nullable(sha),skill_folder_digest:sha,attempts:list(attempt),checks:list(check),relevant_checks_complete:bool,acceptance:one('accepted','failed','blocked','rejected'),usage});
export function normalizeReceipt(value) {
  if (!value || typeof value !== 'object') fail('RECEIPT_MALFORMED');
  if (value.schema_version === 'delegate_receipt.v1') {
    const a=value.pack_content_digest, b=value.routing_pack?.content_digest;
    if (a != null && b != null && a !== b) fail('RECEIPT_PACK_DIGEST_CONFLICT');
    if ((a ?? b) != null && !sha(a ?? b)) fail('RECEIPT_PACK_DIGEST_MALFORMED');
    return {...value, pack_content_digest:a ?? b ?? null};
  }
  if (!receiptCheck(value)) fail('RECEIPT_V2_MALFORMED');
  if (value.execution_environment !== (value.host === 'claude' ? 'claude_code' : 'codex')) fail('RECEIPT_HOST_CONFLICT');
  if (Date.parse(value.completed_at) < Date.parse(value.started_at) || value.elapsed_ms !== Date.parse(value.completed_at)-Date.parse(value.started_at)) fail('RECEIPT_TIME_CONFLICT');
  if (new Set(value.attempts.map(a=>a.attempt_id)).size !== value.attempts.length) fail('RECEIPT_DUPLICATE_ATTEMPT');
  if (!value.attempts.some(a=>a.role==='coordinator')) fail('RECEIPT_COORDINATION_MISSING');
  if (value.mode === 'delegated' && (!value.pack_content_digest || !value.stratum_digest || !value.attempts.some(a=>a.role==='worker'))) fail('RECEIPT_DELEGATION_INCOMPLETE');
  if (value.mode === 'direct' && value.attempts.some(a=>['worker','repair'].includes(a.role))) fail('RECEIPT_MODE_CONFLICT');
  for (const a of value.attempts) if (a.started_at && a.completed_at && (Date.parse(a.started_at)<Date.parse(value.started_at) || Date.parse(a.completed_at)>Date.parse(value.completed_at) || Date.parse(a.completed_at)<Date.parse(a.started_at))) fail('RECEIPT_ATTEMPT_TIME_CONFLICT');
  return structuredClone(value);
}
export async function folderDigest(directory) {
  const files={};
  async function visit(base) {
    for (const entry of (await readdir(base,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
      const path=join(base,entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files[relative(directory,path)]=bytesDigest(await readFile(path));
      else fail('SKILL_SYMLINK_UNSUPPORTED');
    }
  }
  await visit(directory); return digest(files);
}
export async function projectIdentity(cwd,host) {
  if (!one('codex','claude')(host)) fail('HOST_REQUIRED');
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
  const rows=[],comparableRows=[];
  for(const name of names.filter(n=>n.endsWith('.json')).sort()) {
    const row=await readJSON(join(directory,name)), {content_digest,...body}=row;
    if(content_digest!==digest(body)||name!==`${digest(row.id).slice(7)}.json`)fail('STATE_CORRUPT');
    rows.push(row);
  }
  return rows;
}
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
    if(c.outcome==='unverified'||!await referencesValid(c.evidence)) return false;
    if(!c.evidence.some(ref=>history.some(e=>e.kind==='capture' && e.data.run_id===r.run_id && e.data.reference.path===ref.path && e.data.reference.digest===ref.digest && (c.outcome==='passed'?e.data.exit_code===0:e.data.exit_code!==0))))return false;
  }
  if(r.acceptance==='accepted'&&r.checks.some(c=>c.outcome!=='passed')) return false;
  if(r.mode==='delegated') {
    if(!r.checks.some(c=>c.kind==='review'))return false;
    if(!r.attempts.some(a=>a.role==='reviewer')) {
      const route=pack.routes.find(x=>x.stratum_digest===r.stratum_digest), a=r.attempts.find(a=>a.role==='coordinator');
      const verifier=route.reviewers.find(x=>x.candidate_identity===a.candidate_identity&&x.candidate_id===a.candidate_id), t=pack.treatments[a.candidate_identity];
      if(!verifier||!t||!t.frontier||a.evidence_tier!==verifier.evidence_tier||a.configured.model!==(t.snapshot_id??t.model_id)||a.configured.effort!==t.effort||t.provisional?.host!==r.host)return false;
    }
  }
  if(r.research_kind==='live_web'&&!r.checks.some(c=>c.kind==='source'))return false;
  for(const a of r.attempts) {
    if (!await referencesValid(a.evidence) || !a.configured.model || !a.configured.effort) return false;
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
export async function runCommand(command,input,{stateRoot=process.env.DELEGATE_STATE_HOME || (process.env.XDG_STATE_HOME?join(process.env.XDG_STATE_HOME,'delegate'):join(homedir(),'.local/state/delegate')),skillRoot=skillDirectory,now=new Date().toISOString()}={}) {
  if(!input || !text(input.cwd))fail('CWD_REQUIRED');
  const identity=await projectIdentity(input.cwd,input.host), base=join(resolve(stateRoot),identity.project_id.slice(7),identity.host), directory=join(base,'events');
  await mkdir(base,{recursive:true,mode:0o700});
  // A per-project lock also serializes reset with writers. Stale locks cause a nonblocking fallback; never guess that an active process is dead.
  const lock=join(base,'.lock');
  try {await mkdir(lock);} catch(e) {if(e.code==='EEXIST')fail('STATE_BUSY');throw e;}
  try {
    if(command==='reset') { await rm(directory,{recursive:true,force:true}); await rm(join(base,'receipts'),{recursive:true,force:true}); await rm(join(base,'evidence'),{recursive:true,force:true}); return {status:'reset',...identity}; }
    const history=await events(directory), configs=history.filter(e=>e.kind==='config').sort((a,b)=>a.data.sequence-b.data.sequence);
    const settings=Object.assign({learning:true,reminders:true,reminder_limit:1},...configs.map(e=>e.data.settings));
    if(command==='disable') {
      const target=input.target??'learning'; if(!['learning','reminders'].includes(target))fail('SETTING_INVALID');
      const enabled=input.enabled??false;if(!bool(enabled))fail('SETTING_INVALID');
      const settingsUpdate={[target]:enabled};
      if(input.max_per_session!==undefined) {if(target!=='reminders'||!Number.isInteger(input.max_per_session)||input.max_per_session<1)fail('REMINDER_LIMIT_INVALID');settingsUpdate.reminder_limit=input.max_per_session;}
      await atomicEvent(directory,`config:${randomUUID()}`,'config',{at:now,sequence:history.length,settings:settingsUpdate});return {status:'configured',target,enabled};
    }
    if(command==='status')return {status:'ok',...identity,settings,records:history.filter(e=>e.kind==='receipt').length,corrections:history.filter(e=>e.kind==='correction').length,reminders:history.filter(e=>e.kind==='reminder').length};
    if(command==='advise' && input.reminder) {
      const start=history.find(e=>e.kind==='start'&&e.data.run_id===input.run_id)?.data;
      if(!start)fail('RUN_NOT_STARTED');
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
    if(!settings.learning && command!=='start')return {status:'disabled',localPreferences:null};
    if(command==='start') {
      const run_id=input.run_id??randomUUID(), existing=history.find(e=>e.kind==='start'&&e.data.run_id===run_id)?.data;
      const parent=input.parent_run_id?history.find(e=>e.kind==='receipt'&&e.data.run_id===input.parent_run_id)?.data:null;
      if(input.parent_run_id&&!parent)fail('HANDOFF_PARENT_MISSING');
      const data={...identity,run_id,task_id:input.task_id??parent?.task_id??run_id,session_id:input.session_id,parent_run_id:parent?.run_id??null,host_version:input.host_version,task_class:input.task_class,risk:input.risk,scope:input.scope,research_kind:input.research_kind??null,origin:input.origin??'production_usage',started_at:existing?.started_at??now,baseline_digest:input.baseline_digest??null,skill_folder_digest:await folderDigest(skillRoot)};
      if(!text(data.run_id)||!text(data.task_id)||!text(data.session_id)||!text(data.host_version)||!text(data.task_class)||!text(data.scope)||!one('low','medium','high','critical')(data.risk)||!nullable(one('supplied_sources','live_web'))(data.research_kind)||!one('production_usage','qualification_evaluation')(data.origin)||!nullable(sha)(data.baseline_digest))fail('START_INVALID');
      if(parent&&(data.task_id!==parent.task_id||data.origin!==parent.origin||data.scope!==parent.scope||data.task_class!==parent.task_class))fail('HANDOFF_LINEAGE_CONFLICT');
      await atomicEvent(directory,`start:${run_id}`,'start',data);return {status:'started',...data};
    }
    if(command==='capture') {
      const start=history.find(e=>e.kind==='start'&&e.data.run_id===input.run_id)?.data;if(!start)fail('RUN_NOT_STARTED');
      if(!list(text)(input.command)||!input.command.length)fail('CAPTURE_COMMAND_REQUIRED');
      const timeout=input.timeout_ms??30000;if(!Number.isInteger(timeout)||timeout<1||timeout>120000)fail('CAPTURE_TIMEOUT_INVALID');
      const result=spawnSync(input.command[0],input.command.slice(1),{cwd:input.cwd,encoding:'utf8',timeout,maxBuffer:4*1024*1024});
      const observation={command:input.command,cwd:await realpath(input.cwd),run_id:input.run_id,observed_at:now,exit_code:result.status,signal:result.signal,error:result.error?.message??null,stdout:result.stdout??'',stderr:result.stderr??''};
      const path=join(base,'evidence',`${randomUUID()}.json`);await mkdir(dirname(path),{recursive:true,mode:0o700});
      const bytes=JSON.stringify(observation)+'\n';await writeFile(path,bytes,{flag:'wx',mode:0o600});
      const reference={path,digest:bytesDigest(bytes)};
      await atomicEvent(directory,`capture:${randomUUID()}`,'capture',{run_id:input.run_id,reference,exit_code:result.status,error:result.error?.message??null,at:now});
      return {status:'captured',reference,exit_code:result.status,error:result.error?.message??null};
    }
    if(command==='correct') {
      if(!text(input.event_id)||!text(input.reason)||!list(ref)(input.evidence??[]))fail('CORRECTION_INVALID');
      const matched=history.find(e=>e.kind==='receipt'&&e.data.run_id===input.run_id);
      const data={run_id:matched?.data.run_id??null,requested_run_id:input.run_id??null,reason:input.reason,evidence:input.evidence??[],at:now};
      const old=history.find(e=>e.id===`correction:${input.event_id}`);if(old)data.at=old.data.at;
      await atomicEvent(directory,`correction:${input.event_id}`,'correction',data);return {status:matched?'correction_recorded':'unassigned'};
    }
    if(command==='record') {
      const start=history.find(e=>e.kind==='start'&&e.data.run_id===input.run_id)?.data;if(!start)fail('RUN_NOT_STARTED');
      if(start.skill_folder_digest!==await folderDigest(skillRoot))fail('SKILL_CHANGED_DURING_RUN');
      const previous=history.find(e=>e.kind==='receipt'&&e.data.run_id===input.run_id)?.data;
      const completed_at=previous?.completed_at??now;
      const pack=input.mode==='delegated'?await packAt(input.pack_path,completed_at):null;
      if(pack&&!pack.routes.some(r=>r.stratum_digest===input.stratum_digest&&r.public_task_class===start.task_class))fail('STRATUM_MISMATCH');
      const data=normalizeReceipt({schema_version:'delegate_receipt.v2',...start,execution_environment:input.host==='claude'?'claude_code':'codex',mode:input.mode,completed_at,elapsed_ms:Date.parse(completed_at)-Date.parse(start.started_at),pack_content_digest:pack?.content_digest??null,stratum_digest:pack?input.stratum_digest:null,attempts:input.attempts,checks:input.checks,relevant_checks_complete:input.relevant_checks_complete,acceptance:input.acceptance,usage:input.usage??null});
      await atomicEvent(directory,`receipt:${input.run_id}`,'receipt',data);
      const exports=join(base,'receipts'); await mkdir(exports,{recursive:true,mode:0o700});
      const receipt_path=join(exports,`${digest(input.run_id).slice(7)}.json`);
      const exportBytes=JSON.stringify(data)+'\n', existingExport=await optionalJSON(receipt_path);
      if(existingExport && canonical(existingExport)!==canonical(data))fail('RECEIPT_EXPORT_CONFLICT');
      if(!existingExport) {
        const temp=join(exports,`.pending-${randomUUID()}`), out=await open(temp,'wx',0o600);
        try {await out.writeFile(exportBytes);await out.sync();} finally {await out.close();}
        try {await link(temp,receipt_path);} finally {await unlink(temp);}
      }
      return {status:'recorded',receipt:data,evidence_supported:await supported(data,pack,history),receipt_path};
    }
    if(command==='advise') {
      const start=history.find(e=>e.kind==='start'&&e.data.run_id===input.run_id)?.data;if(!start)fail('RUN_NOT_STARTED');
      let pack=null;
      try { pack=await packAt(input.pack_path??join(skillRoot,'routing-pack.json'),now); } catch { return {status:'ok',modePreference:null,localPreferences:null,reason:'Baseline: current pack unavailable or expired.'}; }
      if(start.host_version==='unknown')return {status:'ok',modePreference:null,localPreferences:null,reason:'Baseline: host version unknown.'};
      const rows=[],comparableRows=[];
      for(const event of history.filter(e=>e.kind==='receipt')) {
        const r=normalizeReceipt(event.data);
        if(r.origin!=='production_usage'||r.run_id===start.run_id||r.parent_run_id||r.host_version!==start.host_version||r.task_class!==start.task_class||r.risk!==start.risk||r.scope!==start.scope||r.research_kind!==start.research_kind||r.skill_folder_digest!==start.skill_folder_digest||Date.parse(r.completed_at)>Date.parse(now)||Date.parse(r.completed_at)<Date.parse(now)-30*86400000)continue;
        // Handoffs preserve lineage; incomplete multi-session comparisons are excluded rather than counting only the cheap tail.
        if(history.some(e=>e.kind==='start'&&e.data.parent_run_id===r.run_id))continue;
        if(r.mode==='delegated'&&(!pack||r.pack_content_digest!==pack.content_digest||(input.stratum_digest && r.stratum_digest!==input.stratum_digest)))continue;
        comparableRows.push(r);
        if(!await supported(r,pack,history))return {status:'ok',modePreference:null,workerPreference:null,localPreferences:null,reason:'Baseline: comparable history contains incomplete or unverified work.'};
        if(r.usage&&!await referencesValid([r.usage.source]))r.usage=null;
        r.corrected=history.some(e=>e.kind==='correction'&&e.data.run_id===r.run_id);rows.push(r);
      }
      if(new Set(comparableRows.map(r=>r.task_id)).size!==comparableRows.length)return {status:'ok',modePreference:null,workerPreference:null,localPreferences:null,reason:'Baseline: repeated task identities require a complete combined comparison.'};
      const modePreference=preference(rows,r=>r.mode), workerPreference=preference(rows.filter(r=>r.mode==='delegated').map(r=>{
        const first=r.attempts.find(a=>a.role==='worker');
        const originalSucceeded=first?.outcome==='accepted' && !r.attempts.some(a=>['worker','repair'].includes(a.role)&&a.candidate_identity!==first.candidate_identity);
        return {...r,acceptance:originalSucceeded?r.acceptance:'failed'};
      }),r=>r.attempts.find(a=>a.role==='worker')?.candidate_identity??null);
      const localPreferences=workerPreference&&pack&&input.stratum_digest?{pack_content_digest:pack.content_digest,stratum_digest:input.stratum_digest,host:input.host,preferred_worker_identity:workerPreference.preferred}:null;
      return {status:'ok',modePreference,workerPreference,localPreferences,reason:modePreference||workerPreference?'Local evidence supports a preference; recheck eligibility and explicit instructions.':'Baseline: insufficient comparable evidence.',qualification_authority:false};
    }
    fail('UNKNOWN_COMMAND');
  } finally { await rm(lock,{recursive:true,force:true}); }
}
let invokedDirectly=false;
try { invokedDirectly=!!process.argv[1] && import.meta.url===pathToFileURL(await realpath(resolve(process.argv[1]))).href; } catch { /* Imports from stdin have no executable file. */ }
if(invokedDirectly) {
  try { if(!process.argv[3])fail('Usage: local-learning.mjs command input.json'); const input=JSON.parse(await readFile(process.argv[3],'utf8'));  console.log(JSON.stringify(await runCommand(process.argv[2],input))); }
  catch(error) { console.log(JSON.stringify({status:'unavailable',reason:error.message,localPreferences:null})); process.exitCode=1; }
}
