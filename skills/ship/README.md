# Ship

## Close the Gap Between Done and Live.

The code works locally. The release still needs a review, a commit, passing CI,
and proof that the published result works. Ship takes responsibility for that
last stretch. You hand off the release and get back the evidence.

It checks the scoped changes, updates existing project records, follows the
repository's release process, and tracks the revision that actually ships.
Failed checks lead to diagnosis and bounded repairs. A required approval or
unavailable service gets a precise blocker report.

## Install

```sh
npx skills add GregStarling/ai-skills --skill ship --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory. Ship itself is instructions
only. It uses your existing Git, hosting, CI, and deployment tools and access.

## Use

- Codex: `$ship`
- Claude Code: `/ship`
- Natural language: “Ship the current changes and verify the release.”

Ship applies when you ask to publish completed work. Asking how deployment works,
requesting a preview, or editing this skill does not authorize a release.
Your explicit limits still apply, including “open a PR only” or “do not deploy.”

For an application, Ship checks the deployed behavior. For a package, it checks
the published version and an install or smoke test. For a repository of skills
or documentation, it checks the published files and their use. The final proof
includes the released revision, check results, publication evidence, and time.
An absent CI or deployment service is reported as not configured or not
applicable, never as a passing check.

## Works with CTO, Delegate, and Ponytail

CTO owns the full plan and final acceptance. Ship handles its authorized release
step. Delegate supplies routing and required review when installed. Ponytail
keeps repairs small while preserving required checks. All are optional; Ship
works independently and does not install companions or change saved settings.

## Moving from claude-commands

This is the portable successor to the
[original Ship command](https://github.com/GregStarling/claude-commands/blob/d5babaa934f80fe00a5dad7ccc88f708c67f5ca9/plugins/starling-commands/commands/ship.md).
Install it using the command above and start a fresh session. Confirm that the
loaded Ship instructions come from this skill before using it for a release.

You can keep the old plugin for its other commands. If you copied `ship.md`
manually into a Claude commands folder, back it up outside that folder when
switching. Installing this skill does not uninstall the old plugin or migrate
its other commands. The old repository has not been retired by this migration.

[Canonical instructions](SKILL.md)
