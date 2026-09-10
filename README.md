# AI skills

The primary product is the complete [delegate folder](skills/delegate/): a portable skill for **frontier coordination → cheapest qualified available worker → frontier verification → targeted repair**. It handles a small task with a small work order and a large project with bounded workstreams and final integration review. Foreman is not required.

The governor is maintainer infrastructure. It compiles current evidence into `routing-pack.json`; consumers read that pack through the skill and use their host's native agent tools. Consumers do not install Node, Promptfoo, a database or a governor service. Existing host authentication is sufficient for routes actually available in that host.

## What ships in the folder

- `SKILL.md`: the orchestration entrypoint.
- `routing-pack.json`: generated, versioned task routes, model/effort identities, economics, qualification summaries and freshness.
- `task-classes.md`, `delegation-contract.md`, `swarm-policy.md`, `verification-policy.md`: focused guidance loaded when needed.
- `hosts/claude.md` and `hosts/codex.md`: thin mappings to native host controls.

The skill intersects qualified routes with current host availability. It does not invent a model hierarchy each invocation or assume both providers. Frontier verification is mandatory, but review depth scales with the task. Repairs return to the original worker before capability-based escalation.

## Current readiness

**The initial compiled pack has no qualified production routes.** Existing observations do not satisfy the governor's current task, identity, effort, cost and review requirements. Empty classes remain explicit; illustrative model names and one-task trials have not been promoted into general qualification. Installing the folder currently gives a clear missing-evidence result, not automatic productive routing.

The routing/compiler implementation and copied-folder checks are separate from empirical readiness. Prior native smokes demonstrated candidate evaluation; earlier standalone tests demonstrated source behavior. Neither establishes an installed, fully qualified `/delegate` experience in both hosts. See [current validation](docs/routing-pack-validation.md), [validation history](docs/standalone-delegate-validation.md) and [the routing-pack plan](docs/routing-pack-plan.md).

## Copy the complete folder

Once a suitable production pack is available, copy `skills/delegate/` to a host's skill location. For a project, use `.claude/skills/delegate/` in Claude Code or `.agents/skills/delegate/` in Codex. Personal locations are `~/.claude/skills/delegate/` and `~/.agents/skills/delegate/`. Preserve any existing skill with the same name; this development checkout has not installed or overwritten one.

Claude supports `/delegate <task>`. In Codex, use the installed skill selector or named-skill syntax supported by that host version. Copy every referenced file; updating only `SKILL.md` leaves routing knowledge behind. [Claude discovery](https://code.claude.com/docs/en/skills) · [Codex discovery](https://learn.chatgpt.com/docs/build-skills).

## Maintain routing knowledge

Use [refresh-models](skills/refresh-models/SKILL.md) in the maintainer checkout. Discovery, real evaluations and production results feed the governor; qualification and promotion rules produce the updated pack. Review and publish the pack through Git. That does not require consumers to run the compiler.

[Routing-pack maintenance](docs/routing-pack-maintenance.md) · [Existing engine CLI](docs/usage-cli.md) · [Historical engine release](docs/v1-release.json) · [Foreman findings from development](docs/foreman-scratchpad.md)

Maintainer checks:

```sh
npm ci
npm test
npm run typecheck
npm run build
node scripts/verify/skills.mjs
```

The older `verify:v1`/`verify:v1:live` commands concern the governor engine and retained native evaluation evidence, not consumer installation or qualified routing readiness. Some harvested engine calibration checks require a local Foreman source checkout; that is test provenance, not a delegate runtime dependency.
