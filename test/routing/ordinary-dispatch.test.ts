import {describe,it,expect} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,cp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {dispatchAssignment,runCommand} from '../../skills/delegate/scripts/local-learning.mjs';

// Synthetic host controls test selection, not real model capability or economics.
const workers={economy:{model:'test-economy',effort:'low'},standard:{model:'test-standard',effort:'medium'}};
const input={host:'codex',assignment:'locate_behavior',risk:'low',bounded:true,workers,scope:'routing/helper'};
describe('ordinary bounded dispatch',()=>{
 it.each(['codex','claude'])('supports feature/tweak/bug workflows on %s without fixture qualification',host=>{
  for(const [assignment,tier] of Object.entries({locate_behavior:'economy',summarize_sources:'economy',specified_edit:'economy',reproduce_failure:'standard',implement_feature:'standard',implement_fix:'standard',implement_ui:'standard',implement_plan:'standard'})){
   expect(dispatchAssignment({...input,host,assignment,diagnosis_accepted:true,plan_settled:true})).toMatchObject({worker:workers[tier as keyof typeof workers],worker_tier:tier,qualification_authority:false,gap:null});
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
  [{research_kind:'live_web'},'LIVE_DISCOVERY_REQUIRES_SCOPED_HOST_ASSIGNMENT'],
  [{bounded:false},'BOUND_ASSIGNMENT_FIRST'],
  [{risk:'high'},'FRONTIER_RISK_REVIEW_REQUIRED'],
  [{risk:'critical'},'FRONTIER_RISK_REVIEW_REQUIRED'],
  [{assignment:'frontier_decision'},'FRONTIER_DECISION_REQUIRED'],
  [{assignment:'implement_fix'},'ACCEPT_DIAGNOSIS_FIRST'],
  [{assignment:'implement_plan'},'SETTLE_INTERFACES_FIRST'],
  [{workers:{}},'NO_AVAILABLE_WORKER'],
  [{assignment:'implement_feature',workers:{economy:workers.economy}},'NO_AVAILABLE_WORKER'],
  [{independent_review:true},'INDEPENDENT_REVIEWER_REQUIRED'],
  [{independent_review:true,reviewer:workers.economy},'INDEPENDENT_REVIEWER_REQUIRED'],
 ])('stops at a real boundary: %j',(overrides,gap)=>{
  expect(dispatchAssignment({...input,...overrides})).toMatchObject({gap,worker:null});
 });
 it('excludes failed models and honors fresh independent review',()=>{
  expect(dispatchAssignment({...input,failed_models:[workers.economy.model]}).worker).toEqual(workers.standard);
  expect(dispatchAssignment({...input,failed_models:Object.values(workers).map(w=>w.model)}).worker).toBeNull();
  const reviewer={model:'test-frontier',effort:'high'};
  expect(dispatchAssignment({...input,independent_review:true,reviewer}).verification).toEqual({mode:'separate',reviewer,fresh_context:true});
 });
 it.each([{host:'unknown'},{risk:'unknown'},{assignment:'typo'},{workers:{economy:{model:'guessed'}}},{failed_models:'model'},{evidence_required:'true'},{independent_review:'true'}])('rejects malformed controls %j',overrides=>{
  expect(()=>dispatchAssignment({...input,...overrides})).toThrow();
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
  await writeFile(entry,(await readFile(entry,'utf8')).replace('[context-discipline.md](context-discipline.md)','the context guide'));
  const removed=spawnSync(process.execPath,['scripts/verify/skills.mjs'],{cwd:resolve('.'),encoding:'utf8',env:{...process.env,SKILLS_ROOT:root}});
  expect(removed.stderr).toContain('Unreachable consumer guidance: context-discipline.md');
 }finally{await rm(root,{recursive:true,force:true});}
});
