import {z} from 'zod';
import {digest} from '../core/canonical.js';
import {servingConfigurationSchema} from '../schema/index.js';
import type {PublicTaskClass,RoutingTreatment} from './contracts.js';

const id=z.string().min(1),hash=z.string().regex(/^sha256:[a-f0-9]{64}$/),iso=z.string().datetime({offset:true});
const officialUrl=z.string().url().refine(value=>{const url=new URL(value);return url.protocol==='https:'&&['openai.com','anthropic.com','claude.com','chatgpt.com'].some(domain=>url.hostname===domain||url.hostname.endsWith(`.${domain}`));},'official HTTPS source required');
const citation=z.object({url:officialUrl,checked_at:iso}).strict();
export const acceptanceTaskClasses={tinybug:'mechanical_work',mechanical:'mechanical_work',backend:'bounded_implementation',ui:'ui_implementation',hardbug:'hard_debugging',multicomponent:'complex_implementation'} as const;
const taskEvidenceRecordSchema=z.object({
  case_id:id,case:z.enum(['tinybug','mechanical','backend','ui','hardbug','multicomponent']),record_digest:hash,
  observed_at:iso,host_version:id,acceptance:z.enum(['PASS','PASS_WITH_HARNESS_RECOVERY']),
  artifact_digests:z.record(id,hash),trace_digests:z.array(hash).nonempty(),receipt_digests:z.array(hash).nonempty(),
  recovery:z.object({kind:id,limitations:z.array(id),trace_digests:z.array(hash).nonempty()}).strict().nullable(),
  browser:z.object({artifact_digest:hash,reviewer:id,viewports:z.array(z.object({width:z.number().positive(),height:z.number().positive()}).strict()).nonempty(),checks:z.array(id).nonempty()}).strict().nullable(),
}).strict();
export const taskEvidenceSchema=z.object({
  public_task_class:z.enum(['repo_exploration','mechanical_work','bounded_implementation','ui_implementation','hard_debugging','complex_implementation','research']),
  role:z.enum(['worker','reviewer']),basis:z.enum(['installed_acceptance','smoke_extrapolation']),
  host:z.enum(['codex','claude']),candidate_identity:hash,
  source:z.object({path:z.literal('data/routing/installed-acceptance.json'),content_digest:hash,digest_encoding:z.literal('canonical_json_sha256')}).strict(),
  records:z.array(taskEvidenceRecordSchema),limitations:z.array(id).nonempty(),
}).strict().superRefine((e,ctx)=>{
  if((e.basis==='installed_acceptance')!==(e.records.length>0))ctx.addIssue({code:'custom',message:'installed acceptance requires records; extrapolation must not claim accepted records'});
  for(const record of e.records){
    if(acceptanceTaskClasses[record.case]!==e.public_task_class)ctx.addIssue({code:'custom',message:'acceptance case does not match task class'});
    if(record.acceptance==='PASS_WITH_HARNESS_RECOVERY'&&!record.recovery)ctx.addIssue({code:'custom',message:'assisted acceptance requires recovery provenance'});
    if(record.case==='ui'&&(!record.browser||!Object.values(record.artifact_digests).includes(record.browser.artifact_digest)))ctx.addIssue({code:'custom',message:'UI acceptance requires matching rendered artifact evidence'});
  }
});
export const provisionalEvidenceSchema=z.object({
  observed_at:iso,host:z.enum(['codex','claude']),host_version:id,observed_model_id:id,observed_effort:id.nullable(),configured_effort:id.optional(),effort_source:z.enum(['requested_configuration','host_configuration','runtime','not_applicable']).optional(),
  identity_source:z.enum(['runtime','host_configuration']),control_limitations:z.array(id),
  availability:citation,
  pricing:citation.extend({input_usd_per_million:z.number().nonnegative().nullable(),output_usd_per_million:z.number().nonnegative().nullable(),unknown_reason:id.nullable()}),
  smoke:z.object({task:id,artifact_digest:hash,execution_digest:hash,review_digest:hash,accepted:z.literal(true),frontier_reviewed:z.literal(true)}).strict(),
  task_evidence:taskEvidenceSchema.optional(),
  qualification_failure:z.null(),
}).strict().superRefine((e,ctx)=>{
  if((e.observed_effort===null||e.observed_effort==='unknown')&&(!e.configured_effort||!e.effort_source||e.control_limitations.length===0))ctx.addIssue({code:'custom',message:'unobserved effort requires configured effort, its source, and a limitation'});
  if((e.pricing.input_usd_per_million===null||e.pricing.output_usd_per_million===null)&&e.pricing.unknown_reason===null)ctx.addIssue({code:'custom',message:'unknown pricing must have a reason'});
});
export const provisionalTreatmentSchema=z.object({
  candidate_id:id,provider:z.enum(['openai','anthropic','local']),model_id:id,snapshot_id:id.nullable(),effort:id,
  serving:servingConfigurationSchema,material_serving_settings:z.array(z.enum(['fallback','tool_use','json_schema'])).nonempty(),
  family:id.nullable(),frontier:z.boolean(),capabilities:z.array(id),context_window_tokens:z.number().int().positive().nullable(),
  evidence:provisionalEvidenceSchema,
}).strict().superRefine((t,ctx)=>{
  if(t.serving.fallback!=='disabled'||!t.material_serving_settings.includes('fallback'))ctx.addIssue({code:'custom',message:'fallback must be disabled and material'});
  if(t.evidence.observed_model_id!==(t.snapshot_id??t.model_id)||(t.evidence.configured_effort??t.evidence.observed_effort)!==t.effort||(t.evidence.observed_effort!==null&&t.evidence.observed_effort!=='unknown'&&t.evidence.observed_effort!==t.effort))ctx.addIssue({code:'custom',message:'observed treatment identity must match'});
  if(t.snapshot_id!==null&&t.evidence.identity_source!=='runtime')ctx.addIssue({code:'custom',message:'pinned snapshots require runtime observation'});
  if(t.evidence.task_evidence&&(t.evidence.task_evidence.host!==t.evidence.host||t.evidence.task_evidence.candidate_identity!==provisionalIdentity(t)))ctx.addIssue({code:'custom',message:'task evidence must bind the exact host and treatment identity'});
});
export const routeRequirementsSchema=z.object({tools:z.array(id),capabilities:z.array(id),context_window_tokens:z.number().int().nonnegative(),fresh_context:z.boolean()}).strict();
export type ProvisionalTreatmentInput=z.infer<typeof provisionalTreatmentSchema>;
export function provisionalIdentity(t:Pick<ProvisionalTreatmentInput,'model_id'|'snapshot_id'|'effort'|'serving'|'material_serving_settings'>&{provider:string}){return digest({provider:t.provider,snapshot_id:t.snapshot_id??t.model_id,effort:t.effort,serving:Object.fromEntries([...t.material_serving_settings].sort().map(key=>[key,t.serving[key]]))});}


export const provisionalRankingBasisSchema=z.enum([
  'advertised_token_prices','maintainer_order_cost_unknown',
  'task_evidence_then_advertised_token_prices','task_evidence_then_prices_or_maintainer_order',
]);

/** Accepted task evidence precedes extrapolation; neither is measured qualification. */
export function orderProvisionalTreatments(rows:readonly RoutingTreatment[],taskClass:PublicTaskClass,role:'worker'|'reviewer'){
  const installed=(candidate:RoutingTreatment)=>{
    const evidence=candidate.provisional?.task_evidence;
    return evidence?.basis==='installed_acceptance'&&evidence.records.length>0&&evidence.public_task_class===taskClass&&evidence.role===role&&evidence.host===candidate.provisional?.host&&evidence.candidate_identity===candidate.candidate_identity;
  };
  const levels=[rows.filter(installed),rows.filter(row=>!installed(row))];
  let allComparable=true;
  for(const group of levels){
    const priced=group.every(row=>row.provisional!==null&&row.provisional.pricing.input_usd_per_million!==null&&row.provisional.pricing.output_usd_per_million!==null);
    // No trustworthy provisional task-cost measurement exists. Only use advertised
    // token prices when both input/output order agree; otherwise retain maintainer order.
    const comparable=priced&&group.every(a=>group.every(b=>(a.provisional!.pricing.input_usd_per_million!-b.provisional!.pricing.input_usd_per_million!)*(a.provisional!.pricing.output_usd_per_million!-b.provisional!.pricing.output_usd_per_million!)>=0));
    if(comparable)group.sort((a,b)=>a.provisional!.pricing.input_usd_per_million!-b.provisional!.pricing.input_usd_per_million!||a.provisional!.pricing.output_usd_per_million!-b.provisional!.pricing.output_usd_per_million!);
    else allComparable=false;
  }
  return {treatments:levels.flat(),basis:allComparable?'task_evidence_then_advertised_token_prices' as const:'task_evidence_then_prices_or_maintainer_order' as const};
}
