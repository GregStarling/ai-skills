# MODEL GOVERNOR

## Mission

Build a model-governance and delegation system for Claude Code and Codex.

The system exists because frontier-model selection changes too quickly to encode model names directly into agent definitions, skills, or routing policy. New models, new effort levels, new pricing, benchmark methodology changes, deprecations, provider behavior changes, and better empirical evidence can all change which model is appropriate for a job.

The stable part of this system is therefore not the roster of models.

The stable part is the constitution governing how models earn jobs.

The system must discover available models, collect evidence, qualify candidates against explicit requirements, select the cheapest qualified candidate, create an auditable binding, validate that binding against the policy version that produced it, and render provider-specific Claude Code and Codex configuration as generated artifacts.

The model roster is mutable.

The decision rules are not.

---

# Read this before changing anything

These are the foundational rules of the project.

> **A new model can change the roster. It cannot change the constitution.**

> **Model IDs are data, never policy.**

> **Every numeric value used in a decision must be a measurement, a declared threshold, or an externally sourced fact with provenance.**

> **Every decision must identify the rules that produced it.**

> **No binding may be rendered unless the validator can prove that it satisfies the exact policy version it cites.**

> **A task class without an eval suite does not exist.**

Do not replace these principles with a weighted scoring framework, generalized LLM router, learned black-box router, or "confidence score."

This system deliberately values legibility over cleverness.

---

# The mistake that explains why this project exists

Put this story near the beginning of the README.

Artificial Analysis reported Claude Fable 5.1 at 66 on its Intelligence Index on September 1, 2026.

On September 7, 2026, Artificial Analysis changed the methodology to Intelligence Index v4.3, including changes such as Terminal-Bench v4 and AutomationBench-AA. Under the new methodology, the same model had a score of 53.

At first, we interpreted one number as wrong.

Both were valid.

The model had not changed. The measuring stick had.

That is the exact failure this repository is designed to prevent.

A model score without the benchmark name, benchmark version, methodology, configuration, date, and provenance is not sufficient evidence.

The project's first governance failure was caught while designing the governance system.

That anecdote belongs in the README because it explains the architecture better than marketing copy ever will.

---

# What we are building

The conceptual pipeline is:

```text
                         CONSTITUTION

        roles | task classes | risk | thresholds
        evidence | promotion | escalation | expiry

                              |
                              v

                       MODEL DISCOVERY

          exact IDs | availability | pricing | features
          effort levels | serving configuration

                              |
                              v

                       EVIDENCE LEDGER

           named benchmarks + versions + methodology
           local eval results
           paired challenger results
           production results
           cost per accepted task

                              |
                              v

                        QUALIFICATION

           hard eligibility and quality thresholds
                 never weighted scoring

                              |
                              v

                         SELECTION

                cheapest qualified candidate

                              |
                              v

                       bindings.lock

        exact candidate | evidence | rules fired
        rationale | policy version | expiry

                              |
                              v

                         VALIDATOR

            policy must mathematically and
            logically prove the binding

                              |
                  +-----------+-----------+
                  |                       |
                  v                       v

            CLAUDE ADAPTER           CODEX ADAPTER

                  |                       |
                  v                       v

           generated configs         generated configs
```

Provider-specific agent configuration is a build artifact.

Nobody manually edits generated model assignments.

If someone finds themselves manually changing a model name in a Claude agent or Codex config, the policy or build system has a gap.

---

# The critical separation

There are three different systems. Do not collapse them.

```text
DISCOVERY
What models and configurations exist?

QUALIFICATION
Which candidates demonstrably meet the requirements for which jobs?

ROUTING
Which qualified candidate should perform this specific task?
```

The model performing discovery must not have authority to redefine qualification rules.

The model performing qualification must not have authority to change the constitution.

The runtime orchestrator must not get to decide what "good enough" means.

Policy owns that.

---

# Repository layout

Use this shape unless the existing repository already has an obviously better equivalent.

```text
model-governor/
│
├── README.md
│
├── constitution/
│   ├── roles.yaml
│   ├── task-classes.yaml
│   ├── risk-policy.yaml
│   ├── evidence-policy.yaml
│   ├── qualification-policy.yaml
│   ├── promotion-policy.yaml
│   ├── escalation-policy.yaml
│   └── expiry-policy.yaml
│
├── schemas/
│   ├── roles.schema.*
│   ├── task-classes.schema.*
│   ├── model-record.schema.*
│   ├── evidence-record.schema.*
│   ├── candidate.schema.*
│   ├── binding.schema.*
│   └── decision-record.schema.*
│
├── evidence/
│   ├── models/
│   ├── benchmarks/
│   ├── pricing/
│   ├── local-evals/
│   ├── challenger-runs/
│   └── production-runs/
│
├── bindings/
│   └── bindings.lock
│
├── evals/
│   ├── fixtures/
│   ├── graders/
│   ├── promptfoo/
│   └── results/
│
├── src/
│   ├── policy/
│   ├── validator/
│   ├── classification/
│   ├── qualification/
│   ├── selection/
│   ├── statistics/
│   ├── ledger/
│   ├── discovery/
│   ├── render/
│   └── cli/
│
├── adapters/
│   ├── claude/
│   └── codex/
│
├── generated/
│   ├── claude/
│   └── codex/
│
└── tests/
    ├── policy/
    ├── validator/
    ├── classification/
    ├── qualification/
    ├── selection/
    ├── statistics/
    └── rendering/
```

If this is a TypeScript repository, prefer TypeScript, Zod or JSON Schema, Vitest, and a mature YAML parser.

If this is an established repository in another language, preserve the project's existing language unless there is a compelling technical reason not to.

Do not change stacks merely because this document mentions TypeScript.

---

# Build order

Do not build the refresh skill first.

Do not build model discovery first.

Do not build a fancy UI.

Do not start with Claude or Codex adapters.

The correct construction order is:

```text
1. Constitution

2. Schema + validator

3. Synthetic policy fixtures and pathological validator tests

4. Claude adapter

5. Codex adapter

6. Real evaluation fixtures harvested from actual work

7. Evaluation ledger and production ledger

8. Statistical challenger comparison

9. Model discovery and evidence ingestion

10. /refresh-models skill

11. Optional reporting/UI
```

The validator is the foundation.

Without it, everything else is YAML theater.

---

# Phase 1: Constitution

The constitution is human-owned.

Automated processes may read it.

Automated processes must never silently modify it.

Any change to constitution files should be treated like a code change and reviewed through Git.

## Roles

Start with a small role vocabulary.

Suggested initial roles:

```yaml
orchestrator:
  description: Owns decomposition, integration, escalation, and final acceptance.

implementer:
  description: Performs bounded implementation work.

reviewer:
  description: Independently evaluates work against requirements and evidence.

researcher:
  description: Retrieves, compares, and synthesizes information.

tester:
  description: Creates or executes verification artifacts.
```

Roles do not contain model IDs.

Roles should define job responsibilities, not model assignments.

## Task classes

Keep the taxonomy small.

Hard cap the first version at approximately eight task classes.

Suggested initial set:

```text
architecture_design
ui_implementation
bounded_backend
hard_debugging
mechanical_refactor
test_generation
repository_exploration
research_synthesis
```

Do not create a ninth class casually.

A task class may only exist if it has its own evaluation bucket.

This must be validator-enforced.

A class without evidence is just a label.

Labels eventually become routing by vibes.

## Constraints

Constraints are facts about a specific task that may affect eligibility.

Examples include:

```text
requires_vision
requires_browser
requires_terminal
requires_long_context
requires_specific_language
requires_specific_tool
requires_local_execution
requires_provider
maximum_latency
maximum_cost
privacy_requirement
context_window_requirement
```

Constraints are not task classes.

Do not create a new task class simply because a task requires vision or a long context window.

---

# Risk is categorical, not numeric

Never produce:

```yaml
risk_score: 0.82
```

That number cannot be defended and gives the orchestrator an incentive to call dangerous work `0.79`.

Risk categories must be derived from observable properties.

Use:

```text
low
medium
high
critical
```

Risk classification happens twice.

## Pre-dispatch risk

Classify from observable requirements before implementation.

Examples of signals:

```text
authentication
authorization
permissions
secrets
cryptography
payments
billing
database schema changes
data migration
destructive operation
irreversible operation
production infrastructure
public API changes
user data handling
dependency/security boundary
```

Policy determines which signals map to which categories.

## Post-implementation risk

Classify again from the actual returned diff and changed artifacts.

This is mandatory.

If the worker was assigned a low-risk refactor but actually changed authentication or a schema migration, the post-change risk category must increase automatically.

Final review requirements are based on:

```text
max(pre_dispatch_risk, post_change_risk)
```

A worker cannot evade review requirements because the original ticket looked harmless.

## Risk classification must be auditable

A classification should look like:

```yaml
classification:
  role: implementer
  task_class: bounded_backend
  risk: medium

facts:
  - modifies_public_api
  - stays_within_existing_module
  - no_schema_change
  - acceptance_tests_exist

rules_fired:
  - PUBLIC_API_CHANGE_IS_AT_LEAST_MEDIUM
  - EXISTING_MODULE_WITH_EXPLICIT_SCOPE_IS_BOUNDED_BACKEND
```

Not:

```yaml
confidence: 0.87
```

There should be no confidence float.

---

# Candidate identity

The candidate is not merely the model.

The candidate is at minimum:

```text
model snapshot
× effort level
× materially relevant serving configuration
```

Represent candidates explicitly.

Example:

```yaml
provider: anthropic
model_id: claude-fable-5-1
effort: xhigh

serving:
  fallback: enabled
```

This is a different experimental treatment from:

```yaml
provider: anthropic
model_id: claude-fable-5-1
effort: high

serving:
  fallback: enabled
```

and potentially from:

```yaml
provider: anthropic
model_id: claude-fable-5-1
effort: xhigh

serving:
  fallback: disabled
```

Effort must be part of candidate enumeration.

Do not compare Astra against Fable while ignoring that the optimal Fable candidate may be one reasoning level lower.

Do not explode the candidate space with meaningless provider parameters.

A serving dimension belongs in candidate identity only when there is evidence or strong provider documentation that it materially changes capability, cost, latency, or which underlying model may answer.

---

# Model IDs must be pinned snapshots

Generated production bindings use exact model IDs.

Do not use evergreen aliases such as:

```text
fable
opus
latest
recommended
```

if the provider exposes a stable canonical ID for the model release.

The refresh process is the only path by which a new model replaces an incumbent.

The runtime must not silently upgrade models behind the governor's back.

Document one nuance:

A fixed model ID stabilizes model weights/version identity, but provider serving infrastructure may still change.

Examples could include:

```text
routing infrastructure
safety classifiers
sampling implementation
fallback behavior
caching behavior
serving infrastructure
```

This is one reason production shadow comparison remains useful even when the bound model ID does not change.

---

# Evidence ledger

The evidence ledger stores observations.

It does not store synthesized opinions disguised as measurements.

Good evidence:

```yaml
source: own_eval
suite: bounded_backend
suite_version: 17
git_commit: 83ac4ef

candidate:
  provider: openai
  model_id: example-model-id
  effort: medium

attempted: 50
passed: 47
total_cost_usd: 6.82
median_latency_ms: 74120

grader:
  type: deterministic
  version: 4
```

Good external evidence:

```yaml
source: artificial_analysis
benchmark: intelligence_index
benchmark_version: "4.3"
methodology_version: "4.3"
score: 53
measured_at: 2026-09-07
source_url: ...
retrieved_at: ...
```

Bad evidence:

```yaml
coding_quality: 0.97
reasoning: 0.94
confidence: 0.91
```

Do not create universal per-model capability scalars.

Do not create a single "model quality score."

Do not normalize unlike benchmarks into one magic number.

If a number cannot be traced to a measurement, declaration, or external fact, the schema should not accept it.

---

# Evidence provenance

Every external benchmark record should preserve enough information to explain what was actually measured.

Where available, record:

```text
benchmark name
benchmark version
dataset version or commit SHA
methodology version
model ID
effort setting
tool configuration
fallback configuration
date measured
source URL
date retrieved
score
sample size
reported confidence interval
provider or evaluator notes
```

Do not treat:

```text
Fable scored 66
```

as equivalent to a proper evidence record.

Benchmark-version changes must create new records, never overwrite prior measurements.

Historical evidence matters.

---

# Provider fallback contamination

Record whether the requested model necessarily produced all output.

If a benchmark or provider configuration permits server-side fallback, capture that fact.

Example:

```yaml
requested_model: claude-fable-5-1

serving:
  fallback_enabled: true
  known_fallback_models:
    - claude-opus-example
  observed_fallback_share:
    value: 0.04
    source: evaluator_report
```

Do not silently attribute a benchmark to a single model when some output was served by another model.

Evidence policy may declare that some roles permit fallback-contaminated benchmark evidence and others do not.

---

# Evidence admissibility

Evidence policy determines what evidence may qualify a candidate for a role/task class.

Example concept:

```yaml
bounded_backend:
  primary_evidence:
    - own_suite/bounded_backend

  supporting_evidence:
    - SWE-bench Pro
    - Terminal-Bench

  vendor_self_reported:
    permitted_as: metadata_only
```

Provider marketing benchmarks may inform investigation.

They should not independently qualify a model.

Independent benchmarks are evidence.

They are not the constitution.

Our own evals matter more because they measure our actual work.

---

# Evaluation fixtures

There are two different kinds of fixtures.

Do not confuse them.

## Policy fixtures

Build these immediately.

These are synthetic.

Their job is to prove that policy and validator logic behave correctly.

Examples:

```text
challenger costs 19% more when policy allows 15% -> reject

critical reviewer same family as implementer -> reject

expired binding beyond hard expiry -> reject

task class has no eval bucket -> reject

binding cites nonexistent policy version -> reject

model alias instead of pinned snapshot -> reject

candidate passes quality but exceeds cost ceiling -> reject

candidate fails required tool support -> reject

cheaper candidate clears quality bar -> expensive candidate must not win
```

## Model evaluation fixtures

Build these later.

These should come from real tasks we have actually delegated.

Do not invent synthetic "coding benchmark" puzzles unless necessary.

Harvest tasks from actual work.

Each task should include:

```text
original task
starting repository state or fixture
allowed scope
forbidden scope
acceptance criteria
objective checks
expected artifacts
risk signals
task class
role
constraints
```

Prefer machine grading.

Use:

```text
tests
typecheck
lint
runtime checks
expected file changes
forbidden file changes
API compatibility
snapshot comparison
browser assertions
structured output checks
```

Use an LLM judge only where objective grading is genuinely impractical.

---

# Evaluation suite size

Do not hard-code "50 examples is enough."

Sample size should be driven by the promotion rule and statistical power.

A 47/50 pass result sounds impressive, but a 3-point challenger advantage at that sample size may easily be noise.

Small margins should not cause promotion merely because the point estimate is higher.

The evaluator should support a state equivalent to:

```text
QUALIFIED
PROMOTE
RETAIN_INCUMBENT
INSUFFICIENT_EVIDENCE
```

"Insufficient evidence" is a valid and important result.

---

# Challenger comparison must be paired

Whenever practical, incumbent and challenger should be run on the same task.

Example:

```text
Task 1847

incumbent:
  Terra medium
  PASS
  $0.061

challenger:
  Sol low
  PASS
  $0.117
```

This gives us paired evidence.

Use the paired data rather than comparing two unrelated leaderboard averages.

For binary success/failure outcomes, use a statistically appropriate paired method.

A reasonable implementation is:

```text
exact McNemar-style paired analysis for discordant pass/fail outcomes
plus a paired confidence interval or paired bootstrap for observed quality delta
```

Document the method.

Do not bury statistical logic in prompt prose.

Put it in code and test it.

---

# Promotion has two different cases

This distinction is important.

## Case A: challenger costs more

A more expensive challenger must prove meaningful superiority.

Conceptually:

```text
quality improvement clears declared superiority margin
AND
lower confidence bound clears required improvement threshold
AND
cost increase stays below allowed ceiling
```

Example policy shape:

```yaml
more_expensive_challenger:
  require_superiority: true
  minimum_quality_improvement: 0.03
  maximum_cost_increase: 0.15
```

The numbers above are examples of declared policy values, not universal truths.

They belong in constitution files.

## Case B: challenger is cheaper

A cheaper challenger does not need to outperform the incumbent.

It needs to prove non-inferiority while delivering the required economic gain.

Conceptually:

```text
challenger clears absolute quality bar
AND
quality delta lower bound stays within non-inferiority margin
AND
cost per accepted task improves enough
```

Example:

```yaml
cheaper_challenger:
  require_non_inferiority: true
  non_inferiority_margin: 0.01
  minimum_cost_improvement: 0.20
```

Again, these are declared policy values.

The system must not invent them dynamically.

This rule is necessary because:

> cheapest qualified candidate

is incompatible with requiring every cheaper model to beat the incumbent by three quality points.

---

# Economics

Do not route primarily on token price.

The routing economic metric is:

```text
cost per accepted task
```

or, where paired production data exists:

```text
paired cost per accepted task
```

Token pricing belongs in the evidence ledger because it helps explain cost.

It is not sufficient for routing.

Agentic models can use drastically different token volumes.

Caching can dominate economics.

Retries matter.

Failed work matters.

Review and rework matter.

A cheap token can produce an expensive task.

Track where possible:

```text
input tokens
cached input tokens
output tokens
tool calls
provider-reported cost
wall-clock latency
worker retries
review retries
accepted/rejected
frontier rework
final task success
```

Then calculate actual cost per accepted task from measurements.

Normalize comparisons by:

```text
same task class
same role
same risk category
same relevant constraints
```

Do not compare Astra's cost on architecture work with Terra's cost on mechanical refactors and conclude Terra is 90% cheaper.

---

# Production challenger replay

Do not send 5% of real production work exclusively to an unproven challenger.

Use shadow replay when safe.

Concept:

```text
production task
       |
       +---- incumbent -> result may be used
       |
       +---- challenger -> isolated result discarded
                                |
                                v
                              grade
```

For code, use separate worktrees or equivalent isolated environments.

Never shadow tasks that can perform destructive or irreversible actions.

Sampling can vary by cost/risk class.

For example, policy may allow more shadowing for cheap bounded tasks and almost none for expensive work.

The exact sampling rates belong in policy, not prompt judgment.

Shadow results feed the evidence ledger.

Over time, the production ledger should become more important than public benchmarks.

The long-term competitive advantage of this system is not knowing which model leads SWE-bench.

It is knowing which model and effort setting performs best on the work we actually delegate.

---

# Selection algorithm

Do not use weighted scoring.

No:

```text
quality * 0.7
cost * 0.4
latency * 0.2
= magic score
```

Use a decision ladder.

```text
1. Enumerate candidates

2. Remove unavailable candidates

3. Apply hard capability/constraint eligibility

4. Apply evidence admissibility

5. Apply absolute quality thresholds

6. Apply risk/review independence requirements

7. Among qualified candidates, compare economics

8. Apply incumbent/challenger promotion rules

9. Select candidate or retain incumbent

10. Generate decision record

11. Validate

12. Bind
```

The default selection principle is:

> **Choose the cheapest candidate that demonstrably clears the required bar.**

The frontier model is not automatically the best worker.

The newest model is not automatically the best worker.

The model with the highest public benchmark score is not automatically the best worker.

---

# Decision records

Every routing/binding decision must be explainable without chain-of-thought.

Example:

```yaml
task_id: 84721

classification:
  role: implementer
  task_class: bounded_backend
  risk: low

constraints:
  requires_terminal: true
  language: typescript

requirements:
  own_suite_minimum: 0.90
  max_cost_per_accepted_task_usd: 0.10

candidates_considered:
  - model_id: ...
    effort: ...
  - model_id: ...
    effort: ...
  - model_id: ...
    effort: ...

selected:
  model_id: ...
  effort: medium

rules_fired:
  - MODEL_AVAILABLE
  - REQUIRED_TOOLS_SUPPORTED
  - OWN_SUITE_THRESHOLD_PASSED
  - COST_CEILING_PASSED
  - CHEAPEST_QUALIFIED_CANDIDATE
  - INCUMBENT_PRESERVED

escalate_if:
  - ACCEPTANCE_TESTS_FAIL_TWICE
  - ARCHITECTURAL_DECISION_REQUIRED
  - REQUESTED_SCOPE_EXCEEDED
  - WORKER_REPORTS_UNRESOLVED_AMBIGUITY
```

Do not add:

```yaml
confidence: 0.91
```

If we cannot explain a decision through rules and evidence, fix the policy or evidence.

---

# Escalation

Down-routing is safe only if escalation is explicit.

Escalation criteria belong in the decision record, not merely inside a prompt.

Examples:

```text
acceptance tests fail twice
worker requests architectural judgment
worker modifies files outside scope
worker encounters requirement ambiguity
post-change risk increases
security-sensitive code encountered unexpectedly
public API change discovered
migration becomes destructive
reviewer rejects implementation
provider/model unavailable
```

The worker must have a formal `ESCALATE` path.

A worker should never invent architecture merely because it feels obligated to complete the assignment.

Worker behavior should follow:

```text
execute bounded assignment

do not redesign surrounding system

do not expand scope

do not reinterpret architecture

if required judgment exceeds assignment authority:
    ESCALATE
```

---

# Review independence

Review policy depends on categorical risk.

Suggested conceptual structure:

```text
LOW
fresh/separate context preferred
separate model optional

MEDIUM
separate model required
different family preferred

HIGH
separate model required
different family strongly preferred or required by policy

CRITICAL
frontier reviewer required
different family required
fresh context required
```

The exact mapping belongs in `risk-policy.yaml`.

## Critical fresh-context requirement

A critical reviewer must not inherit the planning/implementation conversation.

Fresh context may receive:

```text
task specification
acceptance criteria
relevant source files
resulting diff
tests
runtime evidence
known constraints
```

Fresh context must not receive:

```text
implementer chain/context
orchestrator reasoning transcript
prior review conclusion
persuasive narrative about why the implementation is correct
```

Give the reviewer the evidence, not the story.

## Family definition

Make `family_id` explicit enough for validation.

Do not infer model independence casually.

For critical review, take a conservative interpretation.

If family independence cannot be established confidently from provider/model metadata, treat candidates from the same provider/model lineage as non-independent.

It is acceptable for the first version to require cross-provider review for critical tasks if that is the only robust way to enforce independence.

Document the rule.

Do not let an LLM dynamically decide whether two models "feel independent."

---

# No qualifying independent reviewer

Critical-review policy must fail loudly.

If policy says:

```text
different family required
```

and no qualifying reviewer exists, the system must return:

```text
ESCALATION_REQUIRED
```

Do not silently weaken the policy.

---

# bindings.lock

`bindings.lock` is machine-generated.

Humans may inspect it.

Humans should not edit it.

A binding should contain enough information to reproduce and audit the decision.

Conceptual example:

```yaml
schema_version: 1
policy_version: 7

generated_at: 2026-09-09T18:40:00Z
refresh_due_at: 2026-09-16T18:40:00Z
hard_expiry_at: 2026-09-30T18:40:00Z

bindings:

  bounded_backend:
    implementer:

      candidate:
        provider: openai
        model_id: exact-snapshot-id
        effort: medium

      requirements:
        own_suite_minimum: 0.90

      evidence_refs:
        - evidence/local-evals/...
        - evidence/production-runs/...

      rules_fired:
        - MODEL_AVAILABLE
        - OWN_SUITE_THRESHOLD_PASSED
        - CHEAPEST_QUALIFIED_CANDIDATE
        - INCUMBENT_PRESERVED

      escalation_rules:
        - ACCEPTANCE_TESTS_FAIL_TWICE
        - ARCHITECTURAL_DECISION_REQUIRED
```

No synthesized confidence number.

No hand-written rationale that contradicts policy.

The rule IDs are the rationale.

---

# Binding validation

This is one of the most important parts of the entire project.

A binding must be rejected if it does not satisfy the exact constitution version it cites.

Do not trust the process that generated the binding.

Validate the output independently.

Pipeline:

```text
validate constitution
        ↓
validate evidence
        ↓
qualify candidates
        ↓
generate proposed binding
        ↓
validate binding against cited policy
        ↓
render provider config
        ↓
validate rendered provider config
        ↓
commit
```

The second policy validation is mandatory.

It should catch bugs like:

```text
policy:
  max cost increase = 15%

binding:
  challenger cost increase = 19%
  recommendation = PROMOTE
```

That build must fail.

No human should need to notice the contradiction.

---

# Validator tests

Before building adapters, construct a large table of pathological cases.

At minimum test:

```text
unknown role -> reject

unknown task class -> reject

task class exists but has no eval bucket -> reject

unknown policy version -> reject

binding cites newer/older incompatible policy -> reject

model alias where pinned ID required -> reject

candidate lacks required tool -> reject

candidate quality below threshold -> reject

candidate exceeds absolute cost ceiling -> reject

more expensive challenger fails superiority threshold -> reject

more expensive challenger exceeds permitted cost increase -> reject

cheaper challenger fails non-inferiority -> reject

cheaper challenger clears non-inferiority and cost rule -> eligible

critical reviewer same family -> reject

critical reviewer lacks fresh-context flag -> reject

risk upgraded post-diff but review policy not upgraded -> reject

binding expired beyond hard expiry -> reject

stale-but-not-hard-expired binding -> explicit STALE state

evidence missing benchmark version -> inadmissible if policy requires version

external score lacks provenance -> inadmissible

fallback-contaminated evidence used where prohibited -> reject

same model at different effort -> treated as distinct candidates

different serving configurations -> treated as distinct when declared material

decision contains synthesized confidence field -> schema reject if we decide to forbid it entirely

rendered model does not match binding -> reject
```

Add more.

The validator should be harder to fool than the generator.

---

# Expiry

Bindings have three runtime states.

```text
VALID
Normal operation.

STALE
Refresh due has passed.
Automatic reselection is not allowed.
Existing binding may continue only if policy permits.
Emit visible warning.

INVALID
Hard expiry passed, model unavailable, model retired,
policy incompatible, or critical evidence invalidated.
Delegation blocked until refresh or explicit human override.
```

Different roles may have different expiry windows.

Frontier/security-critical roles may have shorter refresh windows.

Routine repository search can tolerate longer windows.

These windows belong in policy.

Do not let an LLM choose them ad hoc.

---

# Claude adapter

Build the Claude adapter before the Codex adapter.

The adapter is a compiler.

It does not contain routing policy.

Inputs:

```text
validated bindings.lock
Claude runtime/template definitions
```

Outputs:

```text
generated Claude Code skills/agents/config
```

The adapter should use exact pinned IDs from the binding.

Keep shared skill policy content separate from provider-specific rendering where practical.

Expected conceptual shape:

```text
.claude/
  skills/
    delegate/
      SKILL.md

  agents/
    generated-worker-*.md
    generated-reviewer-*.md
```

Do not assume this exact shape without inspecting the currently installed Claude Code conventions.

The adapter should encode whatever the current runtime expects while preserving our internal schema.

Claude runtime changes should require adapter changes, not constitution changes.

---

# Codex adapter

Build this after Claude.

Codex's subagent/runtime configuration is expected to evolve more quickly.

Treat the Codex adapter as a compatibility layer.

Inputs:

```text
validated bindings.lock
current Codex configuration/runtime capabilities
```

Outputs:

```text
generated Codex skills
generated role configs
generated subagent model configuration
```

Do not put Codex-specific semantics into the constitution.

Do not redesign the constitution merely because Codex changes config shape.

If Codex changes next month, update the adapter.

That is why the adapter exists.

---

# Skills

Eventually expose at least:

```text
/delegate
/refresh-models
```

## /delegate

The delegation skill should:

```text
classify role
classify task class
derive pre-dispatch categorical risk
collect constraints
resolve current validated binding
create bounded assignment
dispatch
inspect returned evidence
derive post-change categorical risk
apply required review
accept, retry, or escalate
record production outcome
```

The skill does not choose a model by vibes.

It consumes the binding.

## Worker assignment contract

Every worker should receive something equivalent to:

```text
GOAL

SCOPE

ALLOWED FILES / SYSTEMS

FORBIDDEN CHANGES

ACCEPTANCE CRITERIA

RISK CONSTRAINTS

RETURN FORMAT

ESCALATION CONDITIONS
```

Example:

```text
Goal:
Implement refresh-token rotation.

Scope:
src/auth/token-service.ts
src/auth/token-service.test.ts

Do not:
Change database schema.
Change public API.
Touch UI.

Acceptance:
Existing auth tests pass.
New reuse-detection test passes.
Typecheck passes.

Return:
Files changed.
Tests executed.
Acceptance results.
Remaining uncertainty.

Escalate if:
Schema changes appear necessary.
Public API must change.
Security assumptions are ambiguous.
```

The frontier model's highest-value job is turning ambiguous work into assignments weaker models can execute reliably.

---

# /refresh-models

Build this last.

It should be boring by design.

It does not contain hidden judgment.

It orchestrates already-defined policy.

Conceptually:

```text
discover currently available candidates
        ↓
collect official metadata
        ↓
collect admissible external evidence
        ↓
identify missing local eval evidence
        ↓
run required evals
        ↓
compare against incumbents
        ↓
apply promotion/non-inferiority policy
        ↓
generate proposed bindings
        ↓
VALIDATE
        ↓
render adapters
        ↓
VALIDATE RENDERED OUTPUT
        ↓
emit diff
```

The refresh system must never silently modify constitution files.

---

# Model discovery

Eventually discover from official provider APIs and documentation.

For each provider collect, where available:

```text
exact canonical model ID
release date
availability
deprecation state
supported modalities
tool support
context limits
effort/reasoning options
pricing
cache pricing
known serving/fallback behavior
provider release notes
model/system cards
```

Official provider sources are authoritative for:

```text
what exists
what IDs mean
pricing
supported API/runtime features
deprecation
documented serving behavior
```

Official provider benchmark claims are evidence, not automatic qualification.

---

# External research

External evidence may include sources such as:

```text
Artificial Analysis
Terminal-Bench
SWE-bench / SWE-bench Pro
other relevant independent evaluations
```

Do not hard-code this list as permanent.

Evidence sources evolve too.

Each evidence source must have provenance and methodology information.

Never import a leaderboard row without enough metadata to distinguish methodology revisions.

---

# Promptfoo

Use Promptfoo or equivalent where it provides useful cross-provider evaluation infrastructure.

It belongs in the eval system.

It does not need to sit in the production delegation hot path.

Production Claude-to-Claude delegation should use Claude Code's native mechanisms where appropriate.

Production Codex-to-OpenAI delegation should use Codex's native mechanisms where appropriate.

Cross-provider production delegation may use explicit CLI bridges where necessary.

Avoid introducing a universal proxy into the production path merely for architectural elegance.

Evaluation plumbing and production plumbing do not need to be identical.

---

# Real production metrics

When the system begins operating, record enough data to answer:

```text
How often does this candidate succeed on the first attempt?

How often is frontier rework required?

How often does it escalate?

How often does review reject it?

How much does an accepted task actually cost?

How long does an accepted task actually take?

Which task classes does it outperform on?

At what effort level does quality stop improving enough to justify cost?
```

This private production ledger should eventually outweigh generic leaderboards for routing decisions.

---

# Generated artifacts

Generated provider configs should have a clear header such as:

```text
GENERATED FILE
Source: bindings/bindings.lock
Policy version: 7
Do not edit manually.
Run the renderer instead.
```

Consider hashing or otherwise recording the source binding so drift can be detected.

A CI test should fail if:

```text
binding says model A
generated config contains model B
```

or if generated files have been manually modified without regeneration.

---

# CLI

Do not build every command immediately, but design toward a small deterministic CLI.

Likely commands:

```text
model-governor validate-policy

model-governor validate-evidence

model-governor validate-binding

model-governor classify

model-governor qualify

model-governor compare

model-governor render claude

model-governor render codex

model-governor status

model-governor discover

model-governor refresh
```

`validate-*` commands come first.

`refresh` comes last.

---

# First implementation milestone

Do not attempt to produce a working multi-model router in milestone one.

Milestone one is successful when all of the following are true:

```text
constitution files exist

schemas exist

validator can load constitution

validator can load synthetic evidence

validator can load synthetic candidate sets

validator can generate or inspect proposed bindings

validator rejects policy violations

validator accepts valid bindings

policy tests cover pathological cases

no runtime adapter is required for these tests

no live provider calls are required

no model IDs are embedded in policy files
```

At the end of milestone one, show me:

```text
repository tree

constitution files

schemas

validator architecture

test matrix

test results

three example valid bindings

at least ten intentionally invalid binding examples and why each failed
```

Do not proceed to adapter work until milestone one is sound.

---

# Second milestone

Claude adapter.

Success means:

```text
a validated binding can deterministically render Claude config

pinned model IDs are used

effort configuration is preserved

roles/task classes remain provider-independent

generated files contain source metadata

changing a binding changes generated output

changing generated output manually is detectable

Claude-specific runtime changes do not require constitution changes
```

---

# Third milestone

Codex adapter.

Same requirements as Claude, plus extra care around Codex runtime/config churn.

Do not generalize prematurely.

It is acceptable for the Claude and Codex adapters to be different internally.

The shared contract is `bindings.lock`, not identical implementation code.

---

# Fourth milestone

Create real eval fixtures.

Seed them from actual delegated coding/research tasks, not invented toy problems.

Start with enough examples to exercise each task class.

Do not promote models based on an arbitrary minimum sample count.

Build the statistical machinery needed to determine when evidence is sufficient.

---

# Fifth milestone

Build evidence ledger, paired challenger comparison, and model qualification.

At this point the system should be able to answer:

```text
Which candidates qualify for bounded_backend?

Why?

Which evidence established that?

What candidate is cheapest per accepted task?

Is the challenger statistically superior?

Is the cheaper challenger statistically non-inferior?

Is there enough evidence to change the incumbent?

Which exact rules fired?
```

---

# Sixth milestone

Build discovery and `/refresh-models`.

Only now does automated discovery become useful.

The refresh system must output a human-readable diff.

Example:

```text
ROLE/TASK:
bounded_backend / implementer

INCUMBENT:
model X, medium effort

CHALLENGER:
model Y, low effort

WHY CHALLENGER WAS EVALUATED:
new canonical model discovered 2026-10-03

ELIGIBILITY:
passed

LOCAL EVAL:
passed

PAIRED PRODUCTION EVIDENCE:
insufficient

ECONOMICS:
27% cheaper per accepted task

PROMOTION POLICY:
requires non-inferiority evidence

DECISION:
HOLD

REASON:
insufficient paired sample to establish non-inferiority
```

"HOLD" is a good result.

The system's purpose is not to change models frequently.

Its purpose is to make justified changes when evidence warrants them.

---

# Things you must not do

Do not:

```text
hard-code today's preferred models in constitution files

create global quality scores

create model "confidence" scores

use weighted-sum routing

let newest automatically win

let highest leaderboard score automatically win

let vendor benchmark claims independently qualify a model

let refresh change the constitution

let runtime aliases silently upgrade pinned bindings

let the orchestrator weaken risk classification without observable evidence

let a critical reviewer inherit the implementation conversation

allow an invalid binding to render

manually repair generated configs instead of fixing source policy/adapters

add task classes without eval buckets

assume 50 test cases proves a 3-point advantage

compare cost across different task classes as though it were causal

route purely on token price

put LiteLLM or another proxy in the production path unless a concrete requirement demands it

build a UI before the validator works
```

---

# Things you may challenge

The architecture is settled, but implementation details are not sacred.

You may challenge:

```text
language/library choices

file naming

schema technology

statistical implementation details

CLI library

test framework

serialization format

adapter internals

Promptfoo integration details

storage format for large production ledgers
```

If you challenge one, give a concrete engineering reason.

Do not reopen the constitutional principles merely because another architecture is fashionable.

---

# How to handle uncertainty

If current Claude Code or Codex behavior is uncertain, inspect the installed runtime and current official documentation.

Do not rely on a months-old example from this handoff.

The entire point of this project is that runtime details change.

Verify:

```text
current skill locations
current agent configuration shape
current subagent mechanisms
current model ID semantics
current effort settings
current CLI flags
current config precedence
```

Then isolate those details in the adapter.

---

# Desired engineering style

Prefer boring code.

Prefer deterministic code.

Prefer explicit schemas.

Prefer pure functions for policy evaluation.

Prefer rule IDs over prose.

Prefer tests demonstrating policy behavior.

Prefer an append-only evidence history over mutable "current scores."

Prefer generated artifacts over duplicated configuration.

Prefer failing loudly over silently weakening requirements.

Prefer `INSUFFICIENT_EVIDENCE` over pretending uncertainty does not exist.

The system should be legible enough that six months later we can answer:

> Why was this model chosen for this role on this date?

without asking an LLM to reconstruct the answer.

---

# Suggested internal abstractions

The following concepts should probably exist explicitly in code:

```text
Role

TaskClass

RiskCategory

ConstraintSet

ModelSnapshot

ServingConfiguration

Candidate

EvidenceRecord

EvidenceReference

QualificationRule

PromotionRule

EscalationRule

ExpiryPolicy

ClassificationResult

QualificationResult

CandidateComparison

DecisionRecord

Binding

BindingState

ProviderAdapter
```

Avoid an enormous generic `ModelScore` object.

That abstraction is intentionally absent.

---

# Rule IDs

Use stable rule identifiers.

Examples:

```text
TASK_CLASS_REQUIRES_EVAL_BUCKET

PINNED_MODEL_ID_REQUIRED

MODEL_MUST_BE_AVAILABLE

REQUIRED_TOOL_SUPPORT

LOCAL_EVAL_THRESHOLD

EVIDENCE_VERSION_REQUIRED

FALLBACK_EVIDENCE_PROHIBITED

CHEAPEST_QUALIFIED_CANDIDATE

MORE_EXPENSIVE_CHALLENGER_REQUIRES_SUPERIORITY

CHEAPER_CHALLENGER_REQUIRES_NON_INFERIORITY

CRITICAL_REVIEW_REQUIRES_DIFFERENT_FAMILY

CRITICAL_REVIEW_REQUIRES_FRESH_CONTEXT

POST_CHANGE_RISK_ESCALATION

BINDING_POLICY_VERSION_MATCH

BINDING_REFRESH_DUE

BINDING_HARD_EXPIRED
```

Stable rule IDs make decisions easy to audit and test.

---

# Policy versioning

Constitution changes increment a policy version.

Every binding records the exact policy version that produced it.

Evidence is not rewritten merely because policy changes.

A policy change may invalidate an existing binding.

The validator determines compatibility.

Do not silently reinterpret an old binding under a new constitution.

---

# Overrides

If you implement overrides, make them explicit and ugly.

An override should require:

```text
who/what requested it
reason
timestamp
expiration
binding being overridden
rule being overridden
```

Overrides must expire.

Do not create a hidden "force=true" path that permanently bypasses governance.

Overrides belong in the audit trail.

---

# Fresh-context review implementation

Treat fresh review as an actual context boundary.

Do not merely tell the same ongoing agent:

```text
forget what you know and review independently
```

That is not fresh context.

Spawn a genuinely new context/session/subagent as supported by the runtime.

Pass only the admissible review package.

---

# Final design test

Before considering the architecture complete, ask whether this hypothetical sequence works without changing constitution files:

```text
October:
new Anthropic model launches

November:
new OpenAI model launches

December:
Anthropic changes pricing

January:
an external benchmark changes methodology

February:
one bound model is deprecated

March:
production data shows a lower-effort candidate is equally good and cheaper

April:
Codex changes subagent config syntax

May:
Claude Code changes agent frontmatter
```

Expected answer:

```text
new models -> discovery/evidence/bindings

new pricing -> evidence/economics/bindings

benchmark methodology -> new evidence record

deprecation -> binding validity

lower effort wins -> qualification/promotion/binding

Codex config change -> Codex adapter

Claude config change -> Claude adapter
```

None of these should require rewriting the constitution unless our actual philosophy about delegation changes.

That is the architectural test.

---

# Immediate instruction

Start with Phase 1 only.

Inspect the repository.

Create or propose the constitution, schemas, validator architecture, and synthetic policy test suite.

Do not implement live model discovery.

Do not build `/refresh-models`.

Do not build provider adapters yet.

Do not hard-code current model preferences into policy.

Before writing substantial code, produce a short implementation plan showing:

```text
files to create
core types
validator stages
policy test strategy
assumptions
anything in the existing repository that materially affects the design
```

Then implement Phase 1.

Run the tests.

Show failures rather than hiding them.

When Phase 1 passes, summarize exactly what constitutional invariants are now enforced in code.

The architecture is not successful because the YAML looks sensible.

It is successful when invalid decisions cannot compile.
