import {describe,expect,it} from 'vitest';
import {parseRuntimeReport} from '../../src/schema/index.js';
import {contentDigest,digest} from '../../src/core/canonical.js';
import {loadPolicy,qualify,evaluateReview,select,createBinding,validateBinding,type SelectionInput} from '../../src/governance/index.js';
import {nativeV5 as fixture} from '../helpers/v5.js';

const first=(input:SelectionInput)=>qualify({...input,candidate:input.candidates[0]!});

describe('v5 subscription qualification derived from preserved host evidence',()=>{
 it.each(['codex','claude_code'] as const)('makes 20 exact %s tasks capability-qualified with truthful uncertainty and no billed dollars',environment=>{
  const {input}=fixture(environment),result=first(input);
  expect(result.status,result.diagnostics.map(d=>`${d.rule_id}: ${d.message}`).join('\n')).toBe('QUALIFIED');
  expect(result.metrics).toMatchObject({tasks:20,accepted:20,success_rate:1,total_cost_usd:null,cost_per_accepted_task_usd:null});
  expect(result.identity_assurance).toMatchObject({overall:environment==='codex'?'CONFIGURATION_ATTESTED':'PARTIALLY_RUNTIME_ATTESTED',execution_environment:environment,model:{value:input.candidates[0]!.model_id,assurance:environment==='codex'?'host_configuration':'runtime_attested'},effort:{value:'high',assurance:'host_configuration'}});
  expect(result.identity_assurance!.limitations).toContain('No host fallback was configured; provider-side fallback state is not independently attested.');
  expect(input.registry.records[0]!.pinning!.immutable_snapshot).toBeNull();
 });
 it('does not count a receipt claim without captured native configuration',()=>{
  const f=fixture(),row=f.input.observations[0]!;f.report(row,{omitNative:true,observed:{source:'runtime_report',model_id:f.input.candidates[0]!.model_id,effort:'high'}});
  const result=first(f.input);expect(result.status).toBe('HOLD');expect(result.metrics.tasks).toBe(19);expect(result.diagnostics.map(d=>d.rule_id)).toContain('identity_assurance_insufficient');
 });
 it.each(['missing-capture','missing-environment','expired'] as const)('qualifies from 20 admissible tasks despite an additional %s observation',kind=>{
  const rule=kind==='expired'?'evidence_expired':kind==='missing-environment'?'runtime_environment_unverified':'identity_assurance_insufficient';
  const f=fixture(),row=structuredClone(f.input.observations[0]!);row.observation_id='ignored_unverifiable';row.task_id='ignored_task';row.attempts[0]!.attempt_id='ignored_attempt';
  const baseline=first(f.input);
  const report=f.report(row,{omitNative:kind==='missing-capture',observed:{source:'runtime_report',model_id:f.input.candidates[0]!.model_id,effort:'high'}});
  if(kind==='missing-environment'){
   delete report.execution_environment;row.provenance.runtime_receipt_digest=digest(report);f.runtimeReports.set(digest(report),report);
  }
  if(kind==='expired')row.measured_at='2026-08-01T00:00:00.000Z';
  f.grade(row);f.input.observations=[...f.input.observations,row];
  const result=first(f.input);expect(result.status).toBe('QUALIFIED');expect(result.metrics).toEqual(baseline.metrics);expect(result.identity_assurance).toEqual(baseline.identity_assurance);
  expect(result.observations).not.toContainEqual(row);expect(result.diagnostics).toContainEqual(expect.objectContaining({rule_id:rule,effect:'ignored_evidence',observation_id:row.observation_id}));
  f.input.economics={schema_version:'economic_evidence.v1',pricing:[],tasks:[],maintainer_order:f.input.candidates.map(c=>c.candidate_id)};
  expect(select(f.input).selected?.candidate_id).toBe(f.input.candidates[0]!.candidate_id);
  expect(validateBinding(createBinding(f.input),f.input).ok).toBe(true);
 });
 it('holds when expired evidence leaves only 19 current admissible tasks',()=>{
  const f=fixture(),row=f.input.observations[0]!;row.measured_at='2026-08-01T00:00:00.000Z';f.grade(row);
  const result=first(f.input);expect(result.status).toBe('HOLD');expect(result.metrics.tasks).toBe(19);
  expect(result.diagnostics).toContainEqual(expect.objectContaining({rule_id:'insufficient_tasks'}));
 });
 it('cannot hide a prohibited security failure in otherwise ignored evidence',()=>{
  const f=fixture(),row=structuredClone(f.input.observations[0]!);row.observation_id='security_observation';row.task_id='security_task';row.attempts[0]!.attempt_id='security_attempt';row.failure_categories=['security_incident'];
  f.report(row,{omitNative:true});f.input.observations=[...f.input.observations,row];
  const result=first(f.input);expect(result.status).toBe('REJECT');expect(result.metrics.tasks).toBe(20);expect(result.diagnostics.map(d=>d.rule_id)).toContain('failure_category_ceiling');
 });
 it('matching caller-written observed identity cannot upgrade raw configuration assurance',()=>{
  const f=fixture();for(const row of f.input.observations){const candidate=f.input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;f.report(row,{observed:{source:'provider_receipt',model_id:candidate.snapshot_id,effort:candidate.effort}});}
  expect(first(f.input).identity_assurance!.overall).toBe('CONFIGURATION_ATTESTED');
 });
 it.each(['model','effort','fallback','native-request','native-source'] as const)('refuses conflicting or unresolved raw %s authority',kind=>{
  const f=fixture(),row=f.input.observations[0]!,candidate=f.input.candidates[0]!;
  if(kind==='model')f.report(row,{args:['exec','--ignore-user-config','--model','gpt-5.6-terra','-c','model_reasoning_effort="high"','--json']});
  if(kind==='effort')f.report(row,{args:['exec','--ignore-user-config','--model',candidate.model_id,'-c','model_reasoning_effort="medium"','--json']});
  if(kind==='fallback')f.report(row,{args:['exec','--ignore-user-config','--model',candidate.model_id,'-c','model_reasoning_effort="high"','--fallback-model','gpt-5.6-terra','--json']});
  const report=parseRuntimeReport(f.runtimeReports.get(row.provenance.runtime_receipt_digest!));
  if(kind==='native-request'){
   const raw=JSON.parse(f.sources.get(report.native_evidence!.request_digest) as string);raw.candidate_identity=digest('another-treatment');report.native_evidence!.request_digest=f.add(JSON.stringify(raw));
   row.provenance.runtime_receipt_digest=digest(report);f.runtimeReports.set(digest(report),report);f.grade(row);
  }
  if(kind==='native-source')f.sources.delete(report.native_evidence!.process_digest);
  const result=first(f.input);expect(result.status).toBe(kind==='native-source'?'HOLD':'REJECT');expect(result.metrics.tasks).toBe(19);
 });
 it.each(['inline-settings','file-settings','agent','agents','plugin'] as const)('does not attest unresolved identity-bearing Claude %s configuration',kind=>{
  const f=fixture('claude_code'),row=f.input.observations[0]!,candidate=f.input.candidates[0]!;
  const args=['--print','--setting-sources','','--model',candidate.model_id,'--effort','high','--tools','Read'];
  if(kind==='inline-settings')args.push('--settings',JSON.stringify({env:{ANTHROPIC_BASE_URL:'https://example.invalid',ANTHROPIC_MODEL:'claude-sonnet-5'}}));
  if(kind==='file-settings')args.push('--settings','/tmp/synthetic-identity-override.json');
  if(kind==='agent')args.push('--agent','model-overriding-agent');
  if(kind==='agents')args.push('--agents',JSON.stringify({worker:{model:'claude-sonnet-5'}}));
  if(kind==='plugin')args.push('--plugin-dir','/tmp/synthetic-model-plugin');
  const report=f.report(row,{args});
  if(kind==='file-settings'){
   const request=JSON.parse(f.sources.get(report.native_evidence!.request_digest) as string);
   request.configuration_files=[{path:'/tmp/synthetic-identity-override.json',content_digest:f.add(JSON.stringify({env:{ANTHROPIC_MODEL:'claude-sonnet-5'}}))}];
   report.native_evidence!.request_digest=f.add(JSON.stringify(request));
   const process=JSON.parse(f.sources.get(report.native_evidence!.process_digest) as string);process.request_digest=report.native_evidence!.request_digest;report.native_evidence!.process_digest=f.add(JSON.stringify(process));
   row.provenance.runtime_receipt_digest=digest(report);f.runtimeReports.set(digest(report),report);f.grade(row);
  }
  const result=first(f.input);expect(result.status).not.toBe('QUALIFIED');expect(result.metrics.tasks).toBe(19);
 });
 it.each(['model','effort'] as const)('a later contradictory observed %s invalidates previously accepted configuration evidence',field=>{
  const f=fixture(),row=structuredClone(f.input.observations[0]!);row.observation_id='later_contradiction';row.task_id='later_task';row.attempts[0]!.attempt_id='later_attempt';
  expect(first(f.input).status).toBe('QUALIFIED');
  f.report(row,{events:[{type:'item.completed',item:{type:'agent_message',text:'SYNTHETIC TEST DATA'}},{type:'turn.completed',served_model:field==='model'?'gpt-5.6-terra':f.input.candidates[0]!.model_id,served_effort:field==='effort'?'medium':'high'}]});f.input.observations=[...f.input.observations,row];
  const result=first(f.input);expect(result.status).toBe('REJECT');expect(result.metrics.tasks).toBe(20);expect(result.diagnostics.map(d=>d.rule_id)).toContain('runtime_identity_mismatch');
 });
 it('rejects raw runtime substitution rather than downgrading Claude model evidence',()=>{
  const f=fixture('claude_code'),row=f.input.observations[0]!;
  f.report(row,{events:[{type:'assistant',message:{id:'mismatch',model:'claude-sonnet-5'}},{type:'result',subtype:'success',is_error:false}]});
  const result=first(f.input);expect(result.status).toBe('REJECT');expect(result.diagnostics.map(d=>d.rule_id)).toContain('runtime_identity_mismatch');
 });
 it('a failed terminal event cannot hide explicit fallback behind an otherwise acceptable success rate',()=>{
  const f=fixture('claude_code'),row=f.input.observations[0]!;row.accepted=false;row.passed=false;
  f.report(row,{failed:true,events:[{type:'assistant',message:{id:row.observation_id,model:f.input.candidates[0]!.snapshot_id}},{type:'result',subtype:'error_during_execution',is_error:true,fallback_used:true}]});
  const result=first(f.input);expect(result.status).toBe('REJECT');expect(result.diagnostics.map(d=>d.rule_id)).toContain('runtime_identity_mismatch');
 });
 it('does not upgrade an earlier weaker task merely because later tasks expose stronger model identity',()=>{
  const f=fixture('claude_code'),row=f.input.observations[0]!;f.report(row,{events:[{type:'assistant',message:{id:'no-model',content:[{type:'text',text:'SYNTHETIC TEST'}]}},{type:'result',subtype:'success',is_error:false}]});
  const result=first(f.input);expect(result.status).toBe('QUALIFIED');expect(result.identity_assurance!.overall).toBe('CONFIGURATION_ATTESTED');expect(result.identity_assurance!.model.assurance).toBe('host_configuration');
 });
 it.each(['codex','claude_code'] as const)('future stronger %s telemetry upgrades assurance through parsing',environment=>{
  const f=fixture(environment);
  for(const row of f.input.observations){
   const candidate=f.input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;
   const events=environment==='codex'?[{type:'item.completed',item:{type:'agent_message',text:'SYNTHETIC TEST DATA'}},{type:'turn.completed',served_model:candidate.snapshot_id,served_effort:candidate.effort}]:[{type:'assistant',message:{id:row.observation_id,model:candidate.snapshot_id,served_effort:candidate.effort}},{type:'result',subtype:'success',is_error:false}];
   f.report(row,{events});
  }
  const result=first(f.input);expect(result.status).toBe('QUALIFIED');expect(result.identity_assurance!.overall).toBe('RUNTIME_ATTESTED');
 });
 it.each(['api','claude_code'] as const)('cannot relabel %s evidence as Codex capability',environment=>{
  const f=fixture(environment==='api'?'codex':'claude_code');
  if(environment==='api')for(const row of f.input.observations){
   const report=parseRuntimeReport(f.runtimeReports.get(row.provenance.runtime_receipt_digest!));report.execution_environment='api';report.observed_identity={source:'provider_receipt',model_id:f.input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!.snapshot_id,effort:'high'};
   row.provenance.runtime_receipt_digest=digest(report);f.runtimeReports.set(digest(report),report);f.grade(row);
  }
  f.input.request.execution_environment='codex';expect(first(f.input).status).toBe('REJECT');
 });
 it('keeps independently qualified fresh frontier review mandatory for medium',()=>{
  const f=fixture('codex','medium'),input=f.input,worker=input.candidates[0]!,reviewer=input.candidates[1]!;
  const reviewerRows=input.observations.filter(o=>o.candidate.candidate_id===reviewer.candidate_id).map(o=>{const row={...o,role_id:'reviewer'};f.grade(row);return row;});
  const reviewerQualification={...input,candidate:reviewer,request:{...input.request,role_id:'reviewer'},observations:reviewerRows};
  expect(qualify(reviewerQualification).status).toBe('QUALIFIED');
  const base={policy:input.policy,registry:input.registry,implementer:worker,reviewer,risk:'medium' as const,artifactDigest:digest('SYNTHETIC TEST artifact'),packageDigest:digest('SYNTHETIC TEST package'),implementerSessionId:'worker-session',reviewerQualification,proof:{outcome:'accepted' as const,artifact_digest:digest('SYNTHETIC TEST artifact'),package_digest:digest('SYNTHETIC TEST package'),runtime_receipt_digest:reviewerRows[0]!.provenance.runtime_receipt_digest,session_id:'fresh-review-session',parent_session_id:null,context_kind:'new' as const,inherited_context_digest:null}};
  expect(evaluateReview(base).ok).toBe(true);
  expect(evaluateReview({...base,proof:{...base.proof,context_kind:'forked'}}).diagnostics.map(d=>d.rule_id)).toContain('fresh_review_context_required');
  expect(evaluateReview({...base,reviewer:worker}).diagnostics.map(d=>d.rule_id)).toContain('review_model_not_independent');
  const noProof={...base};Reflect.deleteProperty(noProof,'proof');expect(evaluateReview(noProof).diagnostics.map(d=>d.rule_id)).toContain('review_required');
 });
 it.each(['high','critical'] as const)('does not broaden %s risk for configuration-only identity',risk=>{
  const f=fixture('codex',risk);for(const record of f.input.registry.records){record.pinning!.immutable_snapshot=true;record.content_digest=contentDigest(record);}f.input.registry.content_digest=contentDigest(f.input.registry);for(const candidate of f.input.candidates)candidate.provenance.registry_content_digest=f.input.registry.content_digest;
  const result=first(f.input);expect(result.status).toBe('HOLD');expect(result.metrics.tasks).toBe(0);expect(result.diagnostics.map(d=>d.rule_id)).toContain('identity_assurance_insufficient');
 });
 it.each(['minimum-tasks','success-floor','duplicate-task','duplicate-attempt','stale','latency','failure-ceiling'] as const)('preserves the unchanged %s requirement',kind=>{
  const f=fixture(),row=f.input.observations[0]!;
  if(kind==='minimum-tasks')f.input.observations=f.input.observations.filter(o=>o.observation_id!==row.observation_id);
  if(kind==='success-floor')for(const item of f.input.observations.slice(0,3)){item.accepted=false;item.passed=false;f.grade(item);}
  if(kind==='duplicate-task'){row.task_id=f.input.observations[1]!.task_id;f.grade(row);}
  if(kind==='duplicate-attempt'){row.attempts[0]!.attempt_id=f.input.observations[1]!.attempts[0]!.attempt_id;f.grade(row);}
  if(kind==='stale')f.input.now='2026-12-01T00:00:00.000Z';
  if(kind==='latency')for(const item of f.input.observations){item.latency_ms=300001;f.grade(item);}
  if(kind==='failure-ceiling'){row.failure_categories=['security_incident'];f.grade(row);}
  expect(first(f.input).status).not.toBe('QUALIFIED');
 });
 it('historical v4 retains runtime identity semantics without relabeling native evidence',()=>{
  const f=fixture();f.input.policy=loadPolicy('policy/constitution-v4.json');
  for(const record of f.input.registry.records){record.pinning!.immutable_snapshot=true;record.content_digest=contentDigest(record);}f.input.registry.content_digest=contentDigest(f.input.registry);for(const candidate of f.input.candidates)candidate.provenance.registry_content_digest=f.input.registry.content_digest;
  const result=first(f.input);expect(result.status).toBe('HOLD');expect(result.identity_assurance).toBeUndefined();expect(result.diagnostics.map(d=>d.rule_id)).toContain('runtime_identity_unverified');
 });
});
