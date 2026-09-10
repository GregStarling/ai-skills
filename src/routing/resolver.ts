import { z } from 'zod';
import { providerSchema, servingConfigurationSchema } from '../schema/index.js';
import {orderProvisionalTreatments} from './provisional.js';
import { expandRoutingPack, publicTaskClassSchema, RoutingError, type RoutingRoute, type RoutingTreatment } from './contracts.js';

const hostSchema=z.object({
  host:z.enum(['codex','claude']).optional(),
  treatments:z.array(z.object({provider:providerSchema,model_id:z.string().min(1),snapshot_id:z.string().min(1).nullable(),effort:z.string().min(1),serving:servingConfigurationSchema,observed_model_id:z.string().min(1).optional(),observed_effort:z.string().min(1).optional(),substitution_observed:z.boolean().optional()}).strict()),
  tools:z.array(z.string().min(1)),capabilities:z.array(z.string().min(1)),context_window_tokens:z.number().int().positive(),supports_fresh_context:z.boolean(),
}).strict();
const localPreferencesSchema=z.object({pack_content_digest:z.string().regex(/^sha256:[a-f0-9]{64}$/),stratum_digest:z.string().regex(/^sha256:[a-f0-9]{64}$/),host:z.enum(['codex','claude']),preferred_worker_identity:z.string().regex(/^sha256:[a-f0-9]{64}$/)}).strict();
const requestSchema=z.object({publicTaskClass:publicTaskClassSchema,stratumDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/),now:z.string().datetime({offset:true}),host:hostSchema,failedCandidateIds:z.array(z.string().min(1)).optional(),localPreferences:localPreferencesSchema.optional()}).strict();
export type ResolveRoutingInput=z.infer<typeof requestSchema>;
export type ResolvedRouting={worker:RoutingTreatment;reviewer:RoutingTreatment;route:RoutingRoute;stale:boolean;ranking_basis:{worker:string;reviewer:string}};

const treatmentAvailable=(candidate:RoutingTreatment,host:z.infer<typeof hostSchema>)=>(candidate.evidence_tier==='qualified'||candidate.provisional?.host===host.host)&&host.treatments.some(t=>t.serving.fallback==='disabled'&&t.provider===candidate.provider&&t.model_id===candidate.model_id&&t.snapshot_id===candidate.snapshot_id&&t.effort===candidate.effort&&t.substitution_observed!==true&&(t.observed_model_id===undefined||t.observed_model_id===(candidate.snapshot_id??candidate.model_id))&&(t.observed_effort===undefined||t.observed_effort===candidate.effort)&&candidate.material_serving_settings.every(key=>t.serving[key]===candidate.serving[key]));
function hostMeets(route:RoutingRoute,host:z.infer<typeof hostSchema>){
  const required=route.requirements;
  return required.capabilities.every(x=>host.capabilities.includes(x))&&required.tools.every(x=>host.tools.includes(x))&&host.context_window_tokens>=required.context_window_tokens&&(!required.fresh_context||host.supports_fresh_context);
}
function independent(worker:RoutingTreatment,reviewer:RoutingTreatment,route:RoutingRoute,host:z.infer<typeof hostSchema>){
  const rule=route.review_rule;if(rule.fresh_context&&!host.supports_fresh_context)return false;
  if(rule.different_model&&worker.provider===reviewer.provider&&(worker.snapshot_id??worker.model_id)===(reviewer.snapshot_id??reviewer.model_id))return false;
  if(rule.different_family&&(worker.family===null||reviewer.family===null||worker.family===reviewer.family))return false;
  return true;
}

export function resolveRouting(packValue:unknown,inputValue:ResolveRoutingInput):ResolvedRouting{
  const pack=expandRoutingPack(packValue);const parsed=requestSchema.safeParse(inputValue);if(!parsed.success)throw new RoutingError('RESOLUTION_INPUT_MALFORMED',parsed.error.message);const input=parsed.data;
  if(pack.mode!=='production')throw new RoutingError('PACK_NOT_PRODUCTION');
  const now=Date.parse(input.now);if(now<Date.parse(pack.generated_at))throw new RoutingError('PACK_NOT_YET_VALID');if(now>=Date.parse(pack.expires_at))throw new RoutingError('PACK_EXPIRED');
  if(input.publicTaskClass==='full_project')throw new RoutingError('DECOMPOSITION_REQUIRED');
  const classRoutes=pack.routes.filter(r=>r.public_task_class===input.publicTaskClass);if(!classRoutes.length)throw new RoutingError('ROUTE_NOT_FOUND');
  const route=classRoutes.find(r=>r.stratum_digest===input.stratumDigest);if(!route)throw new RoutingError('STRATUM_MISMATCH');
  if(!hostMeets(route,input.host))throw new RoutingError('HOST_CAPABILITIES_INSUFFICIENT');
  const failed=new Set(input.failedCandidateIds??[]);let sawWorker=false;
  const requiredProvider=route.stratum.worker_request.constraints.requires_provider;
  const nativeHost=input.host.host==='claude'?'claude_code':input.host.host;
  const explicitCostCeiling=route.stratum.worker_request.max_cost_usd!==undefined||route.stratum.worker_request.constraints.max_cost_usd!=null;
  const capable=(candidate:RoutingTreatment)=>(candidate.evidence_tier!=='provisional'||!explicitCostCeiling)&&(candidate.evidence_tier!=='qualified'||pack.policy_version<4||route.stratum.worker_request.execution_environment===nativeHost)&&(requiredProvider===undefined||candidate.provider===requiredProvider)&&route.requirements.capabilities.every(c=>candidate.capabilities.includes(c))&&(route.requirements.context_window_tokens===0||(candidate.context_window_tokens!==null&&candidate.context_window_tokens>=route.requirements.context_window_tokens));
  const provisionalWorkers=orderProvisionalTreatments(route.workers.filter(row=>row.evidence_tier==='provisional'),route.public_task_class,'worker');
  const provisionalReviewers=orderProvisionalTreatments(route.reviewers.filter(row=>row.evidence_tier==='provisional'),route.public_task_class,'reviewer');
  const workers=[...route.workers.filter(row=>row.evidence_tier==='qualified'),...provisionalWorkers.treatments];
  const reviewers=[...route.reviewers.filter(row=>row.evidence_tier==='qualified'),...provisionalReviewers.treatments];
  for(const worker of workers){
    if(now>=Date.parse(worker.expires_at)||failed.has(worker.candidate_id)||!capable(worker)||!treatmentAvailable(worker,input.host))continue;sawWorker=true;
    const reviewer=reviewers.find(r=>now<Date.parse(r.expires_at)&&!failed.has(r.candidate_id)&&r.frontier&&capable(r)&&treatmentAvailable(r,input.host)&&independent(worker,r,route,input.host));
    if(reviewer){
      // Resolve the baseline pair first. Local preference cannot move a qualified
      // incumbent, cross task-evidence tiers, or induce a different reviewer.
      const advice=input.localPreferences;
      const matchingAdvice=advice&&advice.pack_content_digest===pack.content_digest&&advice.stratum_digest===route.stratum_digest&&advice.host===input.host.host;
      const evidenceBasis=(candidate:RoutingTreatment)=>candidate.provisional?.task_evidence?.basis??'smoke_extrapolation';
      const preferred=worker.evidence_tier==='provisional'&&matchingAdvice?workers.find(candidate=>candidate.candidate_identity===advice.preferred_worker_identity&&candidate.evidence_tier==='provisional'&&evidenceBasis(candidate)===evidenceBasis(worker)&&now<Date.parse(candidate.expires_at)&&!failed.has(candidate.candidate_id)&&capable(candidate)&&treatmentAvailable(candidate,input.host)&&independent(candidate,reviewer,route,input.host)):undefined;
      const selected=preferred??worker;
      return {worker:selected,reviewer,route,stale:now>=Date.parse(pack.refresh_after),ranking_basis:{worker:selected!==worker?'local_preference_within_task_evidence':worker.evidence_tier==='qualified'?route.ranking_basis.workers:provisionalWorkers.basis,reviewer:reviewer.evidence_tier==='qualified'?route.ranking_basis.reviewers:provisionalReviewers.basis}};
    }
  }
  throw new RoutingError(sawWorker?'NO_ELIGIBLE_FRONTIER_REVIEWER':'NO_ELIGIBLE_WORKER');
}
