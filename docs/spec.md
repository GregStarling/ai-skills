# Model Governor — milestone one

Prove Model Governor policy invariants with an offline constitution, strict schemas, deterministic independent binding validator and synthetic adversarial tests before building any runtime adapter.

Source: [original attached specification](model-governor-spec.md).

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

### AC-001: Valid constitution (REQ-001)

Given: The declared policy files and synthetic test buckets exist
When: Load and validate the constitution
Then: Validation accepts a complete internally consistent policy and reports its version and content hash

### AC-002: Malformed policy (REQ-001)

Given: Policies contain an unknown role/class, missing or empty eval bucket, undeclared rule reference, invalid numeric threshold, or embedded model assignment
When: Validate each independently mutated policy
Then: Each invalid policy is rejected with a stable rule ID and actionable field path

### AC-003: Candidate identity (REQ-002)

Given: A registry contains a pinned synthetic model, aliases, and supported effort/serving settings
When: Parse candidates at different effort or material serving settings and an alias candidate
Then: Valid treatments have distinct identities; aliases, unsupported configurations and missing provenance are rejected

### AC-004: Invalid data (REQ-002)

Given: Inputs contain unknown fields, NaN/nonfinite values, negative counts, passed greater than attempted, duplicate IDs, missing versions or malformed dates
When: Parse each public input
Then: Parsing rejects them without uncaught exceptions or silent defaults that weaken policy

### AC-005: Admissible evidence (REQ-003)

Given: Complete synthetic local evidence matches a candidate and its task stratum
When: Validate evidence admissibility
Then: Matching versioned evidence is accepted for policy simulation only

### AC-006: Inadmissible evidence (REQ-003)

Given: Evidence lacks provenance, references another candidate/effort/suite/role/risk/constraint stratum, uses forbidden fallback, or relies only on vendor marketing
When: Qualify the candidate under the relevant policy
Then: The evidence is rejected with a specific reason and cannot contribute to qualification

### AC-007: Risk upgrade (REQ-004)

Given: A task starts low risk but returned-artifact facts include authentication, a migration or another higher-risk signal
When: Reclassify and validate the review bundle
Then: Effective risk increases and the stronger review requirements apply; a claimed lower risk fails

### AC-008: Review independence (REQ-004)

Given: Critical work has a same-family reviewer, inherited context, no qualified reviewer, or a changed artifact after review
When: Validate final acceptance
Then: Each case rejects or returns ESCALATION_REQUIRED; a qualified different-family fresh review of the exact artifact passes

### AC-009: Absolute qualification (REQ-005)

Given: Comparable candidate observations meet quality and required capabilities within absolute cost/latency constraints
When: Qualify candidates
Then: Only candidates satisfying every required bar qualify, with auditable measurements and rules

### AC-010: False economy (REQ-005)

Given: A candidate has zero acceptances, omitted costs, fails quality, lacks a required tool, is unavailable or exceeds an absolute ceiling
When: Qualify and calculate economics
Then: It cannot win through zero/division/omitted-cost handling; the specific eligibility or evidence failure is recorded

### AC-011: Initial minimum (REQ-006)

Given: Two or more candidates qualify and one costs less on comparable tasks
When: Select an initial binding and validate an intentionally expensive alternative
Then: The cheapest wins; the expensive proposed winner is rejected regardless of its claimed rules_fired

### AC-012: Promotion boundaries (REQ-006)

Given: Policy allows 15 percent cost increase but a dearer challenger costs 19 percent more; another fails superiority; a cheaper challenger passes or fails non-inferiority and savings thresholds
When: Evaluate the paired challenger cases
Then: Each rejected promotion retains an eligible incumbent with reasons; a cheaper proven non-inferior candidate meeting savings can replace it

### AC-013: Insufficient or absent incumbent (REQ-006)

Given: Paired evidence is insufficient, costs tie, or the incumbent is invalid and no replacement qualifies
When: Select using the declared transition policy
Then: The results deterministically distinguish RETAIN_INCUMBENT, INSUFFICIENT_EVIDENCE and ESCALATION_REQUIRED without retaining an invalid incumbent

### AC-014: Valid bindings (REQ-007)

Given: Three complete synthetic binding fixtures cover initial selection, incumbent retention and justified promotion
When: Independently validate them at a fixed supplied time
Then: All three validate and their decision evidence can be replayed deterministically

### AC-015: Binding forgery (REQ-007)

Given: Bindings forge rules, requirements, selection, policy version/hash, candidate-set hash, evidence references or reviewed artifact digest
When: Independently validate each mutated binding
Then: Every contradiction is rejected; generator output is not trusted merely because it cites valid-looking rule names

### AC-016: Time states (REQ-008)

Given: A binding is before refresh due, exactly at/after refresh due, and exactly at/after hard expiry
When: Validate with fixed clocks and both stale-allowed and stale-disallowed policies
Then: VALID, STALE and INVALID match declared policy at every boundary, and stale continuation is explicit

### AC-017: No synthetic production (REQ-008)

Given: A synthetically valid binding is presented to a production validation entry point
When: Validate without a simulation designation
Then: It fails closed; synthetic fixture mode cannot silently become a production binding

### AC-018: Usable offline CLI (REQ-009)

Given: A clean checkout has its declared dependencies installed and fixture paths available
When: Build and run each validate command on valid and invalid inputs
Then: Correct structured output and exit statuses are observed; missing/malformed files produce useful diagnostics and input bytes remain unchanged

### AC-019: Proof suite (REQ-009)

Given: A table-driven suite contains the spec pathological cases plus adversarial boundaries
When: Run all tests and typecheck/build
Then: The suite passes with at least three valid examples and ten distinct invalid binding examples, and documentation maps enforced invariants to tests

## constraints

- Authoritative original user specification: docs/model-governor-spec.md. This handoff scopes only its immediate instruction / first implementation milestone; preserve the full source for future work.

- Before substantial application code, produce docs/plan.md with files, core types, validator stages, test strategy and assumptions. Foreman owns adaptive task decomposition. Keep shared schema contracts serialized before consumers; cap execution concurrency at 3.

- Use deterministic code and rule IDs, never weighted-sum routing or universal model scores. Every decision number is a measurement, declared threshold or sourced fact. Model IDs are evidence data, never constitution policy.

- Policy is human-owned and versioned. The initial build may propose explicit policy defaults, documented as assumptions; runtime processes must not silently edit constitution files.

- Run offline only. Synthetic evidence tests governance mechanics and must never qualify real production model choices. No API keys or live model discovery/evaluation calls from this application.

- Local Git commits/branches/worktrees are permitted for Foreman execution. Do not create GitHub repositories, push remotes, publish, install global skills or change user provider configuration.

- Do not weaken acceptance tests or constitutional invariants to get green. Missing evidence is not a pass. Record limits of supplied attestations versus runtime-observed enforcement.

- Keep this a compact library and CLI. Create only milestone-one directories that have real content; no empty adapter/UI/refresh scaffolding.

## outOfScope

- Claude or Codex adapters and generated provider configs

- Model discovery, refresh-models and delegate skills

- Live provider evaluations, production traffic or runtime dispatch

- Real task harvesting, statistical comparison engine and production ledger ingestion services

- UI, universal model proxy, learned routing and weighted scores

- Production policy activation or automatic model promotion

## decisions

- {"id": "DEC-1", "status": "locked", "decision": "Build milestone one only; do not proceed to adapters after it passes.", "rationale": "The attached immediate instruction explicitly requires this boundary."}

- {"id": "DEC-2", "status": "proposed", "decision": "Use TypeScript, Zod strict schemas, the yaml package and Vitest; npm scripts for tests, build and typecheck.", "rationale": "The repository is empty; this follows the spec preferred stack and keeps validation and types together."}

- {"id": "DEC-3", "status": "proposed", "decision": "Separate initial cheapest-qualified selection from incumbent replacement governed by promotion evidence.", "rationale": "Unconditional cheapest-qualified selection would conflict with required incumbent retention under insufficient non-inferiority evidence."}

- {"id": "DEC-4", "status": "proposed", "decision": "Require version plus canonical policy-content digest and explicitly synthetic fixture mode; production mode rejects synthetic observations.", "rationale": "Versions alone do not detect edited policy bytes and synthetic fixtures are not model qualification evidence."}

- {"id": "DEC-5", "status": "locked", "decision": "Preserve the benchmark-methodology anecdote as a user-supplied account, explicitly unverified unless original dated sources can be retrieved. Never manufacture source citations or import its numbers as qualification evidence.", "rationale": "The source spec requests the anecdote, but provenance is a core invariant and the attached text supplies no primary evidence URLs."}

## openQuestions

## framing

- {"heading": "Product and scope", "summary": "This is a new Model Governor project in the cleared claude-commands directory. There is no legacy delegate to preserve. The governor is deterministic infrastructure; future portable skills will consume its validated bindings."}

- {"heading": "Review focus", "summary": "Generator claims are untrusted. Prove failures for tampered policy/evidence, forged winner/rules, incompatible strata, zero acceptances, alias identities, cost and time boundaries, risk escalation and stale reviews. Real model quality is not proven by synthetic tests."}

