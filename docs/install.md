# Installing the delegate skill

Copy the complete `skills/delegate/` folder, including `routing-pack.json`, `scripts/` and every reference file. A partial copy or a symlink into this repository is not an installation. When updating, replace the whole installed folder so old and new routing files are never mixed. This repository's source location is intentionally inert: nothing under `skills/` is discovered from this checkout, and `scripts/verify/skills.mjs` asserts that stays true.

## Claude Code

Skills are discovered under `.claude/skills/delegate/` for a project or `~/.claude/skills/delegate/` for personal use and invoked as `/delegate`. Keep project settings enabled when testing installed `/delegate` discovery; an empty `--setting-sources` disables that discovery.

## Codex

Codex discovers project skills under `.agents/skills/delegate/` and personal skills under `~/.agents/skills/delegate/`. In CLI/IDE, invoke `$delegate <task>` or select it through `/skills`; in the desktop app, use its skill selector. If an older skill has the same name, select this project's skill explicitly.

Exact copy commands for a fresh installation are in the [README](../README.md#install). Host-specific execution guidance lives inside the installed folder at `hosts/claude-code.md` and `hosts/codex.md`.

## Test-period activation through CLAUDE.md

Skill discovery is the primary path. For a guaranteed second path while testing on Claude Code, append the block in `skills/delegate/hosts/claude-md-snippet.md` to `~/.claude/CLAUDE.md` and remove it when the test ends. It restates the routing, mandatory review check and review-tier rules; the installed SKILL.md stays authoritative.

## Measuring the test

Usage is measured from host transcripts, not from inside the session:

```sh
node scripts/measure-usage.mjs --since 2026-09-14
```

This script reads Claude Code transcripts only; it does not measure Codex usage or cost per accepted task. For evaluation, compare matched assignments and include acceptance, audits that found defects, and repair/rework effort alongside consumption. The 10% audit rate is a trial setting.

The script groups sessions by coordinator model and reports API list-price proxies per session and per user turn, with the main-session versus subagent split. Compare the Sonnet-coordinated period against the Fable history on `$/user turn` and `edits/turn`. Prices live in `scripts/usage-prices.json`.
