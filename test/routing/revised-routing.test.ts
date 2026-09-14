import {describe,it,expect} from 'vitest';
import {mkdtemp,writeFile,readFile,rm,readdir,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditTask,artifactDigest,checkWork,dispatchAssignment,reviewRequirement,reviewPolicyInput,runCommand} from '../../skills/delegate/scripts/local-learning.mjs';

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
 it.each(['routine_implementation','routine_fix','substantial_refactor','regression_test'])('%s requires fresh frontier review at medium risk and above even when marked simple',work_type=>{
  for(const risk of ['medium','high','critical']){
   const packet={...base,work_type,risk,substantial:false,phase:'complete'};
   expect(dispatchAssignment(packet)).toMatchObject({outcome:'review',review_requirement:{role:'frontier',reason:'IMPLEMENTED_BEHAVIOR_REQUIRES_FRONTIER'}});
   expect(dispatchAssignment({...packet,frontier:undefined})).toMatchObject({outcome:'blocked',gap:'FRONTIER_REQUIRED'});
  }
  expect(reviewRequirement({...base,work_type,risk:undefined})).toMatchObject({role:'frontier'}); // unknown risk is medium
 });
 it.each(['routine_implementation','routine_fix','substantial_refactor','regression_test'])('%s at declared low risk completes on coordinator checks with a stable frontier audit sample',work_type=>{
  const packet={...base,work_type,risk:'low',substantial:false,phase:'complete'};
  expect(dispatchAssignment(packet)).toMatchObject({outcome:'direct',review_requirement:{role:'none',required:false,reason:'LOW_RISK_IMPLEMENTATION_CHECKS'}});
  expect(dispatchAssignment({...packet,frontier:undefined})).toMatchObject({outcome:'direct'});
  expect(dispatchAssignment({...packet,task_id:auditId})).toMatchObject({outcome:'review',review_requirement:{role:'frontier',reason:'STABLE_LOW_RISK_AUDIT'}});
  expect(dispatchAssignment({...packet,independent_review:true})).toMatchObject({outcome:'review',review_requirement:{role:'frontier',reason:'EXPLICIT_INDEPENDENT_REVIEW'}});
  expect(dispatchAssignment({...packet,implemented_behavior:true,risk:'medium'})).toMatchObject({outcome:'review'});
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
   expect(reviewRequirement({...packet,risk:'medium'})).toMatchObject({role:'frontier'});
   expect(reviewRequirement(packet).reason).not.toBe('SOURCE_CHECKS'); // low risk still takes the implementation branch
   expect(dispatchAssignment(packet)).toMatchObject({gap:'ASSIGNMENT_WORK_TYPE_CONFLICT'});
   expect(dispatchAssignment({...packet,risk:'medium'})).toMatchObject({gap:'ASSIGNMENT_WORK_TYPE_CONFLICT'});
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
  expect(dispatchAssignment({...packet,decision_evidence:evidence,phase:'complete'})).toMatchObject({outcome:'review',review_requirement:{role:'frontier',reason:'HANDOFF_ORIGIN_REQUIRES_FRONTIER_REVIEW'}});
  expect(dispatchAssignment({...packet,decision_evidence:evidence,origin_work_type:'planning',phase:'complete'})).toMatchObject({outcome:'direct',review_requirement:{role:'none',reason:'LOW_RISK_IMPLEMENTATION_CHECKS'}});
  expect(dispatchAssignment({...packet,decision_evidence:evidence,phase:'complete',risk:'medium'})).toMatchObject({outcome:'review'});
  await symlink('/etc/hosts',join(root,'outside'));
  expect(dispatchAssignment({...packet,decision_evidence:{...evidence,path:'outside'}})).toMatchObject({gap:'POLICY_EVIDENCE_INVALID'});
 }));
 it('escalates stalled execution and repeated failed repairs; a first bounded repair stays cheap',()=>{
  const packet={...base,assignment:'implement_feature',work_type:'routine_implementation'};
  expect(dispatchAssignment({...packet,signals:{repair_attempts:1}})).toMatchObject({outcome:'direct'});
  expect(dispatchAssignment({...packet,signals:{repair_attempts:2}})).toMatchObject({outcome:'escalate',gap:'REPEATED_REPAIR_REQUIRES_FRONTIER'});
  expect(dispatchAssignment({...packet,signals:{no_progress_attempts:2}})).toMatchObject({outcome:'escalate',gap:'NO_PROGRESS_ESCALATION_REQUIRED'});
  expect(dispatchAssignment({...packet,risk:'medium',phase:'complete',review:{verdict:'REPAIR',fresh_context:true,...frontier,artifact_digest:'sha256:'+'a'.repeat(64)}})).toMatchObject({outcome:'review'});
 });
 it('records explicit scoped model instructions without standard-acceptance claims for review exceptions',()=>{
  const override={scope:'execution',...frontier,instruction:'Use the frontier model for this research task.'};
  expect(dispatchAssignment({...base,user_model_override:override})).toMatchObject({outcome:'delegate',worker:frontier,rule_id:'USER_MODEL_OVERRIDE'});
  const plan={...base,assignment:'frontier_decision',work_type:'planning',user_model_override:{scope:'execution',...coordinator,instruction:'Use this model for the plan.'}};
  expect(dispatchAssignment(plan)).toMatchObject({outcome:'direct',rule_id:'USER_MODEL_OVERRIDE'});
  const feature={...base,assignment:'implement_feature',work_type:'routine_implementation',risk:'medium',phase:'complete',user_model_override:{scope:'review',...coordinator,instruction:'Use the coordinator model in a fresh context for review.'}};
  expect(dispatchAssignment(feature)).toMatchObject({outcome:'review',standard_policy_acceptance:false,verification:{reviewer:coordinator}});
  expect(()=>dispatchAssignment({...base,user_model_override:{scope:'execution',...frontier}})).toThrow('USER_MODEL_OVERRIDE_INVALID');
 });
 it.each([[{host_available:false},'HOST_UNAVAILABLE'],[{permission_granted:false},'PERMISSION_REQUIRED'],[{limit_available:false},'HOST_LIMIT_REACHED']])('keeps actual launch-control failures distinct: %j',(signals,gap)=>{
  expect(dispatchAssignment({...base,work_type:'planning',assignment:'frontier_decision',signals})).toMatchObject({outcome:'blocked',gap});
 });
});

describe('lightweight ordinary review check',()=>{
 const routine={task_id:'ordinary-fixture',assignment:'implement_feature',work_type:'routine_implementation' as const,risk:'low' as const};
 it('selects the same audit on retry and after work/risk changes',()=>{
  for(const task_id of [routine.task_id,auditId]){
   const first=checkWork({...routine,task_id});
   expect(checkWork({...routine,task_id})).toEqual(first);
   expect(checkWork({...routine,task_id,risk:'medium'}).audit).toEqual(first.audit);
   expect(checkWork({...routine,task_id,work_type:'routine_fix'}).audit).toEqual(first.audit);
   expect(first.audit.selected).toBe(auditTask(task_id));
  }
  expect(checkWork(routine).review_requirement.role).toBe('none');
  expect(checkWork({...routine,task_id:auditId}).review_requirement.reason).toBe('STABLE_LOW_RISK_AUDIT');
 });
 it.each(['medium','high','critical','unknown',undefined] as const)('requires implementation review at %s risk',risk=>{
  expect(checkWork({...routine,risk})).toMatchObject({risk:risk===undefined||risk==='unknown'?'medium':risk,review_requirement:{role:'frontier'}});
 });
 it.each(['hard_bug','concurrency_bug','incident_diagnosis','performance_diagnosis','architecture','critical_ui_ux','accessibility_decision','security_decision','data_migration_design','public_contract_design','consequential_decision'] as const)('preserves %s review through a routine or approved handoff',origin_work_type=>{
  for(const work_type of ['routine_fix','approved_execution'] as const){
   const packet={...routine,assignment:'implement_fix',work_type,origin_work_type};
   const expected={role:'frontier',required:true,reason:'ORIGIN_REQUIRES_FRONTIER_REVIEW'};
   expect(checkWork(packet).review_requirement).toEqual(expected);
   expect(reviewRequirement(packet)).toEqual(expected);
   expect(reviewPolicyInput(packet)['origin_work_type']).toBe(origin_work_type);
  }
 });
 it('reviews unknown handoffs but permits a known nonconsequential plan to use the low-risk tier',()=>{
  for(const origin_work_type of [undefined,'unknown','other','approved_execution'] as const){
   expect(checkWork({...routine,assignment:'implement_plan',origin_work_type}).review_requirement.role).toBe('frontier');
   expect(checkWork({...routine,work_type:'approved_execution',origin_work_type}).review_requirement.role).toBe('frontier');
  }
  expect(checkWork({...routine,work_type:'approved_execution',origin_work_type:'planning'}).review_requirement.role).toBe('none');
  expect(checkWork({...routine,work_type:'approved_execution',origin_work_type:'planning',task_id:auditId}).review_requirement.role).toBe('frontier');
  expect(reviewRequirement({...routine,decision_evidence:ref('plan.md','plan')})).toMatchObject({role:'frontier'});
 });
 it('preserves direct decision, hard-bug and economical research rules',()=>{
  expect(checkWork({...routine,work_type:'hard_bug'}).review_requirement.role).toBe('frontier');
  expect(checkWork({...routine,assignment:'frontier_decision',work_type:'architecture',implemented_behavior:true}).review_requirement.role).toBe('frontier');
  expect(checkWork({...routine,assignment:'frontier_decision',work_type:'planning'}).review_requirement.role).toBe('none');
  expect(checkWork({...routine,independent_review:true}).review_requirement.role).toBe('frontier');
  const research={...routine,assignment:'summarize_sources',work_type:'research' as const};
  expect(checkWork(research).review_requirement.role).toBe('none');
  expect(checkWork({...research,task_id:auditId}).review_requirement.role).toBe('economy');
  expect(checkWork({...research,independent_review:true}).review_requirement.role).toBe('economy');
 });
 it('rejects invalid and conflicting inputs rather than silently bypassing review',()=>{
  for(const invalid of [{...routine,task_id:''},{...routine,task_id:' '},{...routine,risk:'tiny'},{...routine,origin_work_type:'security-ish'},{...routine,independent_review:'true'},{...routine,origin_work_typo:'architecture'},{...routine,work_type:'misspelled'},{...routine,assignment:'unknown'}]){
   expect(()=>checkWork(invalid as any)).toThrow();
  }
  expect(()=>checkWork({...routine,work_type:'research'})).toThrow('ASSIGNMENT_WORK_TYPE_CONFLICT');
  expect(()=>dispatchAssignment({...base,origin_work_type:'misspelled'})).toThrow('ORIGIN_WORK_TYPE_INVALID');
 });
 it('runs from the CLI without host/models/evidence and without accessing project state',async()=>fixture(async root=>{
  const stateRoot=join(root,'not-a-directory');await writeFile(stateRoot,'do not touch');
  await expect(runCommand('check',routine,{stateRoot})).resolves.toEqual(checkWork(routine));
  const helper=fileURLToPath(new URL('../../skills/delegate/scripts/local-learning.mjs',import.meta.url));
  const cli=spawnSync(process.execPath,[helper,'check','-'],{cwd:root,input:JSON.stringify(routine),encoding:'utf8',env:{...process.env,DELEGATE_STATE_HOME:stateRoot}});
  expect(cli.status,cli.stderr).toBe(0);expect(JSON.parse(cli.stdout)).toEqual(checkWork(routine));
  expect(await readFile(stateRoot,'utf8')).toBe('do not touch');
  expect((await readdir(root)).sort()).toEqual(['answer.txt','not-a-directory']);
 }));
 it('rejects array-valued origins before they can bypass consequential review',()=>{
  const malformed={...routine,origin_work_type:['security_decision']};
  expect(()=>checkWork(malformed as any)).toThrow('ORIGIN_WORK_TYPE_INVALID');
  expect(()=>reviewRequirement(malformed)).toThrow('ORIGIN_WORK_TYPE_INVALID');
  expect(()=>dispatchAssignment({...base,...malformed})).toThrow('ORIGIN_WORK_TYPE_INVALID');
  const helper=fileURLToPath(new URL('../../skills/delegate/scripts/local-learning.mjs',import.meta.url));
  const cli=spawnSync(process.execPath,[helper,'check','-'],{input:JSON.stringify(malformed),encoding:'utf8'});
  expect(cli.status).toBe(1);expect(JSON.parse(cli.stdout)).toMatchObject({status:'unavailable',reason:'ORIGIN_WORK_TYPE_INVALID'});
 });
 it('rejects array-valued assignments before they can bypass the implementation floor',()=>{
  const malformed={...routine,assignment:['implement_fix'],work_type:'mechanical_edit',risk:'medium'};
  expect(()=>checkWork(malformed as any)).toThrow('CHECK_INPUT_INVALID');
  expect(()=>dispatchAssignment({...base,...malformed})).toThrow('DISPATCH_INPUT_INVALID');
  const helper=fileURLToPath(new URL('../../skills/delegate/scripts/local-learning.mjs',import.meta.url));
  const cli=spawnSync(process.execPath,[helper,'check','-'],{input:JSON.stringify(malformed),encoding:'utf8'});
  expect(cli.status).toBe(1);expect(JSON.parse(cli.stdout)).toMatchObject({status:'unavailable',reason:'CHECK_INPUT_INVALID'});
 });
 it('enforces and records inherited review in explicit completion',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet={...base,cwd:root,assignment:'implement_plan',work_type:'approved_execution',origin_work_type:'security_decision',decision_evidence:evidence,plan_settled:true,observation_version:3,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0,...artifacts,artifact_files:['answer.txt'],check_evidence:[evidence]},options={stateRoot:join(root,'state')};
  expect(dispatchAssignment({...packet,phase:'complete'})).toMatchObject({outcome:'review',review_requirement:{role:'frontier',reason:'ORIGIN_REQUIRES_FRONTIER_REVIEW'}});
  await expect(runCommand('complete',packet,options)).rejects.toThrow('REVIEW_REQUIRED');
  await expect(runCommand('complete',{...packet,review:pass(artifacts.artifact_digest),attempts:[attempt('reviewer')]},options)).resolves.toMatchObject({status:'completed'});
  const project=(await readdir(options.stateRoot))[0]!,directory=join(options.stateRoot,project,'codex','events');
  const recorded=JSON.parse(await readFile(join(directory,(await readdir(directory))[0]!),'utf8')).data;
  expect(recorded.policy_input.origin_work_type).toBe('security_decision');
  expect(recorded.review_requirement.reason).toBe('ORIGIN_REQUIRES_FRONTIER_REVIEW');
 }));
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
  for(const [work_type,task_id,risk,selection] of [['routine_implementation','ordinary-fixture','medium',frontier],['pdf_analysis',auditId,'low',coordinator]] as const){
   const packet={...base,cwd:root,work_type,task_id,risk,cheap_reviewer:coordinator,observation_version:3,mode:'direct',worker:null,acceptance:'accepted',checks:'passed',repairs:0,...artifacts,artifact_files:['answer.txt'],check_evidence:[evidence],review:pass(artifacts.artifact_digest,selection)},options={stateRoot:join(root,'state')};
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
  const packet={...packetFor(root,evidence,artifacts),assignment:'implement_fix',work_type:'routine_fix',risk:'medium',diagnosis_accepted:true,review:pass(artifacts.artifact_digest),attempts:[attempt('reviewer')]},options={stateRoot:join(root,'state')};
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
  const packet={...packetFor(root,evidence,artifacts),assignment:'implement_feature',work_type:'routine_implementation',risk:'medium'},options={stateRoot:join(root,'state')};
  await expect(runCommand('complete',packet,options)).rejects.toThrow('REVIEW_REQUIRED');
  const reviewed={...packet,review:pass(artifacts.artifact_digest),attempts:[attempt('reviewer')]};
  await expect(runCommand('complete',{...reviewed,check_evidence:[]},options)).rejects.toThrow('CHECK_EVIDENCE_REQUIRED');
  await expect(runCommand('complete',{...reviewed,artifact_digest:'sha256:'+'b'.repeat(64)},options)).rejects.toThrow('REVIEW_ARTIFACT_MISMATCH');
  await expect(runCommand('complete',{...reviewed,artifact_digest:'sha256:'+'b'.repeat(64),review:pass('sha256:'+'b'.repeat(64))},options)).rejects.toThrow('OBSERVATION_ARTIFACT_MISMATCH');
  await expect(runCommand('complete',{...reviewed,review:pass(artifacts.artifact_digest,coordinator)},options)).rejects.toThrow('FRESH_FRONTIER_REVIEW_REQUIRED');
  expect((await runCommand('status',{cwd:root,host:'codex'},options)).observations).toBe(0);
 }));
 it('completes declared low-risk implementation on checks alone and records the tier',async()=>fixture(async(root,evidence,artifacts)=>{
  const packet={...packetFor(root,evidence,artifacts),assignment:'implement_feature',work_type:'routine_implementation',risk:'low'},options={stateRoot:join(root,'state')};
  await expect(runCommand('complete',packet,options)).resolves.toMatchObject({status:'completed'});
  const project=(await readdir(options.stateRoot))[0]!,directory=join(options.stateRoot,project,'codex','events'),files=await readdir(directory);
  expect(JSON.parse(await readFile(join(directory,files[0]!),'utf8')).data).toMatchObject({review_requirement:{role:'none',reason:'LOW_RISK_IMPLEMENTATION_CHECKS'},policy_input:{risk:'low'}});
  await expect(runCommand('complete',{...packet,task_id:'low-medium',risk:'medium'},options)).rejects.toThrow('REVIEW_REQUIRED');
  await expect(runCommand('complete',{...packet,task_id:auditId},options)).rejects.toThrow('REVIEW_REQUIRED');
  await expect(runCommand('complete',{...packet,task_id:'low-fix',assignment:'implement_fix',work_type:'hard_bug',diagnosis_accepted:true},options)).rejects.toThrow('REVIEW_REQUIRED'); // hard-bug fixes keep frontier review at low risk
  await expect(runCommand('complete',{...packet,task_id:'low-decision',implemented_behavior:true,work_type:'architecture',assignment:'frontier_decision',attempts:[attempt('frontier')],execution_evidence:[evidence]},options)).rejects.toThrow('REVIEW_REQUIRED'); // so does implementing a consequential decision
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
