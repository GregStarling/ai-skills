import {z} from 'zod';
import {digest,hashBytes} from '../core/canonical.js';
import {candidateIdentity,parseRuntimeReport,type Candidate,type TaskObservation} from '../schema/index.js';
import {validateObservations} from '../evidence/index.js';
import {parseOfficialModels} from '../discovery/index.js';
import type {QualificationInput} from './qualification.js';

const id=z.string().min(1),sha=z.string().regex(/^sha256:[a-f0-9]{64}$/),count=z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const economicEvidenceSchema=z.object({schema_version:z.literal('economic_evidence.v1'),
 pricing:z.array(z.object({candidate_identity:sha,source:z.object({url:z.url(),kind:z.enum(['openai_model','claude_models']),version:id}).strict(),source_digest:sha,checked_at:z.iso.datetime({offset:true})}).strict()),
 tasks:z.array(z.object({observation:z.unknown(),attempts:z.array(z.object({attempt_id:id,candidate_id:id,candidate_identity:sha,runtime_receipt_digest:sha,usage_source_digest:sha}).strict()).nonempty()}).strict()),
 maintainer_order:z.array(id),
}).strict();
export type EconomicEvidence=z.infer<typeof economicEvidenceSchema>;
export type EconomicLevel='MEASURED_API_EQUIVALENT'|'API_PRICE_PROXY'|'UNKNOWN';
export type CandidateEconomics={candidate_id:string;candidate_identity:string;evidence_level:EconomicLevel;
 metric:'api_equivalent_cost_per_accepted_task_usd';value_usd:number|null;total_cost_usd:number|null;accepted_tasks:number;
 pricing_source_digests:string[];rates:{input:number;output:number}|null;
 task_costs:{task_id:string;fixture_digest:string;accepted:boolean;cost_usd:number}[];diagnostics:string[];
 note:'Normalized API-equivalent proxy; not a subscription bill.'};
type Input=Omit<QualificationInput,'candidate'> & {candidates:readonly Candidate[];economics?:EconomicEvidence};
type Rates={input:number|null;cached_input:number|null;cache_write:number|null;output:number|null};
const empty=(candidate:Candidate):CandidateEconomics=>({candidate_id:candidate.candidate_id,candidate_identity:candidateIdentity(candidate),evidence_level:'UNKNOWN',metric:'api_equivalent_cost_per_accepted_task_usd',value_usd:null,total_cost_usd:null,accepted_tasks:0,pricing_source_digests:[],rates:null,task_costs:[],diagnostics:[],note:'Normalized API-equivalent proxy; not a subscription bill.'});
function source(input:Input,key:string):string{const bytes=input.sources?.get(key);if(bytes===undefined||hashBytes(bytes)!==key)throw Error('ECONOMIC_SOURCE_UNRESOLVED');return typeof bytes==='string'?bytes:new TextDecoder().decode(bytes);}

/** Provider categories are disjoint: reasoning is included in output. Unsupported
 * modifiers/categories remain unknown; never infer cache multipliers or a mix. */
export function apiTokenCategories(provider:Candidate['provider'],raw:unknown):Record<keyof Rates,number>|null{
 const response=z.object({usage:z.record(z.string(),z.unknown()),service_tier:z.string().optional()}).passthrough().parse(raw);
 if(response.service_tier!==undefined&&!['default','standard'].includes(response.service_tier))return null;
 const usage=response.usage;
 const n=(key:string,optional=false)=>optional&&usage[key]===undefined?0:count.parse(usage[key]);
 if(provider==='openai'){
  // Response tier is observed processing, not request auto/project defaults.
  if(response.service_tier!=='default')return null;
  if(Object.keys(usage).some(key=>!['input_tokens','input_tokens_details','output_tokens','output_tokens_details','total_tokens'].includes(key)))return null;
  const details=z.object({cached_tokens:count.optional(),cache_write_tokens:count.optional()}).strict().parse(usage['input_tokens_details']??{});
  const outputDetails=z.object({reasoning_tokens:count.optional()}).strict().parse(usage['output_tokens_details']??{});
  const cached=details.cached_tokens??0,write=details.cache_write_tokens??0,input=n('input_tokens')-cached-write,output=n('output_tokens');
  if(input<0||(outputDetails.reasoning_tokens??0)>output)throw Error('ECONOMIC_TOKEN_CATEGORIES_OVERLAP');
  if(usage['total_tokens']!==undefined&&count.parse(usage['total_tokens'])!==n('input_tokens')+output)throw Error('ECONOMIC_TOKEN_TOTAL_MISMATCH');
  // Provider-hosted tools can add non-token fees. This bounded parser does not price them.
  if(Array.isArray(response['output'])&&response['output'].some((item:unknown)=>z.object({type:z.string()}).passthrough().safeParse(item).data?.type.endsWith('_call')&&!['function_call'].includes((item as {type:string}).type)))return null;
  return {input,cached_input:cached,cache_write:write,output};
 }
 if(provider==='anthropic'){
  if(Object.keys(usage).some(key=>!['input_tokens','cache_read_input_tokens','cache_creation_input_tokens','cache_creation','output_tokens','service_tier'].includes(key)))return null;
  if(usage['service_tier']!=='standard')return null;
  const creation=z.object({ephemeral_5m_input_tokens:count.optional(),ephemeral_1h_input_tokens:count.optional()}).strict().parse(usage['cache_creation']??{});
  const writes=(creation.ephemeral_5m_input_tokens??0)+(creation.ephemeral_1h_input_tokens??0);
  if(usage['cache_creation']!==undefined&&writes!==n('cache_creation_input_tokens',true))throw Error('ECONOMIC_TOKEN_TOTAL_MISMATCH');
  // Zero TTL metadata is harmless. Positive writes need explicit TTL rates.
  if(n('cache_creation_input_tokens',true)>0)return null;
  return {input:n('input_tokens'),cached_input:n('cache_read_input_tokens',true),cache_write:0,output:n('output_tokens')};
 }
 return null;
}

export function assessEconomics(input:Input):CandidateEconomics[]{
 const results=input.candidates.map(empty),byIdentity=new Map(results.map(row=>[row.candidate_identity,row]));
 if(input.economics===undefined)return results.map(row=>({...row,diagnostics:['economic_evidence_missing']}));
 const evidence=economicEvidenceSchema.parse(input.economics),rates=new Map<string,Rates>(),seenPrices=new Set<string>();
 if(new Set(evidence.maintainer_order).size!==evidence.maintainer_order.length||evidence.maintainer_order.some(id=>!input.candidates.some(c=>c.candidate_id===id)))throw Error('ECONOMIC_MAINTAINER_ORDER_INVALID');
 for(const price of evidence.pricing){
  const result=byIdentity.get(price.candidate_identity),candidate=input.candidates.find(c=>candidateIdentity(c)===price.candidate_identity);
  if(!result||!candidate||seenPrices.has(price.candidate_identity))throw Error('ECONOMIC_PRICE_IDENTITY_INVALID');seenPrices.add(price.candidate_identity);
  const body=source(input,price.source_digest),age=Date.parse(input.now)-Date.parse(price.checked_at);
  if(age<0)throw Error('ECONOMIC_PRICE_FROM_FUTURE');
  if(age>(input.policy.economics?.pricing_max_age_days??30)*86400000){result.diagnostics.push('economic_pricing_expired');continue;}
  const model=parseOfficialModels(price.source,body).find(m=>m.provider===candidate.provider&&(m.model_id===candidate.snapshot_id||m.model_id===candidate.model_id&&m.snapshot_id===candidate.snapshot_id));
  if(!model){result.diagnostics.push('economic_pricing_model_unresolved');continue;}
  result.pricing_source_digests.push(price.source_digest);
  const p=model.pricing;
  if(p.qualifiers.length){result.diagnostics.push('economic_pricing_modifiers_unresolved');continue;}
  if(p.input_per_million!==null&&p.output_per_million!==null){result.rates={input:p.input_per_million,output:p.output_per_million};result.evidence_level='API_PRICE_PROXY';}
  rates.set(price.candidate_identity,{input:p.input_per_million,cached_input:p.cached_input_per_million,cache_write:p.cache_write_per_million,output:p.output_per_million});
 }
 const seenTasks=new Set<string>(),seenAttempts=new Set<string>(),seenReports=new Set<string>(),incomplete=new Set<string>();
 for(const task of evidence.tasks){
  const [row]=validateObservations([task.observation],{registry:input.registry,candidates:input.candidates,mode:'production',sources:input.sources??new Map(),runtimeReports:input.runtimeReports??new Map()});
  if(!row)throw Error('ECONOMIC_OBSERVATION_MISSING');
  const result=byIdentity.get(row.candidate.candidate_identity)!;
  const bucket=input.policy.task_classes.find(c=>c.task_class_id===input.request.task_class_id)!.eval_bucket;
  for(const key of ['role_id','task_class_id','risk','cohort_id','constraints_digest'] as const)if(row[key]!==input.request[key])throw Error('ECONOMIC_STRATUM_MISMATCH');
  for(const key of ['suite_id','suite_version','harness_version','grader_version'] as const)if(row[key]!==bucket[key])throw Error('ECONOMIC_BUCKET_MISMATCH');
  const age=Date.parse(input.now)-Date.parse(row.measured_at);if(age<0||age>input.policy.qualification.evidence_max_age_days*86400000)throw Error('ECONOMIC_TASK_NOT_CURRENT');
  const taskKey=`${row.candidate.candidate_identity}:${row.task_id}`;if(seenTasks.has(taskKey))throw Error('ECONOMIC_DUPLICATE_TASK');seenTasks.add(taskKey);
  if(digest(task.attempts.map(a=>a.attempt_id).sort())!==digest(row.attempts.map(a=>a.attempt_id).sort()))throw Error('ECONOMIC_ATTEMPTS_OMITTED');
  if(!task.attempts.some(a=>a.runtime_receipt_digest===row.provenance.runtime_receipt_digest))throw Error('ECONOMIC_PRIMARY_RECEIPT_MISSING');
  let total=0,complete=true;
  for(const attempt of task.attempts){
   if(seenAttempts.has(attempt.attempt_id)||seenReports.has(attempt.runtime_receipt_digest))throw Error('ECONOMIC_DUPLICATE_ATTEMPT');seenAttempts.add(attempt.attempt_id);seenReports.add(attempt.runtime_receipt_digest);
   const candidate=input.candidates.find(c=>c.candidate_id===attempt.candidate_id);
   if(!candidate||candidateIdentity(candidate)!==attempt.candidate_identity)throw Error('ECONOMIC_ATTEMPT_IDENTITY_MISMATCH');
   const observationAttempt=row.attempts.find(a=>a.attempt_id===attempt.attempt_id)!;
   if(observationAttempt.kind==='worker'&&candidate.candidate_id!==row.candidate.candidate_id)throw Error('ECONOMIC_WORKER_IDENTITY_MISMATCH');
   const rawReport=input.runtimeReports?.get(attempt.runtime_receipt_digest);
   if(rawReport===undefined||digest(rawReport)!==attempt.runtime_receipt_digest)throw Error('ECONOMIC_RUNTIME_UNRESOLVED');
   const report=parseRuntimeReport(rawReport);
   if(report.execution_environment!=='api')throw Error('ECONOMIC_API_EXECUTION_REQUIRED');
   if(report.candidate_id!==candidate.candidate_id||report.provider!==candidate.provider||report.observed_identity.source==='unknown'||report.observed_identity.model_id!==candidate.snapshot_id||report.observed_identity.effort!==candidate.effort)throw Error('ECONOMIC_RUNTIME_IDENTITY_MISMATCH');
   if(Date.parse(report.completed_at)>Date.parse(row.measured_at))throw Error('ECONOMIC_RUNTIME_FROM_FUTURE');
   if(report.stdout_digest!==attempt.usage_source_digest)throw Error('ECONOMIC_USAGE_NOT_CAPTURED');
   source(input,report.stderr_digest!);
   const raw=JSON.parse(source(input,attempt.usage_source_digest));
   if(raw.model!==candidate.snapshot_id)throw Error('ECONOMIC_USAGE_MODEL_MISMATCH');
   const quantities=apiTokenCategories(candidate.provider,raw),price=rates.get(candidateIdentity(candidate));
   if(!quantities||!price){complete=false;continue;}
   for(const key of ['input','cached_input','cache_write','output'] as const){const quantity=quantities[key],rate=price[key];if(quantity>0&&rate===null)complete=false;else total+=quantity*(rate??0)/1e6;}
  }
  if(!Number.isFinite(total))throw Error('ECONOMIC_NONFINITE_TOTAL');
  if(complete)result.task_costs.push({task_id:row.task_id,fixture_digest:row.fixture_digest,accepted:row.accepted,cost_usd:total});
  else {incomplete.add(result.candidate_identity);result.diagnostics.push('economic_usage_or_category_rate_unknown');}
 }
 for(const result of results){
  if(incomplete.has(result.candidate_identity)){result.task_costs=[];continue;}
  if(!result.task_costs.length)continue;
  result.accepted_tasks=result.task_costs.filter(t=>t.accepted).length;
  result.total_cost_usd=result.task_costs.reduce((sum,t)=>sum+t.cost_usd,0);
  if(!Number.isFinite(result.total_cost_usd))throw Error('ECONOMIC_NONFINITE_TOTAL');
  if(result.accepted_tasks){result.value_usd=result.total_cost_usd/result.accepted_tasks;result.evidence_level='MEASURED_API_EQUIVALENT';}
  else result.diagnostics.push('economic_no_accepted_tasks');
 }
 return results;
}

/** Compare only like evidence. A measured number is not proof of beating an
 * unknown number; fall back to shared price dominance, then declared order. */
export function orderEconomicCandidates(rows:readonly CandidateEconomics[],maintainerOrder:readonly string[]):{ordered:CandidateEconomics[];basis:'measured_api_equivalent'|'api_price_proxy'|'maintainer_order'|'unresolved'}{
 if(rows.length===0)return {ordered:[],basis:'unresolved'};
 if(rows.every(r=>r.evidence_level==='MEASURED_API_EQUIVALENT'&&r.value_usd!==null))return {ordered:[...rows].sort((a,b)=>a.value_usd!-b.value_usd!||maintainerOrder.indexOf(a.candidate_id)-maintainerOrder.indexOf(b.candidate_id)),basis:'measured_api_equivalent'};
 const comparable=rows.every(r=>r.rates!==null)&&rows.every(a=>rows.every(b=>(a.rates!.input-b.rates!.input)*(a.rates!.output-b.rates!.output)>=0));
 if(comparable)return {ordered:[...rows].sort((a,b)=>a.rates!.input-b.rates!.input||a.rates!.output-b.rates!.output||maintainerOrder.indexOf(a.candidate_id)-maintainerOrder.indexOf(b.candidate_id)),basis:'api_price_proxy'};
 if(rows.every(r=>maintainerOrder.includes(r.candidate_id)))return {ordered:[...rows].sort((a,b)=>maintainerOrder.indexOf(a.candidate_id)-maintainerOrder.indexOf(b.candidate_id)),basis:'maintainer_order'};
 return {ordered:[],basis:'unresolved'};
}
export function pairedEconomicCost(economics:CandidateEconomics,observations:readonly TaskObservation[]):number|null{
 if(economics.evidence_level!=='MEASURED_API_EQUIVALENT')return null;
 const tasks=observations.map(o=>economics.task_costs.find(t=>t.task_id===o.task_id&&t.fixture_digest===o.fixture_digest));
 if(tasks.some(t=>!t))return null;
 const accepted=tasks.filter(t=>t!.accepted).length;return accepted?tasks.reduce((sum,t)=>sum+t!.cost_usd,0)/accepted:null;
}
