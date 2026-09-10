import { contentDigest, digest, hashBytes } from '../core/canonical.js';
import { parsePolicy, policyDigest } from '../governance/policy.js';
import { parseSelectionInput, select, type SelectionInput, type SelectionResult } from '../governance/selection.js';
import { candidateIdentity } from '../schema/index.js';
import { publicTaskClasses, publicTaskClassSchema, parseRoutingPack, RoutingError, type PublicTaskClass, type RoutingPack, type RoutingRoute, type RoutingTreatment } from './contracts.js';

export type RoutingStratumInput={publicTaskClass:PublicTaskClass;workerSelection:unknown;reviewerSelection:unknown};
export type CompileRoutingPackInput=
  | {mode:'production';policy:unknown;strata:readonly RoutingStratumInput[];generatedAt?:never}
  | {mode:'simulation_test';policy:unknown;strata:readonly RoutingStratumInput[];generatedAt:string};

const sameRequest=(a:SelectionInput['request'],b:SelectionInput['request'])=>digest({...a,role_id:''})===digest({...b,role_id:''});
const addHours=(time:number,hours:number)=>time+hours*3600000;
const evidenceExpiry=(result:SelectionResult,days:number)=>Math.min(...result.qualifications.filter(q=>q.status==='QUALIFIED').flatMap(q=>q.observations.map(o=>Date.parse(o.measured_at)+days*86400000)));

function parseCompilationSelection(value:unknown,overrides:{mode:'simulation'|'production';now:string}):SelectionInput{
  if(value===null||typeof value!=='object'||Array.isArray(value))throw new RoutingError('SELECTION_MALFORMED');
  const raw=value as Record<string,unknown>,sourceValue=raw['sources']??{};
  if(sourceValue===null||typeof sourceValue!=='object'||Array.isArray(sourceValue))throw new RoutingError('SELECTION_SOURCES_MALFORMED');
  const sources=new Map<string,string|Uint8Array>();const strings:Record<string,string>={};
  for(const [key,encoded] of Object.entries(sourceValue)){
    let decoded:string|Uint8Array;
    if(typeof encoded==='string')decoded=encoded;
    else if(encoded!==null&&typeof encoded==='object'&&!Array.isArray(encoded)&&Object.keys(encoded).length===2&&(encoded as Record<string,unknown>)['encoding']==='base64'&&typeof (encoded as Record<string,unknown>)['data']==='string'){
      const data=(encoded as {data:string}).data;const bytes=Buffer.from(data,'base64');if(bytes.toString('base64')!==data)throw new RoutingError('SELECTION_SOURCE_ENCODING_INVALID');decoded=bytes;
    }else throw new RoutingError('SELECTION_SOURCES_MALFORMED');
    if(hashBytes(decoded)!==key)throw new RoutingError('SELECTION_SOURCE_DIGEST_MISMATCH');sources.set(key,decoded);if(typeof decoded==='string')strings[key]=decoded;
  }
  const parsed=parseSelectionInput({...raw,sources:strings},overrides);return {...parsed,sources};
}

function treatment(input:SelectionInput,result:SelectionResult,candidateId:string):RoutingTreatment|null{
  const q=result.qualifications.find(x=>x.candidate_id===candidateId);
  const candidate=input.candidates.find(x=>x.candidate_id===candidateId);
  if(!q||q.status!=='QUALIFIED'||!candidate||q.metrics.success_rate===null||q.metrics.total_cost_usd===null||q.metrics.cost_per_accepted_task_usd===null||q.metrics.p95_latency_ms===null||candidate.serving.fallback!=='disabled')return null;
  const record=input.registry.records.find(x=>x.record_id===candidate.provenance.model_record_id)!;
  const metrics={...q.metrics,success_rate:q.metrics.success_rate,total_cost_usd:q.metrics.total_cost_usd,cost_per_accepted_task_usd:q.metrics.cost_per_accepted_task_usd,p95_latency_ms:q.metrics.p95_latency_ms};
  const evidence_digest=digest([...q.observations].sort((a,b)=>a.observation_id.localeCompare(b.observation_id)));
  const identity=candidateIdentity(candidate);
  return {candidate_id:candidate.candidate_id,candidate_identity:identity,provider:candidate.provider,model_id:candidate.model_id,snapshot_id:candidate.snapshot_id,effort:candidate.effort,serving:candidate.serving,material_serving_settings:candidate.material_serving_settings,family:record.family,frontier:record.frontier===true,capabilities:record.capabilities??[],context_window_tokens:record.context_window_tokens,pinning_source:record.pinning?.source??'registry_metadata',qualification:{metrics,evidence_digest,qualification_digest:digest({candidate_identity:identity,metrics,evidence_digest})}};
}
function ordered(input:SelectionInput,result:SelectionResult,frontierOnly=false,preserveSelected=true):RoutingTreatment[]{
  if(!['SELECT','PROMOTE','RETAIN'].includes(result.decision.outcome))return [];
  const rows=result.qualifications.map(q=>treatment(input,result,q.candidate_id)).filter((x):x is RoutingTreatment=>x!==null&&(!frontierOnly||x.frontier));
  rows.sort((a,b)=>a.qualification.metrics.cost_per_accepted_task_usd-b.qualification.metrics.cost_per_accepted_task_usd||a.candidate_id.localeCompare(b.candidate_id));
  const selected=result.decision.selected_candidate_id;
  if(preserveSelected&&selected){
    const index=rows.findIndex(x=>x.candidate_id===selected);if(index<0)return [];if(index>0)rows.unshift(...rows.splice(index,1));
  }
  return rows;
}
function decision(result:SelectionResult){return {outcome:result.decision.outcome,...(result.decision.selected_candidate_id?{selected_candidate_id:result.decision.selected_candidate_id}:{}),rule_ids:result.decision.rule_ids,decision_digest:digest(result.decision)};}
function exclusions(publicTaskClass:PublicTaskClass,stratumDigest:string,lane:'worker'|'reviewer',input:SelectionInput,result:SelectionResult){
  return result.qualifications.flatMap(q=>{
    const candidate=input.candidates.find(c=>c.candidate_id===q.candidate_id)!;const record=input.registry.records.find(r=>r.record_id===candidate.provenance.model_record_id)!;
    const extra=q.status==='QUALIFIED'?(candidate.serving.fallback!=='disabled'?['unsupported_fallback_control']:lane==='reviewer'&&record.frontier!==true?['frontier_reviewer_required']:[]):[];
    if(q.status==='QUALIFIED'&&!extra.length)return [];
    return [{public_task_class:publicTaskClass,stratum_digest:stratumDigest,lane,candidate_id:q.candidate_id,candidate_identity:candidateIdentity(candidate),status:q.status==='QUALIFIED'?'EXCLUDED' as const:q.status,rule_ids:[...new Set([...q.diagnostics.map(d=>d.rule_id),...extra])].sort()}];
  });
}

export function compileRoutingPack(input:CompileRoutingPackInput):RoutingPack{
  if(input===null||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(input,'policy')||!Array.isArray(input.strata)||!['production','simulation_test'].includes(input.mode))throw new RoutingError('COMPILE_INPUT_MALFORMED');
  if(input.mode==='production'&&Object.hasOwn(input,'generatedAt'))throw new RoutingError('PRODUCTION_TIME_OVERRIDE');
  const allowed=new Set(input.mode==='production'?['mode','policy','strata']:['mode','policy','strata','generatedAt']);if(Object.keys(input).some(key=>!allowed.has(key)))throw new RoutingError('COMPILE_INPUT_MALFORMED');
  for(const stratum of input.strata)if(stratum===null||typeof stratum!=='object'||Array.isArray(stratum)||Object.keys(stratum).length!==3||!Object.hasOwn(stratum,'publicTaskClass')||!Object.hasOwn(stratum,'workerSelection')||!Object.hasOwn(stratum,'reviewerSelection'))throw new RoutingError('COMPILE_INPUT_MALFORMED');
  const policy=parsePolicy(input.policy);const expectedPolicy=policyDigest(policy);
  const generated=input.mode==='production'?new Date().toISOString():input.generatedAt;
  if(!Number.isFinite(Date.parse(generated)))throw new RoutingError('INVALID_GENERATED_AT');
  const seen=new Set<string>();const routes:RoutingRoute[]=[];const allExclusions:RoutingPack['exclusions']=[];const registryHashes=new Set<string>();let evidenceLimit=Infinity;
  for(const raw of input.strata){
    const publicTaskClass=publicTaskClassSchema.parse(raw.publicTaskClass);
    const mode=input.mode==='production'?'production':'simulation';
    const worker=parseCompilationSelection(raw.workerSelection,{mode,now:generated});const reviewer=parseCompilationSelection(raw.reviewerSelection,{mode,now:generated});
    if(policyDigest(worker.policy)!==expectedPolicy||policyDigest(reviewer.policy)!==expectedPolicy)throw new RoutingError('POLICY_MISMATCH');
    if(worker.registry.content_digest!==reviewer.registry.content_digest)throw new RoutingError('STRATUM_REGISTRY_MISMATCH');registryHashes.add(worker.registry.content_digest);
    if(worker.request.role_id==='reviewer'||reviewer.request.role_id!=='reviewer'||!sameRequest(worker.request,reviewer.request))throw new RoutingError('STRATUM_REQUEST_MISMATCH');
    const task=policy.task_classes.find(t=>t.task_class_id===worker.request.task_class_id);if(!task)throw new RoutingError('UNKNOWN_GOVERNED_TASK_CLASS');
    const workerResult=select(worker),reviewerResult=select(reviewer);const workers=ordered(worker,workerResult),reviewers=ordered(reviewer,reviewerResult,true);
    const stratum={worker_request:worker.request,reviewer_request:reviewer.request,task_required_capabilities:[...task.required_capabilities].sort(),eval_bucket:task.eval_bucket};
    const stratumDigest=digest(stratum),key=`${publicTaskClass}:${stratumDigest}`;if(seen.has(key))throw new RoutingError('DUPLICATE_ROUTING_STRATUM');seen.add(key);
    const capabilities=new Set([...task.required_capabilities,...(worker.request.required_capabilities??[]),...worker.request.constraints.required_tools]);
    if(worker.request.constraints.requires_vision)capabilities.add('vision');if(worker.request.constraints.requires_browser)capabilities.add('browser');if(worker.request.constraints.requires_local_execution)capabilities.add('local_execution');if(worker.request.constraints.privacy_requirement)capabilities.add(`privacy:${worker.request.constraints.privacy_requirement}`);if(worker.request.constraints.language)capabilities.add(`language:${worker.request.constraints.language}`);
    const requirements={tools:[...worker.request.constraints.required_tools].sort(),capabilities:[...capabilities].sort(),context_window_tokens:Math.max(worker.request.context_window_tokens??0,worker.request.constraints.context_window_requirement??0),fresh_context:worker.request.constraints.requires_fresh_context};
    routes.push({public_task_class:publicTaskClass,stratum_digest:stratumDigest,stratum,requirements,review_rule:policy.review[worker.request.risk],workers,reviewers,worker_decision:decision(workerResult),reviewer_decision:decision(reviewerResult)});
    allExclusions.push(...exclusions(publicTaskClass,stratumDigest,'worker',worker,workerResult),...exclusions(publicTaskClass,stratumDigest,'reviewer',reviewer,reviewerResult));
    evidenceLimit=Math.min(evidenceLimit,evidenceExpiry(workerResult,policy.qualification.evidence_max_age_days),evidenceExpiry(reviewerResult,policy.qualification.evidence_max_age_days));
  }
  routes.sort((a,b)=>publicTaskClasses.indexOf(a.public_task_class)-publicTaskClasses.indexOf(b.public_task_class)||a.stratum_digest.localeCompare(b.stratum_digest));allExclusions.sort((a,b)=>a.public_task_class.localeCompare(b.public_task_class)||a.stratum_digest.localeCompare(b.stratum_digest)||a.lane.localeCompare(b.lane)||a.candidate_id.localeCompare(b.candidate_id));
  const generatedMs=Date.parse(generated);const expires=Math.min(addHours(generatedMs,policy.binding.hard_expiry_hours),evidenceLimit);const refresh=Math.min(addHours(generatedMs,policy.binding.refresh_after_hours),expires);
  const missing_routes=publicTaskClasses.flatMap(public_task_class=>{const matches=routes.filter(r=>r.public_task_class===public_task_class);const reason=!matches.length?'stratum_not_supplied' as const:matches.some(r=>r.workers.length&&r.reviewers.length)?null:matches.every(r=>!r.workers.length)?'no_qualified_worker' as const:'no_qualified_frontier_reviewer' as const;return reason?[{public_task_class,reason}]:[];});
  const registry_content_digests=[...registryHashes].sort();
  const pack={schema_version:'routing_pack.v1' as const,mode:input.mode,generated_at:generated,refresh_after:new Date(refresh).toISOString(),expires_at:new Date(expires).toISOString(),policy_version:policy.policy_version,policy_digest:expectedPolicy,registry_content_digests,registry_digest:digest(registry_content_digests),routes,missing_routes,exclusions:allExclusions,content_digest:''};
  pack.content_digest=contentDigest(pack);return parseRoutingPack(pack);
}
