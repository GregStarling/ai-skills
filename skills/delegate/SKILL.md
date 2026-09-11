---
name: delegate
description: Minimize total model usage by completing tiny work directly and routing bounded execution to the cheapest eligible worker without sacrificing required quality. Use when the user invokes delegate or asks for usage-efficient delegation. Worker and reviewer packets do not reactivate it.
---

Achieve the requested quality with the least total model usage. Count coordinator, worker, reviewer, retry and repair usage. Prefer observed subscription counters; otherwise use model calls, prompt size and lookup economics as conservative proxies. Never claim measured savings from a proxy. Change no user configuration.

If you received a bounded worker or reviewer packet, execute it and return to the coordinator; do not invoke this skill again. The coordinator owns routing and the final receipt.

## 1. Choose the lowest-usage path

Do tiny work directly only when one short frontier pass plus proportionate verification is expected to use less than dispatch, worker execution, integration and verification. Ordinary direct work uses host and project checks; do not classify it, inspect routing files, call the helper or write a receipt.

Otherwise consider delegation. Delegate when all three hold:

- the work can be bounded by a question and permitted sources/actions, or by settled implementation interfaces;
- a cheaper eligible worker is likely to repay the usage of its work order, integration, required verification and a reasonable repair allowance;
- lookup returns a route.

Delegate investigation before solving the problem yourself when the route fits. An unknown answer is allowed: bound the question, sources, actions and stopping point. Workers gather evidence and propose explanations; bring consequential decisions, conflicting evidence or stalled progress back to the frontier. Resolve the specific decision, then return bounded work to the same eligible worker. Spend no model usage merely to measure usage.

Honour explicit requests for a worker, exact model or independent review. Say once when that choice is not the lowest-usage path.

## 2. Select the assignment

Use the concrete assignment below; do not run a model to choose another model. Decompose larger tasks into these assignments. Read [task-classes.md](task-classes.md) only for complex work or legacy `lookup` calls.

| Assignment | Use for |
| --- | --- |
| `locate_behavior` | Find files, trace behavior and explain dependencies |
| `summarize_sources` | Extract or analyze supplied local material |
| `specified_edit` | Apply a precise mechanical change |
| `implement_feature` | Implement a contained feature with settled interfaces |
| `implement_fix` | Apply a fix after reproduction and diagnosis are accepted |
| `implement_ui` | Implement a specified interface |
| `implement_plan` | Execute a settled plan across files |
| `reproduce_failure` | Check coverage for reproduction investigation; currently a gap |
| `frontier_decision` | Resolve conflicting evidence, architecture or product choices |

## 3. Look up a route

Run `node <skill-folder>/scripts/local-learning.mjs route -` with `{host, assignment, risk, coordinator:{model,effort}}`. Omitting `assignment` returns actual coverage and scope for that host and risk. The helper returns one worker and a verification choice using the existing evidence order. Check literal scope and actual host availability, then dispatch the returned worker; do not deliberate over the roster. A gap ends routing: report it briefly and perform the uncovered portion on the frontier unless the user requires a worker. Read [research.md](research.md) for research; pass `research_kind: "live_web"` for live discovery, which has no supported route.

For provisional selections, summarize material limitations once. Confirm model, exact effort and review controls using the [Claude Code](hosts/claude-code.md) or [Codex](hosts/codex.md) guide. Do not open the full pack unless the helper is unavailable; then use [pack-format.md](pack-format.md). `lookup` remains available for full lanes and diagnostics. A refresh reminder does not invalidate unexpired entries.

Safety rules:

- The task must fit route.scope as returned by lookup, read literally; a task outside that scope is a gap even when class, risk and host match.
- A host-reported substitution or an observed model or effort that contradicts the configured treatment rejects that treatment for this task; record the contradiction, never relabel it eligible.

## 4. Delegate and integrate

For investigation, send only question, scope, permitted actions, stopping point and expected return. Model controls come from the routing result, outside the prose brief. Read-only investigations skip `start`, `capture`, `finish` and receipt authoring unless the user or evaluation requires tracking. Keep evidence references and verify the findings normally. For implementation or tracked investigations, use the [work order](delegation-contract.md) and [local learning](local-learning.md), calling `start` before dispatch. Workers investigate and implement within their assignments; you own consequential decisions and integration.

Keep configured and observed settings separate; unknown effort stays unknown. On unavailable workers or repeated failure without progress, rerun `route` with `failed_candidate_ids`; use its next worker and verification choice. Keep bounded repairs with the same worker. Recheck the route before changing an investigator into an implementer. For parallel work read [swarm-policy.md](swarm-policy.md).

Wait for every launched worker to reach a terminal state and collect its result before integration, final artifact inspection, or delivery. A launch acknowledgement is not completion. Never finish while workers remain active; failed or stopped workers require a truthful incomplete outcome unless an eligible replacement completes the work and verification.

## 5. Verify

Apply [verification-policy.md](verification-policy.md). Frontier verification is mandatory, including untracked investigations. Use `verification.mode` from `route`: review yourself for `coordinator`; otherwise dispatch its reviewer, in a fresh process when required. Check decisive sources and actual artifacts; expand review when gaps or contradictions warrant it. Re-verify repairs and integration, then stop when acceptance is met.

## 6. Finish and report

For tracked work, call `finish` once with checks and all attempts as described in [local learning](local-learning.md); run each verification command only when due. Otherwise report concise findings and evidence, models/efforts, checks and material limits. Disclose provisional status and fallbacks. Unknown usage remains unknown; a requested model does not prove the served model.
