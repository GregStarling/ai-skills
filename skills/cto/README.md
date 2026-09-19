# CTO

Give your agent a plan and ask it to finish. CTO owns implementation,
verification, and the authorized shipping outcome. It records acceptance criteria,
work items, decisions, failures, and evidence in a persistent project ledger so
another session can resume.

## Install

```sh
npx skills add GregStarling/ai-skills --skill cto --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory. No build or runtime dependency
is needed for CTO itself.

## Use

- Codex: `$cto Implement the plan in PLAN.md`
- Claude Code: `/cto Implement the plan in PLAN.md`
- Natural language: “CTO mode: ship this plan.”

CTO defines what shipped means, verifies each item, escalates technical blockers,
and performs an adversarial final review. It continues useful work around external
blockers and reports precisely what remains. It cannot run after its host closes
or bypass permissions or execution limits; invoke it again to resume.

## Combine with other skills

Install Delegate separately for routing, risk classification, and required
independent review. If ponytail is available, CTO uses it to simplify the
implementation while preserving approved scope. Neither is required to use CTO.

[Canonical instructions](SKILL.md) · [Ledger template](references/ledger-template.md)
