import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parseSelectionInput,qualify,select,evaluateReview,type SelectionInput} from '../../src/governance/index.js';
import {digest,contentDigest,hashBytes} from '../../src/core/canonical.js';
import {candidateIdentity,parseRuntimeReport,type TaskObservation} from '../../src/schema/index.js';
const example=()=>parseSelectionInput(JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8')).selection);
function sample(count:number):SelectionInput{
 const input=example(); const rows:TaskObservation[]=[];const sources=new Map(input.sources);
 for(let c=0;c<input.candidates.length;c++)for(let i=0;i<count;i++){
  const row=structuredClone(input.observations[c*20+i%20]!);row.observation_id=`observation_${c}_${i}`;row.task_id=`task_${i}`;
  const source=`synthetic independent task ${i}`;row.fixture_digest=hashBytes(source);sources.set(row.fixture_digest,source);
  row.attempts[0]!.attempt_id=`attempt_${c}_${i}`;row.content_digest=contentDigest(row);rows.push(row);
 }
 return {...input,observations:rows,sources};
}
// This constructs native-shaped receipts solely to exercise policy gates; it is never published as performance evidence.
function productionExample(identity: 'known'|'unknown'|'wrong-model'|'wrong-effort'|'missing-effort'): SelectionInput {
 const input=example(); input.mode='production';
 for(const record of input.registry.records){record.provider='openai';record.pinning!.source='registry_metadata';record.content_digest=contentDigest(record);}
 input.registry.content_digest=contentDigest(input.registry);
 for(const candidate of input.candidates){candidate.provider='openai';candidate.provenance.registry_content_digest=input.registry.content_digest;}
 const sources=new Map(input.sources);const runtimeReports=new Map<string,unknown>();
 const add=(value:string)=>{const key=hashBytes(value);sources.set(key,value);return key;};
 for(const row of input.observations){
  const candidate=input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;
  row.lane='production';row.candidate.candidate_identity=candidateIdentity(candidate);
  const receipt=parseRuntimeReport({schema_version:'runtime_report.v1',report_id:`report_${row.observation_id}`,provider:'openai',candidate_id:candidate.candidate_id,started_at:input.now,completed_at:input.now,command:{executable:'test-native-fixture',args:[],cwd:'/tmp'},status:'completed',exit_code:0,signal:null,timeout_ms:1000,stdout_digest:add('captured stdout'),stderr_digest:add(''),observed_identity:identity==='unknown'?{source:'unknown'}:{source:'provider_receipt',model_id:identity==='wrong-model'?'different-snapshot':candidate.snapshot_id,...(identity==='missing-effort'?{}:{effort:identity==='wrong-effort'?'high':candidate.effort})}});
  const receiptDigest=digest(receipt);runtimeReports.set(receiptDigest,receipt);
  const grader=JSON.stringify({schema_version:'grader_result.v1',task_id:row.task_id,fixture_digest:row.fixture_digest,candidate_identity:row.candidate.candidate_identity,artifact_digest:row.provenance.artifact_digest,passed:true,accepted:true,checks:[{check_id:'fixture_check',passed:true,evidence_digest:add('captured grader result')}]});
  row.provenance={...row.provenance,source:'native_runtime',source_digest:add(grader),runtime_receipt_digest:receiptDigest};row.content_digest=contentDigest(row);
 }
 return {...input,sources,runtimeReports};
}
const first=(input:SelectionInput)=>qualify({...input,candidate:input.candidates[0]!});
describe('qualification and selection',()=>{
 it('selects cheapest qualified initial candidate without a promotion comparison',()=>{
  const result=select(example());expect(result.decision.outcome).toBe('SELECT');expect(result.selected?.candidate_id).toBe('candidate_alpha');expect(result.qualifications.every(q=>q.status==='QUALIFIED')).toBe(true);
 });
 it.each(['unknown-candidate','wrong-identity','duplicate-id'])('rejects selection-wide %s evidence',kind=>{
  const input=example();const row=structuredClone(input.observations[0]!);
  if(kind==='unknown-candidate')row.candidate.candidate_id='orphan';
  if(kind==='wrong-identity')row.candidate.candidate_identity=digest('wrong');
  row.observation_id=kind==='duplicate-id'?input.observations[1]!.observation_id:'extra_observation';
  expect(()=>select({...input,observations:[...input.observations,row]})).toThrow();
 });
 it('does not make an unavailable alternative poison an available candidate',()=>{
  const input=example();input.registry.records[1]!.lifecycle='unavailable';input.registry.records[1]!.content_digest=contentDigest(input.registry.records[1]!);input.registry.content_digest=contentDigest(input.registry);for(const candidate of input.candidates)candidate.provenance.registry_content_digest=input.registry.content_digest;
  expect(select(input).selected?.candidate_id).toBe('candidate_alpha');
 });
 it.each(['known','unknown','wrong-model','wrong-effort','missing-effort'] as const)('requires native snapshot and effort identity: %s',kind=>{
  const result=first(productionExample(kind));expect(result.status).toBe(kind==='known'?'QUALIFIED':kind==='unknown'||kind==='missing-effort'?'HOLD':'REJECT');
  if(kind!=='known')expect(result.diagnostics.map(d=>d.rule_id)).toContain(kind==='unknown'||kind==='missing-effort'?'runtime_identity_unverified':'runtime_identity_mismatch');
 });
 it('retains incumbent when paired evidence is insufficient',()=>{
  const result=select({...example(),incumbentCandidateId:'candidate_beta'});expect(result.decision.outcome).toBe('RETAIN');expect(result.selected?.candidate_id).toBe('candidate_beta');
 });
 it('promotes cheaper noninferior candidate from sufficient raw same-task observations',()=>{
  expect(select({...sample(600),incumbentCandidateId:'candidate_beta'}).decision.outcome).toBe('PROMOTE');
 });
 it('requires measured superiority and bounded cost for a more expensive challenger',()=>{
  const input=sample(600);for(const row of input.observations){if(row.candidate.candidate_id==='candidate_alpha'&&Number(row.task_id.split('_')[1])%10===0){row.passed=false;row.accepted=false;}if(row.candidate.candidate_id==='candidate_beta')row.attempts[0]!.cost_usd=.0115;row.content_digest=contentDigest(row);}
  expect(select({...input,incumbentCandidateId:'candidate_alpha'}).decision.outcome).toBe('PROMOTE');
  for(const row of input.observations.filter(r=>r.candidate.candidate_id==='candidate_beta')){row.attempts[0]!.cost_usd=.02;row.content_digest=contentDigest(row);}
  expect(select({...input,incumbentCandidateId:'candidate_alpha'}).decision.outcome).toBe('RETAIN');
 });
 it('counts failure, review and frontier rework costs rather than successful worker costs alone',()=>{
  const input=example();const rows=input.observations.filter(r=>r.candidate.candidate_id==='candidate_alpha');rows[0]!.accepted=false;rows[0]!.passed=false;
  rows[0]!.attempts.push({attempt_id:'review_extra',kind:'review',cost_usd:1,cost_source:'measured',latency_ms:10},{attempt_id:'rework_extra',kind:'rework',cost_usd:2,cost_source:'measured',latency_ms:20});rows[0]!.content_digest=contentDigest(rows[0]!);
  const result=first(input);expect(result.metrics.total_cost_usd).toBeCloseTo(3.2);expect(result.metrics.cost_per_accepted_task_usd).toBeCloseTo(3.2/19);
 });
 it.each(['synthetic-production','cost-unknown','tamper','future','duplicate','capability','provider','privacy','local','constraint-hash','stale','cohort','cost-ceiling'])( 'enforces %s',kind=>{
  let input=example();const row=input.observations[0]!;
  if(kind==='synthetic-production')input={...input,mode:'production'};
  if(kind==='cost-unknown'){row.attempts[0]!.cost_usd=null;row.attempts[0]!.cost_source='unknown';}
  if(kind==='tamper')row.accepted=false;
  if(kind==='future')row.measured_at='2099-01-01T00:00:00.000Z';
  if(kind==='duplicate')input={...input,observations:[...input.observations,row]};
  if(kind==='capability')input.request.required_capabilities=['vision'];
  if(kind==='provider')input.request.constraints.requires_provider='openai';
  if(kind==='privacy')input.request.constraints.privacy_requirement='no_retention';
  if(kind==='local'){input.request.constraints.requires_local_execution=true;input.registry.records[0]!.capabilities=['terminal'];input.registry.records[0]!.content_digest=contentDigest(input.registry.records[0]!);input.registry.content_digest=contentDigest(input.registry);for(const c of input.candidates)c.provenance.registry_content_digest=input.registry.content_digest;}
  if(['provider','privacy','local'].includes(kind)){input.request.constraints_digest=digest(input.request.constraints);for(const o of input.observations){o.constraints_digest=input.request.constraints_digest;o.content_digest=contentDigest(o);}}
  if(kind==='constraint-hash')input.request.constraints.max_cost_usd=.001;
  if(kind==='stale')input={...input,now:'2026-12-01T00:00:00.000Z'};
  if(kind==='cohort')input.request.cohort_id='different_cohort';
  if(kind==='cost-ceiling')input.request.max_cost_usd=.001;
  if(kind!=='tamper')row.content_digest=contentDigest(row);
  expect(first(input).status).not.toBe('QUALIFIED');
 });
 it('does not promote unmatched fixture revisions',()=>{
  const input=sample(600);for(const row of input.observations.filter(o=>o.candidate.candidate_id==='candidate_alpha')){const text='different '+row.task_id;row.fixture_digest=hashBytes(text);(input.sources as Map<string,string>).set(row.fixture_digest,text);row.content_digest=contentDigest(row);}
  expect(select({...input,incumbentCandidateId:'candidate_beta'}).decision.outcome).toBe('RETAIN');
 });
 it('requires independently qualified family, new context and final reviewed digest',()=>{
  const input=example();const reviewer=input.candidates[1]!;
  const reviewerInput={...input,candidate:reviewer,request:{...input.request,role_id:'reviewer',risk:'critical' as const},observations:input.observations.map(o=>{const x={...o,role_id:'reviewer',risk:'critical' as const};return {...x,content_digest:contentDigest(x)};})};
  const base={policy:input.policy,registry:input.registry,implementer:input.candidates[0]!,reviewer,risk:'critical' as const,artifactDigest:digest('final'),packageDigest:digest('package'),implementerSessionId:'implementation-session',reviewerQualification:reviewerInput,proof:{outcome:'accepted' as const,artifact_digest:digest('final'),package_digest:digest('package'),runtime_receipt_digest:digest('receipt'),session_id:'new-session',parent_session_id:null,context_kind:'new' as const,inherited_context_digest:null}};
  expect(evaluateReview(base).ok).toBe(true);
  expect(evaluateReview({...base,artifactDigest:digest('edited')}).diagnostics.map(d=>d.rule_id)).toContain('review_artifact_changed');
  expect(evaluateReview({...base,proof:{...base.proof,context_kind:'forked'}}).ok).toBe(false);
  expect(evaluateReview({...base,reviewer:input.candidates[0]!}).ok).toBe(false);
  expect(candidateIdentity(reviewer)).not.toBe(candidateIdentity(input.candidates[0]!));
 });
});
