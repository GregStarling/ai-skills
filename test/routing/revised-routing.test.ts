import {describe,it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm,readdir,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditTask,artifactDigest,dispatchAssignment,reviewRequirement,reviewPolicyInput,runCommand} from '../../skills/delegate/scripts/local-learning.mjs';

const coordinator={model:'terra-test',effort:'medium'},frontier={model:'astra-test',effort:'high'};
const base={host:'codex',assignment:'summarize_sources',work_type:'research',risk:'low',task_id:'ordinary-fixture',coordinator,frontier,bounded:true,substantial:true};
const ref=(path:string,content:string)=>({path,digest:'sha256:'+createHash('sha256').update(content).digest('hex')});
const auditId=Array.from({length:100},(_,i)=>'audit-'+i).find(auditTask)!;
const attempt=(role:string,selection=frontier)=>({role,...selection,status:'accepted',observed_model:selection.model});
const pass=(artifact_digest:string,selection=frontier)=>({verdict:'PASS',fresh_context:true,...selection,artifact_digest});

async function fixture(run:(root:string,evidence:{path:string;digest:string},artifacts:{artifact_digest:string;files:Record<string,string>})=>Promise<void>){
 const root=await mkdtemp(join(tmpdir(),'delegate-policy-v3-'));
 try{await writeFile(join(root,'answer.txt'),'checked answer');await run(root,ref('answer.txt','checked answer'),await artifactDigest(root,['answer.txt']));}
 finally{await rm(root,{recursive:true,force:true});}
}

describe('deterministic execution and review policy',()=>{
 it.each(['research','pdf_analysis','source_synthesis','source_lookup','conflicting_evidence'])('%s never auto-escalates because of substance, conflicting sources, risk or frontier availability',work_type=>{
  const packet={...base,work_type,frontier:undefined,risk:'critical',signals:{conflicting_evidence:true,host_available:false,limit_available:false}};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'direct',review_requirement:{role:'none',reason:'SOURCE_CHECKS'}});
  expect(dispatchAssignment({...packet,phase:'complete'})).toMatchObject({outcome:'direct'});
 });
 it.each(['research','pdf_analysis'])('%s gets a cheap fresh sampled audit and no frontier self-substitution',work_type=>{
  const packet={...base,work_type,task_id:auditId,phase:'complete',cheap_reviewer:coordinator};
  expect(reviewRequirement(packet)).toEqual({role:'economy',required:true,reason:'INDEPENDENT_INFORMATION_AUDIT'});
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'review',verification:{reviewer:coordinator,fresh_context:true}});
  expect(dispatchAssignment({...packet,frontier:undefined})).toMatchObject({outcome:'review'});
  expect(dispatchAssignment({...packet,cheap_reviewer:undefined})).toMatchObject({gap:'CHEAP_REVIEWER_REQUIRED'});
  expect(dispatchAssignment({...packet,cheap_reviewer:frontier})).toMatchObject({gap:'CHEAP_REVIEWER_MUST_NOT_BE_FRONTIER'});
  expect(dispatchAssignment({...packet,delegation_forbidden:true})).toMatchObject({gap:'DELEGATION_FORBIDDEN'});
  expect(dispatchAssignment({...packet,artifact_digest:'sha256:'+'a'.repeat(64),review:pass('sha256:'+'a'.repeat(64),coordinator)})).toMatchObject({outcome:'direct',review_verified:true});
 });
 it('reports information capability limits without escalating, and can use a cheap worker without frontier access',()=>{
  const packet={...base,frontier:undefined,signals:{no_progress_attempts:2}};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'blocked',gap:'INFORMATION_TOOLS_OR_CHEAP_WORKER_REQUIRED'});
  expect(dispatchAssignment({...packet,workers:{economy:coordinator},signals:{...packet.signals,delegation_requested:true}})).toMatchObject({outcome:'delegate',worker:coordinator});
  expect(dispatchAssignment({...base,signals:{capability_failure:true}})).toMatchObject({gap:'INFORMATION_TOOLS_OR_CHEAP_WORKER_REQUIRED'});
  expect(dispatchAssignment({...base,workers:{economy:frontier},signals:{delegation_requested:true}})).toMatchObject({gap:'NO_AVAILABLE_WORKER'});
 });
 it('splits consequential decisions from information gathering',()=>{
  expect(dispatchAssignment({...base,signals:{consequential_action:true}})).toMatchObject({outcome:'blocked',gap:'SEPARATE_CONSEQUENTIAL_DECISION'});
  expect(dispatchAssignment({...base,assignment:'frontier_decision',work_type:'consequential_decision'})).toMatchObject({outcome:'escalate',execution:frontier});
 });
 it.each(['planning','architecture','critical_ui_ux','security_decision','data_migration_design','public_contract_design'])('%s uses frontier once for decision-only work, then checks',work_type=>{
  const packet={...base,assignment:'frontier_decision',work_type};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'escalate',rule_id:'WORK_TYPE_'+work_type.toUpperCase()});
  expect(reviewRequirement(packet)).toEqual({role:'none',required:false,reason:'FRONTIER_EXECUTION_CHECKS'});
  expect(dispatchAssignment({...packet,phase:'complete'})).toMatchObject({outcome:'direct'});
  expect(dispatchAssignment({...packet,phase:'complete',frontier:undefined})).toMatchObject({gap:'FRONTIER_REQUIRED'});
  expect(reviewRequirement({...packet,implemented_behavior:true})).toMatchObject({role:'frontier',required:true});
 });
 it.each(['routine_implementation','routine_fix','substantial_refactor'])('%s requires fresh frontier review even when marked simple',work_type=>{
  const packet={...base,work_type,substantial:false,phase:'complete'};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'review',review_requirement:{role:'frontier'}});
  expect(dispatchAssignment({...packet,frontier:undefined})).toMatchObject({outcome:'blocked',gap:'FRONTIER_REQUIRED'});
 });
 it.each(['planning','architecture','hard_bug','concurrency_bug'])('%s honors explicit independent review without making a second review automatic',work_type=>{
  const packet={...base,assignment:'frontier_decision',work_type,phase:'complete'};
  expect(reviewRequirement(packet)).toMatchObject({required:false});
  const requested={...packet,independent_review:true};
  expect(dispatchAssignment(requested)).toMatchObject({outcome:'review',review_requirement:{role:'frontier',reason:'EXPLICIT_INDEPENDENT_REVIEW'}});
  expect(dispatchAssignment({...requested,delegation_forbidden:true})).toMatchObject({outcome:'blocked',gap:'DELEGATION_FORBIDDEN'});
 });
 it.each(['research','pdf_analysis'])('keeps explicitly requested %s review economical',work_type=>{
  expect(dispatchAssignment({...base,work_type,frontier:undefined,cheap_reviewer:coordinator,independent_review:true,phase:'complete'})).toMatchObject({outcome:'review',review_requirement:{role:'economy'}});
 });
 it('rejects information labels on real implementation assignments',()=>{
  for(const assignment of ['implement_feature','implement_fix','implement_ui','implement_plan']){
   const packet={...base,assignment,phase:'complete',substantial:false};
   expect(reviewRequirement(packet)).toMatchObject({role:'frontier'});
   expect(dispatchAssignment(packet)).toMatchObject({gap:'ASSIGNMENT_WORK_TYPE_CONFLICT'});
  }
 });
 it.each(['hard_bug','concurrency_bug','incident_diagnosis','performance_diagnosis'])('%s stays with frontier unless the evidence supports a handoff',async work_type=>fixture(async(root,evidence)=>{
  const packet={...base,cwd:root,work_type,assignment:'implement_fix',diagnosis_accepted:true};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'escalate'});
  expect(dispatchAssignment({...packet,hard_bug_handoff:{root_cause:evidence}})).toMatchObject({gap:'HARD_BUG_HANDOFF_EVIDENCE_REQUIRED'});
  const hard_bug_handoff={reproduction:evidence,root_cause:evidence,correction:evidence,regression_check:evidence};
  expect(dispatchAssignment({...packet,hard_bug_handoff})).toMatchObject({outcome:'direct',reason:'EVIDENCED_HARD_BUG_HANDOFF'});
  expect(dispatchAssignment({...packet,hard_bug_handoff,phase:'complete'})).toMatchObject({outcome:'review'});
  await writeFile(join(root,'answer.txt'),'changed');
  expect(dispatchAssignment({...packet,hard_bug_handoff})).toMatchObject({gap:'POLICY_EVIDENCE_INVALID'});
 }));
 it('requires evidence for accepted approaches and preserves a fresh review for the implementation',async()=>fixture(async(root,evidence)=>{
  const packet={...base,cwd:root,assignment:'implement_plan',work_type:'approved_execution',plan_settled:true};
  expect(dispatchAssignment(packet)).toMatchObject({gap:'ACCEPTED_DECISION_EVIDENCE_REQUIRED'});
  expect(dispatchAssignment({...packet,decision_evidence:evidence})).toMatchObject({outcome:'direct'});
  expect(dispatchAssignment({...packet,decision_evidence:evidence,phase:'complete'})).toMatchObject({outcome:'review'});
  await symlink('/etc/hosts',join(root,'outside'));
  expect(dispatchAssignment({...packet,decision_evidence:{...evidence,path:'outside'}})).toMatchObject({gap:'POLICY_EVIDENCE_INVALID'});
 }));
 it('escalates stalled execution and repeated failed repairs; a first bounded repair stays cheap',()=>{
  const packet={...base,assignment:'implement_feature',work_type:'routine_implementation'};
  expect(dispatchAssignment({...packet,signals:{repair_attempts:1}})).toMatchObject({outcome:'direct'});
  expect(dispatchAssignment({...packet,signals:{repair_attempts:2}})).toMatchObject({outcome:'escalate',gap:'REPEATED_REPAIR_REQUIRES_FRONTIER'});
  expect(dispatchAssignment({...packet,signals:{no_progress_attempts:2}})).toMatchObject({outcome:'escalate',gap:'NO_PROGRESS_ESCALATION_REQUIRED'});
  expect(dispatchAssignment({...packet,phase:'complete',review:{verdict:'REPAIR',fresh_context:true,...frontier,artifact_digest:'sha256:'+'a'.repeat(64)}})).toMatchObject({outcome:'review'});
 });
 it('records explicit scoped model instructions without standard-acceptance claims for review exceptions',()=>{
  const override={scope:'execution',...frontier,instruction:'Use the frontier model for this research task.'};
  expect(dispatchAssignment({...base,user_model_override:override})).toMatchObject({outcome:'delegate',worker:frontier,rule_id:'USER_MODEL_OVERRIDE'});
  const plan={...base,assignment:'frontier_decision',work_type:'planning',user_model_override:{scope:'execution',...coordinator,instruction:'Use this model for the plan.'}};
  expect(dispatchAssignment(plan)).toMatchObject({outcome:'direct',rule_id:'USER_MODEL_OVERRIDE'});
  const feature={...base,assignment:'implement_feature',work_type:'routine_implementation',phase:'complete',user_model_override:{scope:'review',...coordinator,instruction:'Use the coordinator model in a fresh context for review.'}};
  expect(dispatchAssignment(feature)).toMatchObject({outcome:'review',standard_policy_acceptance:false,verification:{reviewer:coordinator}});
  expect(()=>dispatchAssignment({...base,user_model_override:{scope:'execution',...frontier}})).toThrow('USER_MODEL_OVERRIDE_INVALID');
 });
 it.each([[{host_available:false},'HOST_UNAVAILABLE'],[{permission_granted:false},'PERMISSION_REQUIRED'],[{limit_available:false},'HOST_LIMIT_REACHED']])('keeps actual launch-control failures distinct: %j',(signals,gap)=>{
  expect(dispatchAssignment({...base,work_type:'planning',assignment:'frontier_decision',signals})).toMatchObject({outcome:'blocked',gap});
 });
});

describe('v3 evidence and historical interpretation',()=>{
 it('records checked research without frontier, with immutable normalized policy and source evidence',async()=>fixture(async(root,evidence,artifacts)=>{
  const options={stateRoot:join(root,'state')},packet={...base,cwd:root,frontier:undefined,observation_version:3,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0,...artifacts,artifact_files:['answer.txt'],check_evidence:[evidence]};
  await expect(runCommand('observe',packet,options)).resolves.toEqual({status:'observed',qualification_authority:false});
  await expect(runCommand('observe',packet,options)).resolves.toEqual({status:'observed',qualification_authority:false});
  const project=(await readdir(options.stateRoot))[0]!,eventPath=join(options.stateRoot,project,'codex','events',(await readdir(join(options.stateRoot,project,'codex','events')))[0]!);
  const data=JSON.parse(await readFile(eventPath,'utf8')).data;
  expect(data).toMatchObject({schema_version:'delegate_observation.v3',review_requirement:{role:'none'},check_evidence:[evidence],policy_input:reviewPolicyInput(packet)});
  await expect(runCommand('observe',{...packet,check_evidence:[]},options)).rejects.toThrow('CHECK_EVIDENCE_REQUIRED');
  await expect(runCommand('observe',{...packet,artifact_digest:'sha256:'+'b'.repeat(64)},options)).rejects.toThrow('OBSERVATION_ARTIFACT_MISMATCH');
  await writeFile(join(root,'answer.txt'),'tampered');
  await expect(runCommand('observe',packet,options)).rejects.toThrow('POLICY_EVIDENCE_DIGEST_MISMATCH');
 }));
 it('binds frontier planning to an exact completed execution rather than a second reviewer',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet={...base,cwd:root,assignment:'frontier_decision',work_type:'planning',observation_version:3,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0,...artifacts,artifact_files:['answer.txt'],check_evidence:[evidence]},options={stateRoot:join(root,'state')};
  await expect(runCommand('observe',packet,options)).rejects.toThrow('EXECUTION_ATTEMPT_REQUIRED');
  await expect(runCommand('observe',{...packet,attempts:[attempt('frontier')]},options)).rejects.toThrow('EXECUTION_EVIDENCE_REQUIRED');
  await expect(runCommand('observe',{...packet,attempts:[attempt('frontier')],execution_evidence:[evidence]},options)).resolves.toMatchObject({status:'observed'});
 }));
 it('requires matching fresh review attempts for behavior and economy audits',async()=>fixture(async(root,evidence,artifacts)=>{
  for(const [work_type,task_id,selection] of [['routine_implementation','ordinary-fixture',frontier],['pdf_analysis',auditId,coordinator]] as const){
   const packet={...base,cwd:root,work_type,task_id,cheap_reviewer:coordinator,observation_version:3,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0,...artifacts,artifact_files:['answer.txt'],check_evidence:[evidence],review:pass(artifacts.artifact_digest,selection)},options={stateRoot:join(root,'state')};
   await expect(runCommand('observe',packet,options)).rejects.toThrow('REVIEW_ATTEMPT_REQUIRED');
   await expect(runCommand('observe',{...packet,attempts:[attempt('reviewer',selection)]},options)).resolves.toMatchObject({status:'observed'});
  }
 }));
 it('preserves v2 source-synthesis frontier requirement and does not reinterpret it as v3',async()=>fixture(async(root)=>{
  const packet={...base,cwd:root,work_type:'source_synthesis',observation_version:2,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0},options={stateRoot:join(root,'state')};
  await expect(runCommand('observe',packet,options)).rejects.toThrow('FRESH_FRONTIER_REVIEW_REQUIRED');
  await expect(runCommand('observe',{...packet,observation_version:3,schema_version:'delegate_observation.v2'},options)).rejects.toThrow('OBSERVATION_INVALID');
 }));
});

it('records execution-scoped model overrides as policy exceptions',()=>{
 const out=dispatchAssignment({host:'codex',cwd:process.cwd(),task_id:'override-plan',assignment:'frontier_decision',work_type:'planning',risk:'low',bounded:true,coordinator:{model:'gpt-5.6-terra',effort:'medium'},frontier:{model:'gpt-6-astra',effort:'high'},user_model_override:{scope:'execution',model:'gpt-5.6-terra',effort:'medium',instruction:'Use Terra for this plan'}});
 expect(out.outcome).toBe('direct');expect(out.standard_policy_acceptance).toBe(false);
});

describe('single-operation completion',()=>{
 const packetFor=(root:string,evidence:{path:string;digest:string},artifacts:{artifact_digest:string})=>({...base,cwd:root,observation_version:3,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0,...artifacts,artifact_files:['answer.txt'],check_evidence:[evidence]});
 it('persists reviewed completion once, including identical retries, without changing observe',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet={...packetFor(root,evidence,artifacts),assignment:'implement_fix',work_type:'routine_fix',diagnosis_accepted:true,review:pass(artifacts.artifact_digest),attempts:[attempt('reviewer')]},options={stateRoot:join(root,'state')};
  const expected={status:'completed',task_id:packet.task_id,artifact_digest:artifacts.artifact_digest,qualification_authority:false};
  expect(await runCommand('complete',packet,options)).toEqual(expected);
  expect(await runCommand('complete',packet,{...options,now:'2030-01-01T00:00:00Z'})).toEqual(expected);
  expect(await runCommand('observe',packet,options)).toEqual({status:'observed',qualification_authority:false});
  const project=(await readdir(options.stateRoot))[0]!,directory=join(options.stateRoot,project,'codex','events'),files=await readdir(directory);
  expect(files).toHaveLength(1);
  expect(JSON.parse(await readFile(join(directory,files[0]!),'utf8')).data).toMatchObject({schema_version:'delegate_observation.v3',acceptance:'accepted',review_requirement:{role:'frontier'},review:packet.review});
  await expect(runCommand('complete',{...packet,repairs:1},options)).rejects.toThrow('EVENT_CONFLICT');
 }));
 it('rejects missing review, checks, mismatched artifacts and substituted review identity',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet={...packetFor(root,evidence,artifacts),assignment:'implement_feature',work_type:'routine_implementation'},options={stateRoot:join(root,'state')};
  await expect(runCommand('complete',packet,options)).rejects.toThrow('REVIEW_REQUIRED');
  const reviewed={...packet,review:pass(artifacts.artifact_digest),attempts:[attempt('reviewer')]};
  await expect(runCommand('complete',{...reviewed,check_evidence:[]},options)).rejects.toThrow('CHECK_EVIDENCE_REQUIRED');
  await expect(runCommand('complete',{...reviewed,artifact_digest:'sha256:'+'b'.repeat(64)},options)).rejects.toThrow('REVIEW_ARTIFACT_MISMATCH');
  await expect(runCommand('complete',{...reviewed,artifact_digest:'sha256:'+'b'.repeat(64),review:pass('sha256:'+'b'.repeat(64))},options)).rejects.toThrow('OBSERVATION_ARTIFACT_MISMATCH');
  await expect(runCommand('complete',{...reviewed,review:pass(artifacts.artifact_digest,coordinator)},options)).rejects.toThrow('FRESH_FRONTIER_REVIEW_REQUIRED');
  expect((await runCommand('status',{cwd:root,host:'codex'},options)).observations).toBe(0);
 }));
 it('requires execution evidence when frontier made the decision',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet={...packetFor(root,evidence,artifacts),assignment:'frontier_decision',work_type:'planning',attempts:[attempt('frontier')]},options={stateRoot:join(root,'state')};
  await expect(runCommand('complete',packet,options)).rejects.toThrow('EXECUTION_EVIDENCE_REQUIRED');
  await expect(runCommand('complete',{...packet,execution_evidence:[evidence]},options)).resolves.toMatchObject({status:'completed'});
 }));
 it.each(['planning','hard_bug'])('cannot complete %s without an explicitly requested independent review',async work_type=>fixture(async(root,evidence,artifacts)=>{
  const packet={...packetFor(root,evidence,artifacts),assignment:'frontier_decision',work_type,independent_review:true,attempts:[attempt('frontier')],execution_evidence:[evidence]},options={stateRoot:join(root,'state')};
  await expect(runCommand('complete',packet,options)).rejects.toThrow('REVIEW_REQUIRED');
  await expect(runCommand('complete',{...packet,review:pass(artifacts.artifact_digest)},options)).rejects.toThrow('REVIEW_ATTEMPT_REQUIRED');
  expect((await runCommand('status',{cwd:root,host:'codex'},options)).observations).toBe(0);
  await expect(runCommand('complete',{...packet,review:pass(artifacts.artifact_digest),attempts:[...packet.attempts,attempt('reviewer')]},options)).resolves.toMatchObject({status:'completed'});
 }));
 it.each(['research','pdf_analysis'])('completes checked %s without frontier identity',async work_type=>fixture(async(root,evidence,artifacts)=>{
  await expect(runCommand('complete',{...packetFor(root,evidence,artifacts),work_type,frontier:undefined},{stateRoot:join(root,'state')})).resolves.toMatchObject({status:'completed'});
 }));
 it('does not report completion when recording is disabled or its state directory cannot be written',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet=packetFor(root,evidence,artifacts),options={stateRoot:join(root,'state')};
  await runCommand('disable',{cwd:root,host:'codex',target:'learning'},options);
  await expect(runCommand('complete',packet,options)).rejects.toThrow('COMPLETION_RECORDING_DISABLED');
  expect((await runCommand('status',{cwd:root,host:'codex'},options)).observations).toBe(0);
  const unavailable=join(root,'state-file');await writeFile(unavailable,'not a directory');
  await expect(runCommand('complete',packet,{stateRoot:unavailable})).rejects.toMatchObject({code:'ENOTDIR'});
  expect(await readFile(unavailable,'utf8')).toBe('not a directory');
 }));
 it('rejects legacy and non-accepted completion inputs while preserving legacy observe',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet=packetFor(root,evidence,artifacts),options={stateRoot:join(root,'state')};
  for(const update of [{observation_version:undefined},{observation_version:2},{acceptance:'failed'}])await expect(runCommand('complete',{...packet,...update},options)).rejects.toThrow('COMPLETION_INPUT_INVALID');
  await expect(runCommand('complete',{...packet,schema_version:'delegate_observation.v2'},options)).rejects.toThrow('OBSERVATION_INVALID');
  await expect(runCommand('observe',{...packet,observation_version:undefined},options)).resolves.toMatchObject({status:'observed'});
  await expect(runCommand('complete',packet,options)).rejects.toThrow('EVENT_CONFLICT');
 }));
 it('exposes completed only for a persisted result through the local CLI',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet=packetFor(root,evidence,artifacts),helper=fileURLToPath(new URL('../../skills/delegate/scripts/local-learning.mjs',import.meta.url));
  const invoke=(input:unknown)=>spawnSync(process.execPath,[helper,'complete','-'],{encoding:'utf8',input:JSON.stringify(input),env:{...process.env,DELEGATE_STATE_HOME:join(root,'state')}});
  const success=invoke(packet);expect(success.status).toBe(0);expect(JSON.parse(success.stdout)).toMatchObject({status:'completed',task_id:packet.task_id});
  const failure=invoke({...packet,check_evidence:[]});expect(failure.status).toBe(1);expect(JSON.parse(failure.stdout)).toMatchObject({status:'unavailable',reason:'CHECK_EVIDENCE_REQUIRED'});
 }));
});
