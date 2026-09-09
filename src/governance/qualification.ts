import { z } from 'zod';
import { riskCategorySchema, constraintSetSchema, parseRuntimeReport, candidateIdentity, type Candidate, type ModelRegistry, type TaskObservation } from '../schema/index.js';
import { digest } from '../core/canonical.js';
import { bindCandidate, validateRegistry } from '../registry/index.js';
import { validateObservations, summarizeObservations } from '../evidence/index.js';
import { parsePolicy, type Policy } from './policy.js';
import type { Diagnostic } from './risk-review.js';

export const requestSchema = z.object({
  role_id: z.string().min(1), task_class_id: z.string().min(1), risk: riskCategorySchema,
  cohort_id: z.string().min(1), constraints_digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  constraints: constraintSetSchema,
  required_capabilities: z.array(z.string()).optional(), max_cost_usd: z.number().finite().nonnegative().optional(),
  max_latency_ms: z.number().finite().positive().optional(), context_window_tokens: z.number().int().positive().optional(),
}).strict();
export type QualificationRequest = z.infer<typeof requestSchema>;
export type QualificationInput = {
  policy: Policy; registry: ModelRegistry; candidate: Candidate; observations: readonly TaskObservation[];
  request: QualificationRequest; mode: 'simulation' | 'production'; now: string;
  sources?: ReadonlyMap<string, string | Uint8Array>; runtimeReports?: ReadonlyMap<string, unknown>;
};
export type Qualification = {
  candidate_id: string; status: 'QUALIFIED' | 'REJECT' | 'HOLD'; diagnostics: Diagnostic[];
  observations: TaskObservation[];
  metrics: { tasks: number; accepted: number; success_rate: number | null; total_cost_usd: number | null;
    cost_per_accepted_task_usd: number | null; p95_latency_ms: number | null };
};
export function qualify(input: QualificationInput): Qualification {
  const diagnostics: Diagnostic[] = [];
  let rejected = false;
  const fail = (rule_id: string, message: string, hard = true) => { diagnostics.push({rule_id,message}); rejected ||= hard; };
  let observations: TaskObservation[] = [];
  const empty: Qualification['metrics'] = { tasks: 0, accepted: 0, success_rate: null, total_cost_usd: null, cost_per_accepted_task_usd: null, p95_latency_ms: null };
  const result = (metrics = empty): Qualification => ({candidate_id: input.candidate.candidate_id,
    status: diagnostics.length ? rejected ? 'REJECT' : 'HOLD' : 'QUALIFIED', diagnostics, observations, metrics});
  try {
    z.enum(['simulation','production']).parse(input.mode);
    const policy = parsePolicy(input.policy);
    const request = requestSchema.parse(input.request);
    const now = Date.parse(z.string().datetime({offset:true}).parse(input.now));
    if (request.constraints_digest !== digest(request.constraints)) { fail('constraints_digest_mismatch', 'Concrete constraints must match the observation stratum digest.'); return result(); }
    const role = policy.roles.find(r => r.role_id === request.role_id);
    const task = policy.task_classes.find(t => t.task_class_id === request.task_class_id);
    if (!role || !task || !role.task_class_ids.includes(request.task_class_id)) { fail('unknown_role_or_task_class', 'Role/task class is absent or incompatible.'); return result(); }
    const order = ['low','medium','high','critical'];
    if (order.indexOf(request.risk) < order.indexOf(task.risk_floor)) fail('risk_below_class_floor', 'Risk cannot be lower than the task class floor.');
    const registry = validateRegistry(input.registry);
    const candidate = bindCandidate(input.candidate, registry);
    const model = registry.records.find(r => r.record_id === candidate.provenance.model_record_id)!;
    if (input.mode === 'production' && (candidate.provider === 'synthetic' || model.pinning?.source === 'synthetic_fixture')) fail('synthetic_candidate_in_production', 'Synthetic identity cannot qualify production.');
    const required = new Set([...task.required_capabilities, ...(request.required_capabilities ?? [])]);
    for (const tool of request.constraints.required_tools) required.add(tool);
    if (request.constraints.requires_vision) required.add('vision');
    if (request.constraints.requires_browser) required.add('browser');
    if (request.constraints.requires_local_execution) required.add('local_execution');
    if (request.constraints.privacy_requirement) required.add(`privacy:${request.constraints.privacy_requirement}`);
    if (request.constraints.language) required.add(`language:${request.constraints.language}`);
    if (request.constraints.requires_provider !== undefined && request.constraints.requires_provider !== candidate.provider) fail('provider_constraint', 'Candidate provider violates the required provider.');
    if (request.constraints.required_tools.some(tool => !request.constraints.allowed_tools.includes(tool))) fail('tool_not_allowed', 'Required tools must belong to the allowed tool set.');
    if ([...required].some(c => !(model.capabilities ?? []).includes(c))) fail('required_capability_missing', 'Candidate lacks verified required capabilities.');
    const requiredContext = Math.max(request.context_window_tokens ?? 0, request.constraints.context_window_requirement ?? 0);
    if (requiredContext > 0 && (model.context_window_tokens === null || model.context_window_tokens < requiredContext)) fail('context_window_insufficient', 'Required context capacity is unavailable.');
    const candidateRows = input.observations.filter(o => o.candidate.candidate_id === candidate.candidate_id);
    const validated = validateObservations(candidateRows, { registry, candidates:[candidate], mode: input.mode,
      sources: input.sources ?? new Map(), ...(input.runtimeReports === undefined ? {} : {runtimeReports:input.runtimeReports}) });
    observations = validated.filter(o => o.candidate.candidate_identity === candidateIdentity(candidate) &&
      o.role_id === request.role_id && o.task_class_id === request.task_class_id && o.risk === request.risk &&
      o.cohort_id === request.cohort_id && o.constraints_digest === request.constraints_digest &&
      o.suite_id === task.eval_bucket.suite_id && o.suite_version === task.eval_bucket.suite_version &&
      o.harness_version === task.eval_bucket.harness_version && o.grader_version === task.eval_bucket.grader_version);
    const taskIds = new Set<string>();
    const attemptIds = new Set<string>();
    for (const observation of observations) {
      if (input.mode === 'production') {
        const receipt = parseRuntimeReport(input.runtimeReports?.get(observation.provenance.runtime_receipt_digest!));
        const observed = receipt.observed_identity;
        if (observed.source === 'unknown' || observed.model_id === undefined || observed.effort === undefined) fail('runtime_identity_unverified', 'Production qualification requires runtime-attested snapshot and effort.', false);
        if (receipt.provider !== candidate.provider || (observed.source !== 'unknown' && ((observed.model_id !== undefined && observed.model_id !== candidate.snapshot_id) || (observed.effort !== undefined && observed.effort !== candidate.effort)))) fail('runtime_identity_mismatch', 'Observed provider, snapshot or effort differs from the exact candidate treatment.');
      }
      if (taskIds.has(observation.task_id)) fail('duplicate_task_observation', 'Repeated task identities cannot inflate sample size.');
      taskIds.add(observation.task_id);
      for (const attempt of observation.attempts) {
        if (attemptIds.has(attempt.attempt_id)) fail('duplicate_attempt', 'Attempt cost cannot be counted twice.');
        attemptIds.add(attempt.attempt_id);
      }
      const age = now - Date.parse(observation.measured_at);
      if (age < 0) fail('future_evidence', 'Observation is in the future.');
      else if (age > policy.qualification.evidence_max_age_days * 86400000) fail('evidence_expired', 'Observation exceeds declared freshness limit.', false);
    }
    const summary = summarizeObservations(observations);
    const latencies = observations.map(o => o.latency_ms);
    const sorted = latencies.filter((v): v is number => v !== null).sort((a,b)=>a-b);
    const metrics: Qualification['metrics'] = {
      tasks: summary.attempted, accepted: summary.accepted,
      success_rate: observations.length ? summary.accepted / observations.length : null,
      total_cost_usd: summary.total_cost_usd, cost_per_accepted_task_usd: summary.cost_per_accepted_task_usd,
      p95_latency_ms: latencies.length && sorted.length === latencies.length ? sorted[Math.ceil(sorted.length * .95)-1]! : null,
    };
    if (observations.length < policy.qualification.minimum_tasks) fail('insufficient_tasks', 'Not enough matched independent task observations.', false);
    if (metrics.success_rate !== null && metrics.success_rate < policy.qualification.minimum_success_rate) fail('absolute_success_floor', 'Observed accepted-task fraction is below the declared floor.');
    if (metrics.cost_per_accepted_task_usd === null) fail('cost_unknown', 'All attempts and accepted task counts are required for economics.', false);
    else if (metrics.cost_per_accepted_task_usd > Math.min(policy.qualification.maximum_cost_per_accepted_task_usd, request.max_cost_usd ?? Infinity,request.constraints.max_cost_usd ?? Infinity)) fail('absolute_cost_ceiling', 'Cost including failures/review/rework exceeds the ceiling.');
    if (metrics.p95_latency_ms === null) fail('latency_unknown', 'Task wall-clock latency is missing.', false);
    else if (metrics.p95_latency_ms > Math.min(policy.qualification.maximum_latency_ms, request.max_latency_ms ?? Infinity,request.constraints.max_latency_ms ?? Infinity)) fail('latency_ceiling', 'Observed p95 task latency exceeds the ceiling.');
    for (const [category, maximum] of Object.entries(policy.qualification.maximum_failure_rates)) {
      const count = observations.filter(o => o.failure_categories?.includes(category)).length;
      if (observations.length && count / observations.length > maximum) fail('failure_category_ceiling', `${category} exceeds its declared failure rate.`);
    }
    return result(metrics);
  } catch (error) { fail('invalid_qualification_input', error instanceof Error ? error.message : 'Invalid input.'); return result(); }
}
