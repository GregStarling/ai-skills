---
name: refresh-models
description: Discover model metadata, investigate evidence gaps and stage an auditable Model Governor assignment refresh for Claude and Codex, then apply a validated local proposal when authorized.
---

Locate the Model Governor checkout supplied for this task. Read `docs/usage-cli.md` there. Use `node <checkout>/dist/cli/index.js` for all decisions.

Prepare a refresh request using the current human-owned policy, complete candidate set, immutable observations, active assignment and the investigation trigger. `discover` captures official metadata; it does not establish performance qualification. Include explicit bounded evaluations only when the user's scope authorizes those local provider calls.

Run `refresh --input <request>`. Review its considered candidates, missing evidence, full-attempt economics, rule IDs, proposed change and runtime limits. Explain HOLD or escalation without manufacturing a promotion or silently retaining an invalid incumbent.

When local activation is authorized, use `refresh-apply --input <apply-request>` with the staged generation. That command revalidates the proposal and generated output before atomically changing the active assignment. Do not edit policy, generated artifacts or bindings to force acceptance. Preserve the source observations and proposal history. Global installation and remote publication are separate actions requiring their own authorization.
