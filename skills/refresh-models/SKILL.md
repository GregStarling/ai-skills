---
name: refresh-models
description: Maintain the delegate skill's portable routing pack using model discovery, versioned evaluation evidence and governor qualification. Use when a maintainer requests a routing refresh or asks to evaluate new models for delegate.
---

This is maintainer tooling. Consumers of the complete delegate folder never need the governor, its dependencies or this refresh workflow.

In the authorized ai-skills checkout, read `docs/routing-pack-maintenance.md`. Identify the current human policy, pack, task scopes, available evaluation sources and refresh trigger. Use existing discovery, evaluation and refresh commands to capture immutable official metadata and actual task/review outcomes. A public benchmark or advertised price does not itself qualify a task route. Record model × effort, material serving controls, failed attempts, review/rework and unknown costs without inventing telemetry.

Evaluate only within the user's authorized budget and available authentication. Reuse immutable evaluation IDs to avoid repeated spend. Preserve paired promotion rules and explicit HOLD results. Do not loosen qualification or hardcode illustrative model ladders to fill an empty pack.

Compile updated worker and frontier-reviewer strata with `compile-routing-pack`. Inspect the pack diff: scope, ordered candidates, effort, cost basis, evidence references, fallback/control requirements and freshness. Reject synthetic production authority, stale evidence and unavailable required controls. Keep unqualified task classes visible as gaps.

Stage the result first. Publish the exact reviewed pack into `skills/delegate/routing-pack.json` through the maintainer's normal authorized Git workflow; do not activate unrelated native bindings or modify consumer settings. An update to this repository is not automatically installed in another user's host. Report changed routes, retained incumbents, missing evidence and actual checks.
