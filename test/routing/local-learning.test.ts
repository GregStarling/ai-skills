import {describe,it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm,mkdir,cp,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runCommand,lookup,routeAssignment,digest,normalizeReceipt,reminderDecision,folderDigest,projectIdentity} from '../../skills/delegate/scripts/local-learning.mjs';
import {resolveRouting} from '../../src/routing/resolver.js';
import {RoutingError} from '../../src/routing/contracts.js';
import {digest as coreDigest} from '../../src/core/canonical.js';
// The test clock follows the published pack so a recompile cannot move the pack's validity window past it.
const packPath=resolve('skills/delegate/routing-pack.json'),pack=JSON.parse(readFileSync(packPath,'utf8'));
const base=Date.parse(pack.generated_at)+3600e3;
const at=(ms:number)=>new Date(base+ms).toISOString();
const now=at(0);
const sha=(v:string)=>`sha256:${createHash('sha256').update(v).digest('hex')}`;
const helper=resolve('skills/delegate/scripts/local-learning.mjs');
const repack=(source:any,mutate:(p:any)=>void)=>{const p=structuredClone(source);mutate(p);const {content_digest,...body}=p;return {...body,content_digest:digest(body)};};
const routeOf=(p:any,host:string,task_class='mechanical_work',risk='low')=>p.routes.find((r:any)=>r.public_task_class===task_class&&r.stratum.worker_request.risk===risk&&p.treatments[r.workers[0].candidate_identity].provisional.host===host);
async function fixture({git=false,host='codex'}={}){
 const root=await mkdtemp(join(tmpdir(),'delegate-learning-')),stateRoot=join(root,'state'),skillRoot=join(root,'skill'),cwd=join(root,'project');
 await mkdir(cwd);await cp(resolve('skills/delegate'),skillRoot,{recursive:true});
 if(git){execFileSync('git',['init','-q'],{cwd});await writeFile(join(cwd,'work.txt'),'edited');}
 const evidence=join(root,'check.txt');await writeFile(evidence,'captured check output');
 const ref={path:evidence,digest:sha('captured check output')};
 const options={stateRoot,skillRoot,now};
 const input={cwd,host,host_version:'1',session_id:'session',task_class:'mechanical_work',risk:'low',scope:'quantity-default',research_kind:null};
 const pack=JSON.parse(await readFile(join(skillRoot,'routing-pack.json'),'utf8'));
 const route=routeOf(pack,host);
 const captures=new Map<string,any>();
 const call=async(c:string,i:any={},time=now)=>{
  if(c==='record' && i.auto_capture!==false){
   if(!captures.has(i.run_id))captures.set(i.run_id,await runCommand('capture',{...input,run_id:i.run_id,command:[process.execPath,'-e',`require('node:fs').readFileSync(${JSON.stringify(evidence)}); console.log('check executed')`]},{...options,now:time}));
   const captured=captures.get(i.run_id).reference;
   const bind=(refs:any[])=>refs.map(r=>r.path===ref.path?captured:r);
   i={...i,attempts:i.attempts?.map((a:any)=>({...a,evidence:bind(a.evidence)})),checks:i.checks?.map((c:any)=>({...c,evidence:bind(c.evidence)}))};
  }
  const {auto_capture,...fields}=i;
  return runCommand(c,{...input,...fields},{...options,now:time});
 };
 const attempt=(role='coordinator',id='coordinator')=>{
  const binding=role==='worker'?route.workers[0]:route.reviewers[0], t=pack.treatments[binding.candidate_identity];
  return {attempt_id:id,role,candidate_id:binding.candidate_id,candidate_identity:binding.candidate_identity,evidence_tier:binding.evidence_tier,configured:{model:t.snapshot_id??t.model_id,effort:t.effort},observed:{model:null,effort:null},outcome:'accepted',started_at:null,completed_at:null,evidence:[ref]};
 };
 const record={mode:'direct',acceptance:'accepted',relevant_checks_complete:true,attempts:[attempt()],checks:[{name:'check',kind:'test',outcome:'passed',evidence:[ref]}],usage:null};
 const stateBase=join(stateRoot,(await projectIdentity(cwd,host)).project_id.slice(7),host);
 const events=async(kind?:string)=>{const dir=join(stateBase,'events');const rows=await Promise.all((await readdir(dir)).filter(n=>n.endsWith('.json')).map(async n=>JSON.parse(await readFile(join(dir,n),'utf8'))));return kind?rows.filter(r=>r.kind===kind):rows;};
 const evidenceFiles=async()=>{try{return (await readdir(join(stateBase,'evidence'))).length;}catch{return 0;}};
 const delegated={mode:'delegated',pack_path:join(skillRoot,'routing-pack.json'),stratum_digest:route.stratum_digest};
 const reviewer=pack.treatments[route.reviewers[0].candidate_identity];
 const coordinator={model:reviewer.snapshot_id??reviewer.model_id,effort:reviewer.effort,observed:null};
 return {root,stateRoot,skillRoot,cwd,evidence,ref,input,options,pack,route,call,attempt,record,delegated,coordinator,stateBase,events,evidenceFiles,cleanup:()=>rm(root,{recursive:true,force:true})};
}
const handoff={objective:'Implement agreed fix',constraints:[],decisions:['Fix the default'],checkout_state:'Isolated branch; baseline checked',completed_checks:['Reproduction'],evidence_locations:['/tmp/repro'],next_action:'Implement fix',unresolved_risks:[]};
const reminder={session_id:'s',session_started_at:at(-3600000),now,safe_boundary:true,remaining_work:true,active_workers:false,coupled_investigation:false,rediscovery_required:false,completed_context_dominates:true,next_phase_independent:true,handoff};
describe('portable local feedback',()=>{
 it('captures canonical direct receipts, immutable idempotent runs, corrections and raw export',async()=>{const f=await fixture();try{
  const start=await f.call('start',{run_id:'a'});expect((await f.call('start',{run_id:'a'})).run_id).toBe(start.run_id);
  const r=await f.call('record',{run_id:'a',...f.record},at(5000));
  expect(r.evidence_supported).toBe(true);expect(normalizeReceipt(JSON.parse(await readFile(r.receipt_path,'utf8')))['run_id']).toBe('a');
  expect((await f.call('record',{run_id:'a',...f.record},at(6000))).receipt.completed_at).toBe(r.receipt.completed_at);
  await expect(f.call('record',{run_id:'a',...f.record,acceptance:'failed'})).rejects.toThrow('EVENT_CONFLICT');
  expect((await f.call('correct',{event_id:'c',run_id:'a',reason:'regression'})).status).toBe('correction_recorded');
  expect((await f.call('correct',{event_id:'d',run_id:'missing',reason:'unmatched'})).status).toBe('unassigned');
  expect((await f.call('status')).records).toBe(1);
 }finally{await f.cleanup();}});
 it('does not credit self-written success, missing references, or incomplete checks',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});
  expect((await f.call('record',{run_id:'a',...f.record,checks:[{name:'claim',kind:'test',outcome:'passed',evidence:[]}]})).evidence_supported).toBe(false);
  await f.call('start',{run_id:'plain'});expect((await f.call('record',{run_id:'plain',...f.record,auto_capture:false})).evidence_supported).toBe(false);
  await f.call('start',{run_id:'b'});await rm(f.evidence);
  expect((await f.call('record',{run_id:'b',...f.record})).evidence_supported).toBe(false);
 }finally{await f.cleanup();}});
 it('preserves fallback attempts, requires pack binding and records changed skill folders as unsupported',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});
  const failed={...f.attempt('worker','failed'),outcome:'failed'}, fallback=f.attempt('worker','fallback');
  const args={run_id:'a',...f.record,...f.delegated,attempts:[f.attempt(),failed,fallback],checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]};
  const r=await f.call('record',args);expect(r.receipt.attempts).toHaveLength(3);expect(r.receipt.pack_content_digest).toBe(f.pack.content_digest);
  await f.call('start',{run_id:'b'});await writeFile(join(f.skillRoot,'new-file'),'changed');
  const changed=await f.call('record',{run_id:'b',...f.record});
  expect(changed).toMatchObject({status:'recorded',evidence_supported:false,reason:'skill_changed_during_run'});expect((await f.call('status')).records).toBe(2);
 }finally{await f.cleanup();}});
 it('learns only after five comparable supported tasks per option and invalidates corrections',async()=>{const f=await fixture();try{
  for(let n=0;n<10;n++){
   const delegated=n>=5,run_id=`r${n}`;await f.call('start',{run_id});
   await f.call('record',{run_id,...f.record,...(delegated?{...f.delegated,attempts:[f.attempt(),f.attempt('worker','w')],checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]}:{})},delegated?at(10000):at(2000));
   if(n===8){await f.call('start',{run_id:'early'});expect((await f.call('advise',{run_id:'early'},at(60000))).modePreference).toBeNull();}
  }
  await f.call('start',{run_id:'next'});
  const advice=await f.call('advise',{run_id:'next'},at(60000));expect(advice.modePreference).toBeNull();
  await f.call('correct',{run_id:'r0',event_id:'c',reason:'missed test'});
  expect((await f.call('advise',{run_id:'next'},at(60000))).modePreference).toMatchObject({preferred:'delegated',basis:'quality'});
  await f.call('start',{run_id:'bad'});await f.call('record',{run_id:'bad',...f.record,acceptance:'failed',checks:[],relevant_checks_complete:false});
  expect((await f.call('advise',{run_id:'next'},at(60000))).reason).toContain('incomplete or unverified');
  await f.call('start',{run_id:'other-scope',scope:'different'});expect((await f.call('advise',{run_id:'other-scope'})).modePreference).toBeNull();
 }finally{await f.cleanup();}});
 it('rejects wrong routed settings and never credits a replacement repair to the original worker',async()=>{const f=await fixture();try{
  const second=f.route.workers[1], t=f.pack.treatments[second.candidate_identity];
  const replacement={...f.attempt('worker','replacement'),candidate_id:second.candidate_id,candidate_identity:second.candidate_identity,evidence_tier:second.evidence_tier,configured:{model:t.snapshot_id??t.model_id,effort:t.effort}};
  const delegated={...f.record,...f.delegated,checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]};
  await f.call('start',{run_id:'wrong',scope:'wrong-test'});
  expect((await f.call('record',{...delegated,run_id:'wrong',attempts:[f.attempt(),{...f.attempt('worker','w'),configured:{model:'WRONG',effort:'WRONG'}}]})).evidence_supported).toBe(false);
  for(let n=0;n<10;n++){
   const run_id=`repair${n}`;await f.call('start',{run_id});
   const attempts=n<5?[f.attempt(),{...f.attempt('worker','original'),outcome:'failed'},{...replacement,role:'repair'}]:[f.attempt(),{...replacement,outcome:'failed'}];
   await f.call('record',{...delegated,run_id,attempts,acceptance:n<5?'accepted':'failed'},n<5?at(1000):at(2000));
  }
  await f.call('start',{run_id:'next'});expect((await f.call('advise',{run_id:'next',stratum_digest:f.route.stratum_digest},at(60000))).workerPreference).toBeNull();
 }finally{await f.cleanup();}});
 it('keeps evaluation history, handoffs, and unknown host versions out of positive preferences',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a',task_id:'task'});await f.call('record',{run_id:'a',...f.record});
  const parent=await f.call('start',{run_id:'b',session_id:'fresh',parent_run_id:'a'});expect(parent.task_id).toBe('task');expect(parent.parent_run_id).toBe('a');
  await expect(f.call('start',{run_id:'c',parent_run_id:'missing'})).rejects.toThrow('HANDOFF_PARENT_MISSING');
  await expect(f.call('start',{run_id:'c',parent_run_id:'a',scope:'wrong'})).rejects.toThrow('LINEAGE_CONFLICT');
  await f.call('start',{run_id:'unknown',host_version:'unknown'});expect((await f.call('advise',{run_id:'unknown'})).reason).toContain('host version unknown');
 }finally{await f.cleanup();}});
 it('survives replacement, supports disable/reset, and isolates hosts',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});await f.call('record',{run_id:'a',...f.record});
  await rm(f.skillRoot,{recursive:true});await cp(resolve('skills/delegate'),f.skillRoot,{recursive:true});
  expect((await f.call('status')).records).toBe(1);expect((await f.call('status',{host:'claude'})).records).toBe(0);
  await f.call('disable');expect((await f.call('start',{run_id:'b'})).status).toBe('started');expect((await f.call('advise',{run_id:'b'})).status).toBe('disabled');
  await f.call('reset');expect((await f.call('status')).records).toBe(0);
 }finally{await f.cleanup();}});
 it('ignores interrupted temp writes, detects corruption, and locks only destructive writes',async()=>{const f=await fixture();try{
  const start=await f.call('start',{run_id:'a'}),base=join(f.stateRoot,start.project_id.slice(7),'codex'),dir=join(base,'events');
  await writeFile(join(dir,'.pending-interrupted'),'partial');expect((await f.call('status')).records).toBe(0);
  await mkdir(join(base,'.lock'));expect((await f.call('status')).status).toBe('ok');
  await expect(f.call('reset')).rejects.toThrow('STATE_BUSY');await expect(f.call('disable')).rejects.toThrow('STATE_BUSY');await rm(join(base,'.lock'),{recursive:true});
  await writeFile(join(dir,'bad.json'),'{}');await expect(f.call('status')).rejects.toThrow('STATE_CORRUPT');
 }finally{await f.cleanup();}});
 it('groups symlink aliases and Git worktrees without transferring across projects',async()=>{const f=await fixture();try{
  const alias=join(f.root,'alias');await symlink(f.cwd,alias);expect(await projectIdentity(alias,'codex')).toEqual(await projectIdentity(f.cwd,'codex'));
  execFileSync('git',['init','-q'],{cwd:f.cwd});execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','fixture'],{cwd:f.cwd,stdio:'ignore'});
  const wt=join(f.root,'worktree');execFileSync('git',['worktree','add','--detach',wt],{cwd:f.cwd,stdio:'ignore'});
  expect(await projectIdentity(wt,'codex')).toEqual(await projectIdentity(f.cwd,'codex'));
  expect(await projectIdentity(f.root,'codex')).not.toEqual(await projectIdentity(f.cwd,'codex'));
 }finally{await f.cleanup();}});
 it('runs from a copied folder without dependencies and returns an actionable failure without input',async()=>{const f=await fixture();try{
  const file=join(f.root,'input.json');await writeFile(file,JSON.stringify({...f.input,run_id:'a'}));
  const result=spawnSync(process.execPath,[join(f.skillRoot,'scripts/local-learning.mjs'),'start',file],{encoding:'utf8',env:{...process.env,DELEGATE_STATE_HOME:f.stateRoot}});
  expect(result.status).toBe(0);expect(JSON.parse(result.stdout).status).toBe('started');
  const invalid=spawnSync(process.execPath,[join(f.skillRoot,'scripts/local-learning.mjs'),'start'],{encoding:'utf8'});expect(invalid.status).toBe(1);expect(JSON.parse(invalid.stdout).status).toBe('unavailable');
 }finally{await f.cleanup();}});
});
describe('lookup',()=>{
 const hostOf=(route:any)=>pack.treatments[route.workers[0].candidate_identity].provisional.host as 'codex'|'claude';
 const rosterOf=(route:any)=>[...route.workers,...route.reviewers].map((x:any)=>{const c=pack.treatments[x.candidate_identity];return {provider:c.provider,model_id:c.model_id,snapshot_id:c.snapshot_id,effort:c.effort,serving:c.serving};});
 const variants=(route:any)=>{const roster=rosterOf(route),host=hostOf(route);return {full:{},'first worker missing':{treatments:roster.slice(1)},'substitution observed on first worker':{treatments:[{...roster[0],substitution_observed:true},...roster.slice(1)]},'supports_fresh_context false':{fresh:false},'observed effort mismatch':{treatments:[{...roster[0],observed_effort:'unexpected'},...roster.slice(1)]},'now past first worker expiry':{when:new Date(Date.parse(route.workers[0].expires_at)+1).toISOString()},'now past refresh_after':{when:pack.refresh_after},'failed_candidate_ids naming the first worker':{failed:[route.workers[0].candidate_id]},'localPreferences naming the second worker':{pref:{pack_content_digest:pack.content_digest,stratum_digest:route.stratum_digest,host,preferred_worker_identity:route.workers[1].candidate_identity}}} as Record<string,{treatments?:any[];fresh?:boolean;when?:string;failed?:string[];pref?:any}>;};
 const table:{name:string;route:any;v:ReturnType<typeof variants>[string]}[]=pack.routes.flatMap((route:any)=>Object.entries(variants(route)).map(([name,v])=>({name:`${hostOf(route)} ${route.public_task_class}/${route.stratum.worker_request.risk}: ${name}`,route,v})));
 it('covers every published route with nine rosters',()=>{expect(pack.routes).toHaveLength(15);expect(table).toHaveLength(135);});
 it.each(table)('equals the maintainer resolver for $name',async({route,v})=>{
  const host=hostOf(route),treatments=v.treatments??rosterOf(route),when=v.when??now,fresh=v.fresh??true;
  const found=await lookup({host,task_class:route.public_task_class,risk:route.stratum.worker_request.risk,host_treatments:treatments,supports_fresh_context:fresh,...(v.failed?{failed_candidate_ids:v.failed}:{}),...(v.pref?{localPreferences:v.pref}:{})},{now:when});
  let expected:any;try{expected=resolveRouting(pack,{publicTaskClass:route.public_task_class,stratumDigest:route.stratum_digest,now:when,host:{host,treatments,tools:route.requirements.tools,capabilities:route.requirements.capabilities,context_window_tokens:Math.max(route.requirements.context_window_tokens,1),supports_fresh_context:fresh},...(v.failed?{failedCandidateIds:v.failed}:{}),...(v.pref?{localPreferences:v.pref}:{})});}catch(error){expected=error;}
  expect(found.host_verified).toBe(true);
  if(expected instanceof RoutingError){if(expected.code!=='ROUTE_NOT_FOUND')expect(found.gap).toBe(expected.code);return;}
  expect(found.gap).toBeNull();expect(found.workers[0].candidate_id).toBe(expected.worker.candidate_id);expect(found.reviewers[0].candidate_id).toBe(expected.reviewer.candidate_id);
  expect(found.pack.refresh_due).toBe(expected.stale);expect(found.ranking_basis).toEqual(expected.ranking_basis);
 });
 it('lets a coordinator verify only from inside the reviewer lane',async()=>{
  for(const route of pack.routes)expect(await lookup({host:hostOf(route),task_class:route.public_task_class,risk:route.stratum.worker_request.risk,coordinator:{model:'unlisted-reviewer',effort:'high'}},{now})).toMatchObject({coordinator_may_verify:null,coordinator_verify_reason:'coordinator_not_in_reviewer_lane'});
  expect((await lookup({host:'claude',task_class:'mechanical_work',risk:'low',coordinator:{model:'claude-fable-5-1',effort:'high'}},{now})).coordinator_may_verify).toBe(true);
  expect((await lookup({host:'claude',task_class:'mechanical_work',risk:'low',coordinator:{model:'claude-opus-5',effort:'high'}},{now})).coordinator_may_verify).toBe(true);
  // The medium route requires a fresh reviewer process, so the coordinator may not verify inside its own context even though Opus is its reviewer.
  expect(await lookup({host:'claude',task_class:'mechanical_work',risk:'medium',coordinator:{model:'claude-opus-5',effort:'high'}},{now})).toMatchObject({coordinator_may_verify:null,coordinator_verify_reason:'fresh_process_required'});
 });
 it('returns a compact defaulted-roster answer with verbatim limitations and no evidence objects',async()=>{
  const found=await lookup({host:'claude',task_class:'mechanical_work',risk:'low'},{now}),text=JSON.stringify(found);
  // Renewal adds the calibrated reviewer and its verbatim scope limitations (4,157 bytes).
  expect(Buffer.byteLength(text)).toBeLessThan(5120);
  expect(found.workers.map((w:any)=>w.candidate_id)).toEqual(['claude-claude-haiku-4-5-20251001-not_applicable','claude-claude-sonnet-5-low']);
  expect(found.reviewers.map((r:any)=>r.candidate_id)).toEqual(['claude-claude-opus-5-high','claude-claude-fable-5-1-high']);
  expect(found).toMatchObject({host_verified:false,host_checks:['model selectable'],gap:null,route:{shape:'single worker',tools:['terminal']},workers:[{effort:'not_applicable'},{effort:'low'}]});
  for(const key of ['task_evidence','provisional','qualification','economics'])expect(text).not.toContain(`"${key}":`);
  const published=new Set<string>();for(const route of pack.routes)for(const x of [...route.workers,...route.reviewers]){for(const l of x.task_evidence?.limitations??[])published.add(l);for(const l of pack.treatments[x.candidate_identity].provisional?.control_limitations??[])published.add(l);}
  expect(found.limitations.length).toBeGreaterThan(0);expect(new Set(found.limitations).size).toBe(found.limitations.length);for(const l of found.limitations)expect(published.has(l)).toBe(true);
 });
 it('answers absent routes, decomposition and coverage without state',async()=>{
  const started=performance.now(),found=await lookup({host:'codex',task_class:'mechanical_work',risk:'medium'},{now});
  expect(performance.now()-started).toBeLessThan(100);expect(found).toMatchObject({gap:'ROUTE_NOT_FOUND',route:null,workers:[]});
  expect((await lookup({host:'codex',task_class:'full_project',risk:'low'},{now})).gap).toBe('DECOMPOSITION_REQUIRED');
  expect(await lookup({host:'codex'},{now})).toMatchObject({coverage:{low:expect.arrayContaining(['mechanical_work','research']),medium:[]},gap:null});
  expect((await lookup({host:'claude'},{now})).coverage.medium).toEqual(['mechanical_work']);
  await expect(lookup({host:'codex',task_class:'nope',risk:'low'},{now})).rejects.toThrow('LOOKUP_INPUT_INVALID');
 });
 it('applies a local preference only within the same task-evidence basis',async()=>{
  const sonnet=(route:any)=>({pack_content_digest:pack.content_digest,stratum_digest:route.stratum_digest,host:'claude',preferred_worker_identity:route.workers[1].candidate_identity});
  // Both research workers extrapolate from smoke; renewed mechanical acceptance is Haiku-only.
  const same=await lookup({host:'claude',task_class:'research',risk:'low',localPreferences:sonnet(routeOf(pack,'claude','research'))},{now});
  expect(same.workers[0].candidate_id).toBe('claude-claude-sonnet-5-low');expect(same.ranking_basis.worker).toBe('local_preference_within_task_evidence');
  const cross=await lookup({host:'claude',task_class:'hard_debugging',risk:'low',localPreferences:sonnet(routeOf(pack,'claude','hard_debugging'))},{now});
  expect(cross.workers[0].candidate_id).toBe('claude-claude-haiku-4-5-20251001-not_applicable');
 });
 it('rejects a tampered pack from runCommand and the CLI, and the CLI ignores an input clock',async()=>{const f=await fixture();try{
  const tampered=join(f.root,'tampered.json');await writeFile(tampered,JSON.stringify({...f.pack,content_digest:sha('tampered')}));
  const request={host:'codex',task_class:'mechanical_work',risk:'low',pack_path:tampered};
  await expect(runCommand('lookup',request,f.options)).rejects.toThrow('PACK_INVALID');
  const file=join(f.root,'lookup.json');await writeFile(file,JSON.stringify(request));
  const cli=spawnSync(process.execPath,[helper,'lookup',file],{encoding:'utf8'});expect(cli.status).toBe(1);expect(JSON.parse(cli.stdout)).toMatchObject({status:'unavailable',reason:'PACK_INVALID'});
  const clocked={...request,pack_path:packPath,now:'2099-01-01T00:00:00.000Z'};await writeFile(file,JSON.stringify(clocked));
  await expect(lookup(clocked,{now:clocked.now})).rejects.toThrow('PACK_EXPIRED_OR_NOT_YET_VALID');
  const expected=await runCommand('lookup',clocked).catch((e:Error)=>({status:'unavailable',reason:e.message,localPreferences:null}));
  expect(JSON.parse(spawnSync(process.execPath,[helper,'lookup',file],{encoding:'utf8'}).stdout)).toEqual(expected);
 }finally{await f.cleanup();}});
 it('still routes a project whose learning is disabled',async()=>{const f=await fixture();try{
  await f.call('disable');
  const found=await runCommand('lookup',{cwd:f.cwd,run_id:'none',host:'codex',task_class:'mechanical_work',risk:'low'},f.options);
  expect(found.gap).toBeNull();expect(found.route.stratum_digest).toBe(f.route.stratum_digest);
 }finally{await f.cleanup();}});
});
describe('finish',()=>{
 const exit=(code:number)=>[process.execPath,'-e',`process.exit(${code})`];
 const direct={mode:'direct',relevant_checks_complete:true,coordinator:{model:'claude-opus-5',effort:null,observed:null}};
 it('records an unavailable compact attempt as blocked while preserving a successful fallback',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});
  const captured=await f.call('capture',{run_id:'a',command:exit(0)});
  const input={run_id:'a',...f.delegated,coordinator:{...f.coordinator,evidence:[captured.reference]},relevant_checks_complete:true,acceptance:'accepted',checks:[{name:'tests',kind:'test',reference:captured.reference}],inspected:[{name:'final source review',kind:'review',outcome:'passed'}],attempts:[
   {role:'worker',model:'gpt-5.3-codex-spark',effort:'low',outcome:'unavailable',observed:null,evidence:[captured.reference]},
   {role:'worker',model:'gpt-5.5',effort:'low',outcome:'accepted',observed:null,evidence:[captured.reference]},
  ]};
  const result=await f.call('finish',input);
  expect(result.receipt.attempts.map((a:any)=>a.outcome)).toEqual(['accepted','blocked','accepted']);
  expect(result.receipt.attempts.slice(1).map((a:any)=>a.observed)).toEqual([{model:null,effort:null},{model:null,effort:null}]);
  expect(result.evidence_supported).toBe(true);
  const events=await f.events();expect((await f.call('finish',input)).receipt).toEqual(result.receipt);expect(await f.events()).toEqual(events);
  const bad=structuredClone(result.receipt);bad.attempts[1].outcome='unavailable';
  expect(()=>normalizeReceipt(bad)).toThrow('RECEIPT_V3_MALFORMED');
  await f.call('start',{run_id:'canonical'});
  await expect(f.call('record',{...bad,...f.delegated,run_id:'canonical',auto_capture:false})).rejects.toThrow('RECEIPT_V3_MALFORMED');
 }finally{await f.cleanup();}});
 it.each(['compact','full','null'])('rejects invalid %s attempt outcomes before writing any evidence',async shape=>{const f=await fixture({git:true});try{
  await f.call('start',{run_id:'a'});const events=await f.events(),files=await f.evidenceFiles();
  const a=shape!=='full'?{role:'worker',model:'gpt-5.5',effort:'low',outcome:shape==='null'?null:'invented'}:{...f.attempt('worker'),outcome:'unavailable'};
  await expect(f.call('finish',{run_id:'a',...f.delegated,coordinator:f.coordinator,acceptance:'accepted',relevant_checks_complete:true,attempts:[a],checks:[{name:'must not run',kind:'test',command:exit(0)}]})).rejects.toThrow('ATTEMPT_OUTCOME_INVALID');
  expect(await f.events()).toEqual(events);expect(await f.evidenceFiles()).toBe(files);
 }finally{await f.cleanup();}});
 it('runs commands once, snapshots the artifact, and derives support from captures and the clock',async()=>{const f=await fixture({git:true});try{
  await f.call('start',{run_id:'a'});
  const r=await f.call('finish',{run_id:'a',...direct,acceptance:'failed',checks:[{name:'ok',kind:'test',command:exit(0)},{name:'bad',kind:'test',command:exit(1)}]},at(5000));
  expect(r.receipt.checks.map((c:any)=>[c.outcome,c.asserted])).toEqual([['passed',false],['failed',false]]);
  const captures=await f.events('capture');
  for(const c of r.receipt.checks)expect(captures.map(e=>e.data.reference)).toContainEqual(c.evidence[0]);
  const coordinator=r.receipt.attempts.find((a:any)=>a.role==='coordinator'),snapshot=captures.find(e=>e.data.reference.digest===coordinator.evidence[0].digest);
  expect(JSON.parse(await readFile(snapshot.data.reference.path,'utf8'))).toMatchObject({kind:'artifact_snapshot',results:[{command:['git','status','--porcelain'],exit_code:0},{command:['git','diff'],exit_code:0}]});
  expect(r).toMatchObject({evidence_supported:true,reason:null});expect(r.receipt.elapsed_ms).toBe(5000);expect(r.receipt.schema_version).toBe('delegate_receipt.v3');
  await f.call('start',{run_id:'b'});
  expect((await f.call('finish',{run_id:'b',...direct,acceptance:'accepted',checks:[{name:'bad',kind:'test',command:exit(1)}]})).evidence_supported).toBe(false);
 }finally{await f.cleanup();}});
 it('reuses a mid-task capture by reference and never runs it again',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});
  const captured=await f.call('capture',{run_id:'a',command:exit(0)});const files=await f.evidenceFiles();
  const r=await f.call('finish',{run_id:'a',...direct,acceptance:'accepted',checks:[{name:'tests',kind:'test',reference:captured.reference}]});
  expect(r.receipt.checks[0]).toMatchObject({outcome:'passed',evidence:[captured.reference]});expect(await f.evidenceFiles()).toBe(files);
  await expect(f.call('finish',{run_id:'a',...direct,acceptance:'accepted',checks:[{name:'x',kind:'test',reference:{path:captured.reference.path,digest:sha('other')}}]})).resolves.toMatchObject({receipt:r.receipt});
  await f.call('start',{run_id:'b'});
  await expect(f.call('finish',{run_id:'b',...direct,acceptance:'accepted',checks:[{name:'x',kind:'test',reference:{path:captured.reference.path,digest:sha('other')}}]})).rejects.toThrow('CHECK_REFERENCE_UNKNOWN');
 }finally{await f.cleanup();}});
 it('keeps review verdicts asserted: no exit code can support them, and inspection never needs one',async()=>{const f=await fixture({git:true});try{
  await f.call('start',{run_id:'a'});
  await expect(f.call('finish',{run_id:'a',...direct,acceptance:'accepted',checks:[{name:'review',kind:'review',command:exit(0)}]})).rejects.toThrow('CHECK_KIND_INVALID');
  const r=await f.call('finish',{run_id:'a',...direct,acceptance:'failed',checks:[{name:'bad',kind:'test',command:exit(1)}],inspected:[{name:'review',kind:'review',outcome:'failed'}]});
  expect(r.receipt.checks[1]).toMatchObject({kind:'review',outcome:'failed',asserted:true});expect(r.receipt.checks[1].evidence).toEqual(r.receipt.attempts[0].evidence);
  expect(r.evidence_supported).toBe(true);
 }finally{await f.cleanup();}});
 it('requires a start, stays idempotent per run, and resolves routed attempts against the route',async()=>{const f=await fixture({host:'claude'});try{
  await expect(f.call('finish',{run_id:'none',...direct,acceptance:'accepted'})).rejects.toThrow('RUN_NOT_STARTED');
  await f.call('start',{run_id:'a'});
  const first=await f.call('finish',{run_id:'a',...direct,acceptance:'accepted',checks:[{name:'ok',kind:'test',command:exit(0)}]});
  const again=await f.call('finish',{run_id:'a',...direct,acceptance:'failed',checks:[{name:'ok',kind:'test',command:exit(1)}]},at(9000));
  expect(again.receipt).toEqual(first.receipt);expect(await f.events('capture')).toHaveLength(1);
  await f.call('start',{run_id:'d'});
  const routed={run_id:'d',...f.delegated,relevant_checks_complete:true,acceptance:'accepted',coordinator:f.coordinator,inspected:[{name:'review',kind:'review',outcome:'passed'}]};
  const r=await f.call('finish',{...routed,attempts:[{role:'worker',model:'claude-haiku-4-5-20251001',effort:'not_applicable'}]});
  expect(r.receipt.attempts[1]).toMatchObject({role:'worker',candidate_id:'claude-claude-haiku-4-5-20251001-not_applicable',candidate_identity:f.route.workers[0].candidate_identity,evidence_tier:'provisional',configured:{model:'claude-haiku-4-5-20251001',effort:'not_applicable'},outcome:'accepted'});
  expect(r.receipt.attempts[0]).toMatchObject({role:'coordinator',candidate_id:'claude-claude-opus-5-high'});
  await f.call('start',{run_id:'e'});
  await expect(f.call('finish',{...routed,run_id:'e',attempts:[{role:'worker',model:'unknown-model',effort:'low'}]})).rejects.toThrow('WORKER_NOT_IN_ROUTE');
  await expect(f.call('finish',{...routed,run_id:'e',attempts:[{role:'worker',model:'claude-sonnet-5',effort:'low'},{role:'reviewer',model:'claude-sonnet-5',effort:'low'}]})).rejects.toThrow('REVIEWER_NOT_IN_ROUTE');
 }finally{await f.cleanup();}});
 it('observes the host version from the binary on PATH and returns advice inline',async()=>{const f=await fixture();try{
  const stub=join(f.root,'codex-stub');await writeFile(stub,'#!/bin/sh\necho "codex-cli 0.154.0"\n',{mode:0o755});
  const {host_version:_omit,...input}=f.input;
  const observed=await runCommand('start',{...input,run_id:'a'},{...f.options,hostCommand:stub});
  expect(observed).toMatchObject({host_version:'0.154.0',host_version_source:'path_binary',host_version_raw:'codex-cli 0.154.0\n',advice:{status:'ok',modePreference:null}});
  expect(await runCommand('start',{...input,run_id:'b'},{...f.options,hostCommand:join(f.root,'missing-binary')})).toMatchObject({host_version:'unknown',host_version_source:'unknown'});
  expect(await f.call('start',{run_id:'c'})).toMatchObject({host_version:'1',host_version_source:'caller'});
  expect(readFileSync(helper,'utf8').split('\n')[1]).toContain('never launches a model');
 }finally{await f.cleanup();}});
 it('reads finish input from stdin',async()=>{const f=await fixture();try{
  const env={...process.env,DELEGATE_STATE_HOME:f.stateRoot},file=join(f.root,'start.json');await writeFile(file,JSON.stringify({...f.input,run_id:'a'}));
  expect(JSON.parse(spawnSync(process.execPath,[helper,'start',file],{encoding:'utf8',env}).stdout).status).toBe('started');
  const out=spawnSync(process.execPath,[helper,'finish','-'],{encoding:'utf8',env,input:JSON.stringify({...f.input,run_id:'a',...direct,acceptance:'accepted',relevant_checks_complete:false})});
  expect(out.status).toBe(0);expect(JSON.parse(out.stdout)).toMatchObject({status:'recorded',evidence_supported:expect.any(Boolean),receipt_path:expect.any(String),reason:null});
 }finally{await f.cleanup();}});
 it('returns bounded output tails with a verifying digest and bounds timeouts',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});
  const r=await f.call('capture',{run_id:'a',command:[process.execPath,'-e',"process.stdout.write('x'.repeat(10000))"],timeout_ms:600000});
  expect(r.stdout_tail).toHaveLength(4096);expect(r.signal).toBeNull();
  const bytes=await readFile(r.reference.path);expect(sha(bytes.toString())).toBe(r.reference.digest);expect(JSON.parse(bytes.toString()).stdout).toHaveLength(10000);
  await expect(f.call('capture',{run_id:'a',command:exit(0),timeout_ms:600001})).rejects.toThrow('CAPTURE_TIMEOUT_INVALID');
 }finally{await f.cleanup();}});
});
describe('receipt v3 and learning defaults',()=>{
 const exit=(code:number)=>[process.execPath,'-e',`process.exit(${code})`];
 const direct={mode:'direct',relevant_checks_complete:true,coordinator:{model:'claude-opus-5',effort:null,observed:null}};
 it('loads a v2 receipt and keeps it out of direct advice',async()=>{const f=await fixture({git:true});try{
  await f.call('start',{run_id:'a'});const v3=(await f.call('finish',{run_id:'a',...direct,acceptance:'accepted',checks:[{name:'ok',kind:'test',command:exit(0)}]})).receipt;
  const {guidance_digest,host_version_source,...rest}=v3;
  const v2={...rest,schema_version:'delegate_receipt.v2',run_id:'legacy',task_id:'legacy',checks:[],relevant_checks_complete:false};
  expect(normalizeReceipt(v2)['guidance_digest']).toBeUndefined();
  const value={id:'receipt:legacy',kind:'receipt',data:v2};await writeFile(join(f.stateBase,'events',`${digest('receipt:legacy').slice(7)}.json`),JSON.stringify({...value,content_digest:digest(value)})+'\n');
  expect((await f.call('status')).records).toBe(2);
  await f.call('start',{run_id:'next'});expect((await f.call('advise',{run_id:'next'})).reason).toContain('insufficient comparable evidence');
 }finally{await f.cleanup();}});
 it('requires configured effort only for routed attempts and rejects contradictions',async()=>{const f=await fixture({git:true});try{
  await f.call('start',{run_id:'a'});
  expect((await f.call('finish',{run_id:'a',...direct,acceptance:'accepted',checks:[{name:'ok',kind:'test',command:exit(0)}]})).evidence_supported).toBe(true);
  const worker=(effort:string|null)=>({...f.attempt('worker','w'),configured:{...f.attempt('worker','w').configured,effort}});
  const routed=(run_id:string,attempts:any[],coordinator:any=f.coordinator)=>({run_id,...f.delegated,relevant_checks_complete:true,acceptance:'accepted',coordinator,attempts,inspected:[{name:'review',kind:'review',outcome:'passed'}]});
  await f.call('start',{run_id:'b'});expect((await f.call('finish',routed('b',[worker(f.pack.treatments[f.route.workers[0].candidate_identity].effort)]))).evidence_supported).toBe(true);
  await f.call('start',{run_id:'c'});expect((await f.call('finish',routed('c',[worker(null)]))).evidence_supported).toBe(false);
  await f.call('start',{run_id:'d'});expect((await f.call('finish',routed('d',[worker('low')],{...f.coordinator,observed:{model:null,effort:'low'}}))).evidence_supported).toBe(false);
 }finally{await f.cleanup();}});
 it('never lets a signal-killed capture support a failed check',async()=>{const f=await fixture({git:true});try{
  await f.call('start',{run_id:'a'});
  const killed=await f.call('capture',{run_id:'a',command:[process.execPath,'-e','setTimeout(()=>{},5000)'],timeout_ms:200});
  expect(killed).toMatchObject({exit_code:null,signal:'SIGTERM'});expect((await f.events('capture'))[0].data.signal).toBe('SIGTERM');
  const r=await f.call('finish',{run_id:'a',...direct,acceptance:'failed',checks:[{name:'tests',kind:'test',reference:killed.reference}]});
  expect(r.receipt.checks[0].outcome).toBe('unverified');expect(r.evidence_supported).toBe(false);
 }finally{await f.cleanup();}});
 it('keys direct comparability on the guidance digest and delegated comparability on the pack',async()=>{const f=await fixture();try{
  const path=join(f.root,'usage.json'),bytes=JSON.stringify({direct:1,delegated:5});await writeFile(path,bytes);
  const usage=(value:number)=>({metric:'allowance',unit:'units',value,source:{path,digest:sha(bytes)},complete:true});
  const delegated=(run_id:string)=>({run_id,...f.record,...f.delegated,usage:usage(5),attempts:[f.attempt(),f.attempt('worker','w')],checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]});
  for(let n=0;n<5;n++){await f.call('start',{run_id:`d${n}`});await f.call('record',{run_id:`d${n}`,...f.record,usage:usage(1)},at(2000));await f.call('start',{run_id:`w${n}`});await f.call('record',delegated(`w${n}`),at(10000));}
  const second=repack(f.pack,p=>{p.generated_at=new Date(Date.parse(p.generated_at)-60000).toISOString();});
  await writeFile(join(f.skillRoot,'routing-pack.json'),JSON.stringify(second));expect(second.content_digest).not.toBe(f.pack.content_digest);
  await f.call('start',{run_id:'n1'});expect((await f.call('advise',{run_id:'n1'},at(60000))).reason).toContain('insufficient comparable evidence');
  for(let n=5;n<10;n++){await f.call('start',{run_id:`w${n}`});await f.call('record',delegated(`w${n}`),at(10000));}
  await f.call('start',{run_id:'n2'});expect((await f.call('advise',{run_id:'n2'},at(60000))).modePreference).toMatchObject({preferred:'direct',basis:'allowance:units'});
  await writeFile(join(f.skillRoot,'SKILL.md'),(await readFile(join(f.skillRoot,'SKILL.md'),'utf8'))+'\nchanged guidance\n');
  await f.call('start',{run_id:'n3'});expect((await f.call('advise',{run_id:'n3'},at(60000))).reason).toContain('insufficient comparable evidence');
 }finally{await f.cleanup();}});
 it('ignores dot-prefixed droppings but records a real mid-run folder change as unsupported and excluded',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});await writeFile(join(f.skillRoot,'.DS_Store'),'finder');
  expect(await f.call('record',{run_id:'a',...f.record})).toMatchObject({evidence_supported:true,reason:null});
  await f.call('start',{run_id:'b'});await writeFile(join(f.skillRoot,'new-file'),'changed');
  expect(await f.call('record',{run_id:'b',...f.record})).toMatchObject({status:'recorded',evidence_supported:false,reason:'skill_changed_during_run'});
  await rm(join(f.skillRoot,'new-file'));await f.call('start',{run_id:'next'});
  expect((await f.call('advise',{run_id:'next'})).reason).toContain('insufficient comparable evidence');
 }finally{await f.cleanup();}});
 it('never compares rows whose host versions came from different sources',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a',host_version:'0.154.0'});await f.call('record',{run_id:'a',...f.record,checks:[],relevant_checks_complete:false});
  await f.call('start',{run_id:'same',host_version:'0.154.0'});expect((await f.call('advise',{run_id:'same'})).reason).toContain('incomplete or unverified');
  const stub=join(f.root,'codex-stub');await writeFile(stub,'#!/bin/sh\necho "codex-cli 0.154.0"\n',{mode:0o755});const {host_version:_omit,...input}=f.input;
  expect((await runCommand('start',{...input,run_id:'observed'},{...f.options,hostCommand:stub})).advice.reason).toContain('insufficient comparable evidence');
 }finally{await f.cleanup();}});
 it('persists concurrent captures without a lock',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});
  const both=await Promise.all([0,1].map(()=>f.call('capture',{run_id:'a',command:exit(0)})));
  for(const r of both)expect(sha((await readFile(r.reference.path)).toString())).toBe(r.reference.digest);
  expect(await f.events('capture')).toHaveLength(2);expect(await f.evidenceFiles()).toBe(2);
 }finally{await f.cleanup();}});
 it('keeps a coordinator-verified delegated receipt supported under a qualified reviewer',async()=>{const f=await fixture();try{
  const qualified=repack(f.pack,p=>{const route=routeOf(p,'codex');p.treatments[route.reviewers[0].candidate_identity].provisional=null;for(const r of p.routes)for(const x of r.reviewers)if(x.candidate_identity===route.reviewers[0].candidate_identity){x.evidence_tier='qualified';x.task_evidence=null;}});
  const pack_path=join(f.root,'qualified.json');await writeFile(pack_path,JSON.stringify(qualified));
  await f.call('start',{run_id:'a'});
  const r=await f.call('record',{run_id:'a',...f.record,...f.delegated,pack_path,attempts:[{...f.attempt(),evidence_tier:'qualified'},f.attempt('worker','w')],checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]});
  expect(r.receipt.attempts[0]).toMatchObject({role:'coordinator',evidence_tier:'qualified'});expect(r.evidence_supported).toBe(true);
 }finally{await f.cleanup();}});
 it('rejects sparse arrays and matches the maintainer canonical digest',async()=>{const f=await fixture({git:true});try{
  expect(()=>digest([1,,,2])).toThrow('NON_JSON_VALUE');
  await f.call('start',{run_id:'a'});const receipt=(await f.call('finish',{run_id:'a',...direct,acceptance:'accepted',checks:[{name:'ok',kind:'test',command:exit(0)}]})).receipt;
  const {content_digest,...body}=pack;
  for(const value of [body,receipt,{a:'é 😀',b:[{c:null,d:[1,2.5,'\\u0000',false]}],z:{y:{x:'ü',w:[]}}}])expect(digest(value)).toBe(coreDigest(value));
  expect(digest(body)).toBe(content_digest);
 }finally{await f.cleanup();}});
});
describe('usage-based learning',()=>{
 it.each(['allowance','tokens','attributable_cost','missing','incomplete','mixed','api_equivalent'])('handles %s without using elapsed time',async metric=>{
  const f=await fixture();try {
   const path=join(f.root,'usage.json'),bytes=JSON.stringify({direct:100,delegated:10});await writeFile(path,bytes);
   for(let n=0;n<10;n++) {
    const delegated=n>=5,run_id=`usage-${n}`;await f.call('start',{run_id});
    const usage=metric==='missing'?null:{metric:metric==='incomplete'?'allowance':metric==='mixed'?(delegated?'tokens':'allowance'):metric,unit:'units',value:delegated?10:100,source:{path,digest:sha(bytes)},complete:metric!=='incomplete'};
    await f.call('record',{run_id,...f.record,...(delegated?{...f.delegated,attempts:[f.attempt(),f.attempt('worker','w')],checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]}:{}),usage},delegated?at(10000):at(1000));
   }
   await f.call('start',{run_id:'next'});const advice=await f.call('advise',{run_id:'next'},at(60000));
   if(['allowance','attributable_cost'].includes(metric))expect(advice.modePreference).toMatchObject({preferred:'delegated',basis:`${metric}:units`});else expect(advice.modePreference).toBeNull();
   if(metric==='allowance'){await rm(path);expect((await f.call('advise',{run_id:'next'},at(60000))).modePreference).toBeNull();}
  }finally{await f.cleanup();}
 });
});
describe('deterministic assignment routes',()=>{
 it.each(['codex','claude'])('selects existing routes and reports actual coverage for %s',async host=>{
  const mappings={locate_behavior:'repo_exploration',summarize_sources:'research',specified_edit:'mechanical_work',implement_feature:'bounded_implementation',implement_fix:'hard_debugging',implement_ui:'ui_implementation',implement_plan:'complex_implementation'};
  for(const [assignment,task_class] of Object.entries(mappings)) {
   const input={host,risk:'low',assignment},r=await routeAssignment(input,{now}),baseline=await lookup({host,risk:'low',task_class},{now});
   expect(r).toMatchObject({task_class,worker:baseline.workers[0],route:baseline.route,scope_match_required:true,host_verified:false,gap:null});
   expect(r.verification).toEqual({mode:'separate',reviewer:baseline.reviewers[0]});
  }
  const coverage=await routeAssignment({host,risk:'low'},{now});expect(coverage.coverage).toHaveLength(9);
  expect(coverage.coverage.find((r:any)=>r.assignment==='locate_behavior').scope).toContain('JavaScript/HTML');
  expect(coverage.coverage.find((r:any)=>r.assignment==='summarize_sources').scope).toContain('no web-research evaluation');
 });
 it('preserves fallback, host checks and coordinator review eligibility',async()=>{
  const input={host:'claude',risk:'low',assignment:'specified_edit'},r=await routeAssignment(input,{now});
  const retry=await routeAssignment({...input,failed_candidate_ids:[r.worker.candidate_id]},{now});expect(retry.worker.candidate_id).not.toBe(r.worker.candidate_id);
  expect((await routeAssignment({...input,host_treatments:[]},{now}))).toMatchObject({gap:'NO_ELIGIBLE_WORKER',worker:null,verification:null,host_verified:true});
  expect((await routeAssignment({...input,coordinator:{model:r.verification.reviewer.model,effort:r.verification.reviewer.effort}},{now})).verification).toEqual({mode:'coordinator'});
 });
 it('keeps unsupported assignments, scope and expiry explicit without state writes',async()=>{
  const f=await fixture();try {
   const input={host:'codex',risk:'low'};
   expect(await runCommand('route',{...input,assignment:'reproduce_failure'},f.options)).toMatchObject({gap:'INVESTIGATION_ROUTE_NOT_AVAILABLE',worker:null});
   expect(await routeAssignment({...input,assignment:'frontier_decision'},{now})).toMatchObject({gap:'FRONTIER_DECISION_REQUIRED'});
   expect(await routeAssignment({...input,assignment:'summarize_sources',research_kind:'live_web'},{now})).toMatchObject({gap:'LIVE_WEB_ROUTE_NOT_AVAILABLE'});
   expect(await routeAssignment({...input,risk:'high',assignment:'locate_behavior'},{now})).toMatchObject({gap:'ROUTE_NOT_FOUND',worker:null});
   await expect(routeAssignment({...input,assignment:'typo'},{now})).rejects.toThrow('ASSIGNMENT_UNKNOWN');
   await expect(routeAssignment({...input,assignment:'locate_behavior',task_class:'mechanical_work'},{now})).rejects.toThrow('ASSIGNMENT_CLASS_CONFLICT');
   await expect(routeAssignment({...input,assignment:'locate_behavior'},{now:f.pack.expires_at})).rejects.toThrow('PACK_EXPIRED_OR_NOT_YET_VALID');
   await runCommand('route',{...input,assignment:'locate_behavior'},f.options);
   await expect(readdir(f.stateRoot)).rejects.toMatchObject({code:'ENOENT'});
  }finally{await f.cleanup();}
 });
});
describe('session reminders',()=>{
 it('distinguishes qualitative judgment and host signals without claiming savings',()=>{
  expect(reminderDecision(reminder)).toMatchObject({suggest:true,basis:'qualitative_judgment',savings:null});
  expect(reminderDecision({...reminder,completed_context_dominates:false,signal:{kind:'compaction',source:'host-event',observed_at:now}})).toMatchObject({suggest:true,basis:'host_signal',savings:null});
  expect(reminderDecision({...reminder,completed_context_dominates:false,signal:{kind:'tokens',source:'host',observed_at:now,value:1000000}}).suggest).toBe(false);
 });
 it('treats missing safety flags as unknown',()=>{const {active_workers,...missing}=reminder;expect(reminderDecision(missing).suggest).toBe(false);});
 it.each(['active_workers','coupled_investigation','rediscovery_required'])('defers for %s',field=>expect(reminderDecision({...reminder,[field]:true}).suggest).toBe(false));
 it.each(['safe_boundary','remaining_work'])('requires %s',field=>expect(reminderDecision({...reminder,[field]:false}).suggest).toBe(false));
 it('honors explicit reminder frequency but never repeats the same milestone',()=>{const first=reminderDecision(reminder);expect(first.suggest).toBe(true);const prior=[{kind:'reminder',data:{session_id:'s',basis:first.basis,milestone_digest:digest({handoff,signal:null})}}];expect(reminderDecision({...reminder,max_per_session:2},prior).suggest).toBe(false);expect(reminderDecision({...reminder,max_per_session:2,handoff:{...handoff,next_action:'Different phase'}},prior).suggest).toBe(true);});
 it('requires complete handoff and rejects future/old telemetry',()=>{
  expect(reminderDecision({...reminder,handoff:{objective:'only'}}).suggest).toBe(false);
  for(const observed_at of [at(-140400000),at(32400000)])expect(reminderDecision({...reminder,completed_context_dominates:false,signal:{kind:'host_pressure',source:'host',observed_at}}).suggest).toBe(false);
 });
 it('persists once-per-session suppression, explicit response, and disabled preferences',async()=>{const f=await fixture();try{
  await f.call('start',{run_id:'a'});expect((await f.call('advise',{run_id:'a',reminder})).suggest).toBe(true);
  expect((await f.call('advise',{run_id:'a',reminder})).suggest).toBe(false);
  expect((await f.call('advise',{run_id:'a',reminder:{response:'dismissed'}})).reason).toBe('response_recorded');
  await f.call('disable',{target:'learning'});await f.call('start',{run_id:'still-remind',session_id:'still-remind'});expect((await f.call('advise',{run_id:'still-remind',reminder})).suggest).toBe(true);
  await f.call('disable',{target:'learning',enabled:true});await f.call('start',{run_id:'b',session_id:'new'});await f.call('disable',{target:'reminders'});
  expect((await f.call('advise',{run_id:'b',reminder})).suggest).toBe(false);
  expect((await f.call('status')).settings.learning).toBe(true);
 }finally{await f.cleanup();}});
});
