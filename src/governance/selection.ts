import { z } from 'zod';
import { candidateIdentity, parseCandidate, parseDecisionRecord, parseTaskObservation, type Candidate, type DecisionRecord, type TaskObservation } from '../schema/index.js';
import { validateRegistry } from '../registry/index.js';
import { digest } from '../core/canonical.js';
import { comparePaired } from '../statistics/index.js';
import { summarizeObservations } from '../evidence/index.js';
import { parsePolicy, policyDigest } from './policy.js';
import { qualify, requestSchema, type QualificationInput, type Qualification } from './qualification.js';
import type { Diagnostic } from './risk-review.js';

export type SelectionInput = Omit<QualificationInput, 'candidate'> & { candidates: readonly Candidate[]; incumbentCandidateId?: string };
const envelopeSchema = z.object({ policy:z.unknown(), registry:z.unknown(), candidates:z.array(z.unknown()).nonempty(),
  observations:z.array(z.unknown()), request:requestSchema, mode:z.enum(['simulation','production']), now:z.string().datetime(),
  incumbentCandidateId:z.string().optional(), sources:z.record(z.string(),z.string()).optional(),
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
    sources:new Map(Object.entries(input.sources ?? {})),runtimeReports:new Map(Object.entries(input.runtimeReports ?? {})) };
}
export type SelectionResult = { decision: DecisionRecord; qualifications: Qualification[]; selected: Candidate|null; diagnostics:Diagnostic[] };
export function select(input: SelectionInput): SelectionResult {
  const policy = parsePolicy(input.policy);
  requestSchema.parse(input.request);
  z.string().datetime({offset:true}).parse(input.now);
  if (!['simulation','production'].includes(input.mode)) throw new Error('invalid_mode');
  if (!input.candidates.length || new Set(input.candidates.map(c=>c.candidate_id)).size !== input.candidates.length || new Set(input.candidates.map(candidateIdentity)).size !== input.candidates.length) throw new Error('invalid_candidate_set');
  const candidates = [...input.candidates].sort((a,b)=>a.candidate_id.localeCompare(b.candidate_id));
  assertObservationReferences(candidates, input.observations);
  const qualifications = candidates.map(candidate => qualify({...input, candidate}));
  const qualified = qualifications.filter(q=>q.status==='QUALIFIED').sort((a,b)=>(a.metrics.cost_per_accepted_task_usd! - b.metrics.cost_per_accepted_task_usd!) || a.candidate_id.localeCompare(b.candidate_id));
  const diagnostics: Diagnostic[] = [];
  let chosen: Qualification | undefined;
  let outcome: DecisionRecord['outcome'] = 'HOLD';
  const ruleIds: string[] = [];
  if (input.incumbentCandidateId === undefined) {
    chosen = qualified[0];
    if (chosen) { outcome='SELECT'; ruleIds.push('cheapest_qualified_initial_selection'); }
    else ruleIds.push('no_qualified_candidate');
  } else {
    const incumbent = qualifications.find(q=>q.candidate_id===input.incumbentCandidateId);
    if (!incumbent || incumbent.status !== 'QUALIFIED') { outcome='ESCALATION_REQUIRED';ruleIds.push('incumbent_not_qualified'); }
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
        const incumbentCost=summarizeObservations(matched.map(p=>p.incumbent)).cost_per_accepted_task_usd;
        const challengerCost=summarizeObservations(matched.map(p=>p.challenger)).cost_per_accepted_task_usd;
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
  const identity={policy_digest:policyDigest(policy),candidate_set_digest:digest(candidates),evidence_digest:digest(evidence),request:input.request,mode:input.mode,incumbent:input.incumbentCandidateId??null,created_at:input.now};
  const decision = parseDecisionRecord({schema_version:'decision_record.v1',decision_id:`decision_${digest(identity).slice(7,31)}`,policy_version:policy.policy_version,
    policy_digest:identity.policy_digest,candidate_set_digest:identity.candidate_set_digest,evidence_digest:identity.evidence_digest,outcome,
    ...(chosen ? {selected_candidate_id:chosen.candidate_id}:{}),considered_candidate_ids:candidates.map(c=>c.candidate_id),
    evidence_refs:[...new Set(evidence.map(o=>o.observation_id))],rule_ids:ruleIds,created_at:input.now});
  return {decision,qualifications,selected:chosen?candidates.find(c=>c.candidate_id===chosen.candidate_id)!:null,diagnostics};
}
export const evaluate = select;
