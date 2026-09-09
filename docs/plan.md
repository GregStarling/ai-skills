# Model Governor — full v1 build plan

The user explicitly expanded ownership to full v1 on 2026-09-09. The milestone-one plan below remains the first checkpoint, not the end of the build. Foreman will continue automatically through the following ordered stages, with reviews and fixes at every stage.

1. Constitution, schemas, independent validator and synthetic pathological tests.
2. Claude adapter: validated bindings compile to pinned effective settings; generated drift is detected.
3. Codex adapter: the same binding contract with verified current native configuration.
4. Real evaluation fixtures harvested from actual work, with immutable starting state and objective graders.
5. Append-only evaluation and production ledgers; paired statistics from raw observations; qualification and promotion with measured cost per accepted task.
6. Official-source discovery and provenance-preserving evidence ingestion; refresh orchestrates existing policy and produces a reviewable binding/config diff.
7. New portable delegate and refresh-models skills; bounded dispatch, pre/post risk, fresh independent review, escalation and production outcomes.
8. End-to-end v1 verification and local delivery. Insufficient evidence and unsupported runtime capabilities remain honest explicit states; passing tests do not authorize fabricated production bindings.

No optional UI or universal routing proxy. Local delivery does not require a remote repository or global skill installation.

---

# Model Governor — milestone-one implementation plan

## Goal and scope

Implement the offline policy foundation described in docs/spec.json and the full source in docs/model-governor-spec.md. Completion means invalid synthetic decisions are rejected with auditable rules and valid examples replay deterministically. No adapters, model discovery, refresh skill, live evaluations, global installation or remote publishing.

## Files and contracts

- constitution/: roles, task classes, risk, evidence, qualification, promotion, escalation and expiry YAML; explicit version and declared threshold rationale.
- schemas/: strict policy, registry/model, candidate, evidence, decision and binding schemas; derived TypeScript types.
- src/: policy loading, canonical identity, validation, qualification/selection and the small validation CLI. Keep pure functions together until separation improves clarity.
- tests/ and evals/fixtures/: versioned synthetic policy buckets, adversarial cases, at least three valid bindings and ten invalid bindings.
- README.md and docs/: usage, architecture, assumptions, test matrix and milestone proof.
- package.json, lockfile and TypeScript/test configuration: only the tooling needed for the offline library and CLI.

Core types: Role, TaskClass, RiskCategory, ConstraintSet, ModelSnapshot, ServingConfiguration, Candidate, EvidenceRecord, Policy, ClassificationResult, QualificationResult, DecisionRecord, Binding, BindingState and ValidationIssue.

## Validator stages

1. Strict parsing and schema validation.
2. Constitution version/hash, references and nonempty evaluation-bucket integrity.
3. Candidate registry identity and evidence provenance, hashes and comparability.
4. Pre/post risk and effective requirements recomputation.
5. Evidence admissibility, hard eligibility and absolute qualification.
6. Review independence and reviewed-artifact checks.
7. Measured economics, initial selection or incumbent-promotion recomputation.
8. Decision and binding consistency, structured escalation and expiry state.

Never trust claimed rules, winner, thresholds or context flags beyond what supplied evidence can establish. Clearly distinguish input-consistency validation from runtime enforcement.

## Lanes and serialization

Foreman will author the executable task graph. Stabilize schemas and constitution contracts before validator consumers. After contracts stabilize, independent test/fixture work and validator/CLI work may proceed with disjoint ownership. Integration and final acceptance remain serialized. Cap concurrent execution workers at three. The supervising agent reviews artifacts and fixes issues only at safe ownership boundaries.

## Policy assumptions

- Initial selection minimizes comparable cost among qualified candidates; incumbent replacement additionally applies promotion rules.
- Synthetic evaluation buckets exercise mechanics only. Production validation must reject synthetic qualification evidence.
- Version plus content digest identifies a policy. Evidence and candidate-set identity also bind a decision.
- Comparison observations are explicit synthetic fixture data in this milestone. Production statistical inference is later work.
- Initial numeric thresholds are declared proposals, not measured universal truths; document exact inclusive/exclusive boundaries.
- Equal-cost ties, invalid incumbents, zero acceptances and stale policy behavior need explicit deterministic rules.

## Test strategy

Use table-driven schema/policy/binding tests and CLI integration tests. Cover the required pathological matrix plus forged rule claims, policy/evidence tampering, candidate/evidence cohort mismatch, unsupported effort, zero acceptances, cost and time boundaries, post-change risk upgrades and changed artifacts after review. Include valid and invalid cases so an always-reject validator cannot pass. Inject time; do not use network services or provider credentials.

Expected checks once Foreman creates the scripts: npm test; npm run typecheck; npm run build. Exercise the built CLI with valid and invalid fixture files and verify exit codes and unchanged source inputs.

## Risks and proof

The supplied benchmark anecdote is an unverified user account until sources are independently established. Preserve that distinction in the README. Do not claim synthetic tests establish model quality. At completion, provide the actual tree, constitution assumptions, architecture, test matrix/results, three valid bindings, at least ten invalid examples and the exact enforced invariants.
