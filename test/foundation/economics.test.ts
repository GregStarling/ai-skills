import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parseSelectionInput,qualify,select,createBinding,validateBinding,assessEconomics,apiTokenCategories,loadPolicy,type SelectionInput,type EconomicEvidence} from '../../src/governance/index.js';
import {candidateIdentity,parseRuntimeReport,type TaskObservation} from '../../src/schema/index.js';
import {contentDigest,digest,hashBytes} from '../../src/core/canonical.js';

// Native-shaped SYNTHETIC TEST DATA exercises trust boundaries; no model calls,
// production ledger writes, subscription bills, or empirical performance claims.
function fixture(){
 const input=parseSelectionInput(JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8')).selection);
 input.policy.policy_version=4;delete input.policy.qualification.maximum_cost_per_accepted_task_usd;
 for(const rule of Object.values(input.policy.review)){rule.required=true;rule.frontier=true;}
 input.policy.economics={primary_metric:'api_equivalent_cost_per_accepted_task_usd',proxy_currency:'official_api_pricing',selection_rule:'cheapest_capability_qualified',maximum_cost_per_accepted_task_usd:5,pricing_max_age_days:30,promotion_requires_measured:true};
 input.mode='production';input.request.execution_environment='codex';
 for(const record of input.registry.records){record.provider='openai';record.pinning!.source='registry_metadata';record.content_digest=contentDigest(record);}
 input.registry.content_digest=contentDigest(input.registry);
 for(const candidate of input.candidates){candidate.provider='openai';candidate.provenance.registry_content_digest=input.registry.content_digest;}
 const sources=new Map(input.sources),runtimeReports=new Map<string,unknown>();input.sources=sources;input.runtimeReports=runtimeReports;
 const add=(bytes:string)=>{const key=hashBytes(bytes);sources.set(key,bytes);return key;};
 const grade=(row:TaskObservation)=>{row.provenance.source_digest=add(JSON.stringify({schema_version:'grader_result.v1',task_id:row.task_id,fixture_digest:row.fixture_digest,candidate_identity:row.candidate.candidate_identity,artifact_digest:row.provenance.artifact_digest,passed:row.passed,accepted:row.accepted,checks:[{check_id:'test_check',passed:row.passed,evidence_digest:add(`SYNTHETIC TEST grade ${row.observation_id}: ${row.passed}`)}]}));row.content_digest=contentDigest(row);};
 const report=(row:TaskObservation,environment:'api'|'codex',stdout:string,id=row.observation_id)=>{
  const candidate=input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;
  const value=parseRuntimeReport({schema_version:'runtime_report.v1',report_id:`test_${id}`,provider:'openai',execution_environment:environment,candidate_id:candidate.candidate_id,started_at:input.now,completed_at:input.now,command:{executable:'SYNTHETIC_TEST_ONLY',args:[],cwd:'/tmp'},status:row.passed?'completed':'failed',exit_code:row.passed?0:1,signal:null,timeout_ms:1000,stdout_digest:add(stdout),stderr_digest:add('test stderr'),observed_identity:{source:'provider_receipt',model_id:candidate.snapshot_id,effort:candidate.effort}});
  const key=digest(value);runtimeReports.set(key,value);return key;
 };
 for(const row of input.observations){
  const candidate=input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;row.lane='production';row.candidate.candidate_identity=candidateIdentity(candidate);
  row.attempts[0]!.cost_usd=null;row.attempts[0]!.cost_source='unknown';
  row.provenance={...row.provenance,source:'native_runtime',runtime_receipt_digest:report(row,'codex','test host output with no USD')};grade(row);
 }
 const economics:EconomicEvidence={schema_version:'economic_evidence.v1',pricing:[],tasks:[],maintainer_order:input.candidates.map(c=>c.candidate_id)};input.economics=economics;
 const price=(index:number,inputRate:number,outputRate:number,cachedRate:number|null=null,writeRate:number|null=null)=>{
  const candidate=input.candidates[index]!;
  const body=`Model ID: \`${candidate.model_id}\`\n- Default snapshot: \`${candidate.snapshot_id}\`\n| Input | $${inputRate} | 1M tokens |\n| Output | $${outputRate} | 1M tokens |\n${cachedRate===null?'':`| Cached input | $${cachedRate} | 1M tokens |\n`}${writeRate===null?'':`| Cache writes | $${writeRate} | 1M tokens |\n`}`;
  const entry={candidate_identity:candidateIdentity(candidate),source:{url:`https://developers.openai.com/api/docs/models/${candidate.model_id}`,kind:'openai_model' as const,version:'SYNTHETIC_TEST_PRICE_SOURCE'},source_digest:add(body),checked_at:input.now};
  economics.pricing=economics.pricing.filter(p=>p.candidate_identity!==entry.candidate_identity);economics.pricing.push(entry);
 };
 const apiTask=(host:TaskObservation,usage:unknown={input_tokens:100000,output_tokens:1000},accepted=host.accepted)=>{
  const row=structuredClone(host);row.observation_id=`api_${host.observation_id}`;row.attempts=row.attempts.map(a=>({...a,attempt_id:`api_${a.attempt_id}`}));row.accepted=accepted;row.passed=accepted;
  const candidate=input.candidates.find(c=>c.candidate_id===row.candidate.candidate_id)!;
  const raw=JSON.stringify({model:candidate.snapshot_id,service_tier:'default',usage});
  row.provenance.runtime_receipt_digest=report(row,'api',raw);grade(row);
  const attempt={attempt_id:row.attempts[0]!.attempt_id,candidate_id:candidate.candidate_id,candidate_identity:candidateIdentity(candidate),runtime_receipt_digest:row.provenance.runtime_receipt_digest,usage_source_digest:hashBytes(raw)};
  economics.tasks.push({observation:row,attempts:[attempt]});return economics.tasks.at(-1)!;
 };
 price(0,1,2);price(1,10,20);
 return {input,sources,runtimeReports,economics,add,grade,report,price,apiTask};
}
const first=(input:SelectionInput)=>qualify({...input,candidate:input.candidates[0]!});

describe('v4 subscription capability and normalized API economics',()=>{
 it('preserves v3 policy history and moves the same ceiling into explicit v4 economics',()=>{
  const old=loadPolicy('policy/constitution-v3.json'),current=loadPolicy('policy/constitution-v4.json');expect(old.policy_version).toBe(3);expect(current.policy_version).toBe(4);
  expect(current.qualification).toEqual(Object.fromEntries(Object.entries(old.qualification).filter(([key])=>key!=='maximum_cost_per_accepted_task_usd')));
  expect(current.economics!.maximum_cost_per_accepted_task_usd).toBe(old.qualification.maximum_cost_per_accepted_task_usd);expect(current.review).toEqual(old.review);
 });
 it('qualifies sufficient exact host evidence without USD while explicit old policy retains cost_unknown HOLD',()=>{
  const {input}=fixture();expect(first(input).status).toBe('QUALIFIED');expect(first(input).metrics.cost_per_accepted_task_usd).toBeNull();
  input.policy.policy_version=3;delete input.policy.economics;input.policy.qualification.maximum_cost_per_accepted_task_usd=5;
  expect(first(input).status).toBe('HOLD');expect(first(input).diagnostics.map(d=>d.rule_id)).toContain('cost_unknown');
 });
 it.each(['missing-request','unknown-request','missing-report','api-report','wrong-effort','unknown-identity','duplicate-task'])( 'preserves host/identity/task requirements: %s',kind=>{
  const f=fixture(),row=f.input.observations[0]!;
  if(kind==='missing-request')delete f.input.request.execution_environment;
  if(kind==='unknown-request')f.input.request.execution_environment='unknown';
  if(kind==='duplicate-task'){row.task_id=f.input.observations[1]!.task_id;f.grade(row);}
  if(['missing-report','api-report','wrong-effort','unknown-identity'].includes(kind)){
   const report=structuredClone(parseRuntimeReport(f.runtimeReports.get(row.provenance.runtime_receipt_digest!)));
   if(kind==='missing-report')delete report.execution_environment;
   if(kind==='api-report')report.execution_environment='api';
   if(kind==='wrong-effort')report.observed_identity.effort='high';
   if(kind==='unknown-identity')report.observed_identity={source:'unknown'};
   row.provenance.runtime_receipt_digest=digest(report);f.runtimeReports.set(digest(report),report);f.grade(row);
  }
  expect(first(f.input).status).toBe(['api-report','wrong-effort','duplicate-task'].includes(kind)?'REJECT':'HOLD');
 });
 it('prices task-specific API tokens instead of ranking raw token counts or host dollars',()=>{
  const f=fixture();for(const row of f.input.observations)f.apiTask(row,{input_tokens:row.candidate.candidate_id==='candidate_alpha'?100000:20000,output_tokens:0});
  const result=select(f.input);expect(result.qualifications.every(q=>q.status==='QUALIFIED')).toBe(true);expect(result.selected?.candidate_id).toBe('candidate_alpha');
  expect(result.economics[0]!.value_usd).toBeCloseTo(.1);expect(result.economics[1]!.value_usd).toBeCloseTo(.2);expect(result.economics.every(e=>e.evidence_level==='MEASURED_API_EQUIVALENT'&&e.note.includes('not a subscription bill'))).toBe(true);
 });
 it('never selects an incapable cheap candidate and excludes expensive economics without changing capability',()=>{
  const f=fixture();for(const row of f.input.observations)f.apiTask(row);
  for(const row of f.input.observations.filter(r=>r.candidate.candidate_id==='candidate_alpha')){row.accepted=false;row.passed=false;f.grade(row);}
  const rejected=select(f.input);expect(rejected.qualifications[0]!.status).toBe('REJECT');expect(rejected.selected?.candidate_id).toBe('candidate_beta');
  const expensive=fixture();for(const row of expensive.input.observations)expensive.apiTask(row);expensive.price(0,100,100);const result=select(expensive.input);
  expect(result.qualifications.every(q=>q.status==='QUALIFIED')).toBe(true);expect(result.selected?.candidate_id).toBe('candidate_beta');expect(result.routing_order.candidate_ids).toEqual(['candidate_beta']);expect(result.diagnostics.map(d=>d.rule_id)).toContain('economic_selection_ceiling');
 });
 it('uses measured economics over list prices, comparable proxies otherwise, and declared order for crossing/unknown rates',()=>{
  const f=fixture();f.economics.maintainer_order=['candidate_beta','candidate_alpha'];
  expect(select(f.input).selected?.candidate_id).toBe('candidate_alpha');expect(select(f.input).routing_order.basis).toBe('api_price_proxy');
  for(const row of f.input.observations)f.apiTask(row,{input_tokens:row.candidate.candidate_id==='candidate_alpha'?1000000:1,output_tokens:0});
  expect(select(f.input).selected?.candidate_id).toBe('candidate_beta');expect(select(f.input).routing_order.basis).toBe('measured_api_equivalent');
  f.economics.tasks=[];f.price(0,1,40);expect(select(f.input).selected?.candidate_id).toBe('candidate_beta');expect(select(f.input).routing_order.basis).toBe('maintainer_order');
  f.economics.pricing=[];expect(select(f.input).selected?.candidate_id).toBe('candidate_beta');expect(select(f.input).economics.every(e=>e.evidence_level==='UNKNOWN')).toBe(true);
  f.economics.maintainer_order=[];expect(select(f.input).selected).toBeNull();
 });
 it('does not claim measured beats unknown and requires measured economics for an explicit task ceiling',()=>{
  const f=fixture();f.economics.pricing=f.economics.pricing.slice(0,1);f.economics.maintainer_order=['candidate_beta','candidate_alpha'];f.apiTask(f.input.observations[0]!);
  expect(select(f.input).selected?.candidate_id).toBe('candidate_beta');expect(select(f.input).routing_order.basis).toBe('maintainer_order');
  f.input.request.max_cost_usd=.2;expect(select(f.input).selected?.candidate_id).toBe('candidate_alpha');expect(select(f.input).qualifications.every(q=>q.status==='QUALIFIED')).toBe(true);
 });
 it('includes failures, rework and review; prices cached/write/output categories without double-counting reasoning',()=>{
  const f=fixture();f.price(0,1,10,.1,2);const task=f.apiTask(f.input.observations[0]!,{input_tokens:1000,input_tokens_details:{cached_tokens:200,cache_write_tokens:100},output_tokens:100,output_tokens_details:{reasoning_tokens:80},total_tokens:1100});
  const row=task.observation as TaskObservation;
  for(const kind of ['review','rework'] as const){const id=`${kind}_extra`;row.attempts.push({attempt_id:id,kind,cost_usd:null,cost_source:'unknown',latency_ms:100});const runtime=f.report(row,'api',JSON.stringify({model:f.input.candidates[0]!.snapshot_id,service_tier:'default',usage:{input_tokens:1000,output_tokens:0}}),id);task.attempts.push({...task.attempts[0]!,attempt_id:id,runtime_receipt_digest:runtime,usage_source_digest:parseRuntimeReport(f.runtimeReports.get(runtime)).stdout_digest!});}
  f.grade(row);f.apiTask(f.input.observations[1]!,{input_tokens:1000,output_tokens:0},false);
  const economics=assessEconomics(f.input)[0]!;expect(economics.accepted_tasks).toBe(1);expect(economics.total_cost_usd).toBeCloseTo(.00492);expect(economics.value_usd).toBeCloseTo(.00492);
 });
 it.each(['source-tamper','wrong-price-effort','wrong-usage-model','host-api-equivalence','wrong-runtime-effort','omitted-attempt','duplicate-task','duplicate-report','wrong-cohort','wrong-harness','unresolved-usage','negative-tokens','overlapping-categories','total-mismatch'])( 'rejects invalid economic authority: %s',kind=>{
  const f=fixture(),task=f.apiTask(f.input.observations[0]!);const row=task.observation as TaskObservation;
  if(kind==='source-tamper')f.sources.set(f.economics.pricing[0]!.source_digest,'tampered');
  if(kind==='wrong-price-effort')f.economics.pricing[0]!.candidate_identity=candidateIdentity({...f.input.candidates[0]!,effort:'high'});
  if(kind==='omitted-attempt'){row.attempts.push({...row.attempts[0]!,attempt_id:'omitted_failure',kind:'rework'});f.grade(row);}
  if(kind==='duplicate-task')f.economics.tasks.push(structuredClone(task));
  if(kind==='duplicate-report'){const other=f.apiTask(f.input.observations[1]!);other.attempts[0]!.runtime_receipt_digest=task.attempts[0]!.runtime_receipt_digest;}
  if(kind==='wrong-cohort'){row.cohort_id='wrong';f.grade(row);}
  if(kind==='wrong-harness'){row.harness_version='2';f.grade(row);}
  if(kind==='unresolved-usage')task.attempts[0]!.usage_source_digest=hashBytes('unrelated');
  if(['host-api-equivalence','wrong-runtime-effort','wrong-usage-model','negative-tokens','overlapping-categories','total-mismatch'].includes(kind)){
   const report=structuredClone(parseRuntimeReport(f.runtimeReports.get(task.attempts[0]!.runtime_receipt_digest)));
   if(kind==='host-api-equivalence')report.execution_environment='codex';if(kind==='wrong-runtime-effort')report.observed_identity.effort='high';
   if(['wrong-usage-model','negative-tokens','overlapping-categories','total-mismatch'].includes(kind)){
    const body=JSON.parse(f.sources.get(report.stdout_digest!) as string);if(kind==='wrong-usage-model')body.model='unrelated';if(kind==='negative-tokens')body.usage.input_tokens=-1;if(kind==='overlapping-categories')body.usage.input_tokens_details={cached_tokens:200000};if(kind==='total-mismatch')body.usage.total_tokens=1;
    report.stdout_digest=f.add(JSON.stringify(body));task.attempts[0]!.usage_source_digest=report.stdout_digest;
   }
   const key=digest(report);f.runtimeReports.set(key,report);task.attempts[0]!.runtime_receipt_digest=key;row.provenance.runtime_receipt_digest=key;f.grade(row);
  }
  expect(()=>assessEconomics(f.input)).toThrow();
 });
 it('preserves same-model effort identity and independently priced measured usage',()=>{
  const f=fixture(),a=f.input.candidates[0]!,b=f.input.candidates[1]!;b.model_id=a.model_id;b.snapshot_id=a.snapshot_id;b.effort='high';b.provenance.model_record_id=a.provenance.model_record_id;
  for(const row of f.input.observations.filter(r=>r.candidate.candidate_id===b.candidate_id)){row.candidate.candidate_identity=candidateIdentity(b);row.provenance.runtime_receipt_digest=f.report(row,'codex','SYNTHETIC TEST high effort');f.grade(row);}
  f.economics.pricing=[];f.price(0,1,2);f.price(1,1,2);for(const row of f.input.observations)f.apiTask(row,{input_tokens:row.candidate.candidate_id===a.candidate_id?100000:50000,output_tokens:0});
  const result=select(f.input);expect(result.qualifications.every(q=>q.status==='QUALIFIED')).toBe(true);expect(result.selected?.effort).toBe('high');expect(new Set(result.economics.map(e=>e.candidate_identity)).size).toBe(2);
 });
 it('keeps capability-qualified but economically excluded incumbents distinct from capability failures',()=>{
  const f=fixture();for(const row of f.input.observations)f.apiTask(row);f.price(0,100,100);f.input.incumbentCandidateId='candidate_alpha';
  const result=select(f.input);expect(result.qualifications[0]!.status).toBe('QUALIFIED');expect(result.decision.rule_ids).toEqual(['incumbent_economically_ineligible']);
 });
 it('retains full attributable roster while explicitly restricting eligible routes and binds that restriction',()=>{
  const f=fixture();for(const row of f.input.observations)f.apiTask(row);f.input.eligibleCandidateIds=['candidate_beta'];
  const result=select(f.input);expect(result.selected?.candidate_id).toBe('candidate_beta');expect(result.routing_order.candidate_ids).toEqual(['candidate_beta']);expect(result.economics).toHaveLength(2);
  const binding=createBinding(f.input);expect(validateBinding(binding,f.input).ok).toBe(true);delete f.input.eligibleCandidateIds;expect(validateBinding(binding,f.input).ok).toBe(false);
 });
 it('does not expose inapplicable qualified prices as a defensible API proxy',()=>{
  const f=fixture(),price=f.economics.pricing[0]!;price.source_digest=f.add(`${f.sources.get(price.source_digest)}\nLarge contexts priced at a different rate.\n`);
  const result=assessEconomics(f.input)[0]!;expect(result.rates).toBeNull();expect(result.evidence_level).toBe('UNKNOWN');expect(result.diagnostics).toContain('economic_pricing_modifiers_unresolved');
 });
 it('accepts zero Anthropic TTL metadata and keeps unsupported positive writes/tier modifiers explicit',()=>{
  const usage={service_tier:'standard',input_tokens:100,cache_read_input_tokens:20,cache_creation_input_tokens:0,cache_creation:{ephemeral_5m_input_tokens:0,ephemeral_1h_input_tokens:0},output_tokens:10};
  expect(apiTokenCategories('anthropic',{usage})).toEqual({input:100,cached_input:20,cache_write:0,output:10});
  expect(apiTokenCategories('anthropic',{usage:{...usage,cache_creation_input_tokens:5,cache_creation:{ephemeral_5m_input_tokens:5,ephemeral_1h_input_tokens:0}}})).toBeNull();
  expect(apiTokenCategories('anthropic',{usage:{...usage,service_tier:'priority'}})).toBeNull();
  expect(()=>apiTokenCategories('anthropic',{usage:{...usage,cache_creation_input_tokens:5}})).toThrow('ECONOMIC_TOKEN_TOTAL_MISMATCH');
 });
 it('requires observed provider response tier before measured economics without changing capability',()=>{
  const f=fixture(),task=f.apiTask(f.input.observations[0]!);const row=task.observation as TaskObservation;
  const report=structuredClone(parseRuntimeReport(f.runtimeReports.get(task.attempts[0]!.runtime_receipt_digest)));
  const raw=JSON.parse(f.sources.get(report.stdout_digest!) as string);delete raw.service_tier;
  report.stdout_digest=f.add(JSON.stringify(raw));const key=digest(report);f.runtimeReports.set(key,report);task.attempts[0]!.runtime_receipt_digest=key;task.attempts[0]!.usage_source_digest=report.stdout_digest;row.provenance.runtime_receipt_digest=key;f.grade(row);
  const economics=assessEconomics(f.input)[0]!;expect(economics.evidence_level).toBe('API_PRICE_PROXY');expect(economics.value_usd).toBeNull();expect(economics.diagnostics).toContain('economic_usage_or_category_rate_unknown');expect(first(f.input).status).toBe('QUALIFIED');
  expect(apiTokenCategories('openai',{usage:{input_tokens:1,output_tokens:1}})).toBeNull();
  expect(apiTokenCategories('openai',{service_tier:'auto',usage:{input_tokens:1,output_tokens:1}})).toBeNull();
  expect(apiTokenCategories('anthropic',{service_tier:'standard',usage:{input_tokens:1,output_tokens:1}})).toBeNull();
  expect(apiTokenCategories('anthropic',{usage:{service_tier:'standard',input_tokens:1,output_tokens:1}})).toEqual({input:1,cached_input:0,cache_write:0,output:1});
 });
 it('does not omit unpriced cache work or reuse expired pricing as measured economics',()=>{
  const f=fixture();f.apiTask(f.input.observations[0]!,{input_tokens:1000,input_tokens_details:{cached_tokens:500},output_tokens:0});expect(assessEconomics(f.input)[0]!.evidence_level).toBe('API_PRICE_PROXY');
  f.economics.pricing[0]!.checked_at='2020-01-01T00:00:00.000Z';expect(assessEconomics(f.input)[0]!.evidence_level).toBe('UNKNOWN');
 });
 it('binds economic input/source authority and execution environment into decision recomputation',()=>{
  const f=fixture();const binding=createBinding(f.input);expect(validateBinding(binding,f.input).ok).toBe(true);
  f.price(0,.5,1);expect(validateBinding(binding,f.input).ok).toBe(false);
  f.input.request.execution_environment='api';expect(validateBinding(binding,f.input).ok).toBe(false);
 });
 it('requires measured paired economics for promotion and preserves noninferiority/superiority rules',()=>{
  const f=fixture();f.input.incumbentCandidateId='candidate_beta';f.input.policy.promotion.minimum_paired_tasks=20;f.input.policy.promotion.non_inferiority_margin=.3;
  expect(select(f.input).decision.outcome).toBe('RETAIN');expect(select(f.input).diagnostics.map(d=>d.rule_id)).toContain('paired_economics_unknown');
  for(const row of f.input.observations)f.apiTask(row);expect(select(f.input).decision.outcome).toBe('PROMOTE');
  f.input.incumbentCandidateId='candidate_alpha';expect(select(f.input).decision.outcome).toBe('RETAIN');
 });
});
