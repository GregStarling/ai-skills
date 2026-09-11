# Delegate reliability follow-up implementation handoff

Requested scope: close premature worker shutdown and compact finish-input failures, then verify only Claude UI, Claude full-project, and Codex multicomponent. Start: local `main` at `dd2a890`; work branch `codex/delegate-reliability-followup`. No push or global installation.

Check an item only when the accompanying artifact, test result, or commit proves it. The campaign directory below is gitignored raw evidence; the final dated report and evidence index must expose its relevant hashes and verdicts.

Campaign: `artifacts/delegate-reliability-followup-2026-09-11/`. Its `budget.json` has the user-approved ceiling of 17 additional executions. Prior usage is 101; cumulative maximum is 118. Never edit the original campaign ledger or historical reports.

## 1. Offline repair

- [x] Consumer instructions require every launched worker to reach a terminal state before integration, final inspection, or delivery; launch acknowledgement is insufficient.
- [x] Claude guidance prefers foreground single-worker CLI execution, collects every parallel child's exit/result, and waits using the host completion tool for background jobs.
- [x] Full-project store and view ownership is disjoint; the coordinator integrates; stopped/failed workers cannot establish completed delivery.
- [x] Compact `finish` alone maps `unavailable` to canonical `blocked`, meaning inability to execute. Canonical `record` and full attempts remain strict.
- [x] All attempt outcomes are validated before snapshots, verification commands, or receipt writes; other invalid outcomes yield `ATTEMPT_OUTCOME_INVALID`.
- [x] Document supported outcomes and `failed` for unsuccessful attempted launches. Retain failed attempts and unknown identities.
- [x] Regression: unavailable attempt plus successful fallback yields a valid receipt containing both; canonical rejection, unknown identities, and finish idempotency remain intact.
- [x] Regression: arbitrary invalid compact/full outcomes produce no new captures, artifact events, or receipts.
- [x] Synthetic completed/stopped/missing worker coverage remains; unfinished workers cannot establish delivery.
- [x] Refresh current consumer-folder/guidance digests and label repairs awaiting live verification.
- [x] Run `npm test`, `npm run typecheck`, `npm run build`, `node scripts/verify/skills.mjs`; commit offline repair and record its hash. Evidence: `8b6a803`.


Offline evidence: `offline-tests-terminal.log` records 732 passing tests across 42 files. `offline-typecheck-final.log`, `offline-build-final.log`, and `offline-skills-final.log` record successful required checks. Receipt regressions are in `test/routing/local-learning.test.ts`; terminal-state regressions are in `test/routing/trace-ledger.test.ts` and `test/routing/assemble-evidence.test.ts`. The exact current digests are in `docs/validation-status.md`.

## 2. Bounded campaign

- [x] Separate approved ledger and unique directory created. Evidence: campaign `budget.json`, immutable approval, `baseline.json`; original ledger is 101 executions with none reserved.
- [x] CLI versions match canonical acceptance: Claude `2.1.267 (Claude Code)`, Codex `codex-cli 0.154.0`. Frontier freshness and entry expiry permit publication after a one-hour window. Evidence: `preflight.json`.
- [x] Extend renewal runner with optional `runId`, `outputDirectory`, `budgetFile`; preserve defaults. Verify unique outputs, duplicate refusal, budget exhaustion, and uncertain-launch charging offline. Evidence: `test/routing/renewal-runner.test.ts`, all three tests passed in `offline-tests-terminal.log`.
- [x] Independent review: PASS, 223 targeted tests passed across four files; no material findings. Evidence: `code-review-1.json`, settled ledger entry `reliability-code-review-1` (one execution). Final publication follow-up also passed (`code-review-2.json`, nine publication tests and hash/binding checks; one execution). Full required checks also passed as recorded above.
- [x] Freeze and hash consumer folder and harness after repairs/review and before live cases. Evidence: `freeze.json`, commit `8b6a803`, folder `sha256:3b5f56fefda262915fd11d6dd0914ff1f2b0568bfd372d9dc5567857628ea391`. `run-case.mjs` verifies it before each launch.
- [x] Lead implements directly; no implementation agents, model probes, calibration, or extra renewal. Restrict case execution to the three named rows below.

| Operation | Maximum executions | Actual / evidence |
| --- | ---: | --- |
| Independent code review including one follow-up | 2 | 2; `code-review-1.json`, `code-review-2.json`, both PASS |
| Claude UI | 4 | 2; `reliability-claude-ui/accounting-reconciliation.json` |
| Claude full-project | 6 | 3; `reliability-claude-fullproject/accounting-reconciliation.json` |
| Codex multicomponent | 4 | 2; `reliability-codex-multicomponent/accounting-reconciliation.json` |
| Fresh Claude UI image review | 1 | 1; `reliability-claude-ui/browser/frontier-review/accounting.json` |
| Total | 17 | 10; cumulative 111; seven remain |

Reserve an operation's maximum before launch, then settle actual executions including failed launches, fallbacks, reviewer turns, and repairs. Reconcile native sessions against exported traces before the next case. Unresolved accounting halts the campaign; provider limits stop the affected host. Do not alter provider settings.

## 3. Exactly three serial cases

All cases use the existing sanitized environment, isolated evaluation learning state, unique run ID and output directory, and a 600-second cap. Run each once. On any failure preserve it and stop promotion; no replacement trials or artifact repair followed by relabeling. If a hard gate prevents continuation, report it and remaining allowance.

- [x] Claude UI: completed worker precedes final coordinator inspection; structural checks and matched receipt pass. Evidence: `reliability-claude-ui/gate.json`, `maintainer-review.json`, `assembled-case.json`.
- [x] Capture unchanged UI artifact using existing browser utility at 320 and 1280 pixels. One fresh image reviewer actually reads both images. Verify associated labels, visible keyboard focus, and no horizontal overflow. Evidence: `reliability-claude-ui/browser/browser-checks.json`, fresh reviewer `frontier-review/stdout.jsonl` with Read IDs `toolu_01FbQptZryqiPTq8kSdyyf2D` and `toolu_015fpebkcxEbzYmo9xViZYwQ`.
- [x] Claude full-project: two completed workers with disjoint store/view ownership; coordinator app integration after both completions and final inspection of all three modules; external checks and matched receipts pass. Evidence: `reliability-claude-fullproject/gate.json`, `maintainer-review.json`, `assembled-case.json`.
- [x] Codex multicomponent: final module inspection after terminal worker completion, successful finish and matched receipt. Native parent/child sessions confirm no failed launch or fallback in this run; offline regression covers unavailable plus fallback. Evidence: `reliability-codex-multicomponent/gate.json`, `maintainer-review.json`, `preserved/native-sources.json`.
- [x] Requests, timed stdout, stderr, artifacts, receipts and relevant native sessions preserved; each case has `accounting-reconciliation.json` before the next launch. See the dated evidence index for every digest and limitation.

## 4. Publication — only if all three cases and reviews pass

- [x] Archive current canonical acceptance byte-identically; record SHA-256 content and Git blob hashes.
- [x] Assemble three new records from actual trace inspection references and new run IDs. Keep the existing 11 records unchanged; exclude original failed run IDs.
- [x] Retain per-case folder provenance. Describe 14-case coverage as multiple consumer iterations, never 14 fresh runs of the repaired folder.
- [x] Preserve smoke observations, frontier evidence, calibration, policy, and medium audits byte-identically against `baseline.json`.
- [x] Recompile using real clock and normal expiry guard, without `--allow-short-entries`.
- [x] Verify 15 provisional routes, zero qualified entries, unchanged reviewer admissions and narrow medium scope. Full-project evidence creates no whole-project worker route.
- [x] Pin previous-generation publication tests to the archived snapshot. Add current-generation assertions for preserved 11, new three, valid bindings, and original failed-ID exclusion.
- [x] Publish a dated report and evidence index with all attempts, verdicts, digests, execution totals, original failure links; update current status and exact pack/folder digests.
- [x] Complete suite before build, typecheck, build, skills verification, built-artifact suite, and CI publication check.
- [x] Evidence refresh committed separately on `codex/delegate-reliability-followup`, commit subject `test(delegate): publish three reliability follow-up acceptances`, following offline repair `8b6a803`. The dated results and validation artifact record tests, 10/17 executions (111 cumulative), and all three PASS verdicts. Branch is ready for integration; no push or global installation.

Completion requires both repairs, three independently checked passing cases, and validated publication. Any failed gate remains explicit; do not claim the gap closed.

Publication evidence: `data/routing/archive/2026-09-11-pre-reliability/preservation.json` proves archived bytes/blob; `docs/evidence/delegate-reliability-followup-2026-09-11/evidence.json` binds all new/preserved cases, unchanged source inputs, routing scope, frozen provenance and final accounting; `validation.json` records 734 pre-build passes plus two expected skips, 736 built passes, typecheck/build/skills PASS and CI publication VALID. The dated results describe the corrected native alias metadata and retain the original review; no live artifacts or verdicts changed.
