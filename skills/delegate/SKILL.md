---
name: delegate
description: Route a user's task to an inexpensive capable worker, then have a frontier model verify completion. Use when the user invokes delegate or asks for cost-effective delegation. Receiving a bounded worker or reviewer packet does not activate this workflow again.
---

Run **frontier coordination → worker → integration → frontier verification → targeted repair → acceptance**. This folder is the complete consumer: no Foreman, Node installation, governor service, registry setup or extra API keys are required.

If already receiving a bounded worker or reviewer packet, execute it and return to the coordinator. Do not recursively invoke this skill. The coordinator owns routing and the final receipt.

## Classify and route

Use [task-classes.md](task-classes.md) and follow `routing_modes` before delegation:

- `full_project`: frontier planning and decomposition; settle interfaces and route bounded workstreams individually. A full project remains your responsibility through the requested outcome.
- `ui_implementation`: frontier specifies the interface before delegation.
- `hard_debugging`: frontier executes a minimal reproduction, captures the failure, diagnoses its cause and defines the precise fix. Resolve or report blocked reproduction before assigning implementation; source reading alone is insufficient.
- `complex_implementation`: frontier settles architecture, interfaces and the implementation plan before assigning workers.

Read [pack-format.md](pack-format.md) for lookup and eligibility, the matching entries in [routing-pack.json](routing-pack.json), and the applicable [Claude](hosts/claude.md) or [Codex](hosts/codex.md) guide. Load other references only when their step applies. Read only the relevant routes and referenced treatments; keep provenance hashes out of worker packets.

Match scope, risk and constraints. Prefer qualified treatments, then matching installed task acceptance, then smoke extrapolation. Apply economics within that evidence level and preserve retained qualified incumbents. API-equivalent economics are a normalized expense proxy, not subscription billing. Never relabel a failed capability check as provisional eligibility.

Intersect every treatment with actual host models, efforts, tools and controls. Confirm an eligible frontier verifier before dispatch. Honor evidence scope, expiry and reviewer independence; disclose provisional use and material limits once. If no eligible worker/verifier remains, report the precise gap and preserve useful planning. Do not manufacture routes or run maintainer evaluations during the user's task.

## Delegate and integrate

For substantial exploration, visual inspection, or a task-boundary handoff, read [context discipline](context-discipline.md).

Give one worker a compact [delegation contract](delegation-contract.md), including settled decisions and acceptance checks. Even a tiny task uses a worker followed by frontier verification; scale the packet and checks down. The frontier owns architecture, UI judgment, boundaries and integration; workers implement.

For independent workstreams, read [swarm-policy.md](swarm-policy.md). Default to at most three concurrent workers, with a normal ceiling of five further limited by the host/project. Settle interfaces and ownership first and use dependency-ordered waves.

Inspect effective dispatch settings and record substitutions. Requested/configured and provider-observed settings are distinct. Omit unsupported effort overrides; unknown effort remains unknown.

If unavailable, try the next eligible compiled treatment and explain the fallback briefly. Keep bounded repairs with the original worker. Repeated failure without progress or insufficient capability advances to another eligible treatment; architectural ambiguity returns to frontier planning. Do not silently make the frontier the implementation worker or bypass required independence.

## Verify, repair and deliver

Apply [verification-policy.md](verification-policy.md). Frontier verification is mandatory. For low risk, the eligible frontier coordinator normally verifies directly; launch another reviewer when the route's model/family/context rules require it or the coordinator is ineligible.

Inspect actual artifacts and relevant tests, rendered UI/interaction evidence, source-supported claims or calculations. Verify the integrated result and every material correction. Keep worker and reviewer evidence tiers distinct.

Deliver when acceptance is met and no material defect remains. Avoid repeated reviews, speculative polish and infrastructure work; respect scope and permissions.

Record every attempt and final acceptance in the local receipt described in [verification-policy.md](verification-policy.md). Report models/efforts, evidence tiers, meaningful fallbacks/repairs, verification and material limits. Report token/cost totals only when observed; distinguish measured economics from advertised-price proxies and unknown economics.
