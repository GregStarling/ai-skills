---
name: delegate
description: Complete small work directly or delegate bounded work when that improves total efficiency, while preserving high-quality output and relevant verification. Use when the user invokes delegate or asks for efficient delegation. Receiving a bounded worker or reviewer packet does not activate this workflow again.
---

Achieve the requested quality with the least total effort needed. Token reductions matter only when quality is preserved. This folder is the complete consumer: no Foreman, Node installation, governor service, registry setup or extra API keys are required.

If already receiving a bounded worker or reviewer packet, execute it and return to the coordinator. Do not recursively invoke this skill. The coordinator owns routing and the final receipt.

## Local task lifecycle

Read [local learning](local-learning.md) and use the optional packaged helper at start and delivery for both direct and delegated tasks, and at useful milestones for session advice. No runtime installation is required; unavailable learning falls back to ordinary work. User history and reminder settings stay local, outside this folder.

## Choose direct execution or delegation

Complete small work directly when handing it off would add more effort than completing and verifying it. Delegate substantial bounded work when it improves total efficiency. Include exploration, coordination, context transfer, implementation, integration, verification, failed attempts and repairs in that judgment; a cheaper first attempt is not necessarily a cheaper completion. Prefer reusing useful context to duplicating work.

Spend stronger reasoning on ambiguity and consequential decisions, including diagnosis, architecture and product judgment. Match reasoning effort to the uncertainty and consequences; do not use maximum effort by habit or lower an evidence-bound treatment's exact effort to save usage.

A bare `$delegate` invocation permits this choice. Honor explicit requests for a worker, exact models, strict pack governance or independent review. Direct execution uses ordinary host/project checks and is not a qualified pack route. Skip coordinator pack lookup for direct work; collect its lightweight local outcome through the helper and preserve the relevant artifact, regression, rendered UI/interaction, source and calculation checks described in [verification-policy.md](verification-policy.md), including any required independent review.

For delegated work, follow **frontier coordination → worker → integration → frontier verification → targeted repair → acceptance** and the sections below. Stop in either mode when the requested quality and acceptance checks are satisfied and no material defect remains; do not add speculative polish or repeat completed reviews without new evidence.

## Classify and route

Use [task-classes.md](task-classes.md) and follow `routing_modes` before delegation:

- `research`: read [focused research](research.md); distinguish supplied-source analysis from live source discovery and check actual source-access tools and route scope.
- `full_project`: frontier planning and decomposition; settle interfaces and route bounded workstreams individually. A full project remains your responsibility through the requested outcome.
- `ui_implementation`: frontier specifies the interface before delegation.
- `hard_debugging`: frontier executes a minimal reproduction, captures the failure, diagnoses its cause and defines the precise fix. Resolve or report blocked reproduction before assigning implementation; source reading alone is insufficient.
- `complex_implementation`: frontier settles architecture, interfaces and the implementation plan before assigning workers.

Read [pack-format.md](pack-format.md) for lookup and eligibility, the matching entries in [routing-pack.json](routing-pack.json), and the applicable [Claude](hosts/claude.md) or [Codex](hosts/codex.md) guide. Load other references only when their step applies. Read only the relevant routes and referenced treatments; keep provenance hashes out of worker packets.

Match scope, risk and constraints. Prefer qualified treatments, then matching installed task acceptance, then smoke extrapolation. Apply economics within that evidence level and preserve retained qualified incumbents. API-equivalent economics are a normalized expense proxy, not subscription billing. Never relabel a failed capability check as provisional eligibility.

Intersect every treatment with actual host models, efforts, tools and controls. Confirm an eligible frontier verifier before dispatch. Honor evidence scope, expiry and reviewer independence; disclose provisional use and material limits once. If no eligible worker/verifier remains, report the precise gap and preserve useful planning. Do not manufacture routes or run maintainer evaluations during the user's task.

## Delegate and integrate

For substantial exploration, visual inspection, or a task-boundary handoff, read [context discipline](context-discipline.md).

Give one worker a compact [delegation contract](delegation-contract.md), including settled decisions and acceptance checks. Scale the packet and checks to the work. The frontier owns architecture, UI judgment, boundaries and integration; workers implement.

For independent workstreams, read [swarm-policy.md](swarm-policy.md). Default to at most three concurrent workers, with a normal ceiling of five further limited by the host/project. Settle interfaces and ownership first and use dependency-ordered waves.

Inspect effective dispatch settings and record substitutions. Requested/configured and provider-observed settings are distinct. Omit unsupported effort overrides; unknown effort remains unknown.

If unavailable, try the next eligible compiled treatment and explain the fallback briefly. Keep bounded repairs with the original worker. Repeated failure without progress or insufficient capability advances to another eligible treatment; architectural ambiguity returns to frontier planning. Do not silently make the frontier the implementation worker or bypass required independence.

## Verify, repair and deliver

Apply [verification-policy.md](verification-policy.md). Frontier verification is mandatory. For low risk, the eligible frontier coordinator normally verifies directly; launch another reviewer when the route's model/family/context rules require it or the coordinator is ineligible.

Inspect actual artifacts and relevant tests, rendered UI/interaction evidence, source-supported claims or calculations. Verify the integrated result and every material correction. Keep worker and reviewer evidence tiers distinct.

Deliver when acceptance is met and no material defect remains. Avoid repeated reviews, speculative polish and infrastructure work; respect scope and permissions.

Record every attempt and final acceptance through the [local helper](local-learning.md), preserving the evidence requirements in [verification-policy.md](verification-policy.md). Report models/efforts, evidence tiers, meaningful fallbacks/repairs, verification and material limits. Report token/cost totals only when observed; distinguish measured economics from advertised-price proxies and unknown economics.
