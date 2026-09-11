# Handoff: Delegate completion plan, executed through M2

Written 2026-09-10 (late evening, America/Chicago) at the end of a Claude Code session that executed [the completion plan](delegate-completion-plan.md) through milestone M2 and started M3. This document is self-contained for a Codex session picking the work up. Nothing has been pushed; no PR exists; no live model execution was launched.

## Where the work is

Three stacked local branches, each one milestone, all committed and verified; a fourth branch holds the start of M3.

| Branch | Commit | Contents | State |
| --- | --- | --- | --- |
| `main` | `a7966cc` | unchanged upstream | as fetched |
| `claude/m0-provenance-window` | `89c2858` on `5427ea0` (plan doc) | M0: per-case folder provenance in the compiler, pack recompiled inside the free window, CI horizon line, write-once v5 reports, maintenance runbook and renewal options | 471 tests green at commit |
| `claude/m1-lookup-finish` | `faf2251` | M1: helper `lookup`, `finish`, cheaper `start`, receipt v3, learning defaults, host guide rename, consumer prose rewritten, `skills.mjs` guards, measured helper overhead | 631 tests green at commit |
| `claude/m2-honest-labels` | `a1908d6` | M2: `docs/validation-status.md` current-state index (CI-bound), PR #5 trial artifacts copied and digested, one folder digest in the harness and v5 script | 631 tests green at commit |
| `claude/m3-matched-harness` | `a1908d6` plus this handoff and the M3.2 criteria doc | M3.2 done; M3.1, M3.3, M3.4, M3.5 not started (two agents were cut off by a session limit before editing anything) | see below |

Verify any branch with:

```sh
npm test && npm run typecheck && npm run build && node scripts/verify/skills.mjs
```

and the CI pack check:

```sh
node --input-type=module -e "import {readFileSync} from 'node:fs'; import {validateRoutingPackPublication} from './dist/routing/index.js'; const p=validateRoutingPackPublication(JSON.parse(readFileSync('skills/delegate/routing-pack.json','utf8'))); console.log(p.content_digest, p.refresh_after, p.expires_at)"
```

Merge order if opened as PRs: m0, then m1, then m2 (each based on the previous). Commits are authored as Greg Starling; add your own co-author trailer to new commits.

## Hard dates

- 2026-09-14 20:23 local: Codex usage window resets (from the preserved PR #5 trace).
- 2026-09-17T04:09:41.232Z: frontier preflight goes stale; the M0 recompile already landed inside the window (pack `generated_at` 2026-09-10T23:41:35.095Z). Any later recompile costs 3 model executions.
- 2026-10-02: renewal decision D1 due (recorded as pending in `docs/routing-pack-maintenance.md` and `docs/validation-status.md`).
- 2026-10-10T02:07:24Z to 02:19:56Z: every route entry expires; `lookup` returns gaps from then. The pack header validates until 2026-10-10T23:41:35Z.

## What M0 to M2 changed, in one paragraph each

**M0.** `src/routing/acceptance.ts` now requires `copied_skill_digest` per case and `final_consumer_folder_digest` at the top of `data/routing/installed-acceptance.json` (both were already present) and emits one limitation string per joined record: `Case <id> accepted on consumer-folder iteration <8 hex> (maintainer-recorded attribution bound by record_digest); the published folder may differ.` plus `Earlier iteration than the acceptance run's last iteration <8 hex>.` when they differ. It never reads `matches_final_skill`; the wire stays `routing_pack.v3`. The pack was recompiled: `content_digest` `sha256:e6e532af2fe5f0b572b0c0cc338e837e60eda8fb03248981ce1ec47ef9622b3f`, 15 routes, 0 qualified, medium stratum unchanged, 10 cases carry the earlier-iteration clause. `.github/workflows/ci.yml` prints `refresh_after` and `earliest_entry_expires_at`. `scripts/verify/v5.mjs` writes write-once to `docs/evidence/v5-validation/<generated_at>-v5.json` via `scripts/verify/validation-report.mjs`. `test/routing/local-learning.test.ts` derives its clock from the pack's `generated_at` so recompiles cannot move the validity window past it.

**M1.** `skills/delegate/scripts/local-learning.mjs` (460 lines) gained a pure exported `lookup` (verbatim port of `src/routing/resolver.ts` predicates; a differential test covers all 15 routes times 9 rosters including `ranking_basis`), `finish` (checks by `command` or by mid-task `capture` `reference`; `inspected` verdicts asserted; git artifact snapshot as a capture event; routed attempts resolved against the route; idempotent; the helper never launches a model), a cheaper `start` (observes host version from the PATH binary, returns advice inline), `capture` output tails and a 600 s cap, `delegate_receipt.v3` (`guidance_digest`, `host_version_source`, `checks[].asserted`; v2 still loads; `src/ledger/receipts.ts` rejects v3 as local-only like v2). Declared learning defaults: coordinator effort may be null, scope optional, direct comparability by guidance digest, lock only for reset and disable, dot-files ignored, a mid-run folder change keeps the receipt but marks it unsupported. `coordinator_may_verify` is null with reason `fresh_process_required` on the fresh-context medium route. `hosts/claude.md` became `hosts/claude-code.md` (it resolved as a nested `CLAUDE.md` on APFS); installation text moved to `docs/install.md`. All consumer prose was rewritten as an ordered decision procedure (SKILL.md 5,981 bytes; two verbatim safety sentences; no governance vocabulary). `scripts/verify/skills.mjs` enforces vocabulary, the two sentences, `node:`-only imports and backtick path closure, with a `SKILLS_ROOT` override. Measured helper overhead is in `docs/validation-status.md`.

**M2.** `docs/validation-status.md` is the single current-state index and `skills.mjs` fails when it stops citing the shipped pack `content_digest` or the helper folder digest (currently `sha256:c26f10f0133603809068886da893c2073d4765ce924cd1d9a89dc3e19c923317`). Every consumer-folder edit and every recompile must update that file. README points at it. The four PR #5 trial directories and the audit were copied byte-identical into gitignored `artifacts/` (from the worktree `/Users/gregpro/ai-skills-delegate-usability` at `735343c`) and their digests appended to `docs/delegate-local-learning-validation.md`. `scripts/verify/installed-delegate.mjs` and `scripts/verify/v5.mjs` carry the helper's `folderDigest` as `skill_folder_digest` additively.

## M3: what exists and what remains

Done:

- `docs/delegate-direct-vs-delegated-results.md` (M3.2): fixture criteria, candidates with commit provenance, pairing protocol, win rule, expansion gate. Both harvested fixtures (`fixtures/harvested/foreman-t920-derived-gate-id`, `foreman-t897-reconnect-notice`) grade `behavioral_failure` with scope and grader integrity passing on the unedited candidate (verified 2026-09-10 through `dist/evaluation`).
- An isolated dependency copy for harvested trials at `artifacts/direct-vs-delegated/deps-b962c1ac/{node_modules,package-lock.json}` (gitignored, 265 MB, APFS clone of `/Users/gregpro/foreman/node_modules`; lock digest matches the manifests).

Remaining, with the interface contract the two cut-off agents were given (use it so the pieces fit):

- **M3.1 + M3.5 (one agent; files `scripts/verify/installed-delegate.mjs`, `src/evaluation/index.ts`, `test/evaluation/fixtures.test.ts`, `test/routing/installed-project.test.ts`).** `snapshot()` in `src/evaluation/index.ts` must skip a top-level `node_modules` entry (vitest writes `node_modules/.vite/vitest/results.json` into the nearest package root, which otherwise registers as a scope violation). `prepareInstalledTrial`/`installedTrial` gain `{harvested:{fixtureId, sourceRepository, dependencyDirectory}}`, `{skillSource}` (an exported skill folder to copy instead of `skills/delegate`, for before-folder pairs) and `{dryRun:true}` (everything up to but not including `execute()`, returning `{prompt, args, manifest, prepared, destination}`). Harvested branch: mkdtemp project, git init, trial `AGENTS.md`/`CLAUDE.md` at the project root, `dependencyDirectory` must not be inside `sourceRepository` (`FIXTURE_DEPENDENCIES_INSIDE_SOURCE`) and its parent `package-lock.json` must match `manifest.package_lock_digest`; clone it to `<project>/node_modules` with `cp -c -R` (fallback `cp -R`, never a symlink) and copy `package-lock.json` beside it; lazily import `prepareFixture`, `gradeFixture`, `fixturePrompt` from `dist/evaluation/index.js` and `digest` from `dist/core/canonical.js` (CI runs `npm test` before `npm run build`, so top-level imports of `dist` break every existing test); `prepareFixture({fixtureId, sourceRepository, workspaceRoot:<project>, bundleRoot:join(root,'fixtures/harvested')})`; `fixtureRoot` is the candidate; grade with `gradeFixture({prepared, candidateIdentity:<a sha256 digest, labels are rejected>, dependencyDirectory:<project>/node_modules, timeoutMs:120000})`. `startInput.task_class` maps `{bounded_backend:'bounded_implementation', hard_debugging:'hard_debugging'}`; `startInput.scope` is `harvested-<fixture_id>` (mode-free). The harvested prompt appends the evaluation-only scope exception with the mapped class, the single check `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` run in the candidate and captured once, and "Do not run npm install or modify node_modules"; `result.json` records `scope_exception:{route_class, host, reason}`. Learning instructions: detect the copied helper's command set (`command==='finish'` present in the copied `local-learning.mjs`) and select variant `current` (start before the task, capture the check once, one `finish` at delivery with `finish-input.json`/`finish-result.json` under the evaluation directory) or `legacy` (the PR #5 five-call text still in the file); record `instruction_variant` and `helper_commands` in the manifest and result. After `execute()`: classify with an exported pure `classifyTrial({host, stdout, stderr, telemetry, fixtureRoot, before, after})` using `parseNativeTelemetry` from `dist/runtime/telemetry.js`: `blocked_provider_limit` (provider error, no progress, message matches `/usage limit|hit your (usage )?limit|rate limit/i`), `blocked_provider_error`, `harness_budget_cap` (a Claude result subtype containing `budget`), else `pending_frontier_trace_review`; progress means a Codex `file_change` item or a Claude Edit/Write inside `fixtureRoot`, or an after-grade that differs from before. Record telemetry `session_id` as `thread_id`/`session_id`. Claude `--max-budget-usd` is 5 at 240 s and 12 at 600 s, recorded; Codex args stay byte-identical (pin them in a dry-run test). Lazily import `scripts/verify/trace-ledger.mjs` in a try/catch and attach `result.ledger`.
- **M3.4 (one agent; files `scripts/verify/host-evidence.mjs`, `scripts/verify/trace-ledger.mjs` new, `test/routing/trace-ledger.test.ts` new, `test/fixtures/traces/**` new).** `execute()` additionally writes `stdout.timed.jsonl` (`{"at":<ISO receive time>,"line":<raw>}` per line) with `stdout.jsonl` bytes unchanged. `executionLedger(host, timedJsonlText, {fixtureRoot, allowedPaths})` returns `{rows:[{index, role, mechanism, model, model_source, started_at, ended_at, failed_launch, usage, counter_kind}], executions, failed_launches, rework_heuristic, routing_reads, helper_calls, task_wall_clock_ms, helper_tail_ms, limitations}`; Claude children are `Agent` tool_use events (model from `input.model`, ended at the matching tool_result) and Bash tool_use events launching `claude -p` or `codex exec`; Codex children are completed `collab_tool_call` items with tool `spawn_agent` (usage null, `usage_scope` `thread_total_child_inclusion_unknown`); never sum child and coordinator counters; rework is mechanical (a child row that starts after the first completed child row and after a coordinator Read or Bash naming an allowed path) and labelled heuristic; `task_wall_clock_ms` runs to the first helper `finish` or `record` call. Derive event field names from the real samples under `artifacts/installed-delegate/*/coordinator/stdout.jsonl` (gitignored) and commit minimal redacted excerpts under `test/fixtures/traces/` with a README naming each source run and full-trace sha256, so the tests run in CI.
- **M3.3 + the offline half of M4.1 (after M3.1; files `scripts/verify/direct-vs-delegated.mjs` new, `test/routing/direct-vs-delegated.test.ts` new).** Pair driver per the plan and the results doc: two fresh projects per fixture and host from one manifest, identical baseline digests, alternating order, run ids `<pair>-<arm>`, 600 s, `maxModelCalls` 1 direct / 4 delegated, `skillSource` with instruction-variant selection, dry-run manifests with `thread_ids:null` and `host_version:null`, refusal of existing result directories, the quality-gate-first win rule as exported pure functions, sanitized child environment via `nativeEnvironment()` and `captureIdentityEnvironment()` from `dist/runtime/native.js` (nested Claude Code variables are inherited otherwise; the earlier memory note used `env -i HOME PATH USER SHELL TMPDIR`), a running execution tally that refuses an arm when the ceiling would be exceeded, provider-error classification by message, and preflight output only under `artifacts/direct-vs-delegated/preflight-<host>-<timestamp>/` with `purpose:'capacity_preflight'`.

After M3 lands: update `docs/validation-status.md` if the consumer folder changed (it should not in M3), run the full check list, commit on `claude/m3-matched-harness`.

## Stop line

M4 and M5 spend model executions and need the user's decisions D1 to D8 in the plan (renewal option and budget, fixture source, the 29-execution M4 ceiling, before-folder pairs, expansion gate, Fable and Astra admission, a v4 wire bump). Do not launch any live trial, probe, calibration or recompile without an explicit approval naming the count.

## Gotchas learned this session

- A recompile moves the pack's validity window; any test that pins a clock before `generated_at` breaks. Derive test clocks from the pack.
- `file` reported `test/routing/local-learning.test.ts` as binary and BSD `grep` silently matched nothing: an agent had written a literal NUL byte into a unicode fixture. Use `grep -a` or a byte scan when a text file behaves oddly; the fix was the ` ` escape.
- `scripts/verify/skills.mjs` now fails on any consumer edit or recompile until `docs/validation-status.md` cites the new digests. That is intended.
- Consumer markdown must not put non-shipped paths (for example `docs/install.md`) in backticks; the verifier resolves every backtick path inside the copied folder.
- `SKILL.md` has 19 bytes of headroom under its 6,000-byte budget.
- The lookup answer for Claude mechanical low is 3,372 bytes; the plan's ceiling was raised to 4,096 because the M0 provenance strings are kept verbatim by design.
- The helper's CLI ignores any `now` inside an input file; tests pass `now` as an option.
- Claude subagent sessions on this account hit a session limit at about 250K subagent tokens per burst late on 2026-09-10 (reset 20:10 local); plan waves accordingly.

## Environment

- Repo `/Users/gregpro/ai-skills`; foreman checkout `/Users/gregpro/foreman` (source of the harvested fixtures; read-only for trials); PR #5 worktree `/Users/gregpro/ai-skills-delegate-usability` at `735343c`.
- Installed personal copy of the skill at `~/.claude/skills/delegate` is the pre-M1 folder (pack `e65c17c8`); not updated by this work, by design.
- Plan artifact page: https://claude.ai/code/artifact/3db28920-7805-4859-9dd5-e732b093b7d8
