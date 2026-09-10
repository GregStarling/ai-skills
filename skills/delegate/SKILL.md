---
name: delegate
description: Route a user's task to an inexpensive capable worker, then have a frontier model verify completion. Use when the user invokes delegate or asks for cost-effective delegation. Receiving a bounded worker or reviewer packet does not activate this workflow again.
---

Run **frontier coordination → worker → integration → frontier verification → targeted repair → acceptance**. The user supplies the task. This entire folder is the consumer product: no Foreman, Node installation, governor service, registry setup or extra API keys are required.

If you are already a worker or reviewer receiving a bounded packet, execute that packet and return to the coordinator. Do not recursively invoke this skill. The coordinator owns routing and the final receipt.

## Read and route

Read metadata and the relevant host/class entries from [routing-pack.json](routing-pack.json), plus the applicable [Claude](hosts/claude.md) or [Codex](hosts/codex.md) guide. Routes occupy one line each so native file search can retrieve just the matching `public_task_class` and host. Avoid loading unrelated routes into the work order. Use [task-classes.md](task-classes.md) to classify workstreams. Load other references only when their step applies.

Pack shape: `routes[]` contains `workers`, `reviewers`, `requirements`, `review_rule` and `ranking_basis` directly. Its `stratum` holds scope/evidence metadata, not candidate arrays. Select a matching route once; do not repeatedly rediscover the schema.

For provisional treatments, `provisional.task_evidence` distinguishes matching installed acceptance from smoke extrapolation and preserves recovery limits. Read the scope, controls, tier, evidence basis and expiry for selection; keep the full provenance hashes out of worker packets.

Follow `routing_modes` before selecting a worker. `full_project` means frontier planning and decomposition: establish interfaces and route each bounded workstream by its own class. It never requires a whole-project worker route. For UI, specify the interface before delegation. For `hard_debugging`, the frontier reproduces the failure, diagnoses its cause and defines a precise fix; an inexpensive capable worker implements it, then the frontier verifies the regression. For `complex_implementation`, the frontier settles architecture, interfaces and the implementation plan before assigning workers.

Before dispatching a `hard_debugging` worker, execute a minimal reproduction yourself and capture the observed failure. Put that evidence, the causal diagnosis and the precise fix in the worker packet. If reproduction is blocked, resolve or report that blocker before assigning implementation; reading the source alone does not satisfy this step.

Match the route's scope, risk and constraints, then intersect its ladder with this host's available models, efforts, tools and controls. Prefer eligible `qualified` treatments; use an eligible `provisional` treatment when no qualified treatment can execute the work. Provisional means limited real host evidence, not full governor qualification. Honor its scope and disclose that tier once. Preserve compiled ordering and retained qualified incumbents. When ranking is based on advertised prices or maintainer order with unknown costs, do not claim measured cheapest completion. Never turn a failed capability check into provisional eligibility.

Before execution, ensure an eligible frontier verifier is available. For a low-risk task, the current eligible frontier coordinator should inspect the worker's artifact and perform final verification itself. Launch another reviewer only when required by the route's model/family/context rules or when the coordinator is ineligible. Worker and reviewer each retain their evidence tier. Inspect effective dispatch settings and record substitutions. Requested/configured settings and provider-observed settings are distinct. For a model without an effort knob, omit that override; unknown effort remains unknown.

Use the host's clock and date comparison tools to compare `refresh_after`, pack `expires_at` and treatment `expires_at` with now. Report refresh due; continue until pack expiry using only treatments whose evidence has not expired. An expired treatment does not disable other valid treatments. Publication validation owns the `generated_at` check; do not infer publication validity from the session's calendar date. Never dispatch from malformed or simulation data. If no eligible worker/verifier remains, report the precise missing capability and preserve useful planning. Do not manufacture a route or run maintainer evaluations during the user's task.

## Execute

Give one worker a compact [delegation contract](delegation-contract.md). Even a tiny task uses a worker followed by frontier verification; the packet and checks scale down. The frontier handles architecture, UI judgment, task boundaries and integration, while the worker implements.

For multiple independent workstreams, read [swarm-policy.md](swarm-policy.md). Default to at most three concurrent workers, with a normal ceiling of five further limited by the host/project. Settle interfaces and ownership first; use dependency-ordered waves. A full project remains your responsibility through its requested outcome, not its first milestone.

If a candidate is unavailable, try the next eligible compiled treatment and explain the fallback briefly. Keep repairable defects with the original worker. If a failure demonstrates insufficient capability or repeats without progress, advance to another eligible treatment; architectural ambiguity returns to frontier planning. Do not silently turn the frontier into the implementation worker or bypass required independence.

## Accept

Apply [verification-policy.md](verification-policy.md). Frontier verification is always required, with depth proportional to the task. Inspect actual artifacts and relevant tests, rendered UI/interaction evidence, source-supported claims or calculations. Verify the integrated final result and every material correction.

Deliver once acceptance is met and no material defect remains. Avoid repeated reviews, speculative polish and infrastructure work. Respect the user's scope and permissions throughout.

Record every attempt and final acceptance in the local receipt described in [verification-policy.md](verification-policy.md). Report models/efforts, evidence tiers, meaningful fallback or repair decisions, verification and material limits. Report token/cost totals only when observed. Do not conflate requested settings, measured evidence, source-format validation and installed host invocation.
