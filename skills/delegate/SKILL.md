---
name: delegate
description: Complete small work directly or delegate bounded work when that improves total efficiency, while preserving high-quality output and relevant verification. Use when the user invokes delegate or asks for efficient delegation. Receiving a bounded worker or reviewer packet does not activate this workflow again.
---

Achieve the requested quality with the least total effort. Token savings count only when quality is preserved. This folder is the complete consumer: no service, registry, extra API key or global installation. Change no user configuration.

If you received a bounded worker or reviewer packet, execute it and return to the coordinator; do not invoke this skill again. The coordinator owns routing and the final receipt.

## 1. Classify

Classify each workstream with [task-classes.md](task-classes.md). A `full_project` is decomposed by you into bounded workstreams and stays your responsibility. For `research` read [research.md](research.md): live-web research is direct work. If the user explicitly asks for a worker anyway, honour it as unrouted work: disclose that no route covers it, keep frontier verification, start with `research_kind` `live_web` and bind no route. At `finish` record it as `mode` `direct` with no worker attempt and a `source` verdict per source check, and name the worker's model and effort in the report; the helper binds worker attempts to a route only.

## 2. Start

Call the helper's `start` with host, class and risk as described in [local learning](local-learning.md). A direct task is `start` then `finish`; a delegated task adds `lookup` (repeated after a worker fails). If the helper is unavailable, continue and say so once.

## 3. Choose direct or delegated

Work directly when all four hold:

- the exact files and change are already known;
- the diff would be shorter than the six-section work order;
- no independent reviewer or fresh context is required;
- verification is one existing command.

Delegate only when all three hold:

- the work is bounded by settled interfaces;
- it needs more than one focused pass;
- lookup returns a route (step 4).

Ambiguous or higher-risk work stays with you. Count exploration, packet writing, integration, verification, failed attempts and repairs as delegation cost; a cheaper first attempt is not a cheaper completion. Spend stronger reasoning on ambiguity and consequential decisions; never lower a route's exact effort to save usage. Direct work uses ordinary host and project checks and is not a pack route. A bare `$delegate` permits this choice; honour explicit requests for a worker, exact models or independent review.

## 4. Look up a route

Run `lookup` first, passing your own model and effort as `coordinator`. A gap ends routing: report its code, keep useful planning, never manufacture a route. Do not open `routing-pack.json` or `pack-format.md` unless lookup is unavailable.

Use lookup's `workers` and `reviewers` order as given. When an entry's `evidence_tier` is `provisional`, say so once and quote `limitations`. Then confirm on the actual host with the [Claude Code](hosts/claude-code.md) or [Codex](hosts/codex.md) guide: the model is selectable, the effort is expressible (omit it when `not_applicable`) and a reviewer satisfies `review_rule`. An empty lane is an exact gap. When `refresh_due` is true, say so and continue with unexpired entries.

Safety rules:

- The task must fit route.scope as returned by lookup, read literally; a task outside that scope is a gap even when class, risk and host match.
- A host-reported substitution or an observed model or effort that contradicts the configured treatment rejects that treatment for this task; record the contradiction, never relabel it eligible.

## 5. Delegate and integrate

Give one worker a compact [work order](delegation-contract.md) with settled decisions and acceptance checks; its Route line carries `candidate_id`, `model`, `effort` and `serving` from lookup. You own architecture, UI judgment, boundaries and integration; workers implement. For substantial exploration or visual inspection read [context discipline](context-discipline.md); for independent workstreams read [swarm-policy.md](swarm-policy.md) (at most three concurrent workers by default).

Record what the host actually launched; configured and observed settings stay separate, and unknown effort stays unknown. If a worker is unavailable or fails repeatedly without progress, re-run `lookup` with `failed_candidate_ids` naming it and take the new `workers` and `reviewers`; say why. Keep bounded repairs with the original worker; return architectural ambiguity to yourself. Do not quietly become the implementation worker or drop required independence.

Wait for every launched worker to reach a terminal state and collect its result before integration, final artifact inspection, or delivery. A launch acknowledgement is not completion. Never finish while workers remain active; failed or stopped workers require a truthful incomplete outcome unless an eligible replacement completes the work and verification.

## 6. Verify

Apply [verification-policy.md](verification-policy.md). Frontier verification is mandatory for every delegated task. Verify it yourself only when lookup returned `coordinator_may_verify: true` for your own model and effort; otherwise launch a reviewer from `reviewers`, in a fresh process when `review_rule.fresh_context` is true. Inspect actual artifacts: the diff and tests, rendered UI and interactions, sources and calculations. Re-verify after every repair and after integration. Stop when acceptance is met and no material defect remains; no speculative polish or repeated review without new evidence.

## 7. Finish and report

Run the real verification once through `capture` when it is due, then call `finish` once at delivery: acceptance, `checks` referencing those captures (or one command the helper runs once), `inspected` for review, visual and source verdicts, and every attempt including failures. A delegated finish adds `pack_path` and the route digest from lookup. Report models and efforts actually used, provisional status, fallbacks and repairs, checks and material limits. Report tokens or costs only when observed. Never present a requested model as proof of the served model, or an estimate as a bill.
