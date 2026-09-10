import { z } from 'zod';
import { providerSchema, servingConfigurationSchema } from '../schema/index.js';
import { parseRoutingPack, publicTaskClassSchema, RoutingError, type RoutingPack, type RoutingTreatment } from './contracts.js';

const hostSchema=z.object({
  treatments:z.array(z.object({provider:providerSchema,model_id:z.string().min(1),snapshot_id:z.string().min(1),effort:z.string().min(1),serving:servingConfigurationSchema}).strict()),
  tools:z.array(z.string().min(1)),capabilities:z.array(z.string().min(1)),context_window_tokens:z.number().int().positive(),supports_fresh_context:z.boolean(),
}).strict();
const requestSchema=z.object({publicTaskClass:publicTaskClassSchema,stratumDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/),now:z.string().datetime({offset:true}),host:hostSchema,failedCandidateIds:z.array(z.string().min(1)).optional()}).strict();
export type ResolveRoutingInput=z.infer<typeof requestSchema>;
export type ResolvedRouting={worker:RoutingTreatment;reviewer:RoutingTreatment;route:RoutingPack['routes'][number];stale:boolean};

const treatmentAvailable=(candidate:RoutingTreatment,host:z.infer<typeof hostSchema>)=>host.treatments.some(t=>t.serving.fallback==='disabled'&&t.provider===candidate.provider&&t.model_id===candidate.model_id&&t.snapshot_id===candidate.snapshot_id&&t.effort===candidate.effort&&candidate.material_serving_settings.every(key=>t.serving[key]===candidate.serving[key]));
function hostMeets(route:RoutingPack['routes'][number],host:z.infer<typeof hostSchema>){
  const required=route.requirements;
  return required.capabilities.every(x=>host.capabilities.includes(x))&&required.tools.every(x=>host.tools.includes(x))&&host.context_window_tokens>=required.context_window_tokens&&(!required.fresh_context||host.supports_fresh_context);
}
function independent(worker:RoutingTreatment,reviewer:RoutingTreatment,route:RoutingPack['routes'][number],host:z.infer<typeof hostSchema>){
  const rule=route.review_rule;if(rule.fresh_context&&!host.supports_fresh_context)return false;
  if(rule.different_model&&worker.provider===reviewer.provider&&worker.snapshot_id===reviewer.snapshot_id)return false;
  if(rule.different_family&&(worker.family===null||reviewer.family===null||worker.family===reviewer.family))return false;
  return true;
}

export function resolveRouting(packValue:unknown,inputValue:ResolveRoutingInput):ResolvedRouting{
  const pack=parseRoutingPack(packValue);const parsed=requestSchema.safeParse(inputValue);if(!parsed.success)throw new RoutingError('RESOLUTION_INPUT_MALFORMED',parsed.error.message);const input=parsed.data;
  if(pack.mode!=='production')throw new RoutingError('PACK_NOT_PRODUCTION');
  const now=Date.parse(input.now);if(now<Date.parse(pack.generated_at))throw new RoutingError('PACK_NOT_YET_VALID');if(now>=Date.parse(pack.expires_at))throw new RoutingError('PACK_EXPIRED');
  const classRoutes=pack.routes.filter(r=>r.public_task_class===input.publicTaskClass);if(!classRoutes.length)throw new RoutingError('ROUTE_NOT_FOUND');
  const route=classRoutes.find(r=>r.stratum_digest===input.stratumDigest);if(!route)throw new RoutingError('STRATUM_MISMATCH');
  if(!hostMeets(route,input.host))throw new RoutingError('HOST_CAPABILITIES_INSUFFICIENT');
  const failed=new Set(input.failedCandidateIds??[]);let sawWorker=false;
  for(const worker of route.workers){
    if(failed.has(worker.candidate_id)||!treatmentAvailable(worker,input.host))continue;sawWorker=true;
    const reviewer=route.reviewers.find(r=>!failed.has(r.candidate_id)&&r.frontier&&treatmentAvailable(r,input.host)&&independent(worker,r,route,input.host));
    if(reviewer)return {worker,reviewer,route,stale:now>=Date.parse(pack.refresh_after)};
  }
  throw new RoutingError(sawWorker?'NO_ELIGIBLE_FRONTIER_REVIEWER':'NO_ELIGIBLE_WORKER');
}
