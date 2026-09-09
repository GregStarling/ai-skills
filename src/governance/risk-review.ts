import type { Candidate, ModelRegistry, RiskCategory } from '../schema/index.js';
import { candidateIdentity } from '../schema/index.js';
import { bindCandidate, validateRegistry } from '../registry/index.js';
import { parsePolicy, type Policy } from './policy.js';
import { qualify, type QualificationInput } from './qualification.js';

export type Diagnostic = { rule_id: string; message: string };
export const riskOrder: readonly RiskCategory[] = ['low', 'medium', 'high', 'critical'];
export function maxRisk(...risks: RiskCategory[]): RiskCategory {
  if (risks.some(r => !riskOrder.includes(r))) throw new Error('unknown_risk');
  return riskOrder[Math.max(0, ...risks.map(r => riskOrder.indexOf(r)))]!;
}
export function classifyRisk(input: { policy: Policy; taskClassId: string; preSignals: string[]; postSignals: string[] }) {
  const policy = parsePolicy(input.policy);
  const task = policy.task_classes.find(t => t.task_class_id === input.taskClassId);
  if (!task) throw new Error('unknown_task_class');
  const classify = (signals: string[]) => {
    const unknown = signals.filter(s => policy.risk_signals[s] === undefined);
    if (unknown.length) throw new Error(`unknown_risk_signal: ${unknown.join(',')}`);
    return maxRisk(task.risk_floor, ...signals.map(s => policy.risk_signals[s]!));
  };
  const pre_dispatch_risk = classify(input.preSignals);
  const post_change_risk = classify(input.postSignals);
  return { pre_dispatch_risk, post_change_risk, risk: maxRisk(pre_dispatch_risk, post_change_risk),
    signals: { pre: [...input.preSignals].sort(), post: [...input.postSignals].sort() }, policy_version: policy.policy_version };
}
export type ReviewProof = {
  outcome: 'accepted' | 'rejected' | 'escalated'; artifact_digest: string; package_digest: string;
  runtime_receipt_digest: string | null; session_id: string | null; parent_session_id: string | null;
  context_kind: 'new' | 'resumed' | 'forked' | 'unknown'; inherited_context_digest: string | null;
};
export function evaluateReview(input: { policy: Policy; registry: ModelRegistry; implementer: Candidate;
  reviewer?: Candidate; risk: RiskCategory; artifactDigest: string; packageDigest: string;
  implementerSessionId: string; proof?: ReviewProof; reviewerQualification?: QualificationInput }) {
  const policy = parsePolicy(input.policy);
  const rule = policy.review[input.risk];
  const diagnostics: Diagnostic[] = [];
  const fail = (rule_id: string, message: string) => diagnostics.push({ rule_id, message });
  if (!rule) fail('unknown_risk', 'Risk category is not declared.');
  else if (rule.required) {
    if (!input.reviewer || !input.proof) fail('review_required', 'No qualifying review supplied.');
    else {
      const evidence = input.reviewerQualification;
      if (!evidence || evidence.request.role_id !== 'reviewer' || evidence.request.risk !== input.risk ||
        candidateIdentity(evidence.candidate) !== candidateIdentity(input.reviewer) ||
        qualify({...evidence,policy,registry:input.registry,candidate:input.reviewer}).status !== 'QUALIFIED') fail('reviewer_not_qualified', 'Reviewer requires current matching qualification evidence.');
      try {
        const registry = validateRegistry(input.registry);
        const implementer = bindCandidate(input.implementer, registry);
        const reviewer = bindCandidate(input.reviewer, registry);
        const a = registry.records.find(r => r.record_id === implementer.provenance.model_record_id)!;
        const b = registry.records.find(r => r.record_id === reviewer.provenance.model_record_id)!;
        if (rule.different_model && implementer.provider === reviewer.provider && implementer.snapshot_id === reviewer.snapshot_id) fail('review_model_not_independent', 'Different effort is not a different model.');
        if (rule.different_family && (a.family === null || b.family === null || a.family === b.family)) fail('review_family_not_independent', 'Distinct model families must be established from registry evidence.');
        if (rule.frontier && b.frontier !== true) fail('frontier_reviewer_required', 'Frontier capability is not established.');
        if (candidateIdentity(reviewer) === candidateIdentity(implementer) && rule.different_model) fail('same_reviewer_treatment', 'Implementer cannot review itself.');
      } catch { fail('review_candidate_invalid', 'Reviewer or implementer fails current registry binding.'); }
      const p = input.proof;
      if (p.outcome !== 'accepted') fail('review_not_accepted', 'Reviewer did not accept the artifact.');
      if (p.artifact_digest !== input.artifactDigest) fail('review_artifact_changed', 'Final artifact differs from reviewed artifact.');
      if (p.package_digest !== input.packageDigest) fail('review_package_changed', 'Review package does not match.');
      if (rule.fresh_context && (p.context_kind !== 'new' || !p.session_id || p.session_id === input.implementerSessionId || p.parent_session_id !== null || p.inherited_context_digest !== null || !p.runtime_receipt_digest)) fail('fresh_review_context_required', 'A distinct new context and runtime receipt are required.');
    }
  }
  return { ok: diagnostics.length === 0, outcome: diagnostics.length ? 'ESCALATION_REQUIRED' as const : 'ACCEPT' as const, diagnostics };
}
