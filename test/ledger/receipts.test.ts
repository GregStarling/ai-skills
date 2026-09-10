import {readFileSync} from 'node:fs';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,describe,expect,it} from 'vitest';
import {captureReceipt,assessReceipt,validateReceiptEvidence} from '../../src/ledger/receipts.js';
import {Ledger} from '../../src/ledger/index.js';
import {contentDigest,digest,hashBytes} from '../../src/core/canonical.js';
import {candidateIdentity,parseRuntimeReport,type TaskObservation} from '../../src/schema/index.js';
import {evaluateReview,parseSelectionInput,qualify,createBinding} from '../../src/governance/index.js';
import {renderCodex,runtimeVersions} from '../../src/adapters/index.js';
import {captureIdentityEnvironment} from '../../src/runtime/identity-assurance.js';
import {proposeRefresh} from '../../src/refresh/index.js';

// SYNTHETIC TEST DATA: native-shaped boundary fixtures, never model-performance
// evidence. Every captured receipt and staged proposal lives in a fresh temp dir.
const directories:string[]=[];
const observedAt=new Date(Date.now()-1000).toISOString();
async function temp(){const directory=await mkdtemp(join(tmpdir(),'governor-receipt-test-'));directories.push(directory);return directory;}
afterEach(async()=>{await Promise.all(directories.splice(0).map(directory=>rm(directory,{recursive:true,force:true})));});
function fixture(candidateIndex=0,taskIndex=0,accepted=true,v4=false,v5=false,v5Risk:'low'|'medium'='low'){
 const input=JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8')).selection;
 const template:TaskObservation=structuredClone(input.observations[0]);
 input.now=observedAt;input.mode='production';input.request.risk='critical';
 // Deliberately permissive test-only sample/interval thresholds exercise plumbing
 // with two tasks. These are NOT proposed operational qualification thresholds.
 if(v4||v5){
  const active=JSON.parse(readFileSync(v5?'policy/constitution.json':'policy/constitution-v4.json','utf8'));
  // Real v4 thresholds with isolated test suite identities; never live evidence.
  input.policy={...active,roles:input.policy.roles,task_classes:input.policy.task_classes};input.request.execution_environment='codex';
 }else{input.policy.qualification.minimum_tasks=2;input.policy.promotion.minimum_paired_tasks=2;input.policy.promotion.non_inferiority_margin=.9;}
 if(v5){input.request.risk=v5Risk;for(const [index,record] of input.registry.records.entries()){record.model_id=index===0?'gpt-6-astra':'gpt-5.6-terra';record.snapshot_id=record.model_id;record.aliases=[];}for(const [index,candidate] of input.candidates.entries()){candidate.model_id=input.registry.records[index].model_id;candidate.snapshot_id=candidate.model_id;}}
 for(const record of input.registry.records){record.provider='openai';record.frontier=true;record.pinning.source='registry_metadata';record.content_digest=contentDigest(record);}
 input.registry.content_digest=contentDigest(input.registry);
 for(const candidate of input.candidates){candidate.provider='openai';candidate.provenance.registry_content_digest=input.registry.content_digest;}
 input.sources={};input.runtimeReports={};input.observations=[];
 const add=(text:string)=>{const key=hashBytes(text);input.sources[key]=text;return key;};
 const worker=input.candidates[candidateIndex],reviewer=input.candidates[1-candidateIndex];
 const report=(candidate:typeof worker,id:string,cost:number|null,passed=true,known=true)=>{
  const value=parseRuntimeReport({schema_version:'runtime_report.v1',report_id:`test_${id}`,provider:'openai',...(v4||v5?{execution_environment:'codex'}:{}),candidate_id:candidate.candidate_id,started_at:input.now,completed_at:input.now,command:{executable:'SYNTHETIC_TEST_DATA_NOT_EXECUTED',args:[],cwd:'/tmp'},status:passed?'completed':'failed',exit_code:passed?0:1,signal:null,timeout_ms:1000,stdout_digest:add(`SYNTHETIC TEST stdout ${id}`),stderr_digest:add(`SYNTHETIC TEST stderr ${id}`),observed_identity:known?{source:'provider_receipt',model_id:candidate.snapshot_id,effort:candidate.effort}:{source:'unknown'},usage:{cost_usd:v4||v5?null:cost}});
  if(v5){
   const schemaPath='/tmp/SYNTHETIC_TEST_ONLY.schema.json',command={executable:'codex',args:['exec','--json','--ephemeral','--ignore-user-config','--ignore-rules','--strict-config','-m',candidate.model_id,'-c',`model_reasoning_effort="${candidate.effort}"`,'--sandbox','workspace-write','--output-schema',schemaPath,'-'],cwd:'/tmp'};
   value.command=command;value.observed_identity={source:'unknown'};
   value.stdout_digest=add([JSON.stringify({type:'thread.started',thread_id:`SYNTHETIC_TEST_${id}`}),JSON.stringify({type:'item.completed',item:{id:`item_${id}`,type:'agent_message',text:'SYNTHETIC TEST DATA; no model performance claim'}}),JSON.stringify({type:passed?'turn.completed':'turn.failed',...(passed?{usage:{input_tokens:10,output_tokens:10}}:{error:{message:'SYNTHETIC TEST failure'}})})].join('\n')+'\n');
   const request=add(JSON.stringify({schema_version:'native_execution_request.v1',execution_environment:'codex',candidate_identity:candidateIdentity(candidate),command,environment:captureIdentityEnvironment({}),prompt_digest:hashBytes(`SYNTHETIC TEST prompt ${id}`),configuration_files:[{path:schemaPath,content_digest:add('{"type":"object"}') }]}));
   const process=add(JSON.stringify({schema_version:'native_execution_process.v1',request_digest:request,started_at:value.started_at,completed_at:value.completed_at,exit_code:value.exit_code,signal:value.signal,timed_out:false,spawn_error:null,stdout_digest:value.stdout_digest,stderr_digest:value.stderr_digest}));
   value.native_evidence={request_digest:request,process_digest:process,version_digest:add('codex-cli 0.154.0\n')};
  }
  const key=digest(value);input.runtimeReports[key]=value;return key;
 };
 const grade=(row:TaskObservation)=>{row.provenance.source_digest=add(JSON.stringify({schema_version:'grader_result.v1',task_id:row.task_id,fixture_digest:row.fixture_digest,candidate_identity:row.candidate.candidate_identity,artifact_digest:row.provenance.artifact_digest,passed:row.passed,accepted:row.accepted,checks:[{check_id:'synthetic_boundary_check',passed:row.passed,evidence_digest:add(`SYNTHETIC TEST check ${row.observation_id}: ${row.passed}`)}]}));row.content_digest=contentDigest(row);};
 const observation=(candidate:typeof worker,id:string,task:string,role='implementer',passed=true)=>{
  const row:TaskObservation={...structuredClone(template),observation_id:id,lane:'production',candidate:{candidate_id:candidate.candidate_id,candidate_identity:candidateIdentity(candidate)},task_id:task,fixture_digest:add(`SYNTHETIC TEST same-task fixture ${task}`),role_id:role,risk:v5?v5Risk:'critical',measured_at:input.now,passed,accepted:passed,attempts:[{attempt_id:`worker_${id}`,kind:'worker',cost_usd:candidate===input.candidates[0]?.01:.02,cost_source:'provider_estimate',latency_ms:100}],provenance:{source:'native_runtime',source_digest:hashBytes('placeholder'),artifact_digest:add(`SYNTHETIC TEST artifact ${id}`),runtime_receipt_digest:null}};
  if(v4||v5){row.attempts[0]!.cost_usd=null;row.attempts[0]!.cost_source='unknown';}
  row.provenance.runtime_receipt_digest=report(candidate,id,row.attempts[0]!.cost_usd,passed);grade(row);return row;
 };
 const row=observation(worker,`worker_${candidateIndex}_${taskIndex}`,`paired_task_${taskIndex}`,'implementer',accepted);
 const reviewRows=Array.from({length:v4||v5?input.policy.qualification.minimum_tasks:2},(_,i)=>observation(reviewer,`reviewer_history_${candidateIndex}_${i}`,`reviewer_task_${i}`,'reviewer'));
 const packageDigest=add(`SYNTHETIC TEST independent review package ${row.observation_id}`);
 const reviewReport=report(reviewer,`current_review_${row.observation_id}`,.001);
 if(accepted)row.attempts.push({attempt_id:`review_${row.observation_id}`,kind:'review',cost_usd:v4||v5?null:.001,cost_source:v4||v5?'unknown':'provider_estimate',latency_ms:100});
 grade(row);
 const reviewSelection={...structuredClone(input),request:{...input.request,role_id:'reviewer'},observations:reviewRows};
 input.observations=[row];
 const raw={schema_version:'delegate_receipt.v1',task_class:'bounded_implementation',task_id:row.task_id,starting_artifact_digest:row.fixture_digest,status:accepted?'completed':'failed',notes:'SYNTHETIC TEST DATA — résumé',attempts:[{candidate_id:worker.candidate_id,candidate_identity:candidateIdentity(worker),role:'worker'},...(accepted?[{candidate_id:reviewer.candidate_id,role:'reviewer'}]:[])]};
 const capture={schema_version:'delegate_receipt_capture.v1' as const,context:{source:'SYNTHETIC TEST DATA; no native invocation',observed_at:input.now,origin:'production_usage' as const,public_task_class:'bounded_implementation',task_id:row.task_id,baseline_digest:row.fixture_digest,...(v4||v5?{execution_environment:'codex' as const}:{})},receipt_text:'',receipt_digest:''};
 const review={selection:reviewSelection,reviewerCandidateId:reviewer.candidate_id,packageDigest,implementerSessionId:'test-worker-session',proof:{outcome:'accepted' as const,artifact_digest:row.provenance.artifact_digest,package_digest:packageDigest,runtime_receipt_digest:reviewReport,session_id:'test-fresh-review-session',parent_session_id:null,context_kind:'new' as const,inherited_context_digest:null}};
 const evidence={selection:input,observationId:row.observation_id,attemptReceipts:Object.fromEntries(row.attempts.map(a=>[a.attempt_id,a.kind==='review'?reviewReport:row.provenance.runtime_receipt_digest!])),...(accepted?{review}:{})};
 const payload={schema_version:'delegate_receipt_evidence.v1' as const,capture,evidence};
 const sealRaw=()=>{capture.receipt_text=JSON.stringify(raw,null,2)+'\n';capture.receipt_digest=hashBytes(capture.receipt_text);};sealRaw();
 const replaceReport=(attemptId:string,patch:Partial<ReturnType<typeof parseRuntimeReport>>)=>{
  const oldKey=evidence.attemptReceipts[attemptId]!;const changed={...input.runtimeReports[oldKey],...patch};const key=digest(changed);input.runtimeReports[key]=changed;evidence.attemptReceipts[attemptId]=key;
  if(row.provenance.runtime_receipt_digest===oldKey)row.provenance.runtime_receipt_digest=key;
  if(review.proof.runtime_receipt_digest===oldKey)review.proof.runtime_receipt_digest=key;
  grade(row);
 };
 return {input,row,raw,payload,evidence,review,worker,reviewer,grade,sealRaw,replaceReport};
}
async function capture(directory:string,f:ReturnType<typeof fixture>){
 const receiptFile=join(directory,`${f.row.observation_id}.json`);await writeFile(receiptFile,f.payload.capture.receipt_text);
 return captureReceipt({directory:join(directory,'ledger'),receiptFile,context:f.payload.capture.context});
}

describe('portable receipt capture and independent evidence ingestion',()=>{
 it('archives exact original text with no authority, deduplicates, and rejects class/task/context/future conflicts',async()=>{
  const directory=await temp(),f=fixture();const first=await capture(directory,f);
  expect(first).toMatchObject({status:'PENDING_EVIDENCE',inserted:true,qualification_authority:false,receipt_digest:hashBytes(f.payload.capture.receipt_text)});
  const record=await new Ledger(first.directory).get(first.recordId);expect(record?.payload).toEqual(f.payload.capture);expect(first.directory).toBe(join(directory,'ledger','bounded_implementation'));
  expect((await capture(directory,f)).inserted).toBe(false);
  f.payload.capture.context.source='different source';await expect(capture(directory,f)).rejects.toThrow(/conflict/i);
  f.payload.capture.context.public_task_class='hard_debugging';await expect(capture(directory,f)).rejects.toThrow('RECEIPT_CLASS_CONFLICT');
  f.payload.capture.context.public_task_class='bounded_implementation';f.payload.capture.context.task_id='wrong_task';await expect(capture(directory,f)).rejects.toThrow('RECEIPT_TASK_CONFLICT');
  f.payload.capture.context.observed_at=new Date(Date.now()+60000).toISOString();await expect(capture(directory,f)).rejects.toThrow('RECEIPT_OBSERVATION_FUTURE');
  expect(await new Ledger(first.directory).list()).toHaveLength(1);
 });
 it('permits pending capture without baseline but refuses assessment until baseline is independently resolved',async()=>{
  const directory=await temp(),f=fixture();Reflect.deleteProperty(f.payload.capture.context,'baseline_digest');Reflect.deleteProperty(f.raw,'starting_artifact_digest');f.sealRaw();
  const captured=await capture(directory,f);expect(captured.status).toBe('PENDING_EVIDENCE');
  await expect(assessReceipt({...captured,evidence:f.evidence})).rejects.toThrow('RECEIPT_BASELINE_UNRESOLVED');
  expect(await new Ledger(captured.directory).list()).toHaveLength(1);
 });
 it.each(['context','raw'] as const)('rejects conflicting %s baseline rather than rebinding a captured starting state',field=>{
  const f=fixture();if(field==='context')f.payload.capture.context.baseline_digest=hashBytes('another baseline');else {f.raw.starting_artifact_digest=hashBytes('another baseline');f.sealRaw();}
  expect(()=>validateReceiptEvidence(f.payload)).toThrow('RECEIPT_BASELINE_UNRESOLVED');
 });
 it.each(['attempt','task'] as const)('rejects understated %s latency against captured native duration',field=>{
  const f=fixture();if(field==='task')f.row.attempts[0]!.latency_ms=200;
  f.replaceReport(f.row.attempts[0]!.attempt_id,{started_at:new Date(Date.parse(observedAt)-200).toISOString()});
  expect(()=>validateReceiptEvidence(f.payload)).toThrow(field==='attempt'?'RECEIPT_ATTEMPT_LATENCY_UNDERSTATED':'RECEIPT_TASK_LATENCY_UNDERSTATED');
 });
 it('retains unknown latency without replacing it with zero or an inferred duration',()=>{
  const f=fixture();f.row.latency_ms=null;f.row.attempts[0]!.latency_ms=null;
  f.replaceReport(f.row.attempts[0]!.attempt_id,{started_at:new Date(Date.parse(observedAt)-200).toISOString()});
  const result=validateReceiptEvidence(f.payload);expect(result.envelope.observation.latency_ms).toBeNull();expect(result.envelope.observation.attempts[0]!.latency_ms).toBeNull();expect(result.qualification.status).toBe('HOLD');
 });
 it('uses the existing critical-risk independent frontier review before retaining accepted evidence as provisional',()=>{
  const f=fixture(),reviewerQualification=parseSelectionInput(f.review.selection,{mode:'production'});
  expect(evaluateReview({policy:f.input.policy,registry:f.input.registry,implementer:f.worker,reviewer:f.reviewer,risk:'critical',artifactDigest:f.row.provenance.artifact_digest,packageDigest:f.review.packageDigest,implementerSessionId:f.review.implementerSessionId,proof:f.review.proof,reviewerQualification:{...reviewerQualification,candidate:f.reviewer}}).ok).toBe(true);
  const result=validateReceiptEvidence(f.payload);expect(result.qualification.status).toBe('HOLD');expect(result.envelope.observation.accepted).toBe(true);expect(result.envelope.observation.attempts).toHaveLength(2);
 });
 it.each(['raw-hash','source-hash','worker-identity','missing-review','wrong-review-identity','rejected-review','forked-review','changed-artifact','unqualified-reviewer','omitted-worker','omitted-review','missing-attempt-receipt','missing-review-cost','invented-cost','context-mismatch','unknown-role','review-stratum','review-policy','wrong-worker-effort','future-runtime','missing-stream'])( 'refuses %s instead of granting receipt authority',kind=>{
  const f=fixture();
  if(kind==='unknown-role'){f.raw.attempts[0]!.role='unrecognized';f.sealRaw();}
  if(kind==='review-stratum')f.review.selection.request.cohort_id='unrelated_cohort';
  if(kind==='review-policy')f.review.selection.policy.qualification.minimum_tasks=1;
  if(kind==='wrong-worker-effort')f.replaceReport(f.row.attempts[0]!.attempt_id,{observed_identity:{source:'provider_receipt',model_id:f.worker.snapshot_id,effort:'high'}});
  if(kind==='future-runtime')f.replaceReport(f.row.attempts[0]!.attempt_id,{completed_at:new Date(Date.parse(observedAt)+100).toISOString()});
  if(kind==='missing-stream'){const report=f.input.runtimeReports[f.row.provenance.runtime_receipt_digest!];delete f.input.sources[report.stdout_digest];}
  if(kind==='raw-hash')f.payload.capture.receipt_text+=' ';
  if(kind==='source-hash')f.input.sources[f.row.fixture_digest]='tampered source';
  if(kind==='worker-identity'){f.raw.attempts[0]!.candidate_id='unrelated-candidate';f.sealRaw();}
  if(kind==='missing-review')delete f.evidence.review;
  if(kind==='wrong-review-identity')f.replaceReport(f.row.attempts[1]!.attempt_id,{observed_identity:{source:'provider_receipt',model_id:'different-snapshot',effort:'low'}});
  if(kind==='rejected-review')Object.assign(f.review.proof,{outcome:'rejected'});
  if(kind==='forked-review')Object.assign(f.review.proof,{context_kind:'forked'});
  if(kind==='changed-artifact')f.review.proof.artifact_digest=hashBytes('different final artifact');
  if(kind==='unqualified-reviewer')f.review.selection.observations=[];
  if(kind==='omitted-worker'){f.raw.attempts.push({...f.raw.attempts[0]!});f.sealRaw();}
  if(kind==='omitted-review'){f.raw.attempts.push({...f.raw.attempts[1]!});f.sealRaw();}
  if(kind==='missing-attempt-receipt')delete f.evidence.attemptReceipts[f.row.attempts[0]!.attempt_id];
  if(kind==='missing-review-cost'){delete f.evidence.attemptReceipts[f.row.attempts[1]!.attempt_id];f.row.attempts.pop();f.grade(f.row);}
  if(kind==='invented-cost'){f.row.attempts[0]!.cost_usd=0;f.grade(f.row);}
  if(kind==='context-mismatch')f.payload.capture.context.observed_at=new Date(Date.parse(f.input.now)-1).toISOString();
  expect(()=>validateReceiptEvidence(f.payload)).toThrow();
 });
 it('preserves a failed invocation with unknown identity and cost, then returns HOLD through refresh',async()=>{
  const directory=await temp(),f=fixture(0,0,false);
  // A zero success threshold isolates missing-identity/cost HOLD from the
  // independent absolute-success-floor REJECT; failure remains in the denominator.
  f.input.policy.qualification.minimum_success_rate=0;
  f.row.attempts[0]!.cost_usd=null;f.row.attempts[0]!.cost_source='unknown';
  f.replaceReport(f.row.attempts[0]!.attempt_id,{observed_identity:{source:'unknown'},usage:{cost_usd:null}});
  const original=await capture(directory,f),assessed=await assessReceipt({...original,evidence:f.evidence});
  expect(assessed).toMatchObject({status:'VALIDATED_OBSERVATION',qualification:'HOLD',inserted:true});
  expect((await assessReceipt({...original,evidence:f.evidence})).inserted).toBe(false);
  const result=validateReceiptEvidence(f.payload);expect(result.envelope.observation).toMatchObject({passed:false,accepted:false,attempts:[{cost_usd:null,cost_source:'unknown'}]});
  const refreshed=await proposeRefresh({selection:{...f.input,observations:[]},directory:join(directory,'refresh'),mode:'adapter-test',trigger:'SYNTHETIC TEST failed receipt',...assessed.refresh_input});
  expect(refreshed.staged).toBe(false);expect(refreshed.qualifications.find(q=>q.candidate_id===f.worker.candidate_id)).toMatchObject({status:'HOLD',metrics:{tasks:1,accepted:0,total_cost_usd:null}});
  expect(refreshed.evaluation_records).toHaveLength(1);expect(await new Ledger(original.directory).list()).toHaveLength(2);
 });
 it('keeps unknown cost unknown even when independent review accepted the result',()=>{
  const f=fixture();f.row.attempts[0]!.cost_usd=null;f.row.attempts[0]!.cost_source='unknown';f.replaceReport(f.row.attempts[0]!.attempt_id,{usage:{cost_usd:null}});
  const result=validateReceiptEvidence(f.payload);expect(result.qualification.status).toBe('HOLD');expect(result.qualification.metrics.total_cost_usd).toBeNull();expect(result.envelope.observation.accepted).toBe(true);
 });
 it('aggregates assessed receipts into qualification and the existing matched-pair promotion path',async()=>{
  const directory=await temp(),records:string[]=[],fixtures:ReturnType<typeof fixture>[]=[];let ledgerDirectory='';let base:ReturnType<typeof fixture>|undefined;
  for(const candidateIndex of [0,1])for(const taskIndex of [0,1]){
   const f=fixture(candidateIndex,taskIndex);base??=f;fixtures.push(f);
   const captured=await capture(directory,f);ledgerDirectory=captured.directory;
   const assessed=await assessReceipt({...captured,evidence:f.evidence});expect(assessed.qualification).toBe('HOLD');records.push(assessed.recordId);
  }
  const selection={...base!.input,observations:[],incumbentCandidateId:'candidate_beta'};
  const request={selection,directory:join(directory,'refresh'),mode:'adapter-test',trigger:'SYNTHETIC TEST receipt pairing only',evaluationLedgers:[{directory:ledgerDirectory,recordIds:records}]};
  const refreshed=await proposeRefresh(request);
  expect(refreshed.qualifications.map(q=>({id:q.candidate_id,status:q.status,tasks:q.metrics.tasks}))).toEqual([{id:'candidate_alpha',status:'QUALIFIED',tasks:2},{id:'candidate_beta',status:'QUALIFIED',tasks:2}]);
  expect(refreshed.decision.outcome).toBe('PROMOTE');expect(refreshed.diff.proposed_candidate_id).toBe('candidate_alpha');expect(refreshed.evaluation_records).toHaveLength(4);
  expect(refreshed.qualifications[0]!.metrics.cost_per_accepted_task_usd).toBeCloseTo(.011);expect(refreshed.qualifications[1]!.metrics.cost_per_accepted_task_usd).toBeCloseTo(.021);
  expect(await new Ledger(ledgerDirectory).list()).toHaveLength(8);
  // The refresh boundary revalidates the policy that accepted the review.
  const changedPolicy=structuredClone(selection.policy);changedPolicy.qualification.minimum_tasks=3;
  await expect(proposeRefresh({...request,selection:{...selection,policy:changedPolicy}})).rejects.toThrow('RECEIPT_ASSESSMENT_POLICY_CHANGED');
  // Loading the same evidence twice cannot inflate N or economics.
  const duplicate=await proposeRefresh({...request,evaluationLedgers:[{directory:ledgerDirectory,recordIds:[...records,...records]}]});expect(duplicate.qualifications.map(q=>q.metrics.tasks)).toEqual([2,2]);
  // Each candidate remains qualified, but changed fixtures are not paired.
  const unmatched=[...records];
  for(const index of [0,1]){const f=fixtures[index]!,bytes=`SYNTHETIC TEST changed fixture ${index}`;f.row.fixture_digest=hashBytes(bytes);f.input.sources[f.row.fixture_digest]=bytes;f.payload.capture.context.baseline_digest=f.row.fixture_digest;f.raw.starting_artifact_digest=f.row.fixture_digest;f.sealRaw();f.grade(f.row);const captured=await capture(directory,f);unmatched[index]=(await assessReceipt({...captured,evidence:f.evidence})).recordId;}
  const retained=await proposeRefresh({...request,evaluationLedgers:[{directory:ledgerDirectory,recordIds:unmatched}]});expect(retained.qualifications.every(q=>q.status==='QUALIFIED')).toBe(true);expect(retained.decision.outcome).toBe('RETAIN');
 });
});

describe('v4 subscription receipt capability boundary',()=>{
 it('qualifies independently assessed subscription tasks at the unchanged sample floor without billed dollars',async()=>{
  const directory=await temp(),base=fixture(0,0,true,true),records:string[]=[];
  const combined=structuredClone(base.input);combined.observations=[];let ledgerDirectory='';
  expect(combined.policy.policy_version).toBe(4);expect(combined.policy.qualification.minimum_tasks).toBe(20);
  for(let i=0;i<combined.policy.qualification.minimum_tasks;i++){
   const f=fixture(0,i,true,true),captured=await capture(directory,f),assessed=await assessReceipt({...captured,evidence:f.evidence});
   expect(captured.qualification_authority).toBe(false);expect(assessed.qualification).toBe('HOLD');
   records.push(assessed.recordId);ledgerDirectory=captured.directory;
   combined.observations.push(f.row);Object.assign(combined.sources,f.input.sources);Object.assign(combined.runtimeReports,f.input.runtimeReports);
  }
  const input=parseSelectionInput(combined,{mode:'production'}),qualification=qualify({...input,candidate:input.candidates[0]!});
  expect(qualification).toMatchObject({status:'QUALIFIED',metrics:{tasks:20,accepted:20,total_cost_usd:null,cost_per_accepted_task_usd:null}});
  const refreshed=await proposeRefresh({selection:{...combined,observations:[]},directory:join(directory,'refresh'),mode:'adapter-test',trigger:'SYNTHETIC TEST v4 subscription intake',evaluationLedgers:[{directory:ledgerDirectory,recordIds:records}]});
  expect(refreshed.qualifications.find(q=>q.candidate_id===base.worker.candidate_id)).toMatchObject({status:'QUALIFIED',metrics:{tasks:20,total_cost_usd:null}});
  const missingHost={...input,request:{...input.request,execution_environment:'api' as const}};
  expect(qualify({...missingHost,candidate:input.candidates[0]!}).status).toBe('REJECT');
  // A separately qualified API treatment still cannot authorize native Codex.
  const api=structuredClone(combined);api.request.execution_environment='api';
  api.economics={schema_version:'economic_evidence.v1',pricing:[],tasks:[],maintainer_order:api.candidates.map((c:{candidate_id:string})=>c.candidate_id)};
  for(const row of api.observations){const report={...api.runtimeReports[row.provenance.runtime_receipt_digest],execution_environment:'api'},key=digest(report);api.runtimeReports[key]=report;row.provenance.runtime_receipt_digest=key;row.content_digest=contentDigest(row);}
  const apiInput=parseSelectionInput(api,{mode:'production'}),binding=createBinding(apiInput);
  expect(qualify({...apiInput,candidate:apiInput.candidates[0]!}).status).toBe('QUALIFIED');
  expect(()=>renderCodex({binding,selection:apiInput,mode:'production',runtimeVersion:runtimeVersions.openai,outputSchema:{type:'object'}})).toThrow('HOST_EXECUTION_EVIDENCE_REQUIRED');
 });
 it.each(['capture','worker','review'] as const)('refuses missing or API %s environment in a claimed subscription assessment',part=>{
  const f=fixture(0,0,true,true);
  if(part==='capture')Reflect.deleteProperty(f.payload.capture.context,'execution_environment');
  else f.replaceReport(f.row.attempts[part==='worker'?0:1]!.attempt_id,{execution_environment:'api'});
  expect(()=>validateReceiptEvidence(f.payload)).toThrow(/ENVIRONMENT/);
 });
});


describe('v5 receipt configuration assurance is independently rederived',()=>{
 it('assesses preserved native configuration for workers and independent reviewers without writing assurance into observations',()=>{
  const f=fixture(0,0,true,false,true),result=validateReceiptEvidence(f.payload);
  expect(result.qualification.status).toBe('HOLD');
  expect(Object.values(result.identity_assurances)).toHaveLength(2);
  expect(Object.values(result.identity_assurances).every(value=>value.overall==='CONFIGURATION_ATTESTED')).toBe(true);
  expect(result.envelope.observation).not.toHaveProperty('identity_assurance');
  expect(result.envelope.runtimeReports[f.row.provenance.runtime_receipt_digest!]).toHaveProperty('observed_identity.source','unknown');
 });
 it('archives agent assurance claims without authority and refuses them as a substitute for native review configuration',async()=>{
  const f=fixture(0,0,true,false,true),directory=await temp();
  Object.assign(f.raw,{identity_assurance:{overall:'CONFIGURATION_ATTESTED'},model:f.worker.model_id,effort:f.worker.effort});f.sealRaw();
  const captured=await capture(directory,f);expect(captured).toMatchObject({status:'PENDING_EVIDENCE',qualification_authority:false});
  for(const value of Object.values(f.input.runtimeReports) as ReturnType<typeof parseRuntimeReport>[]){delete f.input.sources[value.native_evidence!.request_digest];delete f.review.selection.sources[value.native_evidence!.request_digest];}
  // Runtime report hashes remain intact; the independently captured request is absent.
  expect(()=>validateReceiptEvidence(f.payload)).toThrow('RECEIPT_REVIEW_IDENTITY_ASSURANCE_INSUFFICIENT');
 });
 it('refuses tampered request source and a later contradictory worker identity',()=>{
  for(const mutation of ['configuration','runtime'] as const){
   const f=fixture(0,0,true,false,true),report=f.input.runtimeReports[f.row.provenance.runtime_receipt_digest!];
   if(mutation==='configuration')f.input.sources[report.native_evidence.request_digest]='{"model":"trust-me"}';
   else f.replaceReport(f.row.attempts[0]!.attempt_id,{observed_identity:{source:'provider_receipt',model_id:'gpt-different',effort:f.worker.effort}});
   expect(()=>validateReceiptEvidence(f.payload)).toThrow(/IDENTITY|CONFIGURATION|EVIDENCE|RUNTIME|DIGEST/);
  }
 });
 it('requires policy-sufficient independent review on the current artifact even when historical review tasks qualify',()=>{
  const f=fixture(0,0,true,false,true),report=f.input.runtimeReports[f.review.proof.runtime_receipt_digest];
  delete f.input.sources[report.native_evidence.request_digest];delete f.review.selection.sources[report.native_evidence.request_digest];
  expect(()=>validateReceiptEvidence(f.payload)).toThrow(/IDENTITY|CONFIGURATION|EVIDENCE/);
 });
});


it('v5 medium receipt assessment retains accepted configuration evidence only after a fresh different frontier review',()=>{
 const f=fixture(0,0,true,false,true,'medium');
 expect(f.worker.model_id).not.toBe(f.reviewer.model_id);
 const result=validateReceiptEvidence(f.payload);
 expect(result.qualification.status).toBe('HOLD'); // One task still cannot meet the unchanged 20-task floor.
 expect(result.envelope.observation.accepted).toBe(true);
 expect(Object.values(result.identity_assurances).every(value=>value.overall==='CONFIGURATION_ATTESTED')).toBe(true);
 for(const kind of ['missing','resumed','same-session'] as const){
  const invalid=fixture(0,0,true,false,true,'medium');
  if(kind==='missing')delete invalid.evidence.review;
  if(kind==='resumed')invalid.review.proof.context_kind='resumed' as 'new';
  if(kind==='same-session')invalid.review.proof.session_id=invalid.review.implementerSessionId;
  expect(()=>validateReceiptEvidence(invalid.payload)).toThrow(kind==='missing'?'RECEIPT_INDEPENDENT_REVIEW_REQUIRED':'fresh_review_context_required');
 }
});
