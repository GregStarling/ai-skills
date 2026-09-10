import {z} from 'zod';
import { digest, hashBytes } from '../core/canonical.js';
import { parsePolicy, policyDigest } from '../governance/policy.js';
import { parseSelectionInput, select, type SelectionInput, type SelectionResult } from '../governance/selection.js';
import type {CandidateEconomics} from '../governance/economics.js';
import { candidateIdentity } from '../schema/index.js';
import {provisionalTreatmentSchema,provisionalIdentity,routeRequirementsSchema,orderProvisionalTreatments} from './provisional.js';
import { routingModes,publicTaskClasses, publicTaskClassSchema, factorRoutingPack, RoutingError, type PublicTaskClass, type RoutingPack, type RoutingRoute, type RoutingTreatment } from './contracts.js';

export type RoutingStratumInput={publicTaskClass:PublicTaskClass;workerSelection:unknown;reviewerSelection:unknown};
export const provisionalRouteInputSchema=z.object({publicTaskClass:publicTaskClassSchema,scope:z.string().min(1),risk:z.enum(['low','medium']),requirements:routeRequirementsSchema,workers:z.array(provisionalTreatmentSchema).nonempty(),reviewers:z.array(provisionalTreatmentSchema).nonempty(),qualifiedStratumDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/).optional()}).strict();
export type ProvisionalRouteInput=z.infer<typeof provisionalRouteInputSchema>;
export type CompileRoutingPackInput=
  | {mode:'production';policy:unknown;strata:readonly RoutingStratumInput[];provisional?:readonly ProvisionalRouteInput[];generatedAt?:never}
  | {mode:'simulation_test';policy:unknown;strata:readonly RoutingStratumInput[];provisional?:never;generatedAt:string};

const sameRequest=(a:SelectionInput['request'],b:SelectionInput['request'])=>digest({...a,role_id:''})===digest({...b,role_id:''});
const addHours=(time:number,hours:number)=>time+hours*3600000;
const economicSummary=({evidence_level,metric,value_usd,pricing_source_digests,rates}:CandidateEconomics)=>({evidence_level,metric,value_usd,pricing_source_digests,rates});
const rankingBasis=(input:SelectionInput,result:SelectionResult):RoutingRoute['ranking_basis']['workers']=>input.policy.policy_version<4?'governed_cost_per_accepted_task':result.routing_order.basis as RoutingRoute['ranking_basis']['workers'];


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
  if(!q||q.status!=='QUALIFIED'||!candidate||q.metrics.success_rate===null||q.metrics.p95_latency_ms===null||candidate.serving.fallback!=='disabled')return null;
  const record=input.registry.records.find(x=>x.record_id===candidate.provenance.model_record_id)!;
  const metrics={...q.metrics,success_rate:q.metrics.success_rate,total_cost_usd:q.metrics.total_cost_usd,cost_per_accepted_task_usd:q.metrics.cost_per_accepted_task_usd,p95_latency_ms:q.metrics.p95_latency_ms};
  const evidence_digest=digest([...q.observations].sort((a,b)=>a.observation_id.localeCompare(b.observation_id)));
  const identity=candidateIdentity(candidate);
  const observed_at=new Date(Math.min(...q.observations.map(o=>Date.parse(o.measured_at)))).toISOString();
  const economic=result.economics.find(e=>e.candidate_id===candidateId);
  const assurance=input.policy.policy_version>=5&&q.identity_assurance?{identity_assurance:q.identity_assurance}:{};
  return {economics:economic?economicSummary(economic):null,evidence_tier:'qualified',observed_at,expires_at:new Date(Date.parse(observed_at)+input.policy.qualification.evidence_max_age_days*86400000).toISOString(),provisional:null,candidate_id:candidate.candidate_id,candidate_identity:identity,provider:candidate.provider,model_id:candidate.model_id,snapshot_id:candidate.snapshot_id,effort:candidate.effort,serving:candidate.serving,material_serving_settings:candidate.material_serving_settings,family:record.family,frontier:record.frontier===true,capabilities:record.capabilities??[],context_window_tokens:record.context_window_tokens,pinning_source:record.pinning?.source??'registry_metadata',qualification:{metrics,evidence_digest,...assurance,qualification_digest:digest({candidate_identity:identity,metrics,evidence_digest,...assurance})}};
}
function ordered(input:SelectionInput,result:SelectionResult,frontierOnly=false,preserveSelected=true):RoutingTreatment[]{
  if(!['SELECT','PROMOTE','RETAIN'].includes(result.decision.outcome))return [];
  const rows=result.routing_order.candidate_ids.map(id=>treatment(input,result,id)).filter((x):x is RoutingTreatment=>x!==null&&(!frontierOnly||x.frontier));
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
    const extra=q.status==='QUALIFIED'?[...(candidate.serving.fallback!=='disabled'?['unsupported_fallback_control']:lane==='reviewer'&&record.frontier!==true?['frontier_reviewer_required']:[]),...result.diagnostics.filter(d=>d.candidate_id===q.candidate_id&&d.rule_id.startsWith('economic_')).map(d=>d.rule_id)]:[];
    if(q.status==='QUALIFIED'&&!extra.length)return [];
    return [{public_task_class:publicTaskClass,stratum_digest:stratumDigest,lane,candidate_id:q.candidate_id,candidate_identity:candidateIdentity(candidate),status:q.status==='QUALIFIED'?'EXCLUDED' as const:q.status,rule_ids:[...new Set([...q.diagnostics.map(d=>d.rule_id),...extra])].sort()}];
  });
}

export function compileRoutingPack(input:CompileRoutingPackInput):RoutingPack{
  if(input===null||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(input,'policy')||!Array.isArray(input.strata)||!['production','simulation_test'].includes(input.mode))throw new RoutingError('COMPILE_INPUT_MALFORMED');
  if(input.mode==='production'&&Object.hasOwn(input,'generatedAt'))throw new RoutingError('PRODUCTION_TIME_OVERRIDE');
  const allowed=new Set(input.mode==='production'?['mode','policy','strata','provisional']:['mode','policy','strata','generatedAt']);if(Object.keys(input).some(key=>!allowed.has(key)))throw new RoutingError('COMPILE_INPUT_MALFORMED');
  for(const stratum of input.strata)if(stratum===null||typeof stratum!=='object'||Array.isArray(stratum)||Object.keys(stratum).length!==3||!Object.hasOwn(stratum,'publicTaskClass')||!Object.hasOwn(stratum,'workerSelection')||!Object.hasOwn(stratum,'reviewerSelection'))throw new RoutingError('COMPILE_INPUT_MALFORMED');
  const policy=parsePolicy(input.policy);const expectedPolicy=policyDigest(policy);
  const generated=input.mode==='production'?new Date().toISOString():input.generatedAt;
  if(!Number.isFinite(Date.parse(generated)))throw new RoutingError('INVALID_GENERATED_AT');
  const seen=new Set<string>();const routes:RoutingRoute[]=[];const allExclusions:RoutingPack['exclusions']=[];const registryHashes=new Set<string>();
  for(const raw of input.strata){
    const publicTaskClass=publicTaskClassSchema.parse(raw.publicTaskClass);if(publicTaskClass==='full_project')throw new RoutingError('FULL_PROJECT_REQUIRES_DECOMPOSITION');
    const mode=input.mode==='production'?'production':'simulation';
    const worker=parseCompilationSelection(raw.workerSelection,{mode,now:generated});const reviewer=parseCompilationSelection(raw.reviewerSelection,{mode,now:generated});
    if(policyDigest(worker.policy)!==expectedPolicy||policyDigest(reviewer.policy)!==expectedPolicy)throw new RoutingError('POLICY_MISMATCH');
    if(worker.registry.content_digest!==reviewer.registry.content_digest)throw new RoutingError('STRATUM_REGISTRY_MISMATCH');registryHashes.add(worker.registry.content_digest);
    if(input.mode==='production'&&policy.policy_version>=4&&!['claude_code','codex'].includes(worker.request.execution_environment??''))throw new RoutingError('PORTABLE_NATIVE_EXECUTION_REQUIRED');
    if(worker.request.role_id==='reviewer'||reviewer.request.role_id!=='reviewer'||!sameRequest(worker.request,reviewer.request))throw new RoutingError('STRATUM_REQUEST_MISMATCH');
    const task=policy.task_classes.find(t=>t.task_class_id===worker.request.task_class_id);if(!task)throw new RoutingError('UNKNOWN_GOVERNED_TASK_CLASS');
    const workerResult=select(worker),allReviewerResult=select(reviewer);
    // Frontier eligibility belongs before economic selection; filtering the winner
    // afterward can erase an otherwise qualified frontier reviewer.
    const frontierCandidates=reviewer.candidates.filter(candidate=>reviewer.registry.records.find(record=>record.record_id===candidate.provenance.model_record_id)?.frontier===true&&candidate.serving.fallback==='disabled');
    const frontierIds=new Set(frontierCandidates.map(candidate=>candidate.candidate_id));
    const reviewerInput={...reviewer,eligibleCandidateIds:[...frontierIds].filter(id=>reviewer.eligibleCandidateIds===undefined||reviewer.eligibleCandidateIds.includes(id))};
    const reviewerResult=select(reviewerInput);
    const workers=ordered(worker,workerResult),reviewers=ordered(reviewerInput,reviewerResult,true);
    const stratum={worker_request:worker.request,reviewer_request:reviewer.request,task_required_capabilities:[...task.required_capabilities].sort(),eval_bucket:task.eval_bucket};
    const stratumDigest=digest(stratum),key=`${publicTaskClass}:${stratumDigest}`;if(seen.has(key))throw new RoutingError('DUPLICATE_ROUTING_STRATUM');seen.add(key);
    const capabilities=new Set([...task.required_capabilities,...(worker.request.required_capabilities??[]),...worker.request.constraints.required_tools]);
    if(worker.request.constraints.requires_vision)capabilities.add('vision');if(worker.request.constraints.requires_browser)capabilities.add('browser');if(worker.request.constraints.requires_local_execution)capabilities.add('local_execution');if(worker.request.constraints.privacy_requirement)capabilities.add(`privacy:${worker.request.constraints.privacy_requirement}`);if(worker.request.constraints.language)capabilities.add(`language:${worker.request.constraints.language}`);
    const requirements={tools:[...worker.request.constraints.required_tools].sort(),capabilities:[...capabilities].sort(),context_window_tokens:Math.max(worker.request.context_window_tokens??0,worker.request.constraints.context_window_requirement??0),fresh_context:worker.request.constraints.requires_fresh_context};
    routes.push({public_task_class:publicTaskClass,stratum_digest:stratumDigest,stratum,requirements,review_rule:{...policy.review[worker.request.risk],required:true,frontier:true},workers,reviewers,worker_decision:decision(workerResult),reviewer_decision:decision(reviewerResult),provisional_ranking_basis:null,ranking_basis:{workers:rankingBasis(worker,workerResult),reviewers:rankingBasis(reviewerInput,reviewerResult)}});
    allExclusions.push(...exclusions(publicTaskClass,stratumDigest,'worker',worker,workerResult),...exclusions(publicTaskClass,stratumDigest,'reviewer',reviewer,allReviewerResult));
  }
  for(const raw of input.provisional??[]){
    const entry=provisionalRouteInputSchema.parse(raw);if(entry.publicTaskClass==='full_project')throw new RoutingError('FULL_PROJECT_REQUIRES_DECOMPOSITION');
    for(const [role,rows] of [['worker',entry.workers],['reviewer',entry.reviewers]] as const)for(const row of rows){
      const evidence=row.evidence.task_evidence;
      if(evidence&&(evidence.public_task_class!==entry.publicTaskClass||evidence.role!==role))throw new RoutingError('TASK_EVIDENCE_SCOPE_MISMATCH');
    }
    const expiryDays=policy.routing_pack?.provisional_evidence_max_age_days??30;
    const make=(rows:ProvisionalRouteInput['workers']):RoutingTreatment[]=>rows.map(({evidence,...candidate})=>{
      const times=[evidence.observed_at,evidence.availability.checked_at,evidence.pricing.checked_at,...(evidence.task_evidence?.records.map(record=>record.observed_at)??[])].map(Date.parse);
      if(times.some(t=>t>Date.parse(generated)))throw new RoutingError('PROVISIONAL_EVIDENCE_FUTURE');
      const expires_at=new Date(Math.min(...times)+expiryDays*86400000).toISOString();if(Date.parse(expires_at)<=Date.parse(generated))throw new RoutingError('PROVISIONAL_EVIDENCE_EXPIRED');
      const rates=evidence.pricing.input_usd_per_million!==null&&evidence.pricing.output_usd_per_million!==null?{input:evidence.pricing.input_usd_per_million,output:evidence.pricing.output_usd_per_million}:null;
      return {...candidate,economics:{evidence_level:rates?'API_PRICE_PROXY':'UNKNOWN',metric:'api_equivalent_cost_per_accepted_task_usd',value_usd:null,pricing_source_digests:[],rates},candidate_identity:provisionalIdentity(candidate),pinning_source:'host_observation',evidence_tier:'provisional',observed_at:evidence.observed_at,expires_at,qualification:null,provisional:evidence};
    });
    const workerRanking=orderProvisionalTreatments(make(entry.workers),entry.publicTaskClass,'worker');
    const reviewerRanking=orderProvisionalTreatments(make(entry.reviewers),entry.publicTaskClass,'reviewer');
    const workers=workerRanking.treatments,reviewers=reviewerRanking.treatments;if(reviewers.some(r=>!r.frontier))throw new RoutingError('FRONTIER_REVIEWER_REQUIRED');
    const ranking_basis={workers:workerRanking.basis,reviewers:reviewerRanking.basis};
    if(entry.qualifiedStratumDigest){
      const route=routes.find(r=>r.public_task_class===entry.publicTaskClass&&r.stratum_digest===entry.qualifiedStratumDigest);if(!route)throw new RoutingError('PROVISIONAL_STRATUM_NOT_FOUND');
      if(route.stratum.worker_request.risk!==entry.risk||digest(route.requirements)!==digest(entry.requirements))throw new RoutingError('PROVISIONAL_SCOPE_MISMATCH');
      if(route.stratum.worker_request.max_cost_usd!==undefined||route.stratum.worker_request.constraints.max_cost_usd!=null)throw new RoutingError('PROVISIONAL_EXPLICIT_COST_CEILING_UNVERIFIED');
      const requiredProvider=route.stratum.worker_request.constraints.requires_provider;
      if(requiredProvider!==undefined&&[...workers,...reviewers].some(candidate=>candidate.provider!==requiredProvider))throw new RoutingError('PROVISIONAL_PROVIDER_CONSTRAINT');
      // Missing qualification evidence is the reason provisional authority exists. Only
      // actual failures for this exact stratum and lane prevent a bootstrap fallback.
      for(const [lane,candidates] of [['worker',workers],['reviewer',reviewers]] as const){
        const bad=new Set(allExclusions.filter(e=>e.public_task_class===entry.publicTaskClass&&e.stratum_digest===route.stratum_digest&&e.lane===lane&&(e.status==='REJECT'||e.status==='EXCLUDED')).map(e=>e.candidate_identity));
        if(candidates.some(c=>bad.has(c.candidate_identity))){
          const economic=allExclusions.some(e=>e.public_task_class===entry.publicTaskClass&&e.stratum_digest===route.stratum_digest&&e.lane===lane&&candidates.some(c=>c.candidate_identity===e.candidate_identity)&&e.rule_ids.some(rule=>rule.startsWith('economic_')));
          throw new RoutingError(economic?'ECONOMIC_EXCLUSION_CANNOT_BE_RELABELED':'FAILED_QUALIFICATION_CANNOT_BE_RELABELED');
        }
      }
      const mergedWorkers=orderProvisionalTreatments([...route.workers.filter(row=>row.evidence_tier==='provisional'),...workers],entry.publicTaskClass,'worker');
      const mergedReviewers=orderProvisionalTreatments([...route.reviewers.filter(row=>row.evidence_tier==='provisional'),...reviewers],entry.publicTaskClass,'reviewer');
      route.workers=[...route.workers.filter(row=>row.evidence_tier==='qualified'),...mergedWorkers.treatments];
      route.reviewers=[...route.reviewers.filter(row=>row.evidence_tier==='qualified'),...mergedReviewers.treatments];
      route.provisional_ranking_basis={workers:mergedWorkers.basis,reviewers:mergedReviewers.basis};
      route.ranking_basis={workers:route.workers.some(row=>row.evidence_tier==='qualified')?route.ranking_basis.workers:mergedWorkers.basis,reviewers:route.reviewers.some(row=>row.evidence_tier==='qualified')?route.ranking_basis.reviewers:mergedReviewers.basis};
      continue;
    }
    const constraints={schema_version:'constraint_set.v1' as const,constraint_id:'provisional_scope',version:1,allowed_tools:entry.requirements.tools,required_tools:entry.requirements.tools,forbidden_paths:[],requires_fresh_context:entry.requirements.fresh_context,requires_local_execution:false};
    const request={role_id:'implementer',task_class_id:entry.publicTaskClass,risk:entry.risk,cohort_id:'provisional_host_smoke',constraints_digest:digest(constraints),constraints,required_capabilities:entry.requirements.capabilities,...(entry.requirements.context_window_tokens>0?{context_window_tokens:entry.requirements.context_window_tokens}:{})};
    const stratum={worker_request:request,reviewer_request:{...request,role_id:'reviewer'},task_required_capabilities:entry.requirements.capabilities,eval_bucket:{suite_id:'provisional_host_smoke',suite_version:1,harness_version:'native_host_v1',grader_version:'frontier_review_v1',fixture_ids:[entry.publicTaskClass]},provisional_scope:entry.scope};
    const stratum_digest=digest(stratum);if(seen.has(`${entry.publicTaskClass}:${stratum_digest}`))throw new RoutingError('DUPLICATE_ROUTING_STRATUM');seen.add(`${entry.publicTaskClass}:${stratum_digest}`);
    // Bootstrap evidence is explicit authority only for this scope; the governor decision remains HOLD.
    const held={outcome:'HOLD' as const,rule_ids:['provisional_only_not_qualified'],decision_digest:digest({scope:entry.scope,tier:'provisional'})};
    routes.push({public_task_class:entry.publicTaskClass,stratum_digest,stratum,requirements:{...entry.requirements,tools:[...entry.requirements.tools].sort(),capabilities:[...new Set([...entry.requirements.capabilities,...entry.requirements.tools])].sort()},review_rule:{...policy.review[entry.risk],required:true,frontier:true},workers,reviewers,worker_decision:held,reviewer_decision:held,provisional_ranking_basis:ranking_basis,ranking_basis});
  }
  routes.sort((a,b)=>publicTaskClasses.indexOf(a.public_task_class)-publicTaskClasses.indexOf(b.public_task_class)||a.stratum_digest.localeCompare(b.stratum_digest));allExclusions.sort((a,b)=>a.public_task_class.localeCompare(b.public_task_class)||a.stratum_digest.localeCompare(b.stratum_digest)||a.lane.localeCompare(b.lane)||a.candidate_id.localeCompare(b.candidate_id));
  const generatedMs=Date.parse(generated);const expires=addHours(generatedMs,(policy.routing_pack?.hard_expiry_days??30)*24);const refresh=addHours(generatedMs,(policy.routing_pack?.refresh_after_days??7)*24);
  const missing_routes=publicTaskClasses.filter(c=>c!=='full_project').flatMap(public_task_class=>{const matches=routes.filter(r=>r.public_task_class===public_task_class);const reason=!matches.length?'stratum_not_supplied' as const:matches.some(r=>r.workers.length&&r.reviewers.length)?null:matches.every(r=>!r.workers.length)?'no_qualified_worker' as const:'no_qualified_frontier_reviewer' as const;return reason?[{public_task_class,reason}]:[];});
  const registry_content_digests=[...registryHashes].sort();
  const pack={schema_version:'routing_pack.v3' as const,routing_modes:routingModes,mode:input.mode,generated_at:generated,refresh_after:new Date(refresh).toISOString(),expires_at:new Date(expires).toISOString(),policy_version:policy.policy_version,policy_digest:expectedPolicy,registry_content_digests,registry_digest:digest(registry_content_digests),routes,missing_routes,exclusions:allExclusions,content_digest:''};
  return factorRoutingPack(pack);
}
