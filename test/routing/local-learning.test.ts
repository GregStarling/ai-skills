import {describe,it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm,mkdir,cp,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {runCommand,digest,normalizeReceipt,reminderDecision,folderDigest,projectIdentity} from '../../skills/delegate/scripts/local-learning.mjs';
const now='2026-09-10T16:00:00.000Z';
const sha=(v:string)=>`sha256:${createHash('sha256').update(v).digest('hex')}`;
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'delegate-learning-')),stateRoot=join(root,'state'),skillRoot=join(root,'skill'),cwd=join(root,'project');
 await mkdir(cwd);await cp(resolve('skills/delegate'),skillRoot,{recursive:true});
 const evidence=join(root,'check.txt');await writeFile(evidence,'captured check output');
 const ref={path:evidence,digest:sha('captured check output')};
 const options={stateRoot,skillRoot,now};
 const input={cwd,host:'codex',host_version:'1',session_id:'session',task_class:'mechanical_work',risk:'low',scope:'quantity-default',research_kind:null};
 const pack=JSON.parse(await readFile(join(skillRoot,'routing-pack.json'),'utf8'));
 const route=pack.routes.find((r:any)=>r.public_task_class==='mechanical_work'&&r.stratum.provisional_scope?.includes('codex'));
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
 return {root,stateRoot,skillRoot,cwd,evidence,ref,input,options,call,attempt,record,cleanup:()=>rm(root,{recursive:true,force:true})};
}
const handoff={objective:'Implement agreed fix',constraints:[],decisions:['Fix the default'],checkout_state:'Isolated branch; baseline checked',completed_checks:['Reproduction'],evidence_locations:['/tmp/repro'],next_action:'Implement fix',unresolved_risks:[]};
const reminder={session_id:'s',session_started_at:'2026-09-10T15:00:00Z',now,safe_boundary:true,remaining_work:true,active_workers:false,coupled_investigation:false,rediscovery_required:false,completed_context_dominates:true,next_phase_independent:true,handoff};
describe('portable local feedback',()=>{
 it('captures canonical direct receipts, immutable idempotent runs, corrections and raw export',async()=>{const f=await fixture();try{
  const start=await f.call('start',{run_id:'a'});expect((await f.call('start',{run_id:'a'})).run_id).toBe(start.run_id);
  const r=await f.call('record',{run_id:'a',...f.record},'2026-09-10T16:00:05.000Z');
  expect(r.evidence_supported).toBe(true);expect(normalizeReceipt(JSON.parse(await readFile(r.receipt_path,'utf8')))['run_id']).toBe('a');
  expect((await f.call('record',{run_id:'a',...f.record},'2026-09-10T16:00:06.000Z')).receipt.completed_at).toBe(r.receipt.completed_at);
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
 it('preserves fallback attempts, requires pack binding and rejects changed skill folders',async()=>{const f=await fixture();try{
  const pack=JSON.parse(await readFile(join(f.skillRoot,'routing-pack.json'),'utf8'));
  const route=pack.routes.find((r:any)=>r.public_task_class==='mechanical_work'&&r.stratum.provisional_scope?.includes('codex'));
  await f.call('start',{run_id:'a'});
  const failed={...f.attempt('worker','failed'),outcome:'failed'}, fallback=f.attempt('worker','fallback');
  const args={run_id:'a',...f.record,mode:'delegated',pack_path:join(f.skillRoot,'routing-pack.json'),stratum_digest:route.stratum_digest,attempts:[f.attempt(),failed,fallback],checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]};
  const r=await f.call('record',args);expect(r.receipt.attempts).toHaveLength(3);expect(r.receipt.pack_content_digest).toBe(pack.content_digest);
  await f.call('start',{run_id:'b'});await writeFile(join(f.skillRoot,'new-file'),'changed');
  await expect(f.call('record',{run_id:'b',...f.record})).rejects.toThrow('SKILL_CHANGED');
 }finally{await f.cleanup();}});
 it('learns only after five comparable supported tasks per option and invalidates corrections',async()=>{const f=await fixture();try{
  const pack=JSON.parse(await readFile(join(f.skillRoot,'routing-pack.json'),'utf8')),route=pack.routes.find((r:any)=>r.public_task_class==='mechanical_work'&&r.stratum.provisional_scope?.includes('codex'));
  for(let n=0;n<10;n++){
   const delegated=n>=5,run_id=`r${n}`;await f.call('start',{run_id});
   await f.call('record',{run_id,...f.record,...(delegated?{mode:'delegated',pack_path:join(f.skillRoot,'routing-pack.json'),stratum_digest:route.stratum_digest,attempts:[f.attempt(),f.attempt('worker','w')],checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]}:{})},delegated?'2026-09-10T16:00:10.000Z':'2026-09-10T16:00:02.000Z');
   if(n===8){await f.call('start',{run_id:'early'});expect((await f.call('advise',{run_id:'early'},'2026-09-10T16:01:00Z')).modePreference).toBeNull();}
  }
  await f.call('start',{run_id:'next'});
  const advice=await f.call('advise',{run_id:'next'},'2026-09-10T16:01:00Z');expect(advice.modePreference.preferred).toBe('direct');expect(advice.modePreference.basis).toBe('elapsed_time_proxy');
  await f.call('correct',{run_id:'r0',event_id:'c',reason:'missed test'});
  expect((await f.call('advise',{run_id:'next'},'2026-09-10T16:01:00Z')).modePreference.preferred).toBe('delegated');
  await f.call('start',{run_id:'bad'});await f.call('record',{run_id:'bad',...f.record,acceptance:'failed',checks:[],relevant_checks_complete:false});
  expect((await f.call('advise',{run_id:'next'},'2026-09-10T16:01:00Z')).reason).toContain('incomplete or unverified');
  await f.call('start',{run_id:'other-scope',scope:'different'});expect((await f.call('advise',{run_id:'other-scope'})).modePreference).toBeNull();
 }finally{await f.cleanup();}});
 it('rejects wrong routed settings and never credits a replacement repair to the original worker',async()=>{const f=await fixture();try{
  const pack=JSON.parse(await readFile(join(f.skillRoot,'routing-pack.json'),'utf8')),route=pack.routes.find((r:any)=>r.public_task_class==='mechanical_work'&&r.stratum.provisional_scope?.includes('codex'));
  const second=route.workers[1], t=pack.treatments[second.candidate_identity];
  const replacement={...f.attempt('worker','replacement'),candidate_id:second.candidate_id,candidate_identity:second.candidate_identity,evidence_tier:second.evidence_tier,configured:{model:t.snapshot_id??t.model_id,effort:t.effort}};
  const delegated={...f.record,mode:'delegated',pack_path:join(f.skillRoot,'routing-pack.json'),stratum_digest:route.stratum_digest,checks:[...f.record.checks,{...f.record.checks[0],kind:'review'}]};
  await f.call('start',{run_id:'wrong',scope:'wrong-test'});
  expect((await f.call('record',{...delegated,run_id:'wrong',attempts:[f.attempt(),{...f.attempt('worker','w'),configured:{model:'WRONG',effort:'WRONG'}}]})).evidence_supported).toBe(false);
  for(let n=0;n<10;n++){
   const run_id=`repair${n}`;await f.call('start',{run_id});
   const attempts=n<5?[f.attempt(),{...f.attempt('worker','original'),outcome:'failed'},{...replacement,role:'repair'}]:[f.attempt(),{...replacement,outcome:'failed'}];
   await f.call('record',{...delegated,run_id,attempts,acceptance:n<5?'accepted':'failed'},n<5?'2026-09-10T16:00:01Z':'2026-09-10T16:00:02Z');
  }
  await f.call('start',{run_id:'next'});expect((await f.call('advise',{run_id:'next',stratum_digest:route.stratum_digest},'2026-09-10T16:01:00Z')).workerPreference).toBeNull();
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
 it('ignores interrupted temp writes, detects corruption, and falls back on storage failures',async()=>{const f=await fixture();try{
  const start=await f.call('start',{run_id:'a'}),base=join(f.stateRoot,start.project_id.slice(7),'codex'),dir=join(base,'events');
  await writeFile(join(dir,'.pending-interrupted'),'partial');expect((await f.call('status')).records).toBe(0);
  await mkdir(join(base,'.lock'));await expect(f.call('status')).rejects.toThrow('STATE_BUSY');await rm(join(base,'.lock'),{recursive:true});
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
  for(const observed_at of ['2026-09-09T01:00:00Z','2026-09-11T01:00:00Z'])expect(reminderDecision({...reminder,completed_context_dominates:false,signal:{kind:'host_pressure',source:'host',observed_at}}).suggest).toBe(false);
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
