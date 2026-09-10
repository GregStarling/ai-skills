import { z } from 'zod';
import { candidateIdentity, parseCandidate, parseDecisionRecord, parseTaskObservation, type Candidate, type DecisionRecord, type TaskObservation } from '../schema/index.js';
import { validateRegistry } from '../registry/index.js';
import { digest } from '../core/canonical.js';
import { comparePaired } from '../statistics/index.js';
import { summarizeObservations } from '../evidence/index.js';
import { parsePolicy, policyDigest } from './policy.js';
import { qualify, requestSchema, type QualificationInput, type Qualification } from './qualification.js';
import {economicEvidenceSchema,assessEconomics,orderEconomicCandidates,pairedEconomicCost,type EconomicEvidence,type CandidateEconomics} from './economics.js';
import type { Diagnostic } from './risk-review.js';

export type SelectionInput = Omit<QualificationInput, 'candidate'> & { candidates: readonly Candidate[]; incumbentCandidateId?: string; economics?:EconomicEvidence; eligibleCandidateIds?:string[] };
const envelopeSchema = z.object({ policy:z.unknown(), registry:z.unknown(), candidates:z.array(z.unknown()).nonempty(),
  observations:z.array(z.unknown()), request:requestSchema, mode:z.enum(['simulation','production']), now:z.string().datetime(),
  incumbentCandidateId:z.string().optional(), sources:z.record(z.string(),z.string()).optional(),
  economics:economicEvidenceSchema.optional(),eligibleCandidateIds:z.array(z.string()).optional(),
  runtimeReports:z.record(z.string(),z.unknown()).optional() }).strict();
function assertObservationReferences(candidates: readonly Candidate[], observations: readonly TaskObservation[]): void {
  const identities = new Map(candidates.map(candidate => [candidate.candidate_id, candidateIdentity(candidate)]));
  const seen = new Set<string>();
  for (const observation of observations) {
    if (seen.has(observation.observation_id)) throw new Error('duplicate_observation');
    seen.add(observation.observation_id);
    if (identities.get(observation.candidate.candidate_id) !== observation.candidate.candidate_identity) throw new Error('unknown_observation_candidate');
  }
}
export function parseSelectionInput(value: unknown, overrides: {mode?: 'simulation'|'production'; now?:string} = {}): SelectionInput {
  const input = envelopeSchema.parse(value);
  const candidates = input.candidates.map(parseCandidate);
  if (new Set(candidates.map(c=>c.candidate_id)).size !== candidates.length || new Set(candidates.map(candidateIdentity)).size !== candidates.length) throw new Error('duplicate_candidate');
  const observations = input.observations.map(parseTaskObservation);
  assertObservationReferences(candidates, observations);
  return { policy:parsePolicy(input.policy), registry:validateRegistry(input.registry), candidates,
    observations, request:input.request,
    mode:overrides.mode ?? input.mode, now:z.string().datetime({offset:true}).parse(overrides.now ?? input.now),
    ...(input.incumbentCandidateId === undefined ? {} : {incumbentCandidateId:input.incumbentCandidateId}),
    ...(input.eligibleCandidateIds===undefined?{}:{eligibleCandidateIds:input.eligibleCandidateIds}),
    ...(input.economics===undefined?{}:{economics:input.economics}),
    sources:new Map(Object.entries(input.sources ?? {})),runtimeReports:new Map(Object.entries(input.runtimeReports ?? {})) };
}
export type SelectionResult = { decision: DecisionRecord; qualifications: Qualification[]; selected: Candidate|null; diagnostics:Diagnostic[];economics:CandidateEconomics[];routing_order:{candidate_ids:string[];basis:string} };
export function select(input: SelectionInput): SelectionResult {
  const policy = parsePolicy(input.policy);
  requestSchema.parse(input.request);
  z.string().datetime({offset:true}).parse(input.now);
  if (!['simulation','production'].includes(input.mode)) throw new Error('invalid_mode');
  if (!input.candidates.length || new Set(input.candidates.map(c=>c.candidate_id)).size !== input.candidates.length || new Set(input.candidates.map(candidateIdentity)).size !== input.candidates.length) throw new Error('invalid_candidate_set');
  const candidates = [...input.candidates].sort((a,b)=>a.candidate_id.localeCompare(b.candidate_id));
  assertObservationReferences(candidates, input.observations);
  if(input.eligibleCandidateIds&&(new Set(input.eligibleCandidateIds).size!==input.eligibleCandidateIds.length||input.eligibleCandidateIds.some(id=>!candidates.some(c=>c.candidate_id===id))))throw Error('invalid_eligible_candidate_set');
  const qualifications = candidates.map(candidate => qualify({...input, candidate}));
  let qualified = qualifications.filter(q=>q.status==='QUALIFIED'&&(!input.eligibleCandidateIds||input.eligibleCandidateIds.includes(q.candidate_id))).sort((a,b)=>(a.metrics.cost_per_accepted_task_usd! - b.metrics.cost_per_accepted_task_usd!) || a.candidate_id.localeCompare(b.candidate_id));
  const diagnostics: Diagnostic[] = [];
  const economics=policy.policy_version>=4?assessEconomics(input):[];
  let orderingBasis='legacy_measured_cost';
  if(policy.policy_version>=4){
    const eligible=economics.filter(e=>{
      if(!qualified.some(q=>q.candidate_id===e.candidate_id))return false;
      const explicitCeiling=Math.min(input.request.max_cost_usd??Infinity,input.request.constraints.max_cost_usd??Infinity);
      const ceiling=Math.min(policy.economics!.maximum_cost_per_accepted_task_usd,explicitCeiling);
      if(e.value_usd!==null&&e.value_usd>ceiling){diagnostics.push({rule_id:'economic_selection_ceiling',candidate_id:e.candidate_id,message:`${e.candidate_id}: capability qualified but API-equivalent economics exceed the selection ceiling.`});return false;}
      if(e.value_usd===null&&Number.isFinite(explicitCeiling)){diagnostics.push({rule_id:'economic_explicit_ceiling_unverified',candidate_id:e.candidate_id,message:`${e.candidate_id}: explicit task economic ceiling requires measured task economics.`});return false;}
      return true;
    });
    const ordered=orderEconomicCandidates(eligible,input.economics?.maintainer_order??[]);orderingBasis=ordered.basis;
    qualified=ordered.ordered.map(e=>qualifications.find(q=>q.candidate_id===e.candidate_id)!);
    if(ordered.basis==='unresolved'&&eligible.length)diagnostics.push({rule_id:'economic_order_unresolved',message:'No comparable economics or complete explicit maintainer order.'});
    if(ordered.basis==='maintainer_order')diagnostics.push({rule_id:'economic_order_unknown',message:'Order is explicitly maintained; it is not a measured economic advantage.'});
  }
  let chosen: Qualification | undefined;
  let outcome: DecisionRecord['outcome'] = 'HOLD';
  const ruleIds: string[] = [];
  if (input.incumbentCandidateId === undefined) {
    chosen = qualified[0];
    if (chosen) { outcome='SELECT'; ruleIds.push(policy.policy_version>=4?`capability_qualified_${orderingBasis}_selection`:'cheapest_qualified_initial_selection'); }
    else ruleIds.push(qualifications.some(q=>q.status==='QUALIFIED')?'no_economically_eligible_candidate':'no_qualified_candidate');
  } else {
    const incumbent = qualifications.find(q=>q.candidate_id===input.incumbentCandidateId);
    if (!incumbent || incumbent.status !== 'QUALIFIED') { outcome='ESCALATION_REQUIRED';ruleIds.push(policy.policy_version>=4?'incumbent_capability_not_qualified':'incumbent_not_qualified'); }
    else if(!qualified.some(q=>q.candidate_id===incumbent.candidate_id)){outcome='ESCALATION_REQUIRED';ruleIds.push('incumbent_economically_ineligible');}
    else {
      chosen=incumbent;outcome='RETAIN';ruleIds.push('incumbent_retained');
      for (const challenger of qualified.filter(q=>q.candidate_id!==incumbent.candidate_id)) {
        const incumbentByTask = new Map(incumbent.observations.map(o=>[o.task_id,o]));
        const matched: {incumbent:TaskObservation; challenger:TaskObservation}[] = [];
        for (const observation of challenger.observations) {
          const baseline = incumbentByTask.get(observation.task_id);
          if (baseline && baseline.fixture_digest === observation.fixture_digest) matched.push({incumbent:baseline,challenger:observation});
        }
        if (matched.length < policy.promotion.minimum_paired_tasks) { diagnostics.push({rule_id:'insufficient_paired_tasks',message:`${challenger.candidate_id}: insufficient same-task paired evidence.`});continue; }
        const comparison=comparePaired(matched.map(p=>({taskId:p.incumbent.task_id,cohortId:p.incumbent.cohort_id,incumbentAccepted:p.incumbent.accepted,candidateAccepted:p.challenger.accepted})),{alpha:policy.promotion.alpha,nonInferiorityMargin:policy.promotion.non_inferiority_margin});
        const incumbentCost=policy.policy_version>=4?pairedEconomicCost(economics.find(e=>e.candidate_id===incumbent.candidate_id)!,matched.map(p=>p.incumbent)):summarizeObservations(matched.map(p=>p.incumbent)).cost_per_accepted_task_usd;
        const challengerCost=policy.policy_version>=4?pairedEconomicCost(economics.find(e=>e.candidate_id===challenger.candidate_id)!,matched.map(p=>p.challenger)):summarizeObservations(matched.map(p=>p.challenger)).cost_per_accepted_task_usd;
        if (incumbentCost===null || challengerCost===null || !comparison.interval) {diagnostics.push({rule_id:'paired_economics_unknown',message:'Matched costs or interval are unavailable.'});continue;}
        const cheaper=challengerCost<incumbentCost;
        const economic=cheaper ? incumbentCost>0 && (incumbentCost-challengerCost)/incumbentCost>=policy.promotion.minimum_cost_improvement : (incumbentCost===0 ? challengerCost===0 : (challengerCost-incumbentCost)/incumbentCost<=policy.promotion.maximum_cost_increase);
        const improvement=cheaper ? comparison.interval.lower>=-policy.promotion.non_inferiority_margin : comparison.qualityDelta!>=policy.promotion.superiority_margin && comparison.interval.lower>=policy.promotion.superiority_margin && comparison.mcnemarP!<=policy.promotion.alpha;
        if (!economic || !improvement) {diagnostics.push({rule_id:!economic?'promotion_economic_rule_failed':'promotion_interval_insufficient',message:`${challenger.candidate_id}: incumbent replacement has not met declared ${cheaper?'non-inferiority':'superiority'} and cost requirements.`});continue;}
        chosen=challenger;outcome='PROMOTE';ruleIds.splice(0,ruleIds.length,cheaper?'cheaper_noninferior_promotion':'superior_cost_bounded_promotion');break;
      }
    }
  }
  const evidence=[...input.observations].sort((a,b)=>a.observation_id.localeCompare(b.observation_id));
  const identity={policy_digest:policyDigest(policy),candidate_set_digest:digest(candidates),evidence_digest:policy.policy_version>=4?digest({observations:evidence,economics:input.economics??null,assessment:economics}):digest(evidence),request:input.request,...(input.eligibleCandidateIds===undefined?{}:{eligibleCandidateIds:input.eligibleCandidateIds}),mode:input.mode,incumbent:input.incumbentCandidateId??null,created_at:input.now};
  const decision = parseDecisionRecord({schema_version:'decision_record.v1',decision_id:`decision_${digest(identity).slice(7,31)}`,policy_version:policy.policy_version,
    policy_digest:identity.policy_digest,candidate_set_digest:identity.candidate_set_digest,evidence_digest:identity.evidence_digest,outcome,
    ...(chosen ? {selected_candidate_id:chosen.candidate_id}:{}),considered_candidate_ids:candidates.map(c=>c.candidate_id),
    evidence_refs:[...new Set(evidence.map(o=>o.observation_id))],rule_ids:ruleIds,created_at:input.now});
  return {decision,qualifications,economics,routing_order:{candidate_ids:qualified.map(q=>q.candidate_id),basis:orderingBasis},selected:chosen?candidates.find(c=>c.candidate_id===chosen.candidate_id)!:null,diagnostics};
}
export const evaluate = select;
