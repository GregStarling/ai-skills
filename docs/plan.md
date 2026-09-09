# Model Governor v1 Implementation Plan

This repository will deliver Model Governor v1 in one execution phase with
ordered internal checkpoints. The foundation checkpoint comes first so schemas,
policy parsing, evidence identity and independent validation are stable before
Claude, Codex, runtime delegation, refresh or proof layers consume them.

## Phase Branch Setup

Foreman owns task branching, integration, gate execution and commits. Worker
tasks use isolated worktrees and must not publish, modify provider-global
configuration or install global skills. Local generated output is ignored before
any build or proof gate runs. Branches should be named by Foreman task ID and
lane, with foundation tasks merged before adapter and runtime tasks.

## Repository Files

- `package.json` and `package-lock.json`: npm package metadata, strict TypeScript
  scripts, CLI bin entry, and the minimal dependencies needed across the full
  build: Zod for strict schemas, `yaml` for mature YAML parsing, and
  `@iarna/toml` for TOML parsing.
- `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`: strict compiler,
  build and test configuration used by every checkpoint.
- `src/index.ts`: public library surface for downstream modules.
- `src/cli/index.ts`: executable package entry point.
- `src/cli/router.ts`: generic command registry and dispatcher so future command
  modules can be registered without later `package.json` changes. Built modules in `src/cli/registry/` export a named `commands` array
  satisfying `readonly CliCommand[]` (import the type from `../router.js`). The
  entry loads these modules in filename order and rejects malformed or duplicate
  registrations. `npm run --silent governor -- <command>` builds and invokes it.
- `scripts/verify/scaffold.mjs`: local scaffold verifier for plan and project
  scaffold declarations.
- `.gitignore`: generated path coverage, including all generated paths declared
  in `foreman-project.config.json` plus build caches, logs and local databases.

Later full-v1 implementation files will use this layout without moving the
scaffold: human policy in `constitution/` or `policy/`, schema sources in
`schemas/`, pure implementation in `src/`, fixtures under `fixtures/`,
append-only evidence and production ledgers under `ledgers/`, generated adapter
artifacts under `generated/`, runtime state under `runtime/`, and inert portable
skill source under `skills/`.

## Core Types

Core types must be schema-derived and shared across consumers: `Policy`,
`Role`, `TaskClass`, `RiskCategory`, `ConstraintSet`, `ModelRecord`,
`Candidate`, `ServingConfiguration`, `EvidenceRecord`, `EvidenceDigest`,
`QualificationResult`, `EconomicsSummary`, `DecisionRecord`, `Binding`,
`ValidationResult`, `WorkOrder`, `ReviewRecord`, `ProductionOutcome`,
`PairedComparison`, `CapabilityReport`, and `RefreshProposal`.

Strict schemas reject unknown fields, invalid chronology, impossible counts,
nonfinite values, duplicate identities, synthetic evidence in production mode,
and invented universal quality/confidence scores. Model IDs remain data in
registry and binding records, never constitution policy.

## Validator Stages

1. Strict parse all public inputs with stable rule IDs and field paths.
2. Resolve exact schema version, policy version and content hash.
3. Resolve candidate, registry, evidence and fixture identities by immutable
   digests.
4. Enforce admissibility, freshness, comparability and simulation/production
   boundaries.
5. Derive pre-dispatch and post-change categorical risk from declared facts.
6. Enforce role, task-class, constraint and review-independence requirements.
7. Recompute hard qualification and cost per accepted task from comparable
   attempts, failures, review and rework.
8. Recompute initial cheapest-qualified selection or incumbent transition using
   paired evidence and declared policy margins.
9. Validate generated, refresh-due and hard-expiry timestamps with an injected
   clock and exact boundary semantics.
10. Independently classify the binding as `VALID`, `STALE` or `INVALID`, with
    stable diagnostics. Rendering and provider calls are outside the foundation
    validator.

## Ordered Checkpoints

1. Foundation proof: constitution, strict schemas, evidence identity, risk,
   economics, qualification, selection, expiry and offline CLI validation.
2. Claude compiler: inspected local Claude runtime and official documentation,
   deterministic rendering, drift detection and dispatch precedence checks.
3. Codex compiler: independent Codex adapter against the same binding contract.
4. Real fixtures: harvested authorized tasks with pinned starting states,
   objective graders and treatment identity.
5. Evidence and production ledgers: append-only records, digests, recovery and
   comparable accepted-task economics.
6. Paired statistics: exact paired binary method and paired quality-delta
   interval implementation.
7. Production qualification: real registry, admissible ledgers, paired
   inference, status/classify/qualify/compare commands and HOLD semantics.
8. Official discovery: read-only official metadata, pricing and benchmark
   ingestion with unknowns preserved.
9. Delegation: bounded work orders, native CLI bridge, returned-diff inspection,
   risk escalation, independent fresh review and auditable outcomes.
10. Shadow replay: isolated challenger worktrees and policy-controlled refusal
    for unsafe tasks.
11. Refresh: deterministic proposals, rendered-output validation, local staged
    activation and idempotent no-change results.
12. Final proof: offline and live verification workflows with hashed artifacts,
    objective checks and honest blockers.

## Requirement Ownership

| Requirement | Owner checkpoint | Primary files or modules | Acceptance scenarios |
| --- | --- | --- | --- |
| REQ-001 | Foundation proof | `constitution/`, `policy/`, `schemas/`, `src/policy/` | AC-001, AC-002 |
| REQ-002 | Foundation proof | `schemas/`, `src/schema/`, `src/identity/` | AC-003, AC-004 |
| REQ-003 | Foundation proof, ledger | `fixtures/`, `src/evidence/`, `ledgers/` | AC-005, AC-006 |
| REQ-004 | Foundation proof, delegation | `src/risk/`, `src/review/`, `src/delegate/` | AC-007, AC-008 |
| REQ-005 | Foundation proof, qualification | `src/qualification/`, `src/economics/` | AC-009, AC-010 |
| REQ-006 | Foundation proof, statistics | `src/selection/`, `src/statistics/` | AC-011, AC-012, AC-013 |
| REQ-007 | Foundation proof | `src/validator/`, `bindings/`, `src/cli/` | AC-014, AC-015 |
| REQ-008 | Foundation proof | `src/expiry/`, `src/validator/` | AC-016, AC-017 |
| REQ-009 | Foundation proof | `src/cli/`, `tests/`, `docs/`, package scripts | AC-018, AC-019 |
| REQ-010 | Claude adapter | `adapters/claude/`, `generated/claude/`, `runtime/` | AC-020, AC-021, AC-044 |
| REQ-011 | Codex adapter | `adapters/codex/`, `generated/codex/`, `runtime/` | AC-022, AC-023, AC-044 |
| REQ-012 | Real fixtures | `fixtures/`, `src/evals/`, `docs/` | AC-024, AC-025, AC-044 |
| REQ-013 | Ledger | `ledgers/`, `src/ledger/`, `src/economics/` | AC-025, AC-026, AC-027, AC-034, AC-038 |
| REQ-014 | Paired statistics | `src/statistics/`, `tests/statistics/` | AC-028, AC-029, AC-030 |
| REQ-015 | Production qualification | `src/qualification/`, `src/selection/`, `src/cli/` | AC-027, AC-030, AC-031, AC-032 |
| REQ-016 | Discovery | `src/discovery/`, `ledgers/`, `docs/` | AC-033, AC-034 |
| REQ-017 | Delegation | `src/delegate/`, `runtime/`, `skills/` | AC-035, AC-036, AC-037, AC-038, AC-044 |
| REQ-018 | Shadow replay | `src/shadow/`, `runtime/`, `ledgers/` | AC-039, AC-040 |
| REQ-019 | Refresh | `src/refresh/`, `skills/`, `generated/` | AC-041, AC-042 |
| REQ-020 | Final proof | `scripts/verify/`, `docs/`, `README.md` | AC-043, AC-044 |

## Acceptance Scenario Map

| Scenario | Requirement | Checkpoint | Planned proof |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | Foundation | Valid constitution parse returns version and digest. |
| AC-002 | REQ-001 | Foundation | Mutated policy table rejects each error with rule ID and path. |
| AC-003 | REQ-002 | Foundation | Candidate identity tests distinguish effort and serving settings. |
| AC-004 | REQ-002 | Foundation | Public schemas reject unknown and impossible data. |
| AC-005 | REQ-003 | Foundation | Synthetic evidence admissible only in simulation mode. |
| AC-006 | REQ-003 | Foundation | Inadmissible provenance, mismatch and fallback cases rejected. |
| AC-007 | REQ-004 | Foundation/delegation | Post-change facts upgrade effective risk. |
| AC-008 | REQ-004 | Foundation/delegation | Review independence, fresh context and artifact digest enforced. |
| AC-009 | REQ-005 | Foundation | Hard eligibility and absolute quality thresholds qualify only complete evidence. |
| AC-010 | REQ-005 | Foundation | False economy cases cannot win through omitted or zero costs. |
| AC-011 | REQ-006 | Foundation | Initial cheapest-qualified selection rejects expensive forgery. |
| AC-012 | REQ-006 | Statistics | Promotion margins and savings boundaries are deterministic. |
| AC-013 | REQ-006 | Foundation/statistics | Retain, insufficient-evidence and escalation outcomes are distinct. |
| AC-014 | REQ-007 | Foundation | Three valid bindings replay exactly. |
| AC-015 | REQ-007 | Foundation | Forged winner, rules and policy references fail validation. |
| AC-016 | REQ-008 | Foundation | Fixed-clock expiry tests cover exact boundaries. |
| AC-017 | REQ-008 | Foundation | Production validation rejects synthetic evidence. |
| AC-018 | REQ-009 | Foundation | Offline CLI validates policy, evidence and bindings with JSON output. |
| AC-019 | REQ-009 | Foundation | Proof suite includes valid and invalid binding fixtures. |
| AC-020 | REQ-010 | Claude adapter | Compiler preserves binding identity and runtime settings. |
| AC-021 | REQ-010 | Claude adapter | Unsupported settings and manual drift fail closed. |
| AC-022 | REQ-011 | Codex adapter | Codex rendering is independent and deterministic. |
| AC-023 | REQ-011 | Codex adapter | Unsupported runtime version and tampering are rejected. |
| AC-024 | REQ-012 | Real fixtures | Harvested fixtures preserve authorized origin and starting revision. |
| AC-025 | REQ-012, REQ-013 | Fixtures/ledger | Replay isolation and treatment identity feed comparable ledger records. |
| AC-026 | REQ-013 | Ledger | Append-only writes reject conflicts and recover from interruption. |
| AC-027 | REQ-013, REQ-015 | Ledger/qualification | Accepted-task economics include failures and rework. |
| AC-028 | REQ-014 | Statistics | Reference vectors validate paired methods. |
| AC-029 | REQ-014 | Statistics | Supplied untrusted statistical proof is ignored. |
| AC-030 | REQ-014, REQ-015 | Statistics/qualification | Promotion quality and economic boundaries are recomputed. |
| AC-031 | REQ-015 | Production qualification | Production qualification remains evidence-bound and synthetic-free. |
| AC-032 | REQ-015 | Production qualification | Invalid incumbent cannot be retained. |
| AC-033 | REQ-016 | Discovery | Official discovery changes roster data only, not policy. |
| AC-034 | REQ-013, REQ-016 | Ledger/discovery | Benchmark methodology revisions are appended, not overwritten. |
| AC-035 | REQ-017 | Delegation | Worker scope, native execution and fresh review contract enforced. |
| AC-036 | REQ-017 | Delegation | Scope breach or risk escalation prevents acceptance. |
| AC-037 | REQ-017 | Delegation | Final artifact mutation invalidates previous review. |
| AC-038 | REQ-013, REQ-017 | Delegation/ledger | Dispatch failures remain auditable ledger outcomes. |
| AC-039 | REQ-018 | Shadow replay | Challenger shadow output never substitutes for incumbent work. |
| AC-040 | REQ-018 | Shadow replay | Destructive or irreversible shadow tasks are refused. |
| AC-041 | REQ-019 | Refresh | HOLD is emitted as a truthful refresh result. |
| AC-042 | REQ-019 | Refresh | Refresh verifies proposed output before local activation. |
| AC-043 | REQ-020 | Final proof | Offline end-to-end regression evidence covers all retained checks. |
| AC-044 | REQ-010, REQ-011, REQ-012, REQ-017, REQ-020 | Final proof/live | Live CLI subscription checks report objective results and blockers. |

## Repair Authority

Foreman owns integration and may assign repair tasks after upstream owners
finish. Repair authority may cross earlier implementation files only at safe
ownership boundaries needed to fix failing checks; it must preserve acceptance
evidence, schema contracts and generated-artifact lineage. Foundation repair may
adjust package/config/CLI/schema files because later owners depend on them.
Adapter repair may update generated-output validation but must not weaken
foundation policy. Runtime repair may inspect worker output and ledgers but must
not fabricate evidence or convert live blockers into success.

## Assumptions

- The v1 build is local-first, CI-grade and non-interactive.
- Local authenticated Claude and Codex CLIs are used only in later live
  verification and runtime work; no provider API keys or universal proxy are
  introduced.
- Official discovery is read-only metadata retrieval and cannot alter
  constitution thresholds.
- Initial policy thresholds are declared proposals, not empirical facts.
- Missing admissible evidence yields HOLD, INSUFFICIENT_EVIDENCE or escalation.
- Synthetic fixtures can test policy mechanics but cannot qualify production
  bindings.
- Optional UI is excluded from v1.

## Test Strategy

Use table-driven Vitest suites for schemas, policy mutation, evidence
admissibility, risk escalation, review independence, economics, selection,
expiry, forged bindings, ledger concurrency/recovery, paired statistics,
adapter drift and runtime dispatch. CLI tests import command handlers and later
exercise the built package entry point. Verification scripts must record
executed checks, exit status categories, artifact hashes and limitations.
Filters selecting zero tests are failures. `verify:v1` is offline and
`verify:v1:live` separately exercises available provider CLIs while reporting
blocked or insufficient-evidence states honestly.

## Verification Commands

The scaffold declares `npm test`, `npm run typecheck`, `npm run build`,
`npm run verify:v1`, and `npm run verify:v1:live`. Later proof commands must use
fresh non-interactive shell assumptions, JSON output where machine-read by
Foreman, and no GUI, external subjective judgment or provider traffic unless
the command is explicitly in the live lane.
