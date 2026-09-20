# Ship skill migration

## Sources and plan

Migrate the [original command](https://github.com/GregStarling/claude-commands/blob/d5babaa934f80fe00a5dad7ccc88f708c67f5ca9/plugins/starling-commands/commands/ship.md)
and the existing personal portable variant into `skills/ship`. The original
command supplies existing-project bookkeeping and the four-repair limit. The
portable variant supplies scoped release authority, deployment verification,
and the proof footer.

1. Keep one shared SKILL.md, host metadata, and an install/use README. No runtime
   helper, provider adapter, new dependency, or separate state system is needed.
2. Establish the release destination from repository evidence. Preserve unrelated
   changes and commits, required PR/review policies, and existing authorization.
3. Verify the integrated result and actual released revision; bound retries and
   distinguish absent infrastructure from failed or missing required stages.
4. Verify applications, packages, and repository artifacts at their destination.
   Preserve useful no-op/resume behavior and optional companion composition.
5. Add Ship to the collection catalog and install guide, with migration guidance.
6. Validate packaging, both-host installs, repository regressions, isolated release
   behavior, and fresh independent review before opening a pull request.

The old repository and personal installs remain unchanged. Other commands have
not been migrated. This change does not modify CTO or Delegate behavior, model
routing, historical evidence, or published routing-pack bytes.

## Validation

- Repository suite: 913 tests passed, 3 existing skips, 49 test files.
- Typecheck, build, portable packaging, routing-pack publication validation,
  documentation link checks, and whitespace checks passed.
- Skill Creator frontmatter/scaffold validation passed in an isolated validator
  environment. Ship adds no runtime dependencies.
- Skills CLI installed Ship alone and all three consumer skills from the local
  source into separate disposable projects for Codex and Claude Code. Every
  installed file matched its corresponding source bytes. No personal install
  or saved setting changed.
- CTO and Delegate source folders remain byte-for-byte unchanged.

## Behavioral evaluation

A fresh independent evaluator used the skill in a disposable local Git fixture.
The fixture had a feature branch, a default release branch named `release`, an
incoming colleague commit, an outgoing regression-test commit, existing task
records, and unrelated staged, unstaged, and untracked edits.

The evaluator released the greeting correction through an isolated worktree,
merged the incoming commit, reran two tests, pushed to the local bare remote,
and checked a fresh consumer clone. Both tests and the greeting smoke check
passed. The released revision was `4ad8404784f3706ffc2625ccc15d798169f49b7d`.
Both original commits remained ancestors. The original checkout's index was
byte-identical and all unrelated work remained intact and unpublished. CI and
deployment were correctly reported as not applicable to this fixture. Verdict:
PASS, with no repair required.

Seven additional scenario simulations covered an older green CI run, a clean
checkout with pending deployment, a timed-out immutable package publication,
a PR-only restriction, exhausted repair attempts, staging/production mismatch,
and a documentation request that did not authorize publication. The evaluator
withheld release success in every incomplete case and respected the PR-only and
no-publication boundaries.

These are bounded local execution and simulated-provider checks. They do not
establish that a real production deployment or registry publish was executed.
The local fixture is disposable; its SHA identifies that fixture, not a commit
in this repository.
