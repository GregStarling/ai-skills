# Catchup

## Pick Up Where the Work Actually Stands.

Returning to a project should not require rebuilding its history in your head.
Catchup reads the current state and gives you a short briefing: recent work,
what is unfinished, what is in flight, and the next supported step.

It checks existing project records against the repository. When notes are stale
or remote information is unavailable, the brief says so. It does not edit files,
fetch refs, run builds, or start the work it describes.

## Install and use

```sh
npx skills add GregStarling/ai-skills --skill catchup --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory. No build or runtime helper
is required. The skill uses your host's existing file and repository read tools.

- Codex: `$catchup`
- Claude Code: `/catchup`
- Natural language: “Catch me up on this project. What should I pick up next?”

For a specific comparison, supply a date or commit. Without a reliable baseline,
Catchup reports recent work rather than inventing when you last visited. A local
repository without a remote or upstream still gets a useful briefing.

## Composition and migration

Catchup can read CTO's ledger without resuming the build. The ledger is evidence
to check, not authority to edit. No companion skill is required.

This replaces the [original Catchup command](https://github.com/GregStarling/claude-commands/blob/d5babaa934f80fe00a5dad7ccc88f708c67f5ca9/plugins/starling-commands/commands/catchup.md).
Install the skill and confirm the loaded source in a fresh session. If replacing
a manually copied command, save its backup outside the host's discovery folders.
Installing Catchup does not uninstall the old plugin or its other commands.

[Canonical instructions](SKILL.md)
