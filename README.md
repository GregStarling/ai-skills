# AI Skills

Reusable skills for AI coding agents. Install the ones you need and combine them
when useful. Each skill keeps its instructions and supporting files in its own
folder.

## Skills

| Skill | What it does | Use it when |
| --- | --- | --- |
| [CTO](skills/cto/) | Owns a plan through implementation, verification, and authorized shipping, with a persistent execution ledger. | You want the whole plan implemented. |
| [Delegate](skills/delegate/) | Routes work to appropriate agents and requires independent review where warranted. | You want routine work handled economically and harder decisions reviewed. |

CTO owns completion. Delegate handles routing and review. Both also work with
[ponytail](https://github.com/DietrichGebert/ponytail) when installed, to keep
implementation simple without removing requested behavior. Ponytail is a separate
project and is not bundled here. Each skill can be installed on its own.

## Install

Use the [open skills CLI](https://github.com/vercel-labs/skills) from the project
where you want the skills. It supports Codex, Claude Code, and other agents that
load the Agent Skills format. Node.js is required for the CLI and Delegate's
lightweight review helper; CTO itself is instructions only.

```sh
# Choose skills and agents interactively
npx skills add GregStarling/ai-skills

# Install either skill for Codex and Claude Code in the current project
npx skills add GregStarling/ai-skills --skill cto --agent codex claude-code --copy
npx skills add GregStarling/ai-skills --skill delegate --agent codex claude-code --copy

# Install both together
npx skills add GregStarling/ai-skills --skill cto delegate --agent codex claude-code --copy
```

Add `--global` for personal use across projects. Run these from a consumer
project, not this source checkout. Select `cto` and/or `delegate`;
`refresh-models` is for maintainers only. You do not need to build this repository,
configure API keys, or run its evaluation engine to use either consumer skill.

Prefer a manual installation? Copy a complete skill folder to the appropriate
[discovery directory](docs/install.md). That guide also covers updates and removal.

## Use

| Agent | CTO | Delegate |
| --- | --- | --- |
| Codex | `$cto Implement the plan in PLAN.md` | `$delegate Fix this bug and run the relevant checks` |
| Claude Code | `/cto Implement the plan in PLAN.md` | `/delegate Fix this bug and run the relevant checks` |

Both support automatic selection for matching requests. CTO is for complete-plan
execution, not ordinary coding questions. It resumes from `.cto/ledger.md` in your
project. Skills respect your existing permissions and do not change your model
settings. Start a fresh agent session if a new skill does not appear.

## Contributing a skill

Add `skills/<name>/SKILL.md` with `name` and `description` frontmatter, a short
README, and only the resources it needs. Keep consumer references inside that
folder and installation paths out of portable behavior. Add it to the catalog,
then run `node scripts/verify/skills.mjs` after `npm ci`. All consumer skills are
checked from isolated copies; no central registration file is needed.

## Maintainer tools

[refresh-models](skills/refresh-models/SKILL.md) maintains Delegate's routing pack
and requires this repository. Model Governor, its tests, policy, fixtures, and
historical evidence remain maintainer tooling; consumers do not install them.

- [Delegate architecture, routing, and historical validation](docs/delegate.md)
- [Maintainer installation and measurement notes](docs/delegate-install.md)
- [Collection changes and validation](docs/skills-collection.md)
- [Delegate validation index](docs/validation-status.md)

Repository checks: `npm test`, `npm run typecheck`, `npm run build`, and
`node scripts/verify/skills.mjs`.
