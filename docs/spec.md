# Model Governor — full v1

Complete a local evidence-governed delegation system whose Claude and Codex skills execute only auditable policy-validated model assignments and whose refresh process justifies every change from reproducible observations.

The user has authorized the complete v1. Milestones are prerequisites, not stopping points.

## REQ-001: Versioned human-owned constitution

Create versioned constitution YAML for roles, task classes, categorical risk, evidence admissibility, qualification, promotion, escalation, and expiry. Model IDs and weighted/quality/confidence scores never belong in policy. Numeric decision values are explicit declared thresholds with provenance and documented initial assumptions. Start with at most eight task classes; every class references an existing versioned nonempty evaluation bucket. Distinguish synthetic policy-test buckets from real qualification suites.

## REQ-002: Strict shared schemas

Define strict schemas and derived types for roles, task classes, categorical risk, constraints, model records, candidates, evidence, decision records and bindings. Candidate identity includes exact model snapshot, effort, and declared materially relevant serving settings. Reject unknown fields, invented scalar confidence/quality scores, impossible counts, nonfinite values, duplicate identities and invalid chronology. Pinning is verified against registry metadata, not an ID-shaped regex. Schemas live in schemas/ and are the single source of truth.

## REQ-003: Evidence provenance and comparability

Load synthetic evidence and registry records with immutable IDs and content digests; resolve all references and reject missing or tampered evidence. Preserve source, benchmark/suite/dataset/methodology and grader versions, measured/retrieved dates, model/effort/tool/serving configuration and observation counts/costs. Enforce evidence admissibility, fallback restrictions, freshness and matching role/task-class/risk/constraints/suite/treatment. Vendor self-report alone cannot qualify. Separate benchmark versions and never overwrite history. Phase 1 reads fixtures only; no ingestion service is needed.

## REQ-004: Auditable risk and review requirements

Derive categorical pre-dispatch and post-change risk from declared observable facts and stable policy rule IDs; effective risk is their maximum. Enforce role and constraint eligibility including availability, tool/modalities/context/provider/local/privacy and declared cost/latency ceilings. Critical review requires a qualified independently defined family and fresh context, otherwise ESCALATION_REQUIRED. Review evidence names the reviewed artifact digest and admissible context package. An altered final artifact invalidates review. Phase 1 validates supplied synthetic facts and attestations; do not claim static validation proves a real runtime context boundary.

## REQ-005: Qualification and measured economics

Implement deterministic hard eligibility and absolute quality qualification from admissible measurements. Compute cost per accepted task from all comparable attempt costs including failures and attributable review/rework, not token price or just successful-attempt spend. Zero accepted tasks, missing necessary cost data and insufficient evidence cannot appear cheap or qualified. Threshold equality and uncertainty handling are explicit policy decisions. Report eligible, rejected and insufficient-evidence candidates with rule IDs, not synthetic confidence.

## REQ-006: Selection and incumbent promotion

Separate initial selection from replacement. Initially select the cheapest qualified candidate with a declared deterministic tie break. For replacement, apply explicit superiority requirements and allowed cost increase to a dearer challenger, or non-inferiority plus required savings to a cheaper challenger. Use paired comparable evidence with declared margins and confidence-bound provenance; statistical inference engines are future scope, so Phase 1 uses explicitly synthetic paired comparison observations and validates internal consistency, never inventing a confidence float. Retain an eligible incumbent when evidence is insufficient, but never preserve an unavailable, disqualified or hard-expired incumbent. Define equal-cost and no-qualified-candidate outcomes.

## REQ-007: Independent binding validator

Implement pure validation stages that independently recompute eligibility, economics, selection and fired rules from the exact cited policy version plus hash, complete supplied candidate set and resolved evidence; never trust binding-supplied requirements/rationale/rules. Bindings identify schema/policy versions, candidate-set and evidence digests, requirement stratum, decision and escalation rules, timestamps and review artifact identity where applicable. Reject mismatches or hand-edited assertions even if structurally valid. Expose a typed VALID, STALE or INVALID result with stable diagnostic rules. No rendering or provider calls in milestone 1.

## REQ-008: Expiry and fail-closed simulation boundary

Validate generated_at, refresh_due_at and hard_expiry_at against the cited expiry policy and an injected clock, with explicit exact-boundary semantics. Refresh due yields STALE and continuation only when permitted; hard expiry, unavailability or incompatible policy yields INVALID. Staleness never triggers silent reselection. Synthetic fixtures must be explicitly labeled and accepted only in simulation/test mode; production validation rejects them. Do not implement overrides as a bypass; overrides may remain out of scope.

## REQ-009: Local validation CLI and proof

Provide a small offline CLI for validate-policy, validate-evidence and validate-binding, using the same schema/validator functions as tests. Deterministic machine-readable results and nonzero invalid/error exits, clear human diagnostics, no provider traffic and no mutation of input policy/evidence. Add scripts for build, typecheck and tests. Supply at least three valid binding files and ten independently invalid examples with expected failure rule IDs. Document architecture, repository tree, constitution assumptions and exact test commands/results and limits.

## REQ-010: Validated Claude compiler

Extend the established milestone-one contracts with a deterministic Claude Code adapter that compiles only validated production bindings into repository-local generated skills, agents and configuration. Inspect the installed Claude runtime and current official documentation to establish exact snapshot IDs, effort/serving controls, config precedence and fresh-session semantics; persist a versioned capability report with source provenance. Preserve every material binding setting and source policy/binding identity, detect manual drift, and fail closed when a required setting or pin cannot be enforced. A separately labeled adapter-test mode may render synthetic bindings only into disposable test artifacts that production dispatch refuses. Resolve effective invocation/environment/config precedence at dispatch: conflicting model, effort, fallback or settings overrides must fail closed or be explicitly neutralized only in the child process, with effective values revalidated. Agent frontmatter alone is insufficient enforcement.

## REQ-011: Validated Codex compiler

After the Claude compiler is verified, implement an independent Codex adapter against the same binding contract, based on the installed Codex runtime and current official documentation. Render repository-local portable skill entry points and supported role/subagent configuration with exact model snapshot, effort, material serving settings and source metadata. Detect config drift and unsupported runtime versions/settings without weakening policy or modifying user-global configuration; adapter syntax changes must not require constitution changes. Validate effective invocation/environment/config precedence at dispatch and reject or locally neutralize conflicting overrides without modifying user-global settings.

## REQ-012: Real task evaluation suites

Create versioned, reproducible evaluation fixtures harvested from actual authorized delegated work, with traceable task origin, starting repository revision/content, allowed and forbidden scope, objective acceptance checks, expected artifacts, role, class, risk and constraints. Include real fixtures for each active task class and executable graders; clearly distinguish harvested tasks from synthetic policy tests. An evaluation runner must replay candidates on the same isolated fixtures, preserve prompt/tool/harness/grader treatment identity, and record raw results without treating a small seed suite as statistical qualification.

## REQ-013: Append-only observation ledger

Implement local append-only model/evidence/evaluation/production records with immutable IDs, content digests, provenance and typed references. Record raw attempts, acceptance, retries, escalation, review rejection, rework, latency and available usage/cost components; link outcomes to candidate/effort/material serving configuration, task cohort, artifact, suite and harness versions. Missing cost or runtime attribution remains explicit unknown, never zero or an invented fact. Derive comparable cost per accepted task from all attributable attempts/review/rework; preserve benchmark and pricing revisions as new records, reject conflicting duplicate writes, and survive interrupted writes/concurrent appends without corrupting accepted history.

## REQ-014: Executable paired inference

Replace synthetic comparison claims with a documented, deterministic statistical implementation that derives paired quality comparisons from raw same-task incumbent/challenger outcomes and comparable costs. Implement an appropriate exact paired binary method plus a defensible paired interval method for quality delta; the method, confidence level, seed where relevant, margins and stopping/evidence-sufficiency rules are versioned and auditable. Produce superiority, non-inferiority or insufficient evidence against constitution thresholds; promotion must never trust a supplied confidence bound, unpaired leaderboard average or arbitrary fixed sample count.

## REQ-015: Production qualification and selection

Integrate real registry, admissible ledger observations and recomputed paired inference with the established independent validator and CLI classify/qualify/compare/status commands. Preserve initial cheapest-qualified selection versus incumbent promotion, deterministic ties, hard constraints, review independence, exact policy/digest matching and explicit expiry states. Every production decision exposes considered candidates, exclusions, measured economics, evidence references, stable rules and escalation conditions; synthetic evidence cannot qualify or promote, and unavailable/retired/disqualified incumbents cannot be retained. Missing necessary comparable evidence returns HOLD/INSUFFICIENT_EVIDENCE or ESCALATION_REQUIRED without fabricating a production binding.

## REQ-016: Official discovery and evidence ingestion

Add explicit official-source discovery and ingestion after qualification/statistics are verified. Retrieve available canonical snapshots, availability/deprecation, supported effort/modalities/tools/context and material serving behavior, release/model documentation and pricing/cache pricing where accessible without new credentials. Preserve source URL/retrieval time/source version and unknown facts; official metadata describes capabilities and prices, while vendor benchmark claims remain nonqualifying alone. Ingest independently sourced benchmarks only with required version/methodology/configuration provenance, append revisions, and enumerate meaningful candidate treatments without assigning model names inside policy.

## REQ-017: Portable bounded delegation

Provide one provider-independent delegate contract with generated Claude and Codex skill interfaces and an executable runtime flow that classifies task/role/constraints and pre-dispatch risk, resolves a current validated binding, creates a bounded work order, dispatches through verified native runtime mechanisms or an explicit necessary CLI bridge, inspects actual returned changes and checks, derives post-change risk, obtains the required independent fresh-context review, and accepts/retries/escalates before recording an outcome. Enforce allowed/forbidden scope and structured escalation; artifact acceptance is tied to the final reviewed digest and any subsequent edit invalidates prior review. Use existing local subscription-authenticated CLIs for execution, never new API keys or silent model/effort fallback.

## REQ-018: Safe paired challenger replay

Support explicit policy-controlled shadow replay of eligible real work with incumbent results usable and challenger results isolated/discarded. Use separate worktrees or equivalent isolated environments, restrict capabilities and side effects according to task scope, and categorically refuse destructive or irreversible shadow tasks. Match fixture/task and treatment identity for paired ledger evidence; enforce policy sampling limits and never silently switch real production work exclusively to an unqualified challenger.

## REQ-019: Deterministic refresh proposal

Build the refresh command and portable refresh-models skill last among operational capabilities, composing discovery, admissible evidence ingestion, missing-eval identification and authorized isolated evaluation, paired comparison, qualification/promotion, proposed bindings, independent validation, adapter rendering and rendered-output validation. Produce a human-readable and machine-readable diff identifying role/class, incumbent/challenger, investigation trigger, evidence, economics, exact rules and PROMOTE/HOLD/ESCALATION_REQUIRED result. Policy is read-only; unsupported runtimes, missing evidence, stale/unavailable models or invalid output fail closed. Stage complete proposals and apply locally through an explicit recorded action with atomic consistency; a no-change refresh is idempotent and cannot silently alter active assignments.

## REQ-020: Reproducible full-v1 proof

Deliver a documented local full-v1 verification workflow covering the retained milestone-one regressions, adapter compiler/runtime conformance, real fixture provenance and grader execution, immutable ledger behavior, statistical reference cases, qualification/selection, delegation review boundaries, safe shadow replay and refresh proposals. Include npm scripts verify:v1 and verify:v1:live with machine-readable results that distinguish passed, failed, blocked and insufficient evidence; live verification uses existing CLI subscriptions in isolated local workspaces. Document installation-free local usage, current verified runtime/source versions, exact commands/results, architecture and enforced versus externally attested facts. Demonstrate each provider live where verified runtime support and authorized evidence permit, and report concrete blockers without presenting mocks, synthetic qualifications or unavailable costs as live success.

### AC-001: Valid constitution (REQ-001)

Given: The declared policy files and synthetic test buckets exist
When: Load and validate the constitution
Then: Validation accepts a complete internally consistent policy and reports its version and content hash
Verification: npm test

### AC-002: Malformed policy (REQ-001)

Given: Policies contain an unknown role/class, missing or empty eval bucket, undeclared rule reference, invalid numeric threshold, or embedded model assignment
When: Validate each independently mutated policy
Then: Each invalid policy is rejected with a stable rule ID and actionable field path
Verification: npm test

### AC-003: Candidate identity (REQ-002)

Given: A registry contains a pinned synthetic model, aliases, and supported effort/serving settings
When: Parse candidates at different effort or material serving settings and an alias candidate
Then: Valid treatments have distinct identities; aliases, unsupported configurations and missing provenance are rejected
Verification: npm test

### AC-004: Invalid data (REQ-002)

Given: Inputs contain unknown fields, NaN/nonfinite values, negative counts, passed greater than attempted, duplicate IDs, missing versions or malformed dates
When: Parse each public input
Then: Parsing rejects them without uncaught exceptions or silent defaults that weaken policy
Verification: npm test

### AC-005: Admissible evidence (REQ-003)

Given: Complete synthetic local evidence matches a candidate and its task stratum
When: Validate evidence admissibility
Then: Matching versioned evidence is accepted for policy simulation only
Verification: npm test

### AC-006: Inadmissible evidence (REQ-003)

Given: Evidence lacks provenance, references another candidate/effort/suite/role/risk/constraint stratum, uses forbidden fallback, or relies only on vendor marketing
When: Qualify the candidate under the relevant policy
Then: The evidence is rejected with a specific reason and cannot contribute to qualification
Verification: npm test

### AC-007: Risk upgrade (REQ-004)

Given: A task starts low risk but returned-artifact facts include authentication, a migration or another higher-risk signal
When: Reclassify and validate the review bundle
Then: Effective risk increases and the stronger review requirements apply; a claimed lower risk fails
Verification: npm test

### AC-008: Review independence (REQ-004)

Given: Critical work has a same-family reviewer, inherited context, no qualified reviewer, or a changed artifact after review
When: Validate final acceptance
Then: Each case rejects or returns ESCALATION_REQUIRED; a qualified different-family fresh review of the exact artifact passes
Verification: npm test

### AC-009: Absolute qualification (REQ-005)

Given: Comparable candidate observations meet quality and required capabilities within absolute cost/latency constraints
When: Qualify candidates
Then: Only candidates satisfying every required bar qualify, with auditable measurements and rules
Verification: npm test

### AC-010: False economy (REQ-005)

Given: A candidate has zero acceptances, omitted costs, fails quality, lacks a required tool, is unavailable or exceeds an absolute ceiling
When: Qualify and calculate economics
Then: It cannot win through zero/division/omitted-cost handling; the specific eligibility or evidence failure is recorded
Verification: npm test

### AC-011: Initial minimum (REQ-006)

Given: Two or more candidates qualify and one costs less on comparable tasks
When: Select an initial binding and validate an intentionally expensive alternative
Then: The cheapest wins; the expensive proposed winner is rejected regardless of its claimed rules_fired
Verification: npm test

### AC-012: Promotion boundaries (REQ-006)

Given: Policy allows 15 percent cost increase but a dearer challenger costs 19 percent more; another fails superiority; a cheaper challenger passes or fails non-inferiority and savings thresholds
When: Evaluate the paired challenger cases
Then: Each rejected promotion retains an eligible incumbent with reasons; a cheaper proven non-inferior candidate meeting savings can replace it
Verification: npm test

### AC-013: Insufficient or absent incumbent (REQ-006)

Given: Paired evidence is insufficient, costs tie, or the incumbent is invalid and no replacement qualifies
When: Select using the declared transition policy
Then: The results deterministically distinguish RETAIN_INCUMBENT, INSUFFICIENT_EVIDENCE and ESCALATION_REQUIRED without retaining an invalid incumbent
Verification: npm test

### AC-014: Valid bindings (REQ-007)

Given: Three complete synthetic binding fixtures cover initial selection, incumbent retention and justified promotion
When: Independently validate them at a fixed supplied time
Then: All three validate and their decision evidence can be replayed deterministically
Verification: npm test

### AC-015: Binding forgery (REQ-007)

Given: Bindings forge rules, requirements, selection, policy version/hash, candidate-set hash, evidence references or reviewed artifact digest
When: Independently validate each mutated binding
Then: Every contradiction is rejected; generator output is not trusted merely because it cites valid-looking rule names
Verification: npm test

### AC-016: Time states (REQ-008)

Given: A binding is before refresh due, exactly at/after refresh due, and exactly at/after hard expiry
When: Validate with fixed clocks and both stale-allowed and stale-disallowed policies
Then: VALID, STALE and INVALID match declared policy at every boundary, and stale continuation is explicit
Verification: npm test

### AC-017: No synthetic production (REQ-008)

Given: A synthetically valid binding is presented to a production validation entry point
When: Validate without a simulation designation
Then: It fails closed; synthetic fixture mode cannot silently become a production binding
Verification: npm test

### AC-018: Usable offline CLI (REQ-009)

Given: A clean checkout has its declared dependencies installed and fixture paths available
When: Build and run each validate command on valid and invalid inputs
Then: Correct structured output and exit statuses are observed; missing/malformed files produce useful diagnostics and input bytes remain unchanged
Verification: npm test

### AC-019: Proof suite (REQ-009)

Given: A table-driven suite contains the spec pathological cases plus adversarial boundaries
When: Run all tests and typecheck/build
Then: The suite passes with at least three valid examples and ten distinct invalid binding examples, and documentation maps enforced invariants to tests
Verification: npm test

### AC-020: Claude compiler preserves validated identity (REQ-010)

Given: The baseline validator passes and a complete validated test binding identifies a pinned snapshot, effort and material serving configuration supported by a captured Claude capability report.
When: Render twice in the isolated adapter-test mode.
Then: Both outputs are byte-identical and identify their source policy/binding hashes. The runtime parser or capability-specific conformance check sees the exact bound settings; generated test artifacts are marked nonproduction and production dispatch rejects them.
Verification: npm run verify:v1

### AC-021: Claude unsupported setting and drift fail closed (REQ-010)

Given: A runtime profile lacks required effort/pinning/fallback control, a binding is invalid, or a generated agent was manually changed. This includes an environment or invocation override that outranks the generated agent model/effort setting.
When: Attempt production rendering or dispatch for each independently mutated input.
Then: The operation rejects with a stable diagnostic and creates no usable replacement config; an apparently valid model name never substitutes for proof that the setting is supported. A child process receives only the verified effective model/effort/serving settings; conflicting overrides cannot silently win and parent/global configuration remains unchanged.
Verification: npm run verify:v1

### AC-022: Codex adapter is independent and deterministic (REQ-011)

Given: The Claude compiler gate passed and a Codex runtime profile supports the validated snapshot/effort/serving settings.
When: Render supported bindings and change only the bound effort or snapshot.
Then: Unchanged inputs render identically; the changed binding produces the expected changed Codex configuration and source digest. Roles and task classes remain provider-independent; changing the tested Codex config syntax needs an adapter change only.
Verification: npm run verify:v1

### AC-023: Codex unsupported version and tampering (REQ-011)

Given: Codex runtime semantics are unknown or no longer match the verified profile, a generated file is tampered with, or an input binding contains a model alias. Another case injects higher-precedence model or effort overrides.
When: Run adapter validation and dispatch preflight.
Then: Each case blocks before worker execution; the error identifies unsupported runtime semantics, drift or invalid pinning and the governor never silently selects a replacement. The resolved effective dispatch settings match the binding or dispatch is refused; checking generated text alone cannot pass the gate.
Verification: npm run verify:v1

### AC-024: Traceable real harvested fixtures (REQ-012)

Given: Actual authorized work supplies task descriptions and reconstructible starting states for the active classes.
When: Harvest fixtures and execute their objective graders against the recorded starting/result artifacts.
Then: Each fixture preserves source lineage, scope, acceptance criteria, risk, class/role and relevant constraints. Every active production class has a nonempty real bucket; a missing source/state is reported as incomplete rather than filled with an invented coding puzzle. A fixture alone never becomes model performance evidence; real candidate attempts and grader results are separately required.
Verification: npm run verify:v1

### AC-025: Replay isolation and treatment comparability (REQ-012, REQ-013)

Given: Two supported candidates are evaluated against the same real fixture revision using declared prompt/tool/grader/harness versions.
When: Run both isolated attempts and then change the suite or harness version for a subsequent run.
Then: The first attempts retain the same pairing key and individual candidate identity, command outcomes, artifact and costs where available. The changed treatment produces a distinct version/cohort and cannot be silently pooled into the original comparison; failures and partial attempts remain in the ledger.
Verification: npm run verify:v1

### AC-026: Ledger immutable and recoverable (REQ-013)

Given: The ledger already holds a valid observation and its digest.
When: Append the same observation, attempt a conflicting record with the same ID, append concurrently, and interrupt a write before completion.
Then: Idempotent repeats do not double-count, conflicting content is rejected, successful concurrent records remain readable, and partial records cannot be mistaken for complete evidence. The previously accepted observation bytes/digests remain unchanged and history verifies.
Verification: npm run verify:v1

### AC-027: Accepted-task economics includes failures (REQ-013, REQ-015)

Given: A comparable cohort contains unsuccessful worker attempts, review/rework costs and accepted outcomes.
When: Compute production metrics and qualification economics.
Then: The total includes all attributable costs and divides by accepted task count, not only successful attempts. Zero accepted outcomes or unavailable required costs yields an explicit nonqualifying/insufficient-evidence result rather than zero price, infinity serialized as a valid number, or fabricated token pricing.
Verification: npm run verify:v1

### AC-028: Paired statistical reference vectors (REQ-014)

Given: Versioned reference vectors include identical results, zero discordant outcomes, asymmetric discordances, reversed candidate order and a known superiority case.
When: Run exact paired inference and the chosen paired quality-delta interval method.
Then: Outputs match independently derived/reference-checked expectations within declared numerical tolerances; reversing order reverses directional conclusions appropriately. Intervals remain within valid delta bounds; identical or tiny samples do not manufacture proof beyond what the documented method supports. Repeated computation with the same inputs/method/seed yields identical results.
Verification: npm run verify:v1

### AC-029: Reject untrusted statistical proof (REQ-014)

Given: An input supplies a favorable precomputed confidence bound, duplicate task pairs, unmatched outcomes, mixed strata or altered treatment versions.
When: Attempt production paired comparison and promotion.
Then: The implementation rejects/inadmissibly excludes those inputs with reasons, derives permitted comparisons from raw matched data only, and cannot promote by accepting an asserted interval or synthetic comparison.
Verification: npm run verify:v1

### AC-030: Promotion margins and economic boundaries (REQ-014, REQ-015)

Given: Declared policy permits at most 15 percent additional cost for a superior challenger, and a scenario challenger costs 19 percent more; other cases exercise cheaper non-inferiority and threshold equality.
When: Evaluate promotion using raw paired test observations and independently recomputed statistics.
Then: The 19 percent increase fails the 15 percent ceiling regardless of quality; passing or failing non-inferiority and minimum savings yields the corresponding permitted replacement or hold. Tests use explicitly synthetic observations only for algorithm verification and cannot activate a production binding. Small noisy quality gains return insufficient evidence, preserving an eligible incumbent without claiming superiority.
Verification: npm run verify:v1

### AC-031: Production qualification remains evidence-bound (REQ-015)

Given: A real registry and comparable local observations contain several candidates, including a cheap unqualified candidate and an eligible incumbent.
When: Run qualify/compare/status and independently validate the proposed selection.
Then: Only fully qualified candidates enter economics; initial selection is the cheapest qualified candidate with deterministic ties, while replacement obeys paired promotion requirements. The decision records candidate exclusions, exact evidence references, policy digest, rule IDs and escalation conditions. Vendor-only, synthetic, missing-price and incompatible-stratum observations cannot establish production qualification.
Verification: npm run verify:v1

### AC-032: Invalid incumbent cannot be retained (REQ-015)

Given: The incumbent is retired, unavailable, disqualified, hard-expired or bound to incompatible policy; no challenger presently qualifies.
When: Resolve the binding and request a task dispatch.
Then: The result is INVALID/ESCALATION_REQUIRED and dispatch is blocked; HOLD never authorizes an invalid incumbent, and STALE continuation is permitted only by the cited policy with a visible status.
Verification: npm run verify:v1

### AC-033: Official discovery changes roster only (REQ-016)

Given: Captured and live-accessible official source pages describe canonical IDs, effort options, features, prices and a deprecation update.
When: Discover and ingest the sources with recorded retrieval information.
Then: Registry/pricing entries reflect the source facts with exact provenance; missing facts remain unknown and obsolete data is not silently represented as current. New model, price and deprecation records are appended without changing constitution content or choosing a winner. Provider marketing scores cannot independently qualify any model.
Verification: npm run verify:v1

### AC-034: Benchmark methodology history preserved (REQ-013, REQ-016)

Given: A benchmark changes methodology and a second result for the same snapshot appears; another row omits required version/configuration provenance.
When: Ingest both revisions and the incomplete row.
Then: Both complete revisions remain individually retrievable and are not pooled as comparable measurements. The incomplete row is quarantined/rejected as qualifying evidence with a reason rather than assigned a guessed methodology. No supplied anecdote score enters the ledger as a verified external fact without its original sources.
Verification: npm run verify:v1

### AC-035: Bounded worker and fresh review contract (REQ-017)

Given: A task has a valid production binding and a runtime profile capable of enforcing its declared scope and context boundary.
When: Dispatch a bounded implementation and required reviewer through the native mechanisms or documented CLI bridge.
Then: The worker receives goal, scope, allowed/forbidden systems/files, acceptance checks, risk constraints, structured return and escalation conditions. The runtime records the requested exact candidate and observed identity where available; unknown served identity is not asserted as observed. A fresh critical reviewer is a new context receiving only the admissible artifact/spec/check package, with no implementation conversation or prior review conclusions. The accepted outcome names the exact reviewed artifact digest and records the verification evidence.
Verification: npm run verify:v1

### AC-036: Scope and risk escalation prevents acceptance (REQ-017)

Given: A low-risk assignment returns changes that cross allowed scope or modify authentication/schema-sensitive artifacts, or the worker requests architectural judgment.
When: Inspect the actual diff and structured outcome before final acceptance.
Then: Observable changes trigger categorical post-change reclassification; final review uses max pre/post risk and the appropriate reviewer requirements. Scope violations, ambiguous high-risk changes and missing required independent reviewers escalate instead of silently expanding authority. Worker-reported low risk cannot override the artifact evidence.
Verification: npm run verify:v1

### AC-037: Final artifact invalidates previous review (REQ-017)

Given: A qualified independent reviewer approved artifact digest A, then integration/polish changes it to digest B.
When: Attempt final acceptance using the previous review.
Then: Acceptance rejects until digest B receives the required checks and fresh applicable review; a prose claim that the change is minor cannot bypass policy.
Verification: npm run verify:v1

### AC-038: Dispatch failure remains auditable (REQ-013, REQ-017)

Given: The CLI is unauthenticated/unavailable, its runtime changes mid-run, the served model cannot satisfy required attribution, a worker times out, or acceptance tests repeatedly fail.
When: Execute the delegation state machine for each failure.
Then: Execution fails/escalates with a structured outcome and retains attempts, uncertainty and available costs; retries follow declared policy limits. No API-key lookup/setup, silent model fallback, hidden force mode or false accepted-task event occurs.
Verification: npm run verify:v1

### AC-039: Shadow work never substitutes for incumbent (REQ-018)

Given: A bounded task is eligible for policy sampling and both attempts can be isolated.
When: Run incumbent work and challenger shadow replay.
Then: Only the incumbent result can be integrated; challenger output remains isolated and discarded after grading. The paired raw records share task identity and preserve distinct candidate/treatment identities; retries and failure costs remain attributable. The configured sampling limit is enforced without a hard-coded ad hoc percentage.
Verification: npm run verify:v1

### AC-040: Unsafe shadow work refused (REQ-018)

Given: The proposed shadow task can delete data, mutate production infrastructure, perform an irreversible operation, or escape the permitted sandbox.
When: Request challenger shadow replay.
Then: Preflight rejects the shadow run before worker dispatch and records the reason; isolation is not presumed merely because code uses a worktree.
Verification: npm run verify:v1

### AC-041: Refresh hold is a truthful result (REQ-019)

Given: Official discovery finds a candidate cheaper per comparable accepted task, but paired evidence cannot establish non-inferiority.
When: Run refresh using available authorized local evaluations.
Then: The proposal reports incumbent/challenger, trigger, eligibility, economics, missing evidence and exact promotion rule, with HOLD. An eligible incumbent and active generated assignments remain unchanged; policy content and history hashes remain unchanged. A second unchanged refresh produces no spurious model churn or duplicate accepted evidence.
Verification: npm run verify:v1

### AC-042: Refresh verifies before local activation (REQ-019)

Given: A complete real evidence set authorizes replacement and both adapter profiles support the proposed binding; a separate case has invalid generated output.
When: Stage the refresh proposal, inspect its machine/human diff, and invoke explicit local apply.
Then: Successful apply activates a mutually consistent binding/generated set with recorded source digests; no partially applied set is dispatchable after interruption. Invalid binding/output, changed policy/source digests or unsupported adapter prevents activation and leaves the prior usable state intact. No constitution file, global skill directory or user-global provider configuration is modified.
Verification: npm run verify:v1

### AC-043: Offline end-to-end regression evidence (REQ-020)

Given: A clean checkout has declared local dependencies and versioned fixture/source captures.
When: Run npm run verify:v1.
Then: The baseline pathological suite and all full-v1 offline acceptance groups execute with a coverage/result report, passing build/typecheck and useful errors. The report identifies which tests are synthetic and which artifacts came from actual harvested work; it does not call offline mocks live proof. Model launches, price changes, methodology updates and runtime syntax changes are exercised without rewriting constitution principles.
Verification: npm run verify:v1

### AC-044: Live CLI subscription smoke and honest limits (REQ-010, REQ-011, REQ-012, REQ-017, REQ-020)

Given: Existing local subscription-authenticated Claude and Codex CLIs are available, inspected current semantics are documented, and an isolated authorized real fixture is selected.
When: Run npm run verify:v1:live against each provider; use a governed production binding only if genuinely qualified, otherwise label an execution strictly as qualification evaluation.
Then: Each supported execution records invocation/runtime versions, exact requested model/effort/config, runtime-reported identity and usage where actually available, objective grader result and resulting artifact. Qualification evaluation never impersonates accepted production delegation or upgrades synthetic evidence. Missing auth/support/evidence/attribution/cost or insufficient statistical power is a named blocked/insufficient result with retained evidence, not a skipped test counted as success. No global installation/configuration changes, API keys or remote publish occur.
Verification: npm run verify:v1:live

## constraints

- Authoritative original user specification: docs/model-governor-spec.md. The latest user instruction explicitly expands the build through full v1; its Phase 1 stopping instruction is superseded while its architectural order and principles remain authoritative.

- Before substantial application code, produce docs/plan.md with files, core types, validator stages, test strategy and assumptions. Foreman owns adaptive task decomposition. Stabilize shared schemas before consumers and cap execution concurrency at three.

- First prove REQ-001 through REQ-009 as one coherent validator milestone before REQ-010. The sequence fields on REQ-010 onward then impose the original subsequent milestone order. Do not stop after an internal checkpoint.

- Initial numeric thresholds are declared policy proposals with rationale, not empirical universal truths. Runtime processes never silently edit constitution files.

- Implementation scope and proof must not be reduced merely because auth, current runtime controls or sufficient empirical evidence are unavailable; finish independent work and report operational blockers honestly.

- Requirement sequences encode the source construction order: verified first milestone, Claude adapter, Codex adapter, real harvested fixtures, ledger, paired inference/qualification, discovery, operational delegate/shadow integration, refresh last, then full-v1 proof. Foreman owns adaptive decomposition within these gates; do not start adapters before the foundation passes or discovery/refresh before their evidence dependencies.

- Preserve human-owned versioned constitution, model IDs only in data, provenance for every decision number, no weighted/model-quality/confidence routing scores, no vendor-only qualification, no alias upgrade, no empty eval classes, exact policy/evidence identities, independent validation before rendering, and final-artifact review.

- Execution may use only existing local Claude/Codex CLI subscription authentication. Do not read/export credential values, add API keys, log credentials, change login/global configuration or silently fall back to API billing. Public official documentation can supply discovery metadata; an authenticated-only source that is unavailable is a reported limitation.

- Live model calls are limited to authorized bounded local evaluation/delegation and explicitly safe shadow replay. Keep empirical evidence and synthetic algorithm/adapter tests separate through storage, validation, artifact marking and dispatch gates. A successful fixture run is not automatically sufficient evidence to qualify or promote.

- Keep all generated configuration/skills and operational artifacts repository-local or in explicit disposable workspaces. Local commits/branches/worktrees are permitted; no global installs, remote publication, new GitHub repository, pushes, product UI or universal proxy.

- Runtime and provider facts are unstable: inspect installed CLIs and current official documentation for skill/agent locations, pinning, effort, tool controls, fallback, config precedence and context boundaries. Record sources/versioned capabilities and fail closed on unsupported or unverified required semantics.

- Do not fabricate canonical snapshots, empirical outcomes, source citations, token counts, subscription-derived dollar costs, confidence bounds, sample sufficiency or served-model identity. Unknown cost blocks cost-based production qualification until admissible measurement exists; lack of a production binding does not block implementation and offline/evaluation verification.

- Full v1 is a working local library/CLI and portable skill workflow with honest empirical states, not a guarantee that current installed runtimes expose every control or any candidate already qualifies. Report concrete remaining operational blockers and continue all independent implementation/verification.

## outOfScope

- Optional reporting UI, universal production model proxy, learned black-box router, weighted scores and permanent preferred-model policy.

- Global skills/config installation, remote publishing/pushing, new credentials/API-key billing, destructive live tasks and unqualified exclusive production traffic.

- Synthetic data presented as production qualification, forced promotions, invented evaluation tasks passed off as real work, and fabricated cost/identity/statistical evidence.

- Human override bypasses, hidden force flags and automatic constitution edits; explicit expiring override support can remain unimplemented.

- Historical data purging, automatic source-repository mutation outside task scope and claiming runtime/provider attestations are mathematically proven facts.

## decisions

- {"id": "DEC-1", "status": "locked", "decision": "Build one full-v1 package with verified first milestone, Claude adapter, Codex adapter, real fixtures, ledger, paired inference/qualification, discovery, delegate/shadow integration, refresh last and final proof; do not stop after a passed checkpoint.", "rationale": "The latest user clarification expands ownership through full v1; the original milestone order remains a locked dependency constraint."}

- {"id": "DEC-2", "status": "locked", "decision": "Use only existing subscription-authenticated local CLIs for live model execution; do not add API keys.", "rationale": "The supervisor relayed this explicit execution boundary, which also avoids confusing API token prices with subscription task cost."}

- {"id": "DEC-3", "status": "proposed", "decision": "Use and extend the baseline TypeScript/schema/test contracts when they land; do not build a parallel replacement foundation.", "rationale": "This fragment will be merged into the new full-v1 scaffold handoff, with the baseline validator implemented before adapters."}

- {"id": "DEC-4", "status": "proposed", "decision": "Use an append-only local file ledger with immutable content-addressed records and atomic writes unless measured volume/concurrency requires a different storage implementation.", "rationale": "A local first version needs trustworthy history and replay, not an ingestion service or database by default."}

- {"id": "DEC-5", "status": "proposed", "decision": "Implement a mathematically documented exact paired binary test and a validated deterministic paired interval method, with raw-data replay and explicit insufficient-evidence rules.", "rationale": "The source permits statistical implementation choices, but unsupported synthetic confidence bounds must be eliminated from production decisions."}

- {"id": "DEC-6", "status": "proposed", "decision": "Harvest available real tasks from authorized target/Foreman work and preserve their reproducible origin; leave a class visibly incomplete if no real source can be obtained.", "rationale": "The user requires actual work rather than invented puzzles; completeness cannot be manufactured by relabeling synthetic fixtures."}

- {"id": "DEC-7", "status": "proposed", "decision": "Treat missing cost as unknown. Use provider-reported task cost or a fully measured usage-derived estimate only with explicit cost-basis provenance and consistently declared policy semantics; never mislabel API-equivalent usage estimates as subscription invoices.", "rationale": "The cost metric must account for all attempts and review/rework on comparable tasks. Existing CLI telemetry may report estimated dollars rather than actual marginal subscription charges."}

- {"id": "DEC-8", "status": "proposed", "decision": "Refresh stages validated repository-local proposals and activates them only via an explicit recorded local apply operation after complete validation.", "rationale": "The source requires auditable diffs and prevents silent upgrades; staged atomic apply makes the final change concrete without publishing or mutating global configuration."}

- {"id": "DEC-9", "status": "proposed", "decision": "Expose npm run verify:v1 and npm run verify:v1:live as stable verification entry points; adapt internal command names to the established CLI.", "rationale": "The acceptance suite needs reproducible commands while Foreman retains implementation freedom and offline/live evidence stays distinguishable."}

- {"id": "DEC-10", "status": "locked", "decision": "Use verified primary Artificial Analysis sources and docs/benchmark-provenance.md for the README anecdote, preserving measurement configuration and fallback attribution; do not invent the earlier index version.", "rationale": "The supervisor verified https://artificialanalysis.ai/articles/claude-fable-5-1 (September 1: 66 at max effort, fallback accounting for 4 percent of output tokens) and https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-3 (September 7: 53 at max effort with fallback). The earlier methodology version was not explicit in the first source."}

## openQuestions

## framing

- {"heading": "Product outcome", "summary": "Model Governor earns model/effort assignments through explicit evidence and policy, then compiles portable local Claude/Codex delegation tools. Discovery describes candidates; qualification establishes suitability; runtime consumes validated bindings."}

- {"heading": "Continuation boundary", "summary": "These REQ-010 onward additions will join the baseline constitution, strict schemas, synthetic adversarial fixtures and independent validation requirements in one full-v1 scaffold package. The previous package stopped before application implementation; the user wants the complete local v1, with no revival of the deleted legacy delegate."}

- {"heading": "Empirical honesty", "summary": "A fully implemented system can correctly report HOLD, insufficient evidence or unsupported runtime control. That is distinct from unfinished code, and the final proof must separate working capability, real measured evidence and actual operational blockers."}

- {"heading": "Sequencing rationale", "summary": "The source explicitly orders compilers before real evals, evidence/statistics before discovery, and refresh after the mechanisms it orchestrates. The listed requirement sequence preserves these user-imposed gates rather than inventing Foreman lanes or task decomposition."}

