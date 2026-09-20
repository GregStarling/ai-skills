# Catchup and Debug

## Plan and acceptance

Migrate [Catchup](https://github.com/GregStarling/claude-commands/blob/d5babaa934f80fe00a5dad7ccc88f708c67f5ca9/plugins/starling-commands/commands/catchup.md)
and [Repro](https://github.com/GregStarling/claude-commands/blob/d5babaa934f80fe00a5dad7ccc88f708c67f5ca9/plugins/starling-commands/commands/repro.md)
into portable independent consumer skills. Repro becomes **Debug**, with no
`repro` alias. Preserve the existing CTO, Delegate, and Ship behavior.

1. Catchup gives a bounded read-only briefing. Handle local-only repositories,
   absent upstreams, detached HEAD, stale refs, and unavailable provider reads.
   Check existing records without editing them or inventing a last-visit time.
2. Debug establishes a faithful reproduction before repairing production code,
   verifies the correction and surrounding behavior, and preserves unrelated work.
   Continue evidence-led diagnosis for intermittent/environment-specific bugs;
   distinguish missing evidence and incomplete verification from a verified fix.
3. Honor diagnosis-only and publishing limits. Keep companion skills optional,
   with Delegate responsible for routing/review and CTO for its outer plan.
4. Package each as SKILL.md, README, and host metadata, without new dependencies
   or provider-specific runtime scripts. Expand the marketing README, catalog,
   installation commands, and migration guidance to cover all five skills.
5. Validate isolated installations for both hosts, full repository checks,
   independent behavior exercises, and a fresh final review. Extend the existing
   public collection PR; do not retire the old repo or alter personal installs.

## Validation

- Skill Creator frontmatter/scaffold validation passed for both skills.
- Repository suite: 913 tests passed, 3 existing skips, 49 test files.
- Typecheck, build, portable packaging/reference closure, routing-pack publication,
  documentation links, and whitespace checks passed.
- Skills CLI installed Catchup alone, Debug alone, and all five consumer skills
  into disposable projects for Codex and Claude Code. All installed files matched
  the source bytes. No personal install or saved setting was changed.
- CTO, Delegate, and Ship folders are unchanged by this addition.

### Catchup execution

A fresh evaluator applied Catchup to two local fixtures. The first had staged,
unstaged, and untracked work, a stash, a conflicting CTO ledger, and remote state
newer than the cached tracking ref. The second had no remote, upstream, or task
tracking. The briefs identified the relevant work and uncertainty, used a remote
SHA read without fetching, and labeled the local-only next step as inferred.
SHA-256 inventories including Git metadata remained identical: 48 files in the
first fixture and 28 in the second. Verdict: PASS, no repair required.

### Debug execution

An independent evaluator applied Debug to a small CLI that ignored a zero retry
count. It captured the wrong CLI output, then ran five tests against unchanged
production files with four assertion failures covering the CLI, client, and
string/integer zero cases. Production-file hashes confirmed the failing checks
preceded the correction.

The evaluator fixed the shared helper's treatment of zero as a missing value.
All five tests then passed; CLI and client smoke checks confirmed zero, default,
and positive counts. HEAD, index bytes, staged diff, and unrelated draft contents
remained unchanged. No commit or publication occurred. Verdict: PASS, no repair
required in the skill.

Two additional simulations covered a diagnosis-only production timeout without
environment access and a test blocked at import by a missing dependency. The
evaluator distinguished hypotheses/setup failures from reproduced behavior and
withheld a fix or resolution claim. These simulations were not live experiments.

Local fixtures and scenario simulations do not establish production-environment
or provider-backed validation.
