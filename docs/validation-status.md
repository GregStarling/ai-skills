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

`skills/delegate/`, 14 files. Reliability repairs added 2026-09-11: explicit worker-completion waits and compact finish outcome normalization. **All three targeted live cases passed**, with matched receipts and independent trace/artifact checks. See the [follow-up results](delegate-reliability-followup-results-2026-09-11.md) and [checklist](delegate-reliability-followup-plan.md).

| Digest | Value |
| --- | --- |
| Helper `folderDigest` (skill_folder_digest) | `sha256:603f405245b835466650a577657805970a2b0ae0da1c6792f00588cd6b3e0725` |
| `guidance_digest` (folder without `routing-pack.json`) | `sha256:f78d3f7e5cee1370e75dfd469db9c85ae49a38244c839f8255d78a02439759d1` |

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

A direct task therefore costs about 165 ms of helper time beyond the checks it would run anyway, and a check referenced at `finish` never runs twice.

These timings used the M1 folder before renewal. The current Claude mechanical lookup includes the additional calibrated reviewer and its scope limitations (4,157 bytes); no new timing measurement is claimed.

## Renewal decision

Renewal decision (2026-09-11): full renewal approved under the [130-execution completion authorization](delegate-completion-authorization-2026-09-11.md). The original renewal and scoped reviewer calibration completed with 3 cases withheld; the separate reliability follow-up now closes those gaps with three new passing runs. The original ledger remains 101/130, byte-identical. Follow-up usage is 10/17, cumulative 101 + 10 = 111 within the 118 ceiling, with seven remaining; both independent reviews and final publication validation passed. The dated results and evidence index contain the complete accounting. Astra and Fable are admitted only as additional mechanical_work/low reviewers. No expansion is funded: **no evidence supports delegation for this shape** for bounded_backend (m4-current-claude-1, m4-current-codex-1; 0/2 delegated wins or ties) and hard_debugging (m4-current-claude-2, m4-current-codex-2; 0/2). This is a declared proposal, authorizes evidence spending only, never route authority. Keep the direct rule and the current route scope; v4 is unnecessary. Renewal and approved scoped calibration do not broaden those shapes.

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
