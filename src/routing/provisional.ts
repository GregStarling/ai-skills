import {z} from 'zod';
import {digest} from '../core/canonical.js';
import {servingConfigurationSchema} from '../schema/index.js';

const id=z.string().min(1),hash=z.string().regex(/^sha256:[a-f0-9]{64}$/),iso=z.string().datetime({offset:true});
const officialUrl=z.string().url().refine(value=>{const url=new URL(value);return url.protocol==='https:'&&['openai.com','anthropic.com','claude.com','chatgpt.com'].some(domain=>url.hostname===domain||url.hostname.endsWith(`.${domain}`));},'official HTTPS source required');
const citation=z.object({url:officialUrl,checked_at:iso}).strict();
export const provisionalEvidenceSchema=z.object({
  observed_at:iso,host:z.enum(['codex','claude']),host_version:id,observed_model_id:id,observed_effort:id.nullable(),configured_effort:id.optional(),effort_source:z.enum(['requested_configuration','host_configuration','runtime','not_applicable']).optional(),
  identity_source:z.enum(['runtime','host_configuration']),control_limitations:z.array(id),
  availability:citation,
  pricing:citation.extend({input_usd_per_million:z.number().nonnegative().nullable(),output_usd_per_million:z.number().nonnegative().nullable(),unknown_reason:id.nullable()}),
  smoke:z.object({task:id,artifact_digest:hash,execution_digest:hash,review_digest:hash,accepted:z.literal(true),frontier_reviewed:z.literal(true)}).strict(),
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
});
export const routeRequirementsSchema=z.object({tools:z.array(id),capabilities:z.array(id),context_window_tokens:z.number().int().nonnegative(),fresh_context:z.boolean()}).strict();
export type ProvisionalTreatmentInput=z.infer<typeof provisionalTreatmentSchema>;
export function provisionalIdentity(t:Pick<ProvisionalTreatmentInput,'model_id'|'snapshot_id'|'effort'|'serving'|'material_serving_settings'>&{provider:string}){return digest({provider:t.provider,snapshot_id:t.snapshot_id??t.model_id,effort:t.effort,serving:Object.fromEntries([...t.material_serving_settings].sort().map(key=>[key,t.serving[key]]))});}
