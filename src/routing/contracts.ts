import { z } from 'zod';
import { requestSchema } from '../governance/qualification.js';
import { contentDigest, digest } from '../core/canonical.js';
import { providerSchema, servingConfigurationSchema } from '../schema/index.js';
import {provisionalEvidenceSchema,provisionalIdentity,routeRequirementsSchema,provisionalRankingBasisSchema,taskEvidenceSchema} from './provisional.js';

export const publicTaskClasses = [
  'repo_exploration', 'mechanical_work', 'bounded_implementation', 'ui_implementation',
  'hard_debugging', 'complex_implementation', 'research', 'full_project',
] as const;
export const routingModes={repo_exploration:'direct',mechanical_work:'direct',bounded_implementation:'direct',ui_implementation:'frontier_specify_then_delegate',hard_debugging:'frontier_diagnose_then_delegate',complex_implementation:'frontier_plan_then_delegate',research:'direct',full_project:'decompose'} as const;
export const publicTaskClassSchema = z.enum(publicTaskClasses);
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const iso = z.string().datetime({offset:true});
const id = z.string().min(1);
const evalBucketSchema = z.object({suite_id:id,suite_version:z.number().int().positive(),harness_version:id,grader_version:id,fixture_ids:z.array(id).nonempty()}).strict();
const reviewRuleSchema = z.object({required:z.boolean(),different_model:z.boolean(),different_family:z.boolean(),fresh_context:z.boolean(),frontier:z.boolean()}).strict();
const metricsSchema = z.object({tasks:z.number().int().nonnegative(),accepted:z.number().int().nonnegative(),success_rate:z.number().min(0).max(1),total_cost_usd:z.number().nonnegative().nullable(),cost_per_accepted_task_usd:z.number().nonnegative().nullable(),p95_latency_ms:z.number().nonnegative()}).strict().superRefine((metrics,ctx)=>{
  if(metrics.accepted>metrics.tasks||metrics.tasks===0||metrics.success_rate!==metrics.accepted/metrics.tasks||metrics.accepted===0||(metrics.total_cost_usd===null)!==(metrics.cost_per_accepted_task_usd===null)||metrics.total_cost_usd!==null&&metrics.cost_per_accepted_task_usd!==null&&Math.abs(metrics.cost_per_accepted_task_usd-metrics.total_cost_usd/metrics.accepted)>1e-12)ctx.addIssue({code:'custom',message:'incoherent qualification metrics'});
});
const economicSummarySchema=z.object({evidence_level:z.enum(['MEASURED_API_EQUIVALENT','API_PRICE_PROXY','UNKNOWN']),metric:z.literal('api_equivalent_cost_per_accepted_task_usd'),value_usd:z.number().nonnegative().nullable(),pricing_source_digests:z.array(hash),rates:z.object({input:z.number().nonnegative(),output:z.number().nonnegative()}).strict().nullable()}).strict().superRefine((e,ctx)=>{
  if((e.evidence_level==='MEASURED_API_EQUIVALENT')!==(e.value_usd!==null)||e.evidence_level==='API_PRICE_PROXY'&&e.rates===null||e.evidence_level==='UNKNOWN'&&e.rates!==null)ctx.addIssue({code:'custom',message:'incoherent economic evidence'});
});
const rankingBasisSchema=z.union([z.enum(['governed_cost_per_accepted_task','measured_api_equivalent','api_price_proxy','maintainer_order','unresolved']),provisionalRankingBasisSchema]);
const treatmentSchema = z.object({
  candidate_id:id,candidate_identity:hash,provider:providerSchema,model_id:id,snapshot_id:id.nullable(),effort:id,
  serving:servingConfigurationSchema,material_serving_settings:z.array(z.enum(['fallback','tool_use','json_schema'])).nonempty(),
  family:id.nullable(),frontier:z.boolean(),capabilities:z.array(id),context_window_tokens:z.number().int().positive().nullable(),
  pinning_source:z.enum(['official_metadata','registry_metadata','synthetic_fixture','host_observation']),
  evidence_tier:z.enum(['qualified','provisional']),observed_at:iso,expires_at:iso,
  qualification:z.object({metrics:metricsSchema,evidence_digest:hash,qualification_digest:hash}).strict().nullable(),
  provisional:provisionalEvidenceSchema.nullable(),economics:economicSummarySchema.nullable(),
}).strict();
const decisionSummarySchema = z.object({outcome:z.enum(['SELECT','PROMOTE','RETAIN','HOLD','ESCALATION_REQUIRED','REJECT']),selected_candidate_id:id.optional(),rule_ids:z.array(id),decision_digest:hash}).strict();
const routeSchema = z.object({
  public_task_class:publicTaskClassSchema,stratum_digest:hash,
  stratum:z.object({worker_request:requestSchema,reviewer_request:requestSchema,task_required_capabilities:z.array(id),eval_bucket:evalBucketSchema,provisional_scope:id.optional()}).strict(),
  requirements:routeRequirementsSchema,
  review_rule:reviewRuleSchema,workers:z.array(treatmentSchema),reviewers:z.array(treatmentSchema),
  worker_decision:decisionSummarySchema,reviewer_decision:decisionSummarySchema,
  provisional_ranking_basis:z.object({workers:provisionalRankingBasisSchema,reviewers:provisionalRankingBasisSchema}).strict().nullable(),
  ranking_basis:z.object({workers:rankingBasisSchema,reviewers:rankingBasisSchema}).strict(),
}).strict();
const exclusionSchema = z.object({public_task_class:publicTaskClassSchema,stratum_digest:hash,lane:z.enum(['worker','reviewer']),candidate_id:id,candidate_identity:hash,status:z.enum(['REJECT','HOLD','EXCLUDED']),rule_ids:z.array(id).nonempty()}).strict();
const missingRouteSchema = z.object({public_task_class:publicTaskClassSchema,reason:z.enum(['stratum_not_supplied','no_qualified_worker','no_qualified_frontier_reviewer'])}).strict();

const expandedPackObject = z.object({
  schema_version:z.literal('routing_pack.v3'),mode:z.enum(['production','simulation_test']),generated_at:iso,refresh_after:iso,expires_at:iso,
  routing_modes:z.object({repo_exploration:z.literal('direct'),mechanical_work:z.literal('direct'),bounded_implementation:z.literal('direct'),ui_implementation:z.literal('frontier_specify_then_delegate'),hard_debugging:z.literal('frontier_diagnose_then_delegate'),complex_implementation:z.literal('frontier_plan_then_delegate'),research:z.literal('direct'),full_project:z.literal('decompose')}).strict(),
  policy_version:z.number().int().positive(),policy_digest:hash,registry_content_digests:z.array(hash),registry_digest:hash,routes:z.array(routeSchema),missing_routes:z.array(missingRouteSchema),
  exclusions:z.array(exclusionSchema),content_digest:hash,
}).strict();
const expandedPackSchema=expandedPackObject.superRefine((pack,ctx)=>{
  if (Date.parse(pack.generated_at)>Date.parse(pack.refresh_after)||Date.parse(pack.refresh_after)>Date.parse(pack.expires_at)) ctx.addIssue({code:'custom',path:['expires_at'],message:'invalid routing-pack chronology'});
  if(new Set(pack.registry_content_digests).size!==pack.registry_content_digests.length||digest(pack.registry_content_digests)!==pack.registry_digest)ctx.addIssue({code:'custom',path:['registry_digest'],message:'registry digest mismatch'});
  const routeKeys=pack.routes.map(r=>`${r.public_task_class}:${r.stratum_digest}`);if(new Set(routeKeys).size!==routeKeys.length)ctx.addIssue({code:'custom',path:['routes'],message:'duplicate routing stratum'});
  if(new Set(pack.missing_routes.map(r=>r.public_task_class)).size!==pack.missing_routes.length)ctx.addIssue({code:'custom',path:['missing_routes'],message:'duplicate public task class'});
  const covered=new Set([...pack.routes.map(r=>r.public_task_class),...pack.missing_routes.map(r=>r.public_task_class)]);
  if(publicTaskClasses.some(c=>c!=='full_project'&&!covered.has(c)))ctx.addIssue({code:'custom',path:['missing_routes'],message:'all public task classes must be accounted for'});
  if(pack.routes.some(r=>r.public_task_class==='full_project')||pack.missing_routes.some(r=>r.public_task_class==='full_project'))ctx.addIssue({code:'custom',message:'full_project decomposes; it cannot have or require a worker route'});
  for(const route of pack.routes){
    if(!route.review_rule.required||!route.review_rule.frontier)ctx.addIssue({code:'custom',message:'frontier verification is mandatory'});
    if(route.stratum_digest!==digest(route.stratum))ctx.addIssue({code:'custom',path:['routes'],message:'stratum digest mismatch'});
    const {worker_request:worker,reviewer_request:reviewer}=route.stratum;
    if(pack.mode==='production'&&pack.policy_version>=4&&[...route.workers,...route.reviewers].some(c=>c.evidence_tier==='qualified')&&!['claude_code','codex'].includes(worker.execution_environment??''))ctx.addIssue({code:'custom',message:'qualified portable routes require native host execution evidence'});
    if(worker.role_id==='reviewer'||reviewer.role_id!=='reviewer'||digest({...worker,role_id:''})!==digest({...reviewer,role_id:''})||worker.constraints_digest!==digest(worker.constraints))ctx.addIssue({code:'custom',path:['routes'],message:'incoherent governed stratum'});
    const required=new Set([...route.stratum.task_required_capabilities,...(worker.required_capabilities??[]),...worker.constraints.required_tools]);if(worker.constraints.requires_vision)required.add('vision');if(worker.constraints.requires_browser)required.add('browser');if(worker.constraints.requires_local_execution)required.add('local_execution');if(worker.constraints.privacy_requirement)required.add(`privacy:${worker.constraints.privacy_requirement}`);if(worker.constraints.language)required.add(`language:${worker.constraints.language}`);
    if(digest(route.requirements)!==digest({tools:[...worker.constraints.required_tools].sort(),capabilities:[...required].sort(),context_window_tokens:Math.max(worker.context_window_tokens??0,worker.constraints.context_window_requirement??0),fresh_context:worker.constraints.requires_fresh_context}))ctx.addIssue({code:'custom',path:['routes'],message:'routing requirements mismatch'});
    for(const [lane,candidates] of [['workers',route.workers],['reviewers',route.reviewers]] as const){
      for(const candidate of candidates){const evidence=candidate.provisional?.task_evidence;if(evidence&&(evidence.public_task_class!==route.public_task_class||evidence.role!==(lane==='workers'?'worker':'reviewer')||evidence.host!==candidate.provisional?.host||evidence.candidate_identity!==candidate.candidate_identity))ctx.addIssue({code:'custom',message:'task evidence scope or identity mismatch'});}
      if(new Set(candidates.map(c=>c.candidate_id)).size!==candidates.length||new Set(candidates.map(c=>c.candidate_identity)).size!==candidates.length)ctx.addIssue({code:'custom',path:['routes'],message:`duplicate ${lane} treatment`});
    }
    for(const candidate of [...route.workers,...route.reviewers]){
      if(candidate.candidate_identity!==provisionalIdentity(candidate))ctx.addIssue({code:'custom',path:['routes'],message:'candidate identity mismatch'});
      if(Date.parse(candidate.observed_at)>Date.parse(pack.generated_at)||Date.parse(candidate.expires_at)<=Date.parse(candidate.observed_at))ctx.addIssue({code:'custom',message:'invalid treatment chronology'});
      if(candidate.evidence_tier==='qualified'){
        if(pack.policy_version>=4&&candidate.economics===null)ctx.addIssue({code:'custom',message:'qualified v4 economics must be explicit'});
        if(candidate.qualification===null||candidate.provisional!==null||candidate.snapshot_id===null||candidate.pinning_source==='host_observation')ctx.addIssue({code:'custom',message:'invalid qualified evidence'});
        else {const expected=digest({candidate_identity:candidate.candidate_identity,metrics:candidate.qualification.metrics,evidence_digest:candidate.qualification.evidence_digest});if(candidate.qualification.qualification_digest!==expected)ctx.addIssue({code:'custom',message:'qualification digest mismatch'});}
      }else {
        const price=candidate.provisional?.pricing,rates=price&&price.input_usd_per_million!==null&&price.output_usd_per_million!==null?{input:price.input_usd_per_million,output:price.output_usd_per_million}:null;
        if(digest(candidate.economics)!==digest({evidence_level:rates?'API_PRICE_PROXY':'UNKNOWN',metric:'api_equivalent_cost_per_accepted_task_usd',value_usd:null,pricing_source_digests:[],rates}))ctx.addIssue({code:'custom',message:'provisional economics must match advertised prices or remain unknown'});
        if(candidate.qualification!==null||candidate.provisional===null||candidate.pinning_source!=='host_observation')ctx.addIssue({code:'custom',message:'invalid provisional evidence'});
        else if(candidate.provisional.observed_model_id!==(candidate.snapshot_id??candidate.model_id)||(candidate.provisional.configured_effort??candidate.provisional.observed_effort)!==candidate.effort||(candidate.provisional.observed_effort!==null&&candidate.provisional.observed_effort!=='unknown'&&candidate.provisional.observed_effort!==candidate.effort)||candidate.observed_at!==candidate.provisional.observed_at)ctx.addIssue({code:'custom',message:'provisional identity mismatch'});
      }
      if(candidate.serving.fallback!=='disabled')ctx.addIssue({code:'custom',path:['routes'],message:'fallback-enabled treatments are unsupported'});
      if(pack.mode==='production'&&(candidate.provider==='synthetic'||candidate.pinning_source==='synthetic_fixture'))ctx.addIssue({code:'custom',path:['routes'],message:'synthetic treatment cannot carry production authority'});
    }
    if(route.reviewers.some(r=>!r.frontier))ctx.addIssue({code:'custom',path:['routes'],message:'reviewer ladder must be frontier-qualified'});
    const qualifiedWorkers=route.workers.filter(c=>c.evidence_tier==='qualified'),qualifiedReviewers=route.reviewers.filter(c=>c.evidence_tier==='qualified');
    if(['SELECT','PROMOTE','RETAIN'].includes(route.worker_decision.outcome)){
      if(!route.worker_decision.selected_candidate_id||(qualifiedWorkers.length>0&&qualifiedWorkers[0]?.candidate_id!==route.worker_decision.selected_candidate_id))ctx.addIssue({code:'custom',path:['routes'],message:'worker decision ordering mismatch'});
    }else if(qualifiedWorkers.length||route.worker_decision.selected_candidate_id)ctx.addIssue({code:'custom',path:['routes'],message:'non-selecting worker decision cannot authorize a ladder'});
    if(!['SELECT','PROMOTE','RETAIN'].includes(route.reviewer_decision.outcome)&&(qualifiedReviewers.length||route.reviewer_decision.selected_candidate_id))ctx.addIssue({code:'custom',path:['routes'],message:'non-selecting reviewer decision cannot authorize a ladder'});
    if(['SELECT','PROMOTE','RETAIN'].includes(route.reviewer_decision.outcome)&&qualifiedReviewers.length>0&&qualifiedReviewers[0]?.candidate_id!==route.reviewer_decision.selected_candidate_id)ctx.addIssue({code:'custom',path:['routes'],message:'reviewer decision ordering mismatch'});
    for(const [lane,rows,decision] of [['workers',qualifiedWorkers,route.worker_decision],['reviewers',qualifiedReviewers,route.reviewer_decision]] as const){
      if(!rows.length)continue;
      const basis=route.ranking_basis[lane],fallbacks=rows.slice(['RETAIN','PROMOTE'].includes(decision.outcome)?1:0);
      const valid=basis==='governed_cost_per_accepted_task'?pack.policy_version<4&&rows.every(r=>r.qualification!.metrics.cost_per_accepted_task_usd!==null)&&fallbacks.every((row,i)=>i===0||fallbacks[i-1]!.qualification!.metrics.cost_per_accepted_task_usd!<=row.qualification!.metrics.cost_per_accepted_task_usd!):basis==='measured_api_equivalent'?rows.every(r=>r.economics?.evidence_level==='MEASURED_API_EQUIVALENT')&&fallbacks.every((row,i)=>i===0||fallbacks[i-1]!.economics!.value_usd!<=row.economics!.value_usd!):basis==='api_price_proxy'?rows.every(r=>r.economics?.rates!=null)&&rows.every(a=>rows.every(b=>(a.economics!.rates!.input-b.economics!.rates!.input)*(a.economics!.rates!.output-b.economics!.rates!.output)>=0))&&fallbacks.every((row,i)=>i===0||fallbacks[i-1]!.economics!.rates!.input<=row.economics!.rates!.input&&fallbacks[i-1]!.economics!.rates!.output<=row.economics!.rates!.output):basis==='maintainer_order';
      if(!valid)ctx.addIssue({code:'custom',path:['routes'],message:'treatment ladder is not economically ordered'});
    }
  }
  const expectedMissing=publicTaskClasses.filter(c=>c!=='full_project').flatMap(public_task_class=>{const matches=pack.routes.filter(r=>r.public_task_class===public_task_class);const reason=!matches.length?'stratum_not_supplied' as const:matches.some(r=>r.workers.length&&r.reviewers.length)?null:matches.every(r=>!r.workers.length)?'no_qualified_worker' as const:'no_qualified_frontier_reviewer' as const;return reason?[{public_task_class,reason}]:[];});
  if(digest(pack.missing_routes)!==digest(expectedMissing))ctx.addIssue({code:'custom',path:['missing_routes'],message:'missing-route summary mismatch'});
});

// The wire format stores treatment-wide claims once. Qualification and installed
// task acceptance remain on each route/lane; sharing identity does not share authority.
const sharedTreatmentSchema=treatmentSchema.omit({candidate_id:true,candidate_identity:true,pinning_source:true,evidence_tier:true,observed_at:true,expires_at:true,qualification:true,provisional:true,economics:true}).extend({
  provisional:z.object(Object.fromEntries(Object.entries(provisionalEvidenceSchema.shape).filter(([key])=>key!=='task_evidence')) as Omit<typeof provisionalEvidenceSchema.shape,'task_evidence'>).strict().nullable(),
}).strict();
const treatmentReferenceSchema=treatmentSchema.pick({candidate_id:true,candidate_identity:true,pinning_source:true,evidence_tier:true,observed_at:true,expires_at:true,qualification:true,economics:true}).extend({task_evidence:taskEvidenceSchema.nullable()}).strict();
const wirePackObject=expandedPackObject.extend({treatments:z.record(hash,sharedTreatmentSchema),routes:z.array(routeSchema.extend({workers:z.array(treatmentReferenceSchema),reviewers:z.array(treatmentReferenceSchema)}))}).strict();
type WirePack=z.infer<typeof wirePackObject>;
function expandUnchecked(pack:WirePack){
  const {treatments,...metadata}=pack;
  return {...metadata,routes:pack.routes.map(route=>({...route,...Object.fromEntries((['workers','reviewers'] as const).map(lane=>[lane,route[lane].map(reference=>{
    const {task_evidence,...evidence}=reference,shared=treatments[reference.candidate_identity]!;
    return {...shared,...evidence,provisional:reference.evidence_tier==='provisional'&&shared?.provisional?{...shared.provisional,...(task_evidence?{task_evidence}:{})}:null};
  })]))}))};
}
export const routingPackSchema=wirePackObject.superRefine((pack,ctx)=>{
  const references=pack.routes.flatMap(route=>[...route.workers,...route.reviewers]),used=new Set(references.map(reference=>reference.candidate_identity));
  for(const [identity,treatment] of Object.entries(pack.treatments)){
    if(identity!==provisionalIdentity(treatment))ctx.addIssue({code:'custom',path:['treatments',identity],message:'candidate identity mismatch'});
    if(!used.has(identity))ctx.addIssue({code:'custom',path:['treatments',identity],message:'unreferenced treatment'});
  }
  let unresolved=false;
  for(const reference of references){
    if(!Object.hasOwn(pack.treatments,reference.candidate_identity)){unresolved=true;ctx.addIssue({code:'custom',path:['routes'],message:'unresolved treatment reference'});}
    if(reference.evidence_tier==='qualified'&&reference.task_evidence!==null)ctx.addIssue({code:'custom',message:'qualified evidence cannot inherit provisional task acceptance'});
  }
  if(unresolved)return;
  const expanded=expandedPackSchema.safeParse(expandUnchecked(pack));
  if(!expanded.success)for(const issue of expanded.error.issues)ctx.addIssue({code:'custom',path:issue.path,message:issue.message});
});

export type PublicTaskClass = z.infer<typeof publicTaskClassSchema>;
export type RoutingPack = z.infer<typeof routingPackSchema>;
export type ExpandedRoutingPack = z.infer<typeof expandedPackSchema>;
export type RoutingRoute = ExpandedRoutingPack['routes'][number];
export type RoutingTreatment = RoutingRoute['workers'][number];

/** Compiler-only factoring; conflicting claims for one identity are never merged. */
export function factorRoutingPack(pack:ExpandedRoutingPack):RoutingPack{
  const treatments:WirePack['treatments']={};
  const routes=pack.routes.map(route=>({...route,...Object.fromEntries((['workers','reviewers'] as const).map(lane=>[lane,route[lane].map(candidate=>{
    const {candidate_id,candidate_identity,pinning_source,evidence_tier,observed_at,expires_at,qualification,provisional,economics,...metadata}=candidate;
    const {task_evidence,...common}=provisional??{};
    const shared={...metadata,provisional:provisional?common:null} as WirePack['treatments'][string],previous=treatments[candidate_identity];
    if(previous){
      if(digest({...previous,provisional:null})!==digest({...shared,provisional:null})||previous.provisional&&shared.provisional&&digest(previous.provisional)!==digest(shared.provisional))throw new RoutingError('TREATMENT_METADATA_CONFLICT');
      if(!previous.provisional&&shared.provisional)previous.provisional=shared.provisional;
    }else treatments[candidate_identity]=shared;
    return {candidate_id,candidate_identity,pinning_source,evidence_tier,observed_at,expires_at,qualification,economics,task_evidence:task_evidence??null};
  })]))}));
  const wire={...pack,treatments:Object.fromEntries(Object.entries(treatments).sort(([a],[b])=>a.localeCompare(b))),routes,content_digest:''};
  wire.content_digest=contentDigest(wire);return parseRoutingPack(wire);
}
export function expandRoutingPack(value:unknown):ExpandedRoutingPack{
  return expandedPackSchema.parse(expandUnchecked(parseRoutingPack(value)));
}

export class RoutingError extends Error {
  constructor(readonly code:string,message=code){super(message);this.name='RoutingError';}
}

export function parseRoutingPack(value:unknown):RoutingPack{
  if(value!==null&&typeof value==='object'&&'schema_version' in value&&value.schema_version!=='routing_pack.v3')throw new RoutingError('PACK_VERSION_UNSUPPORTED','Expected routing_pack.v3. Recompile and reinstall the complete delegate folder; older packs are not reinterpreted.');
  const parsed=routingPackSchema.safeParse(value);
  if(!parsed.success)throw new RoutingError('PACK_MALFORMED',parsed.error.message);
  if(contentDigest(parsed.data)!==parsed.data.content_digest)throw new RoutingError('PACK_TAMPERED');
  return parsed.data;
}

export function validateRoutingPackPublication(value:unknown,now=new Date().toISOString()):RoutingPack{
  const pack=parseRoutingPack(value);const parsed=iso.safeParse(now);if(!parsed.success)throw new RoutingError('INVALID_PUBLICATION_TIME');
  if(pack.mode!=='production')throw new RoutingError('PACK_NOT_PRODUCTION');
  if(Date.parse(pack.generated_at)>Date.parse(parsed.data))throw new RoutingError('PACK_NOT_YET_VALID');
  if(Date.parse(pack.expires_at)<=Date.parse(parsed.data))throw new RoutingError('PACK_EXPIRED');
  return pack;
}
