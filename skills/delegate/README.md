# Delegate

Keep an economical agent in charge of routine work. Bring in stronger reasoning
for plans, consequential decisions, and hard bugs, with independent review where
required. Execution and review are separate decisions; original risk and task
identity survive handoffs.

## Install

```sh
npx skills add GregStarling/ai-skills --skill delegate --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory, including the helper and
routing pack. Node.js is required for the helper; no npm install, build, service,
or separate API key is needed for the installed skill.

## Use

- Codex: `$delegate Fix this bug and run the relevant checks`
- Claude Code: `/delegate Fix this bug and run the relevant checks`

Delegate also activates automatically for covered work. It discovers the current
host's supported capabilities, honors explicit model/delegation restrictions,
and does not change saved defaults. See the [canonical instructions](SKILL.md)
and [Codex](hosts/codex.md) or [Claude Code](hosts/claude-code.md) host guidance.

CTO can own the overall plan while Delegate handles bounded work and review.
Ponytail can keep each implementation simple. Install those skills separately.

[Architecture and validation history](https://github.com/GregStarling/ai-skills/blob/main/docs/delegate.md)
