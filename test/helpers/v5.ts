import {readFileSync} from 'node:fs';
import {candidateIdentity,parseRuntimeReport,type TaskObservation,type RuntimeReport,type RiskCategory} from '../../src/schema/index.js';
import {contentDigest,digest,hashBytes} from '../../src/core/canonical.js';
import {loadPolicy,parseSelectionInput,type SelectionInput} from '../../src/governance/index.js';
import {captureIdentityEnvironment,nativeExecutionRequestSchema,nativeExecutionProcessSchema} from '../../src/runtime/identity-assurance.js';

// SYNTHETIC TEST DATA. These fixtures exercise actual v5 policy thresholds and
// raw native capture validation; they are never written to a production ledger.
export function nativeV5(environment:'codex'|'claude_code'='codex',risk:RiskCategory='low'){
 const input=parseSelectionInput(JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8')).selection);
 input.policy=loadPolicy('policy/constitution.json');input.mode='production';input.request.execution_environment=environment;input.request.risk=risk;
 const provider=environment==='codex'?'openai':'anthropic';
 const models=environment==='codex'?['gpt-6-astra','gpt-5.6-terra']:['claude-fable-5-1','claude-sonnet-5'];
 for(const [index,record] of input.registry.records.entries()){
  record.provider=provider;record.model_id=models[index]!;record.snapshot_id=record.model_id;record.frontier=true;record.aliases=['latest'];
  record.pinning!.source='registry_metadata';record.pinning!.immutable_snapshot=null;
  record.supported_serving_settings.json_schema=[false];record.content_digest=contentDigest(record);
 }
 input.registry.content_digest=contentDigest(input.registry);
 for(const [index,candidate] of input.candidates.entries()){
  candidate.provider=provider;candidate.model_id=models[index]!;candidate.snapshot_id=candidate.model_id;candidate.effort='high';candidate.serving.json_schema=false;
  candidate.provenance.registry_content_digest=input.registry.content_digest;
 }
 const sources=new Map(input.sources),runtimeReports=new Map<string,unknown>();input.sources=sources;input.runtimeReports=runtimeReports;
 const add=(bytes:string)=>{const key=hashBytes(bytes);sources.set(key,bytes);return key;};
 const grade=(row:TaskObservation)=>{
  row.provenance.source_digest=add(JSON.stringify({schema_version:'grader_result.v1',task_id:row.task_id,fixture_digest:row.fixture_digest,candidate_identity:row.candidate.candidate_identity,artifact_digest:row.provenance.artifact_digest,passed:row.passed,accepted:row.accepted,checks:[{check_id:'synthetic_boundary_check',passed:row.passed,evidence_digest:add(`SYNTHETIC TEST CHECK ${row.observation_id}: ${row.passed}`)}]}));
  row.content_digest=contentDigest(row);
 };
 const trace=(row:TaskObservation)=>{
  const candidate=input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;
  return environment==='codex'?[{type:'thread.started',thread_id:row.observation_id},{type:'item.completed',item:{type:'agent_message',text:'SYNTHETIC TEST DATA'}},{type:'turn.completed',usage:{input_tokens:10,output_tokens:5}}]:[{type:'assistant',message:{id:row.observation_id,model:candidate.snapshot_id,content:[{type:'text',text:'SYNTHETIC TEST DATA'}]}},{type:'result',subtype:'success',is_error:false,result:'SYNTHETIC TEST DATA'}];
 };
 const report=(row:TaskObservation,patch:{args?:string[];events?:unknown[];observed?:RuntimeReport['observed_identity'];omitNative?:boolean;failed?:boolean}={})=>{
  const candidate=input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;
  const command={executable:environment==='codex'?'codex':'claude',args:patch.args??(environment==='codex'?['exec','--ignore-user-config','--model',candidate.model_id,'-c',`model_reasoning_effort="${candidate.effort}"`,'--json']:['-p','--setting-sources','','--model',candidate.model_id,'--effort',candidate.effort,'--tools','Read,Bash','--output-format','stream-json']),cwd:'/tmp/synthetic-v5-qualification-fixture'};
  const request=nativeExecutionRequestSchema.parse({schema_version:'native_execution_request.v1',execution_environment:environment,candidate_identity:candidateIdentity(candidate),command,environment:captureIdentityEnvironment({}),prompt_digest:add(`SYNTHETIC TEST prompt ${row.task_id}`)});
  const requestDigest=add(JSON.stringify(request)),stdoutDigest=add((patch.events??trace(row)).map(event=>JSON.stringify(event)).join('\n')+'\n'),stderrDigest=add('');
  const process=nativeExecutionProcessSchema.parse({schema_version:'native_execution_process.v1',request_digest:requestDigest,started_at:input.now,completed_at:input.now,exit_code:patch.failed?1:0,signal:null,timed_out:false,spawn_error:null,stdout_digest:stdoutDigest,stderr_digest:stderrDigest});
  const value=parseRuntimeReport({schema_version:'runtime_report.v1',report_id:`test_${row.observation_id}`,provider,execution_environment:environment,candidate_id:candidate.candidate_id,started_at:input.now,completed_at:input.now,command,status:patch.failed?'failed':'completed',exit_code:patch.failed?1:0,signal:null,timeout_ms:1000,stdout_digest:stdoutDigest,stderr_digest:stderrDigest,observed_identity:patch.observed??{source:'unknown'},...(patch.omitNative?{}:{native_evidence:{request_digest:requestDigest,process_digest:add(JSON.stringify(process)),version_digest:add(environment==='codex'?'codex-cli 0.154.0\n':'2.1.267 (Claude Code)\n')}})});
  const key=digest(value);runtimeReports.set(key,value);row.provenance.runtime_receipt_digest=key;grade(row);return value;
 };
 for(const row of input.observations){
  const candidate=input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!,task=input.policy.task_classes.find(c=>c.task_class_id===row.task_class_id)!;
  row.lane='production';row.risk=risk;row.candidate.candidate_identity=candidateIdentity(candidate);row.harness_version=task.eval_bucket.harness_version;row.grader_version=task.eval_bucket.grader_version;
  row.attempts[0]!.cost_usd=null;row.attempts[0]!.cost_source='unknown';row.provenance.source='native_runtime';report(row);
 }
 return {input,sources,runtimeReports,add,grade,report,trace};
}
