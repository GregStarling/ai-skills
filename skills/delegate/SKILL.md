---
name: delegate
description: >-
  Routes substantive work to the least expensive path that keeps the requested
  quality. This session does routine work directly; a frontier model takes
  plans, consequential decisions, hard bugs and required reviews; a bundled
  check decides which review is mandatory. Use automatically at the start of
  implementation, bug fixes, planning, consequential decisions, research, PDF
  or source analysis, review, and mechanical edits (which still get a routing
  and audit decision), alongside any task-specific skill. Do not use for
  casual conversation, simple factual answers, creative drafting,
  voice-sensitive editing, or when executing a worker or reviewer packet.
---

# Delegate

Choose the least expensive complete path that preserves the requested quality, counting
coordination, execution, checks, repairs and review together. Direct execution by this session is
the default. The user's current model choices and restrictions on delegation take precedence. Never
change saved models, permissions or configuration. If you were handed a worker, decision or reviewer
packet, execute it and return; do not coordinate.

## Roles

| Role | Claude Code | Codex |
| --- | --- | --- |
| Coordinator, this session | `sonnet` | `gpt-6.1-sol`, medium reasoning |
| Primary frontier: plans, decisions, hard bugs and reviews | `opus` (Opus 5.5) through the Agent tool | `gpt-6.1-sol`, high reasoning |
| Rescue for a stuck build | Stay on Opus 5.5; never Fable | `gpt-6-astra`, high reasoning, only under the rescue conditions below |
| Optional workers | `sonnet` or `haiku` agents | `gpt-6.1-sol` or `gpt-6-luna` agents |

Where GPT-6.1 Sol is not enabled for the account, coordinate on `gpt-6-sol` and use `gpt-6-luna` workers.
An unavailable primary frontier is a blocker; it does not authorize Astra or Fable as a fallback.

Frontier is a role, not a requirement to switch model families. A separate GPT-6.1 Sol agent at
high reasoning handles normal Codex frontier work, even when Sol also coordinates. Required
independent review still needs a fresh context; reviewing your own work in the same context does
not satisfy it. Risk, task size, planning, hard-bug classification, audits and review requirements
never by themselves authorize Astra. Never select Fable for any role, fallback, retry or review.

An explicit role binding in the user's global CLAUDE.md or AGENTS.md, such as
`Delegate frontier: <model>`, can override this table within the user's current model policy.
Older bindings, inherited defaults and routing-pack entries cannot re-enable Fable or bypass the
Astra rescue conditions. The CLAUDE.md activation snippet only mirrors this table. Read
[hosts/claude-code.md](hosts/claude-code.md) or [hosts/codex.md](hosts/codex.md) once for the
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

Two attempts without new evidence or measurable progress send eligible execution to the primary frontier.
Repairs go back to the executor with the concrete failure, the affected artifact, the expected
correction and the acceptance check; then retest and re-review where review is required. Two failed
repairs move the work to the primary frontier. These counters alone never authorize Astra.
Research and document failures use better tools or a cheaper retry, or report the limitation;
they never escalate on their own.

Astra may receive a bounded rescue assignment only when a build is stuck: GPT-6.1 Sol at high
reasoning has tried at least two materially different approaches to the same implementation or
debugging blocker, relevant checks still show no progress, and Sol cannot identify a supported
next correction. Include the blocker, attempted approaches and failing check results in the
rescue packet. A first failure, two routine retries, a review request, missing tools, permissions,
model access or quota are insufficient. After the rescue, return implementation and required
fresh review to the primary frontier. Claude Code stays on Opus 5.5 even when stuck; never Fable.

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
- Before using evidence-qualified routing (`route`), read [pack format](pack-format.md). It is narrow and optional; the assignment must fit `route.scope` literally.

Evaluation records and routing packs establish evidence, not permission to use a model. Filter
their candidates through the model policy above before selecting any worker or reviewer. Never
substitute a different model into recorded evidence or claim an unobserved treatment is qualified.

Read each of these only when its condition applies:

- Unfamiliar or large repositories, cross-package changes, investigation or visual inspection: [context discipline](context-discipline.md)
- Writing a worker or investigator packet: [worker contract](delegation-contract.md)
- Assigning an evidence-required route's workstream class: [task classes](task-classes.md)
- Considering more than one concurrent worker: [parallel work](swarm-policy.md)
- Research, PDF analysis, source comparison or synthesis: [research](research.md)
- Choosing verification depth for a deliverable: [verification policy](verification-policy.md)
- Making these routing rules present on every turn, even when the skill does not trigger: [CLAUDE.md activation snippet](hosts/claude-md-snippet.md)
