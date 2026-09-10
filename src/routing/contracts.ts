import { z } from 'zod';
import { requestSchema } from '../governance/qualification.js';
import { contentDigest, digest } from '../core/canonical.js';
import { providerSchema, servingConfigurationSchema } from '../schema/index.js';

export const publicTaskClasses = [
  'repo_exploration', 'mechanical_work', 'bounded_implementation', 'ui_implementation',
  'hard_debugging', 'complex_implementation', 'research', 'full_project',
] as const;
export const publicTaskClassSchema = z.enum(publicTaskClasses);
const hash = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const iso = z.string().datetime({offset:true});
const id = z.string().min(1);
const evalBucketSchema = z.object({suite_id:id,suite_version:z.number().int().positive(),harness_version:id,grader_version:id,fixture_ids:z.array(id).nonempty()}).strict();
const reviewRuleSchema = z.object({required:z.boolean(),different_model:z.boolean(),different_family:z.boolean(),fresh_context:z.boolean(),frontier:z.boolean()}).strict();
const metricsSchema = z.object({tasks:z.number().int().nonnegative(),accepted:z.number().int().nonnegative(),success_rate:z.number().min(0).max(1),total_cost_usd:z.number().nonnegative(),cost_per_accepted_task_usd:z.number().nonnegative(),p95_latency_ms:z.number().nonnegative()}).strict().superRefine((metrics,ctx)=>{
  if(metrics.accepted>metrics.tasks||metrics.tasks===0||metrics.success_rate!==metrics.accepted/metrics.tasks||metrics.accepted===0||Math.abs(metrics.cost_per_accepted_task_usd-metrics.total_cost_usd/metrics.accepted)>1e-12)ctx.addIssue({code:'custom',message:'incoherent qualification metrics'});
});
const treatmentSchema = z.object({
  candidate_id:id,candidate_identity:hash,provider:providerSchema,model_id:id,snapshot_id:id,effort:id,
  serving:servingConfigurationSchema,material_serving_settings:z.array(z.enum(['fallback','tool_use','json_schema'])).nonempty(),
  family:id.nullable(),frontier:z.boolean(),capabilities:z.array(id),context_window_tokens:z.number().int().positive().nullable(),
  pinning_source:z.enum(['official_metadata','registry_metadata','synthetic_fixture']),
  qualification:z.object({metrics:metricsSchema,evidence_digest:hash,qualification_digest:hash}).strict(),
}).strict();
const decisionSummarySchema = z.object({outcome:z.enum(['SELECT','PROMOTE','RETAIN','HOLD','ESCALATION_REQUIRED','REJECT']),selected_candidate_id:id.optional(),rule_ids:z.array(id),decision_digest:hash}).strict();
const routeSchema = z.object({
  public_task_class:publicTaskClassSchema,stratum_digest:hash,
  stratum:z.object({worker_request:requestSchema,reviewer_request:requestSchema,task_required_capabilities:z.array(id),eval_bucket:evalBucketSchema}).strict(),
  requirements:z.object({tools:z.array(id),capabilities:z.array(id),context_window_tokens:z.number().int().nonnegative(),fresh_context:z.boolean()}).strict(),
  review_rule:reviewRuleSchema,workers:z.array(treatmentSchema),reviewers:z.array(treatmentSchema),
  worker_decision:decisionSummarySchema,reviewer_decision:decisionSummarySchema,
}).strict();
const exclusionSchema = z.object({public_task_class:publicTaskClassSchema,stratum_digest:hash,lane:z.enum(['worker','reviewer']),candidate_id:id,candidate_identity:hash,status:z.enum(['REJECT','HOLD','EXCLUDED']),rule_ids:z.array(id).nonempty()}).strict();
const missingRouteSchema = z.object({public_task_class:publicTaskClassSchema,reason:z.enum(['stratum_not_supplied','no_qualified_worker','no_qualified_frontier_reviewer'])}).strict();

export const routingPackSchema = z.object({
  schema_version:z.literal('routing_pack.v1'),mode:z.enum(['production','simulation_test']),generated_at:iso,refresh_after:iso,expires_at:iso,
  policy_version:z.number().int().positive(),policy_digest:hash,registry_content_digests:z.array(hash),registry_digest:hash,routes:z.array(routeSchema),missing_routes:z.array(missingRouteSchema),
  exclusions:z.array(exclusionSchema),content_digest:hash,
}).strict().superRefine((pack,ctx)=>{
  if (Date.parse(pack.generated_at)>Date.parse(pack.refresh_after)||Date.parse(pack.refresh_after)>Date.parse(pack.expires_at)) ctx.addIssue({code:'custom',path:['expires_at'],message:'invalid routing-pack chronology'});
  if(new Set(pack.registry_content_digests).size!==pack.registry_content_digests.length||digest(pack.registry_content_digests)!==pack.registry_digest)ctx.addIssue({code:'custom',path:['registry_digest'],message:'registry digest mismatch'});
  const routeKeys=pack.routes.map(r=>`${r.public_task_class}:${r.stratum_digest}`);if(new Set(routeKeys).size!==routeKeys.length)ctx.addIssue({code:'custom',path:['routes'],message:'duplicate routing stratum'});
  if(new Set(pack.missing_routes.map(r=>r.public_task_class)).size!==pack.missing_routes.length)ctx.addIssue({code:'custom',path:['missing_routes'],message:'duplicate public task class'});
  const covered=new Set([...pack.routes.map(r=>r.public_task_class),...pack.missing_routes.map(r=>r.public_task_class)]);
  if(publicTaskClasses.some(c=>!covered.has(c)))ctx.addIssue({code:'custom',path:['missing_routes'],message:'all public task classes must be accounted for'});
  for(const route of pack.routes){
    if(route.stratum_digest!==digest(route.stratum))ctx.addIssue({code:'custom',path:['routes'],message:'stratum digest mismatch'});
    const {worker_request:worker,reviewer_request:reviewer,eval_bucket:bucket}=route.stratum;
    if(worker.role_id==='reviewer'||reviewer.role_id!=='reviewer'||digest({...worker,role_id:''})!==digest({...reviewer,role_id:''})||worker.constraints_digest!==digest(worker.constraints))ctx.addIssue({code:'custom',path:['routes'],message:'incoherent governed stratum'});
    const required=new Set([...route.stratum.task_required_capabilities,...(worker.required_capabilities??[]),...worker.constraints.required_tools]);if(worker.constraints.requires_vision)required.add('vision');if(worker.constraints.requires_browser)required.add('browser');if(worker.constraints.requires_local_execution)required.add('local_execution');if(worker.constraints.privacy_requirement)required.add(`privacy:${worker.constraints.privacy_requirement}`);if(worker.constraints.language)required.add(`language:${worker.constraints.language}`);
    if(digest(route.requirements)!==digest({tools:[...worker.constraints.required_tools].sort(),capabilities:[...required].sort(),context_window_tokens:Math.max(worker.context_window_tokens??0,worker.constraints.context_window_requirement??0),fresh_context:worker.constraints.requires_fresh_context}))ctx.addIssue({code:'custom',path:['routes'],message:'routing requirements mismatch'});
    for(const [lane,candidates] of [['workers',route.workers],['reviewers',route.reviewers]] as const){
      if(new Set(candidates.map(c=>c.candidate_id)).size!==candidates.length||new Set(candidates.map(c=>c.candidate_identity)).size!==candidates.length)ctx.addIssue({code:'custom',path:['routes'],message:`duplicate ${lane} treatment`});
    }
    for(const candidate of [...route.workers,...route.reviewers]){
      const serving=Object.fromEntries([...candidate.material_serving_settings].sort().map(key=>[key,candidate.serving[key]]));
      if(candidate.candidate_identity!==digest({provider:candidate.provider,snapshot_id:candidate.snapshot_id,effort:candidate.effort,serving}))ctx.addIssue({code:'custom',path:['routes'],message:'candidate identity mismatch'});
      const expected=digest({candidate_identity:candidate.candidate_identity,metrics:candidate.qualification.metrics,evidence_digest:candidate.qualification.evidence_digest});
      if(candidate.qualification.qualification_digest!==expected)ctx.addIssue({code:'custom',path:['routes'],message:'qualification digest mismatch'});
      if(candidate.serving.fallback!=='disabled')ctx.addIssue({code:'custom',path:['routes'],message:'fallback-enabled treatments are unsupported'});
      if(pack.mode==='production'&&(candidate.provider==='synthetic'||candidate.pinning_source==='synthetic_fixture'))ctx.addIssue({code:'custom',path:['routes'],message:'synthetic treatment cannot carry production authority'});
    }
    if(route.reviewers.some(r=>!r.frontier))ctx.addIssue({code:'custom',path:['routes'],message:'reviewer ladder must be frontier-qualified'});
    if(['SELECT','PROMOTE','RETAIN'].includes(route.worker_decision.outcome)){
      if(!route.worker_decision.selected_candidate_id||(route.workers.length>0&&route.workers[0]?.candidate_id!==route.worker_decision.selected_candidate_id))ctx.addIssue({code:'custom',path:['routes'],message:'worker decision ordering mismatch'});
    }else if(route.workers.length||route.worker_decision.selected_candidate_id)ctx.addIssue({code:'custom',path:['routes'],message:'non-selecting worker decision cannot authorize a ladder'});
    if(!['SELECT','PROMOTE','RETAIN'].includes(route.reviewer_decision.outcome)&&(route.reviewers.length||route.reviewer_decision.selected_candidate_id))ctx.addIssue({code:'custom',path:['routes'],message:'non-selecting reviewer decision cannot authorize a ladder'});
    if(['SELECT','PROMOTE','RETAIN'].includes(route.reviewer_decision.outcome)&&route.reviewers.length>0&&route.reviewers[0]?.candidate_id!==route.reviewer_decision.selected_candidate_id)ctx.addIssue({code:'custom',path:['routes'],message:'reviewer decision ordering mismatch'});
    const sorted=(rows:typeof route.workers)=>rows.every((row,index)=>index===0||rows[index-1]!.qualification.metrics.cost_per_accepted_task_usd<row.qualification.metrics.cost_per_accepted_task_usd||rows[index-1]!.qualification.metrics.cost_per_accepted_task_usd===row.qualification.metrics.cost_per_accepted_task_usd&&rows[index-1]!.candidate_id.localeCompare(row.candidate_id)<=0);
    if(!sorted(route.reviewers.slice(['SELECT','RETAIN','PROMOTE'].includes(route.reviewer_decision.outcome)?1:0))||!sorted(route.workers.slice(route.worker_decision.outcome==='RETAIN'||route.worker_decision.outcome==='PROMOTE'?1:0)))ctx.addIssue({code:'custom',path:['routes'],message:'treatment ladder is not cost ordered'});
  }
  const expectedMissing=publicTaskClasses.flatMap(public_task_class=>{const matches=pack.routes.filter(r=>r.public_task_class===public_task_class);const reason=!matches.length?'stratum_not_supplied' as const:matches.some(r=>r.workers.length&&r.reviewers.length)?null:matches.every(r=>!r.workers.length)?'no_qualified_worker' as const:'no_qualified_frontier_reviewer' as const;return reason?[{public_task_class,reason}]:[];});
  if(digest(pack.missing_routes)!==digest(expectedMissing))ctx.addIssue({code:'custom',path:['missing_routes'],message:'missing-route summary mismatch'});
});

export type PublicTaskClass = z.infer<typeof publicTaskClassSchema>;
export type RoutingPack = z.infer<typeof routingPackSchema>;
export type RoutingRoute = RoutingPack['routes'][number];
export type RoutingTreatment = RoutingRoute['workers'][number];

export class RoutingError extends Error {
  constructor(readonly code:string,message=code){super(message);this.name='RoutingError';}
}

export function parseRoutingPack(value:unknown):RoutingPack{
  const parsed=routingPackSchema.safeParse(value);
  if(!parsed.success)throw new RoutingError('PACK_MALFORMED',parsed.error.message);
  if(contentDigest(parsed.data)!==parsed.data.content_digest)throw new RoutingError('PACK_TAMPERED');
  return parsed.data;
}
