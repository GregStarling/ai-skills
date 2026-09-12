import {describe,it,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {auditTask,dispatchAssignment,runCommand,workRoutes,substantialTask,reviewRequirement} from '../../skills/delegate/scripts/local-learning.mjs';

// Synthetic host controls test selection, not real model capability or economics.
const workers={economy:{model:'test-economy',effort:'low'},standard:{model:'test-standard',effort:'medium'}};
const coordinator={model:'test-coordinator',effort:'high'},frontier={model:'test-frontier',effort:'high'};
const input={host:'codex',assignment:'locate_behavior',risk:'low',bounded:true,workers,scope:'routing/helper',task_id:'ordinary-fixture',phase:'execute' as const,coordinator,frontier,signals:{delegation_requested:true}};
describe('ordinary bounded dispatch',()=>{
 it.each(['codex','claude'])('supports routine worker assignments on %s without fixture qualification',host=>{
  for(const [assignment,tier] of Object.entries({locate_behavior:'economy',summarize_sources:'economy',specified_edit:'economy',implement_feature:'standard',implement_fix:'standard'})){
   expect(dispatchAssignment({...input,host,assignment,diagnosis_accepted:true})).toMatchObject({worker:workers[tier as keyof typeof workers],worker_tier:tier,qualification_authority:false,gap:null});
  }
  expect(dispatchAssignment({...input,host,assignment:'specified_edit',risk:'medium'}).worker).toEqual(workers.standard);
 });
 it('does not read a qualification pack or impose a repository/language ceiling',async()=>{
  const root=await mkdtemp(join(tmpdir(),'delegate-monorepo-'));
  try{
   await mkdir(join(root,'packages','api'),{recursive:true});
   await writeFile(join(root,'packages','api','index.ts'),'export const setting: number = 1;\n');
   const result=await runCommand('dispatch',{...input,cwd:root},{skillRoot:resolve('skills/delegate'),stateRoot:join(root,'state')});
   expect(result).toMatchObject({gap:null,worker:workers.economy,recent_outcomes:{tasks:0}});
   expect(await readdir(root)).toEqual(['packages']); // Dispatch is read-only.
   expect(await runCommand('dispatch',{...input,pack_path:join(root,'missing-pack.json')},{now:'2100-01-01T00:00:00Z'})).toMatchObject({gap:null,qualification_authority:false});
  }finally{await rm(root,{recursive:true,force:true});}
 });
 it.each([
  [{evidence_required:true},'USE_EVIDENCE_ROUTE'],

  [{bounded:false},'BOUND_ASSIGNMENT_FIRST'],
  [{assignment:'specified_edit',risk:'high'},'FRONTIER_RISK_REVIEW_REQUIRED'],
  [{assignment:'specified_edit',risk:'critical'},'FRONTIER_RISK_REVIEW_REQUIRED'],
  [{assignment:'frontier_decision'},'UNCLASSIFIED_REQUIRES_FRONTIER'],
  [{assignment:'implement_fix'},'ACCEPT_DIAGNOSIS_FIRST'],
  [{assignment:'implement_plan'},'WORK_TYPE_PLANNING'],
  [{workers:{}},'NO_AVAILABLE_WORKER'],
  [{assignment:'implement_feature',workers:{economy:workers.economy}},'NO_AVAILABLE_WORKER'],
  [{phase:'complete',independent_review:true},'CHEAP_REVIEWER_REQUIRED'],
 ])('stops at a real boundary: %j',(overrides,gap)=>{
  expect(dispatchAssignment({...input,...overrides})).toMatchObject({gap,worker:null});
 });
 it('excludes failed models and honors fresh independent review',()=>{
  expect(dispatchAssignment({...input,failed_models:[workers.economy.model]}).worker).toEqual(workers.standard);
  expect(dispatchAssignment({...input,failed_models:Object.values(workers).map(w=>w.model)}).worker).toBeNull();
  expect(dispatchAssignment({...input,independent_review:true,cheap_reviewer:coordinator}).verification).toEqual({mode:'separate',reviewer:coordinator,fresh_context:true});
 });
 it.each([{host:'unknown'},{risk:'unknown'},{assignment:'typo'},{workers:{economy:{model:'guessed'}}},{failed_models:'model'},{evidence_required:'true'},{independent_review:'true'},{signals:{no_progress_attempts:-1}}])('rejects malformed controls %j',overrides=>{
  expect(()=>dispatchAssignment({...input,...overrides})).toThrow();
 });
 it('keeps information direct and makes implemented-behavior review explicit',()=>{
  expect(dispatchAssignment({...input,signals:{}})).toMatchObject({outcome:'direct',worker:null,gap:null});
  expect(dispatchAssignment({...input,phase:'complete',substantial:true,signals:{}})).toMatchObject({outcome:'direct',review_requirement:{role:'none'}});
  const packet={...input,assignment:'implement_feature',phase:'complete',signals:{}};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'review',verification:{mode:'separate',reviewer:frontier,fresh_context:true}});
  const artifact_digest='sha256:'+'a'.repeat(64),review={verdict:'PASS',fresh_context:true,...frontier,artifact_digest};
  expect(dispatchAssignment({...packet,artifact_digest,review})).toMatchObject({outcome:'direct',review_verified:true});
  expect(dispatchAssignment({...packet,artifact_digest,review:{...review,artifact_digest:'sha256:'+'b'.repeat(64)}})).toMatchObject({outcome:'review',gap:'REVIEW_ARTIFACT_MISMATCH'});
 });
 it('returns empty worker history for a direct decision',async()=>{
  const root=await mkdtemp(join(tmpdir(),'delegate-direct-history-'));
  try{expect(await runCommand('dispatch',{...input,cwd:root,signals:{}},{stateRoot:join(root,'state')})).toMatchObject({outcome:'direct',worker:null,recent_outcomes:{tasks:0}});}
  finally{await rm(root,{recursive:true,force:true});}
 });
 it('escalates decisive signals and separates host, permission, and limit blocks',()=>{
  for(const [signals,gap] of [[{conflicting_evidence:true},'CONFLICTING_EVIDENCE'],[{architecture:true},'ARCHITECTURE_DECISION_REQUIRED'],[{consequential_action:true},'CONSEQUENTIAL_ACTION_REQUIRES_FRONTIER'],[{capability_failure:true},'CAPABILITY_FAILURE_REQUIRES_FRONTIER'],[{no_progress_attempts:2},'NO_PROGRESS_ESCALATION_REQUIRED']])expect(dispatchAssignment({...input,assignment:'specified_edit',signals})).toMatchObject({outcome:'escalate',gap});
  for(const [signals,gap] of [[{delegation_requested:true,host_available:false},'HOST_UNAVAILABLE'],[{delegation_requested:true,permission_granted:false},'PERMISSION_REQUIRED'],[{delegation_requested:true,limit_available:false},'HOST_LIMIT_REACHED']])expect(dispatchAssignment({...input,signals})).toMatchObject({outcome:'blocked',gap});
 });
 it('uses a stable task-id audit and only exposes old dispatch through legacy:true',()=>{
  const first=dispatchAssignment({...input,task_id:'same-id'}),again=dispatchAssignment({...input,task_id:'same-id'});
  expect(first.audit).toEqual(again.audit);
  expect(dispatchAssignment({...input,coordinator:undefined,frontier:undefined})).toMatchObject({outcome:'blocked',gap:'COORDINATOR_REQUIRED'});
  expect(dispatchAssignment({host:'codex',assignment:'locate_behavior',risk:'low',bounded:true,workers,legacy:true})).toMatchObject({worker:workers.economy,gap:null});
 });
});

describe('one-call investigation feedback',()=>{
 it('persists failures without telemetry or receipts, surfaces them narrowly, and respects disable/reset',async()=>{
  const root=await mkdtemp(join(tmpdir(),'delegate-observe-'));
  try{
   const options={stateRoot:join(root,'state'),now:'2026-09-11T12:00:00Z'};
   const observation={...input,cwd:root,task_id:'investigation-1',mode:'delegated',worker:workers.economy,acceptance:'failed',checks:'failed',repairs:1,usage:null};
   expect(await runCommand('observe',observation,options)).toEqual({status:'observed',qualification_authority:false});
   await runCommand('observe',observation,{...options,now:'2026-09-11T12:01:00Z'});
   expect(await runCommand('status',observation,options)).toMatchObject({observations:1,records:0});
   expect(await runCommand('dispatch',observation,options)).toMatchObject({recent_outcomes:{tasks:1,failures:1,repairs:1},worker:workers.economy});
   expect((await runCommand('dispatch',{...observation,scope:'other'},options)).recent_outcomes.tasks).toBe(1);
   expect((await runCommand('dispatch',{...observation,assignment:'summarize_sources'},options)).recent_outcomes.tasks).toBe(0);
   expect((await runCommand('dispatch',{...observation,host:'claude'},options)).recent_outcomes.tasks).toBe(0);
   expect((await runCommand('dispatch',{...observation,workers:{economy:{...workers.economy,effort:'high'}}},options)).recent_outcomes.tasks).toBe(0);
   expect((await runCommand('dispatch',observation,{...options,now:'2026-10-12T12:00:00Z'})).recent_outcomes.tasks).toBe(0);
   await expect(runCommand('observe',{...observation,repairs:2},options)).rejects.toThrow('EVENT_CONFLICT');
   await expect(runCommand('observe',{...observation,task_id:'bad',acceptance:'accepted'},options)).rejects.toThrow('ACCEPTANCE_REQUIRES_CHECKS');
   await runCommand('disable',observation,options);
   expect(await runCommand('observe',{...observation,task_id:'disabled'},options)).toEqual({status:'disabled'});
   expect((await runCommand('dispatch',observation,options)).recent_outcomes.tasks).toBe(0);
   await runCommand('reset',observation,options);
   expect(await runCommand('status',observation,options)).toMatchObject({observations:0,records:0});
  }finally{await rm(root,{recursive:true,force:true});}
 });
 it('accepts source-verified investigation without a command or scope label and retains history through guidance edits',async()=>{
  const root=await mkdtemp(join(tmpdir(),'delegate-source-check-'));
  try{
   const skillRoot=join(root,'skill');await mkdir(skillRoot);
   await writeFile(join(skillRoot,'SKILL.md'),'Initial guidance\n');
   const options={stateRoot:join(root,'state'),skillRoot,now:'2026-09-11T12:00:00Z'};
   const observation={...input,scope:undefined,cwd:root,task_id:'sources-verified',mode:'delegated',worker:workers.economy,acceptance:'accepted',checks:'passed',repairs:0};
   await runCommand('observe',observation,options); // Source inspection: no command, capture, start or receipt.
   await runCommand('observe',{...observation,task_id:'old-failure',acceptance:'failed',checks:'failed',scope:'a legacy label'},options);
   await writeFile(join(skillRoot,'SKILL.md'),'Revised guidance\n');
   await runCommand('observe',observation,options); // Replay preserves original provenance, not a new sample.
   expect(await runCommand('status',observation,options)).toMatchObject({observations:2,records:0});
   expect(await runCommand('dispatch',{...observation,scope:'different session label'},options)).toMatchObject({recent_outcomes:{tasks:2,failures:1,repairs:0}});
   await expect(runCommand('observe',{...observation,task_id:'unchecked',checks:'unverified'},options)).rejects.toThrow('ACCEPTANCE_REQUIRES_CHECKS');
   expect((await runCommand('dispatch',observation,{...options,now:'2026-09-10T12:00:00Z'})).recent_outcomes.tasks).toBe(0);
   const other=join(root,'other-project');await mkdir(other);
   expect((await runCommand('dispatch',{...observation,cwd:other},options)).recent_outcomes.tasks).toBe(0);
  }finally{await rm(root,{recursive:true,force:true});}
 });
 it('uses existing canonical repository identity across package directories and Git worktrees',async()=>{
  const root=await mkdtemp(join(tmpdir(),'delegate-worktree-feedback-'));
  try{
   const repo=join(root,'repo'),worktree=join(root,'worktree');await mkdir(repo);
   const git=(...args:string[])=>{const r=spawnSync('git',args,{cwd:repo,encoding:'utf8'});expect(r.status,r.stderr).toBe(0);};
   git('init');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','--allow-empty','-m','fixture');
   git('worktree','add','--detach',worktree);
   const packageDir=join(worktree,'packages','api');await mkdir(packageDir,{recursive:true});
   const options={stateRoot:join(root,'state'),now:'2026-09-11T12:00:00Z'};
   const observation={...input,cwd:repo,task_id:'shared-history',mode:'delegated',worker:workers.economy,acceptance:'failed',checks:'failed',repairs:1};
   await runCommand('observe',observation,options);
   expect(await runCommand('dispatch',{...input,cwd:packageDir,scope:undefined},options)).toMatchObject({recent_outcomes:{tasks:1,failures:1,repairs:1}});
 }finally{await rm(root,{recursive:true,force:true});}
 });
 it('requires a fresh actual frontier PASS for accepted substantial v2 observations',async()=>{
  const root=await mkdtemp(join(tmpdir(),'delegate-v2-observe-'));
  try{
   const options={stateRoot:join(root,'state'),now:'2026-09-11T12:00:00Z'};
   const attempts=[{role:'reviewer' as const,model:frontier.model,effort:frontier.effort,status:'accepted' as const,observed_model:null}];
   const artifact_digest='sha256:'+ 'a'.repeat(64);
   const base={...input,cwd:root,artifact_digest,frontier,task_id:'substantial',mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0,usage:null,observation_version:2,substantial:true,coordinator,attempts,elapsed_ms:10};
   await expect(runCommand('observe',base,options)).rejects.toThrow('FRESH_FRONTIER_REVIEW_REQUIRED');
   await expect(runCommand('observe',{...base,review:{verdict:'PASS',fresh_context:true,model:frontier.model,effort:frontier.effort,artifact_digest}},options)).resolves.toEqual({status:'observed',qualification_authority:false});
   await expect(runCommand('observe',{...base,review:{verdict:'PASS',fresh_context:false,model:frontier.model,effort:frontier.effort,artifact_digest}},options)).rejects.toThrow('FRESH_FRONTIER_REVIEW_REQUIRED');
   await expect(runCommand('observe',{...base,review:{verdict:'REPAIR',fresh_context:true,model:frontier.model,effort:frontier.effort,artifact_digest}},options)).rejects.toThrow('FRESH_FRONTIER_REVIEW_REQUIRED');
   expect((await runCommand('dispatch',{...input,cwd:root},options)).recent_outcomes.tasks).toBe(0);
  }finally{await rm(root,{recursive:true,force:true});}
 });
});

it('packaging rejects orphaned guidance, including unreachable cycles',async()=>{
 const root=await mkdtemp(join(tmpdir(),'delegate-reachability-'));
 try{
  await cp(resolve('skills'),join(root,'skills'),{recursive:true});
  await mkdir(join(root,'docs'));
  await cp(resolve('docs/validation-status.md'),join(root,'docs/validation-status.md'));
  const orphan=join(root,'skills/delegate/orphan.md');
  await writeFile(orphan,'[Self](orphan.md)\n');
  const result=spawnSync(process.execPath,['scripts/verify/skills.mjs'],{cwd:resolve('.'),encoding:'utf8',env:{...process.env,SKILLS_ROOT:root}});
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Unreachable consumer guidance: orphan.md');
  const entry=join(root,'skills/delegate/SKILL.md');
  await rm(orphan);
  await writeFile(entry,(await readFile(entry,'utf8')).replace('[context discipline](context-discipline.md)','the context guide'));
  const removed=spawnSync(process.execPath,['scripts/verify/skills.mjs'],{cwd:resolve('.'),encoding:'utf8',env:{...process.env,SKILLS_ROOT:root}});
  expect(removed.stderr).toContain('Unreachable consumer guidance: context-discipline.md');
 }finally{await rm(root,{recursive:true,force:true});}
});

it('enforces simple audits and user restrictions before any required launch',()=>{
 let task_id=''; for(let i=0;i<100;i++)if(auditTask('audit-'+i)){task_id='audit-'+i;break;}
 expect(task_id).not.toBe('');
 const base={...input,assignment:'specified_edit',task_id,phase:'complete',substantial:false,signals:{}};
 expect(dispatchAssignment(base)).toMatchObject({outcome:'review'});
 expect(dispatchAssignment({...base,delegation_forbidden:true})).toMatchObject({outcome:'blocked',gap:'DELEGATION_FORBIDDEN'});
 expect(dispatchAssignment({...input,assignment:'specified_edit',signals:{architecture:true},delegation_forbidden:true})).toMatchObject({outcome:'blocked',gap:'DELEGATION_FORBIDDEN'});
 expect(dispatchAssignment({...input,signals:{permission_granted:false},substantial:false})).toMatchObject({outcome:'direct'});
});
it('accepts completed high-risk and frontier-decision work without relabeling risk',()=>{
 const artifact_digest='sha256:'+'a'.repeat(64),review={verdict:'PASS',fresh_context:true,...frontier,artifact_digest};
 for(const extra of [{risk:'high'},{risk:'critical'},{assignment:'frontier_decision'}])expect(dispatchAssignment({...input,assignment:'implement_feature',...extra,phase:'complete',artifact_digest,review,signals:{}})).toMatchObject({outcome:'direct',review_verified:true});
});
it('prescribes frontier planning, critical design and hard bugs before any fallback',()=>{
 for(const work_type of ['planning','critical_ui_ux','hard_bug']){
  const base={...input,work_type,signals:{},fallback_route:'coordinator',routing_reason:'I could do it'};
  expect(dispatchAssignment(base)).toMatchObject({outcome:'escalate',route:{destination:'frontier',basis:'prescribed'}});
  expect(dispatchAssignment({...base,delegation_forbidden:true})).toMatchObject({outcome:'blocked',gap:'DELEGATION_FORBIDDEN'});
 }
 expect(dispatchAssignment({...input,work_type:'approved_execution',signals:{}})).toMatchObject({outcome:'blocked',gap:'ACCEPTED_DECISION_EVIDENCE_REQUIRED'});
 expect(dispatchAssignment({...input,work_type:'other',signals:{}})).toMatchObject({outcome:'escalate',route:{rule:'UNCLASSIFIED_REQUIRES_FRONTIER'}});
 expect(dispatchAssignment({...input,work_type:'other',fallback_route:'coordinator',routing_reason:'A bounded conversion with exact acceptance checks',signals:{}})).toMatchObject({outcome:'direct',route:{basis:'coordinator_choice'}});
});

it('covers every prescribed route, blocks unavailable frontier and prevents simple-label downgrades',()=>{
 for(const [work_type,destination] of Object.entries(workRoutes)){
  if(work_type==='approved_execution')continue;
  const packet={...input,work_type,signals:{},substantial:false};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:destination==='frontier'?'escalate':'direct',route:{destination,basis:'prescribed'}});
  if(destination==='frontier'){
   expect(dispatchAssignment({...packet,frontier:undefined})).toMatchObject({outcome:'blocked',gap:'FRONTIER_REQUIRED'});
   expect(dispatchAssignment({...packet,signals:{permission_granted:false}})).toMatchObject({outcome:'blocked',gap:'PERMISSION_REQUIRED'});
   expect(dispatchAssignment({...packet,phase:'complete'})).toMatchObject({outcome:'direct',review_requirement:{role:'none'}});
  }
 }
 for(const work_type of ['routine_fix','routine_implementation','substantial_refactor','regression_test']){
  expect(substantialTask({work_type,substantial:false})).toBe(true);
  expect(dispatchAssignment({...input,work_type,substantial:false,signals:{},phase:'complete'})).toMatchObject({outcome:'review'});
 }
 expect(()=>dispatchAssignment({...input,work_type:'unrecognized'})).toThrow('WORK_TYPE_INVALID');
 expect(()=>dispatchAssignment({...input,work_type:'other',fallback_route:'guess'})).toThrow('FALLBACK_ROUTE_INVALID');
 expect(dispatchAssignment({...input,work_type:'other',fallback_route:'coordinator',routing_reason:'',signals:{}}).outcome).toBe('escalate');
});

it('keeps the assignment review floor even with a contradictory mechanical label',async()=>{
 const packet={...input,assignment:'implement_fix',work_type:'mechanical_edit',substantial:false,signals:{},phase:'complete'};
 expect(dispatchAssignment(packet)).toMatchObject({outcome:'review'});
 const root=await mkdtemp(join(tmpdir(),'delegate-fix-floor-'));
 try{await expect(runCommand('observe',{...packet,cwd:root,observation_version:2,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0},{stateRoot:join(root,'state')})).rejects.toThrow('FRESH_FRONTIER_REVIEW_REQUIRED');}finally{await rm(root,{recursive:true,force:true});}
});

it('discovers mechanical work independently of whether a worker is useful',async()=>{
 const skill=await readFile(resolve('skills/delegate/SKILL.md'),'utf8');
 const description=skill.split('\n').find(line=>line.startsWith('description:'))!;
 expect(description).toContain('mechanical edits');expect(description).toMatch(/routing(?: and |\/)audit decision/);
 expect(skill).toContain('scripts/local-learning.mjs complete -');
});
