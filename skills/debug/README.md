# Debug

## Make the Bug Show Its Work.

Debug turns a bug report into a reproduction, a demonstrated cause, and a
verified correction. It checks that the failure comes from the reported behavior
before changing the implementation, then reruns the same check after the fix.

For intermittent or environment-specific bugs, it investigates the conditions
and records what the evidence can prove. A passing retry is not enough. If the
failure cannot be reproduced, you get the observations and the next useful
experiment instead of an unsupported claim that it is fixed.

## Install and use

```sh
npx skills add GregStarling/ai-skills --skill debug --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory. Debug is instructions only
and uses your project's existing tools and test conventions.

- Codex: `$debug The CLI ignores --retries 0. Reproduce and fix it.`
- Claude Code: `/debug The CLI ignores --retries 0. Reproduce and fix it.`
- Diagnosis only: “Debug this timeout. Explain the cause without editing files.”

Debug preserves unrelated work and limits repairs to the demonstrated cause.
It reports the failure evidence, correction, checks, and remaining verification
limits. A Debug request alone does not authorize committing or publishing.

## Composition and migration

Delegate can route difficult diagnosis and require independent review. CTO owns
the larger plan and acceptance; Debug returns its evidence to that loop. Ponytail
keeps the correction small. Ship handles a separately authorized release. None
is required to install Debug.

Debug is the renamed successor to [Repro](https://github.com/GregStarling/claude-commands/blob/d5babaa934f80fe00a5dad7ccc88f708c67f5ca9/plugins/starling-commands/commands/repro.md).
Use `debug` for installation and invocation; this collection has no `repro`
alias. Start a fresh session after installing. The old plugin and any manually
copied `/repro` command remain separate until you remove them. Preserve manual
customizations in a backup outside discovery folders when switching.

[Canonical instructions](SKILL.md)
