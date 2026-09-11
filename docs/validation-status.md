# Validation status

The single current-state index. It is updated with every pack recompile and every consumer-folder change; `scripts/verify/skills.mjs` fails when the pack content digest or the consumer folder digest below stops matching what ships. Every dated report linked at the end is historical and immutable, except for dated append-only addenda. Nothing here is qualification, and no savings are claimed.

## Current pack

| Field | Value |
| --- | --- |
| Schema, mode | `routing_pack.v3`, production |
| `content_digest` | `sha256:ebda991b38d0a2eaba7434fbd577d447d5288412c9f195a9206cbc2498685619` |
| `generated_at` | 2026-09-11T05:16:44.956Z (reliability follow-up publication) |
| `refresh_after` | 2026-09-18T05:16:44.956Z |
| `expires_at` | 2026-10-11T05:16:44.956Z |
| Earliest route-entry expiry | 2026-10-11T02:29:16.954Z; publication guard requires no entry to expire more than 24 hours before the pack |
| Routes | 15 (14 low risk, 1 medium: Claude `mechanical_work`); qualified entries 0 |
| Free recompile window | until 2026-09-18T02:29:16.954Z (fresh frontier metadata age); a later refresh requires counted probes |

## Current consumer folder

`skills/delegate/`, 14 files. Large-repository revision added 2026-09-11: ordinary `dispatch` uses actual host slots and bounded assignments independent of repository size/language; evidence-required `route` remains strict and unchanged. Direct execution is valid at any size when the complete delegated path is unlikely to save allowance. One `observe` call records ordinary investigation/implementation outcomes without receipt ceremony. Earlier reliability repairs retain explicit worker-completion waits. **All three targeted reliability cases passed** on a preceding guidance iteration, not this revision. See the [follow-up results](delegate-reliability-followup-results-2026-09-11.md) and [checklist](delegate-reliability-followup-plan.md).

| Digest | Value |
| --- | --- |
| Helper `folderDigest` (skill_folder_digest) | `sha256:d7035599f99636078c60af35518d49454466033fd1aad0c40872352394ca536b` |
| `guidance_digest` (folder without `routing-pack.json`) | `sha256:b43a9eb8e79659effafa6cd66ab42f086e99c84a523b51f39505985d9d87feba` |

Native-host follow-up: Claude guidance explicitly selects Haiku/Sonnet through Agent, distinguishes definition versus invocation effort, and avoids a CLI child merely to tune ordinary effort. The [new ordinary comparison](delegate-ordinary-results-2026-09-11.md) completed four passing arms on frozen folder `0c0c39a5`, using eight of ten explicit executions. Direct estimates were $0.345498 / $0.438340 versus delegated $1.130673 / $0.864007; both proxy verdicts favor direct, with no subscription-savings or general large-repository claim. A one-sentence helper host-name clarification followed capture, so final-folder live acceptance is not claimed. The [evidence-path assessment](delegate-evidence-path-assessment.md) is assessment-only; the pack and historical evidence remain unchanged.

Follow-up release checks: 784 tests across 45 files, typecheck, build, portable packaging/reachability and built-CLI pack validation passed. The installed consumer folder matches the source digest above; its prior version was backed up outside skill discovery. The generic Python skill validator lacked PyYAML; repository YAML/frontmatter validation passed without a new dependency.

Feedback follow-up: routine observation instructions now live in the entrypoint, explicitly accepting frontier source inspection as passed checks without a command. Ordinary history uses the existing canonical project/host identity plus assignment/model/effort and a 30-day window. Free-text scopes are optional metadata; guidance hashes remain provenance, not lookup filters. Existing records remain readable and repeated observation calls retain their original guidance provenance. Strict evidence-receipt comparability is unchanged. Regression tests cover source-verified success, rejection of unchecked success, retained success/failure history after guidance edits or label changes, worktree/subdirectory sharing, and project/host/assignment/effort/time isolation. All 774 tests across 44 files, typecheck, build, portable packaging and pack publication validation passed. No new model trials or savings claims were added for these fixes.

Ordinary dispatch supports bounded location, source analysis, reproduction, tweaks, features, fixes, UI and settled cross-component plans. It is a declared host heuristic, not evidence qualification. High/critical risk, missing controls, unbounded work and unsettled diagnosis/interfaces stop explicitly. Large-repository guidance covers ownership discovery, cross-package read dependencies, explicit write scope and integrated checks. The packaging guard now rejects unreachable guidance, including orphan cycles. Local economic learning excludes elapsed time and raw tokens; only complete comparable allowance/attributable-cost observations can break quality/repair ties. Ordinary feedback surfaces failures/repairs without an economic preference. The [coverage audit](delegate-routing-coverage.md) distinguishes these paths. The routing pack and historical evidence remain unchanged; no measured savings or general large-repository capability qualification is claimed.

Revision checks: 772 tests across 44 files, typecheck, build, portable packaging/reachability, ordinary CLI dispatch and pack publication validation passed. A bounded independent usability forward-test in the real Foreman TypeScript repository completed ordinary dispatch, one read-only worker investigation, coordinator source verification and one outcome observation with usage null. Requested native worker controls were `gpt-5.6-luna`, medium effort, no history fork; served controls were not exposed. The investigator found the separate run-plan retry and dispatch requeue mechanisms and returned affected metadata, serial/parallel callers, tests and unresolved feature semantics. Verification corrected a minor repeated-failure/same-diagnosis conflation. No Foreman edits or broad test runs occurred. This tests investigation usability, not implementation quality, massive-repository generalization, model qualification or allowance savings. A wording fix afterward clarifies that configurable controls are checked before launch and observations afterward.

**Current acceptance: 14 cases across multiple consumer iterations.** Eleven original accepted records remain unchanged; three new follow-up runs passed on repaired folder `3b5f56fe`. The three original failed run IDs remain excluded and preserved in the [renewal results](delegate-renewal-results.md). Recompilation changes the pack after capture; no exact-published-folder live run is claimed. M4's four earlier matched pairs passed quality checks, with direct execution faster in all four.

## Measured helper overhead

Measured 2026-09-11 on the maintainer laptop (Node v22.23.2) from a copied folder with an isolated state root; wall-clock of one helper subprocess each, including Node startup. Source: `artifacts/helper-overhead-2026-09-11.json` (gitignored; commands recorded there). Counters are not subscription spending.

| Command | ms |
| --- | --- |
| `start`, host version supplied | 59 |
| `start`, host version observed from `claude --version` | 147 |
| `start`, host version observed from `codex --version` | 122 |
| `capture`, trivial check | 69 |
| `finish` by reference, trivial check | 104 |
| `capture`, realistic check (`npx vitest run test/routing/local-learning.test.ts`) | 9,952 |
| `finish` by reference after that capture | 100 |
| `finish` running the same realistic check itself | 9,724 |
| `lookup`, Claude `mechanical_work` low (3,373 bytes) | 29 |
| `lookup`, Claude coverage (417 bytes) | 28 |

An explicitly measured direct task costs about 165 ms of helper time beyond the checks it would run anyway, but ordinary direct work now skips the helper. A check referenced at `finish` never runs twice.

These timings used the M1 folder before renewal. The current Claude mechanical lookup includes the additional calibrated reviewer and its scope limitations (4,157 bytes); no new timing measurement is claimed.

## Renewal decision

Renewal decision (2026-09-11): full renewal approved under the [130-execution completion authorization](delegate-completion-authorization-2026-09-11.md). The original renewal and scoped reviewer calibration completed with 3 cases withheld; the separate reliability follow-up now closes those gaps with three new passing runs. The original ledger remains 101/130, byte-identical. The two recorded campaigns total 101 + 10 = 111; the follow-up used 10/17. A separately recovered external review adds five executions, bringing the reconciled observed total to 116. Both completed ledgers remain unchanged, and both independent follow-up reviews and publication validation passed. The [closeout reconciliation](delegate-closeout-2026-09-11.md) records the external review and direct manifest bindings; no further spending is authorized by its unused balance. Astra and Fable are admitted only as additional mechanical_work/low reviewers. No expansion is funded: **no evidence supports delegation for this shape** for bounded_backend (m4-current-claude-1, m4-current-codex-1; 0/2 delegated wins or ties) and hard_debugging (m4-current-claude-2, m4-current-codex-2; 0/2). This is a declared proposal, authorizes evidence spending only, never route authority. Keep the direct rule and the current route scope; v4 is unnecessary. Renewal and approved scoped calibration do not broaden those shapes.

## Evidence generations

Every row carries its own folder digest and origin; none carries qualification authority.

| Generation | When | Host versions | Consumer folder | Pack | Notes |
| --- | --- | --- | --- | --- | --- |
| 1. Route evidence: installed acceptance | validated 2026-09-10T03:09:16.077Z | Claude 2.1.222, Codex 0.142.5 (`host_versions` in `data/routing/archive/2026-09-10/installed-acceptance.json`) | `final_consumer_folder_digest` `sha256:2509569ea44c7dd78170df77214f858d0cafedb5d16b8890e1937680b3053767` (harness encoding); 12 of 14 cases ran on earlier iterations, and the pack names the 10 non-full-project ones with an earlier-iteration clause | `sha256:885956442ada2677325887532cff51c2a165ca11fb2237afe69b972c011a6e86` (the pre-refactor pack recorded in the acceptance file) | both UI cases `PASS_WITH_HARNESS_RECOVERY` (assisted); origin `qualification_evaluation`; `qualification_authority` false |
| 2. Usability pilots | 2026-09-10T18:32Z | Claude 2.1.267 (`claude-version.txt` sha256 `8af323716e94a684dd2faf7e0720ec75ad20db3791997bd6a6fb7eac59c0a5da`), Codex 0.154.0 (`codex-version.txt` sha256 `5efa0283757c66156d45d082b4e2e8afb881de3a97862bc03aed7fb34f45df7b`), from `docs/evidence/delegate-usability-2026-09-10/evidence.json` `host_captures` | harness `skill_folder_sha256` `6e3f9cd21e3e59693dd27db694c3b1c25df833b8dfe809456da61c4b0223f9d4` (source commit `8a0ceee`) | `sha256:e65c17c8910146e621095f4f94e252603fa39a3a27b6749d2124c1788974f5cc` | two-file rename on both hosts; Fable and Astra calibration passed, admission withheld; origin `qualification_evaluation`; `qualification_authority` false |
| 3. PR #5 live trials | 2026-09-10 | per `result.json` `host_version` | helper `folderDigest` `sha256:b78790de928c204b6df2c23b4a23c1a25ca34ac8550539039c0e95aefe9aea65` at `a7966cc`; harness folder `d3f057b37a3ee780c70b8dfd492728f4c9b3a4e5fa772bb85723a2aec4ebf5d1` | `sha256:e65c17c8910146e621095f4f94e252603fa39a3a27b6749d2124c1788974f5cc` | Claude direct PASS, Codex direct PARTIAL, Claude research INCOMPLETE, Codex research BLOCKED; raw digests in the addendum of [delegate-local-learning-validation.md](delegate-local-learning-validation.md); origin `qualification_evaluation`; `qualification_authority` false |
| 4. M4 current folder | 2026-09-11 | Claude 2.1.267, Codex 0.154.0 | `sha256:c26f10f0133603809068886da893c2073d4765ce924cd1d9a89dc3e19c923317` | `sha256:e6e532af2fe5f0b572b0c0cc338e837e60eda8fb03248981ce1ec47ef9622b3f` | four quality-gated pairs, direct wins all; evaluation only, qualification_authority false |
| 5. Fresh renewal | 2026-09-11 | Claude 2.1.267, Codex 0.154.0 | captured sha256:c26f10f0133603809068886da893c2073d4765ce924cd1d9a89dc3e19c923317; published sha256:e797626848d489bb3a14fca1dece3072ca650a62bd9a03825c454a6d08d3ee91 | captured e6e532af; published sha256:0dc26099e7ead306d8dd499ef6ecec324a8d163df2b50971ee16bef42f60fb57 | 11/14 acceptance; 3 withheld; fresh smokes and narrow reviewer admissions; qualification_authority false |

| 6. Reliability follow-up | 2026-09-11 | Claude 2.1.267, Codex 0.154.0 | captured `sha256:3b5f56fefda262915fd11d6dd0914ff1f2b0568bfd372d9dc5567857628ea391`; published `sha256:603f405245b835466650a577657805970a2b0ae0da1c6792f00588cd6b3e0725` | captured `0dc26099`; published `sha256:ebda991b38d0a2eaba7434fbd577d447d5288412c9f195a9206cbc2498685619` | three new passing runs; prior eleven records unchanged; multiple iterations; qualification_authority false |

## Historical reports

Immutable except dated append-only addenda.

- [v5-validation.md](v5-validation.md), 2026-09-10, pack `e65c17c8`, 9-file folder before PR #5; machine-readable result frozen at `data/routing/v5-validation.json`; later release-proof runs are written once under `docs/evidence/v5-validation/`.
- [v5-host-evidence.md](v5-host-evidence.md), [v4-validation.md](v4-validation.md), [v4-host-evidence.md](v4-host-evidence.md), [routing-pack-validation.md](routing-pack-validation.md).
- [delegate-usability-results.md](delegate-usability-results.md) with [its evidence metadata](evidence/delegate-usability-2026-09-10/evidence.json).
- [delegate-local-learning-validation.md](delegate-local-learning-validation.md) with the 2026-09-10 addendum.
- [standalone-delegate-validation.md](standalone-delegate-validation.md), [production-evidence-validation.md](production-evidence-validation.md).
