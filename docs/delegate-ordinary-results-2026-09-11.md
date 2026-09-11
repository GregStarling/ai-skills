# Ordinary delegation: implementation and comparison

**All four arms passed; neither paired result supports savings from this investigate-first workflow.** The direct path had the lower API-equivalent estimate in both cases. These are client-side price proxies, not subscription charges or allowance measurements.

## Results

| Foreman TypeScript task | Direct estimate | Delegated estimate | Delegated change | Held-out checks | Explicit executions |
| --- | ---: | ---: | ---: | --- | --- |
| Derived acceptance-gate ID | $0.345498 | $1.130673 | +227.3% | Both pass, 11 tests each | 1 direct / 3 delegated |
| Uncounted reconnect notice | $0.438340 | $0.864007 | +97.1% | Both pass, 21 tests each | 1 direct / 3 delegated |

Native Claude Code 2.1.267 ran Opus 5 coordinators. Delegated arms used explicit Agent `haiku` then `sonnet`, with native totals/forwarded messages identifying `claude-haiku-4-5-20251001` and `claude-sonnet-5`. Requested coordinator effort was high; served effort was unavailable. Worker effort was recorded as null. No repair workers, child model CLI launches, substitutions, provider limits or timeouts occurred. All eight explicit executions completed; two unused budget slots were not spent.

Opus source verification caught and corrected Haiku's proposed invalid word-boundary regex on the reconnect task before Sonnet implementation. Both delegated arms stored two accepted/passed observations with zero repairs and usage null. Both first used the invalid helper host name `claude-code`, then corrected it to `claude`; the extra helper calls and discovery stayed in the measurement. The backend coordinator also corrected a failed inline verification probe. No failures were erased or favorable reruns substituted.

The coordinator itself cost more in each delegated arm than the entire corresponding direct arm. Cheap workers did not offset coordination, source verification and integration in these samples. That observation does not isolate which individual overhead caused the difference, and does not prove delegation loses on larger investigations.

## Method and accounting

The opt-in `ordinary-investigation-first` harness mode uses the same two harvested fixtures, frozen starting artifacts, isolated project contexts, copied dependencies, allowed write paths and protected external graders as the earlier comparison. Backend order was direct then delegated; reconnect order was delegated then direct. Direct Opus performed the task without helper/worker calls. Delegated Opus dispatched Haiku investigation, verified sources and settled decisions, dispatched Sonnet implementation, then inspected and verified the result.

Both arms received the same compiler check and held-out grading. Additional proportionate inline checks were allowed and counted. Maintainer trace/artifact review separately accepted quality and workflow adherence. The legacy worker-wrote-every-file criterion was not used; source verification, role boundaries, final integration and actual observations were reviewed instead. Legacy receipts, qualification probes and TypeScript route exceptions were absent.

The plan reserved ten **explicit coordinator/worker executions**, not ten API requests: one per direct arm and up to four per delegated arm, including one optional repair. This is a prompt ceiling with post-run accounting, not a hard quota. Each arm retained the native $12 estimate guard and 600-second process limit. No paid preflight or retry campaign ran. Total native estimate across the four arms was $2.77851825; experiment setup, this maintainer session and report writing are outside those task-arm estimates.

Each distinct native final `modelUsage` aggregate was summed once and reconciled against `total_cost_usd`. Every traced task execution mapped to those totals. Parent and child usage counters were never added together. The direct results additionally contained small unassigned Haiku totals ($0.001673 and $0.001676), included in full rather than attributed to an invented worker. The traces do not expose their purpose or count as separate task executions. Per-model usage is documented as session-level model accounting, including multi-model/subagent work; it is not authoritative billing. See [Claude cost tracking](https://code.claude.com/docs/en/agent-sdk/cost-tracking).

The comparison requires complete terminal accounting, scope/integrity/behavior checks, unchanged instructions/skill, maintainer acceptance, role adherence and comparable accounting before an economic verdict. Missing coverage yields inconclusive. Raw tokens and elapsed time never decide the winner. Diagnostic durations were 37.014s / 217.857s for backend and 60.500s / 198.442s for reconnect (direct / delegated).

This is **n=1 per task shape**, with a fixed requested role split and existing prompt caches, not a statistical estimate or proof of massive-repository performance. Prior unfavorable trials remain unchanged. The two tasks establish bounded TypeScript execution, not general feature/bug capability or subscription savings.

## Evidence and version boundaries

[Machine-readable evidence](evidence/delegate-ordinary-2026-09-11/evidence.json) contains frozen baselines, result/trace/manifest/artifact digests, native counters, preserved observation data, maintainer review references and recomputable verdicts. Raw artifacts remain in the gitignored `artifacts/direct-vs-delegated/ordinary-live-2026-09-11` directory; private source/transcripts are not published. Foreman's source checkout stayed unchanged.

All four trials used consumer folder `sha256:0c0c39a532a0f08ec4650d757a9be4da0517295202fcff50f53169b7d1174f5f`. After capture, one host-guide sentence explicitly names `host:"claude"` to prevent the mistake seen in both delegated arms. Published folder identity is in the [validation index](validation-status.md). That clarification received local regression checks, not another model trial; no exact-final-folder live acceptance is claimed. The routing pack did not change.

## Completion checklist and reuse

- [x] Native Haiku/Sonnet defaults, capability-aware effort reporting and conditional CLI fallback.
- [x] Opt-in ordinary harness, legacy compatibility, weighted accounting and failure gates.
- [x] Four-arm dry run with matching baselines and no model executions.
- [x] Four live arms; eight of ten explicit executions used; all workers terminal.
- [x] Held-out grading, source/artifact review and isolated observations inspected.
- [x] [Evidence-path dependency and footprint assessment](delegate-evidence-path-assessment.md); no extraction or deletion.
- [x] Full local tests, typecheck, build, packaging/reference closure and pack validation.
- [x] Installed skill backed up outside discovery directories, synchronized and digest-matched to source.

Final local verification: 784 tests across 45 files passed, plus typecheck, build, portable packaging/reachability and the built CLI's routing-pack validation. Skill Creator's Python quick validator could not load its absent PyYAML dependency; the repository's existing YAML/frontmatter and packaging checks passed without installing a dependency. Installed backup: `/Users/gregpro/.agents/skill-backups/delegate-native-jDAaT3/delegate`.

To prepare this workflow without spending model usage:

```sh
node scripts/verify/direct-vs-delegated.mjs --dry-run \
  --workflow ordinary-investigation-first --host claude \
  --campaign-id ordinary-check --output artifacts/direct-vs-delegated/ordinary-check
```

Execution additionally needs `--execute --approved-executions 10`, local authenticated Claude, the source repository and pinned external dependencies. Paths can be supplied through the existing source/dependency/skill flags. Use a new output directory; historical artifacts are immutable. **This report authorizes no further model spending.**
