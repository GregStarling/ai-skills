# Installing the delegate skill

Copy the complete `skills/delegate/` folder, including `routing-pack.json`, `scripts/` and every reference file. A partial copy or a symlink into this repository is not an installation. When updating, replace the whole installed folder so old and new routing files are never mixed. This repository's source location is intentionally inert: nothing under `skills/` is discovered from this checkout, and `scripts/verify/skills.mjs` asserts that stays true.

## Claude Code

Skills are discovered under `.claude/skills/delegate/` for a project or `~/.claude/skills/delegate/` for personal use and invoked as `/delegate`. Keep project settings enabled when testing installed `/delegate` discovery; an empty `--setting-sources` disables that discovery.

## Codex

Codex discovers project skills under `.agents/skills/delegate/` and personal skills under `~/.agents/skills/delegate/`. In CLI/IDE, invoke `$delegate <task>` or select it through `/skills`; in the desktop app, use its skill selector. If an older skill has the same name, select this project's skill explicitly.

Exact copy commands for a fresh installation are in the [README](../README.md#claude-code). Host-specific execution guidance lives inside the installed folder at `hosts/claude-code.md` and `hosts/codex.md`.
