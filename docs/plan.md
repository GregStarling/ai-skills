# Model Governor v1 build plan

Deliver the complete local library, CLI and portable skills in one execution
phase, with ordered internal checkpoints. This replaces the earlier
foundation-only phase plan. Foreman refines task ownership and verification;
the supervisor reviews actual diffs and repairs defects.

## Full-v1 sequencing

1. Constitution, strict shared schemas, evidence/risk/economics, qualification
   and independent binding validation. Prove adversarial foundation behavior
   through the offline CLI before adapters.
2. Claude compiler, then Codex compiler, using inspected native contracts and
   generated drift detection.
3. Real evaluation fixtures with pinned starting states and objective graders.
4. Append-only ledger, paired inference and evidence-bound qualification.
5. Official model/configuration discovery with immutable provenance.
6. Bounded native delegation, actual diff-derived risk, exact final artifact
   review, and safe challenger shadow replay.
7. Refresh proposals and atomic local activation after complete validation.
8. Portable skills, README and offline/live full-v1 proof.

## Files and core types

Keep human-owned YAML under policy/ or constitution/, strict schemas under
schemas/, pure implementation under src/, real and synthetic fixtures explicitly
separated, and canonical portable instructions under skills/. Operational state
and generated runtime workspaces stay local and isolated.

Core types: Policy, Candidate, ServingConfiguration, EvidenceRecord, RiskCategory,
ConstraintSet, QualificationResult, DecisionRecord, Binding, ValidationResult,
WorkOrder, ReviewRecord, ProductionOutcome and RefreshProposal. Use one schema
source with derived types; avoid parallel handwritten definitions.

## Validator stages

Strict parse; exact policy/version/hash; candidate/evidence identity;
admissibility/comparability; effective risk and review; hard qualification and
complete accepted-task economics; initial selection or incumbent promotion;
independent decision recomputation; expiry/simulation boundary; stable diagnostics.
Never trust submitted winners, rules or thresholds.

## Constitution assumptions and declared-threshold provenance

Initial numerical thresholds are explicit proposals with rationale. No model
IDs, universal quality scalar or weighted routing belong in constitution.
Runtime cannot rewrite thresholds or treat missing observations as zero.
Statistical methods and exact-boundary semantics must be reproducible.

## Test strategy

Use table-driven malformed and forged inputs, fixed-clock expiry, false-economy
and promotion cases, native parser conformance and real imported module/CLI
calls. Require three complete valid bindings and ten distinct invalid cases.
Exercise concurrent/interrupted ledger writes, artifact tampering, subprocess
timeouts, review invalidation, refresh rollback and fabricated verification
reports. Test names alone are not coverage.

## Verification commands

Run npm test, npm run typecheck, npm run build, npm run verify:v1 and npm run
verify:v1:live. JSON capture uses npm silent mode. Record exits, executed checks,
artifact digests, native runtime facts and objective graders. Final proof maps
REQ-001 through REQ-020 and AC-001 through AC-044 to actual evidence.

## Limits

Synthetic tests cannot qualify production models. A successful live CLI request
does not itself establish production eligibility or served snapshot identity.
Missing admissible evidence yields HOLD, INSUFFICIENT_EVIDENCE or escalation;
it does not excuse unfinished implementation. No global installation, API-key
setup, remote publication, optional UI or universal proxy.

See implementation-handoff.md for concrete findings the task graph must address.
