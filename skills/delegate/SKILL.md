---
name: delegate
description: Use automatically for implementation, bug fixes, planning, critical decisions, research, PDF analysis, source synthesis, mechanical edits and review. An economical coordinator does routine work directly and brings in the frontier model for plans, consequential decisions, hard bugs and fresh review of implemented behavior at medium risk or above. Simple edits still get a routing/audit decision. Exclude casual conversation, simple factual answers, creative drafting, voice-sensitive editing, and worker/reviewer packets.
---

# Delegate

Choose the least expensive complete path that preserves the requested quality, counting
coordination, execution, checks, repairs and review together. Direct execution by this session is
the default. Explicit user model choices and any restriction on delegation take precedence. Never
change saved models, permissions or configuration. If you were handed a worker, decision or reviewer
packet, execute it and return; do not coordinate.

## Roles

| Role | Claude Code | Codex |
| --- | --- | --- |
| Coordinator, this session | Sonnet | Terra, medium reasoning |
| Frontier | `fable` through the Agent tool | Astra, high reasoning |
| Optional workers | `sonnet` or `haiku` agents | Terra or Luna agents |

Read [hosts/claude-code.md](hosts/claude-code.md) or [hosts/codex.md](hosts/codex.md) once for the
actual launch controls. Bind roles to the models the host really serves. An observed substitution
rejects that treatment; never relabel it eligible.

## Route the work

Classify the assignment, then apply its row. Reclassify when evidence changes. Size, document
length, file type and source count never by themselves send work to the frontier.

| Work | Executes | Verifies |
| --- | --- | --- |
| Create or materially revise a plan | Frontier | Check sources, constraints and acceptance criteria; no second frontier call for a plan alone |
| Architecture, critical UI/UX, accessibility, security, data migration, public contracts, other consequential decisions | Frontier decides; settled implementation may return to the coordinator | Fresh frontier review of implemented behavior |
| Hard bugs, races, unexplained failures, incident or performance diagnosis | Frontier by default; hand back only with reproduction, root cause, bounded correction and regression check in hand | Fresh frontier review of behavior-changing fixes, at any risk |
| Features, understood fixes, refactors, regression tests | Coordinator, or a bounded worker | Review tiers below |
| Research, PDF analysis, source comparison, synthesis | Coordinator or cheaper workers; volume or conflicting sources never justify frontier | Source, extraction, citation and calculation checks; a stable 10% sample gets a fresh economical audit |
| Mechanical edits, formatting, docs sync, cosmetic UI, inventories, running existing checks | Coordinator | Proportionate checks; a stable 10% sample gets a frontier audit |
| Unmatched work | Inspect briefly and record a routing reason; unresolved goes to frontier | The resulting row's rule |

A consequential choice that surfaces during research or implementation becomes a separate frontier
assignment with the decisive evidence attached. The frontier does not repeat bulk reading.

## Required review check

At intake, run `node <skill-folder>/scripts/local-learning.mjs check -` with JSON on stdin:

```json
{"task_id":"<host-task-id>:<assignment-id>","assignment":"implement_feature","work_type":"routine_implementation","risk":"low"}
```

Choose the ID once before checking, retain it in the conversation, and carry it through workers,
repairs and retries. Never regenerate it to change the sample. Use `specified_edit` for exact edits, `summarize_sources` for research,
`implement_fix` for fixes, `implement_feature` for features, or `frontier_decision` with its decision
work type. Use `implement_plan` with `work_type:"approved_execution"` for an accepted plan; omit risk or use `"unknown"` when unsure (both mean medium). Rerun only when scope, risk or
origin changes; consult the latest result before delivery. The command returns `review_requirement`
and the stable 10% audit selection. Follow that requirement; a required but unavailable review
blocks accepted completion. The command selects review, not execution or permission: the routing
and escalation rules still apply. Explicit user restrictions remain authoritative; report conflicts.

Carry `origin_work_type` in implementation handoffs: retain a consequential-decision or hard-bug
classification through every later label and repair. For example, an `approved_execution` originating
in `security_decision` still requires frontier review. Missing/unknown handoff origin requires review;
a known `planning`-only origin may use the low-risk tier. Set `implemented_behavior:true` for mixed
decision-and-implementation work and `independent_review:true` when explicitly requested. Never
clear an already-required review by renaming work or dropping its origin. This check needs no host,
model fields, artifact hashes, evidence files or saved outcome; its JSON stays in the conversation.

## Review tiers for implemented behavior

Declare the risk before you start and keep it honest. A small diff does not lower risk.

| Risk | Meaning | Verification |
| --- | --- | --- |
| Low | Reversible; covered by existing tests or a direct check; no security, data, contract or critical UI surface | Coordinator runs the checks and inspects the diff. A stable 10% sample keyed to the task ID also gets a fresh frontier review |
| Medium | User-visible behavior change or cross-module effect; partial coverage | Fresh frontier review, mandatory |
| High or critical | Security, auth, payments, data migration, public contracts, irreversible operations, production incidents | Frontier executes or decides, then fresh frontier review |

Unknown risk is medium. The 10% rate is a trial setting, not a proven quality threshold. Hard-bug
fixes, implementation of a consequential decision, and explicitly requested independent review of
implemented behavior always require frontier review.

## Escalate and repair

Two attempts without new evidence or measurable progress send eligible execution to the frontier.
Repairs go back to the executor with the concrete failure, the affected artifact, the expected
correction and the acceptance check; then retest and re-review where review is required. Two failed
repairs move the work to the frontier. Research and document failures use better tools or a cheaper
retry, or report the limitation; they never escalate on their own.

## Workers and reviewers

One worker by default, three concurrent at most, and only when workstreams are independent with
settled interfaces and disjoint ownership. A worker packet has five parts: the outcome with its
acceptance criteria, context paths, write ownership, constraints, and what to return. A reviewer gets
the requirements, the final artifact paths or diff, the checks that ran with their results, and
nothing from the executor's transcript. Reviewers answer PASS, REPAIR or BLOCKED with findings. Any
edit after a review invalidates it. Wait for every launched agent to finish; a launch acknowledgment
is not a result.

## Deliver

Inspect the actual artifact, not the summary. Run the repository's relevant checks. Report what was
done, which checks ran and their results, the review verdict when one was required, and any
limitation. Unknown usage stays unknown; never claim measured savings from inside a session.

## Optional evaluation tools

- Full `dispatch` provides model/evidence-bound routing for explicit evaluations; pass `host:"claude"` or `host:"codex"`. It does not replace the ordinary `check`.
- Outcome recording with `node <skill-folder>/scripts/local-learning.mjs complete -` is optional and only for explicit evaluations; see [local learning](local-learning.md). Usage is measured from host transcripts, not from inside the session.
- Evidence-qualified routing (`route`) is narrow and optional; the assignment must fit `route.scope` literally. See [pack format](pack-format.md).

Further reading when relevant: [context discipline](context-discipline.md), [worker contract](delegation-contract.md),
[task classes](task-classes.md), [parallel work](swarm-policy.md), [research](research.md),
[verification policy](verification-policy.md), [CLAUDE.md activation snippet](hosts/claude-md-snippet.md).
