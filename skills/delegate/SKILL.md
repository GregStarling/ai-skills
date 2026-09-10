---
name: delegate
description: Use Model Governor to plan and execute a bounded coding assignment through a current evidence-qualified Claude or Codex binding, with checked scope and independent review.
---

Locate the Model Governor checkout supplied for this task. Read its `docs/usage-cli.md` for the request format, and run its built CLI with `node <checkout>/dist/cli/index.js`.

Translate the authorized task into a concrete work order: allowed and forbidden paths, objective checks, observable risk facts, retry/time limits and escalation conditions. Keep the user's requested outcome and scope. Select the current human-owned policy and supplied immutable evidence; model choices come from the engine.

Use `plan-delegate --input <request>` to validate authority and scope, then `delegate --input <request>` to execute. Let the engine collect actual changes, checks, costs and any required fresh review. Report the resulting outcome, artifacts and unresolved limits.

HOLD or escalation is a result to explain and resolve through missing evidence or supported controls. Never hand-edit a binding, substitute another model/effort, turn simulation into production, or bypass the engine by directly spawning an unqualified worker. For an evidence gap, use the library's evaluation or refresh workflow within the user's authorization.
