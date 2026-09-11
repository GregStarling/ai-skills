# Local learning validation — 2026-09-10

This report records the pre-publication implementation checks. No global skill installation was performed. The local helper, v2 receipt import, conservative resolver advice, research guidance, and advisory reminders are implemented. Live acceptance is incomplete; the published routing pack remains unchanged and does not authorize live-web research.

## Executed checks

- Repository suite: **463 tests passed in 33 files**.
- TypeScript typecheck and build passed.
- Portable skill copy/reference closure passed for all 14 consumer files.
- Existing production routing-pack publication validation passed; digest remains `sha256:e65c17c8910146e621095f4f94e252603fa39a3a27b6749d2124c1788974f5cc`.
- Independent offline review exposed and prompted fixes for wrong treatment attribution, omitted failed history, duplicate task samples, replacement-worker credit, missing reminder safety flags, independent reminder settings, stdin imports, corrupt-state reset, and capture storage inside repositories. Regression checks cover the corrected behavior.
- The optional skill-creator Python validator could not start because PyYAML is unavailable. The repository's existing Node/YAML metadata and portable-package checks passed. No dependency was installed merely for that checker.

The helper captures already-required checks once through a built-in subprocess wrapper. References to plain self-written success files do not establish positive learning. Missing/incomplete comparable evidence returns baseline; a repaired task cannot give positive worker credit to a failed original treatment. Captured outputs, receipts and personal state default outside repositories and installed skill folders. Evaluation stores used an explicit disposable override.

## Four bounded live trials

| Trial | Observed result | Duration |
| --- | --- | --- |
| Claude direct tiny bug | PASS: artifact, canonical v2 receipt, first reminder, repeat suppression, baseline advice and state readback | 119.027 s |
| Codex direct tiny bug | PARTIAL: artifact, canonical receipt, first reminder and suppression passed; account usage limit interrupted final advice/status readback and delivery | 160.184 s |
| Claude delegated documentation research | INCOMPLETE: one Haiku worker retrieved sources and returned a report; frontier verification did not finish and no canonical receipt was produced before timeout | 240 s deadline; 0.305 s process shutdown |
| Codex delegated documentation research | BLOCKED by account usage limit; no completed worker research or canonical receipt | 29.604 s |

Five visible model executions were observed: four coordinator launches and one Claude Haiku worker. No extra reviewer, fallback, repair, or retry model execution occurred. The approved ceiling was eight. Internal provider operations that are not exposed by the host cannot be counted. No additional live trials were launched after the account-limit and deadline failures.

The research fixture checked current official Node.js documentation for copying defaults and temporary-directory precedence. The report's structure passed, and live retrieval plus source passages were observed. Structural grading is not final source acceptance: the worker report still mixed a hard-error claim with an unresolved question about that same behavior. Do not treat this run as accepted live-web routing evidence or as support for general research qualification. The relevant sources were [Node filesystem documentation](https://nodejs.org/api/fs.html) and [Node OS documentation](https://nodejs.org/api/os.html).

## Exact version and evidence binding

All four trials copied the same final 14-file skill, preserved project instructions, and left the copied package unchanged:

- Harness folder SHA-256: `d3f057b37a3ee780c70b8dfd492728f4c9b3a4e5fa772bb85723a2aec4ebf5d1`.
- Helper folder digest: `sha256:b78790de928c204b6df2c23b4a23c1a25ca34ac8550539039c0e95aefe9aea65`.

These use different explicit encodings: the harness hashes JSON of relative filenames mapped to unprefixed file hashes; the helper hashes canonical JSON with prefixed file hashes. Both were independently recomputed and matched. Baseline digests bind the harness's complete baseline-file map, not just the edited file. Both direct receipts passed strict validation, exact run/origin/folder binding, and reference-byte hash verification.

Raw immutable baselines, requests, process summaries, traces and outputs remain gitignored under `artifacts/installed-delegate/`, in the four directories ending with `local-learning-{claude|codex}-{direct|research}-20260910a`. The derived audit is `artifacts/local-learning-validation/audit.json`. Every trial used `qualification_evaluation`; these outcomes cannot train personal routing. Client price estimates are not subscription bills, and this validation makes no savings claim.

Two harness-only corrections followed trace inspection: tinybug records now classify as mechanical work, and receipt harvesting excludes ordinary capture-input/output and research JSON artifacts. Original trial records are preserved; the direct trials' original task-class labels remain an explicit limitation. Those corrections passed the focused harness checks and did not change the tested skill folder. The initial research result listed five JSON artifacts as receipts; independent filtering found **zero canonical receipts**.

## Remaining acceptance work

Codex live acceptance requires usable account capacity. Delegated research requires a completed frontier review and canonical receipt within an explicitly approved validation budget. Until then, live-web delegation stays gated and the earlier supplied-source pack remains unchanged. Installation remains a separate requested action; repository publication does not change personal installations. Old pilots retain their original versions and scope; they do not validate this feedback loop.

## Addendum 2026-09-10: raw trial artifacts made locally auditable

Appended below the original report; nothing above this heading was edited. The four live trials above ran from the worktree at commit `735343c` (branch `codex/delegate-local-learning`), merged into `main` as `a7966cc`. Their raw directories and the derived audit were copied byte-identical into this checkout's gitignored `artifacts/` on 2026-09-10. The tested consumer folder is bound by the helper folder digest `sha256:b78790de928c204b6df2c23b4a23c1a25ca34ac8550539039c0e95aefe9aea65`, which equals `folderDigest(skills/delegate)` at `a7966cc`.

| File | SHA-256 |
| --- | --- |
| `artifacts/installed-delegate/claude-tinybug-local-learning-claude-direct-20260910a/result.json` | `e44f65503644786e95f7f5d2b99ec9c10806cc1ab82c64c40ff3d70ef752ebc7` |
| `artifacts/installed-delegate/codex-tinybug-local-learning-codex-direct-20260910a/result.json` | `f1043670db8ac9c2e8d01ee1b0e6fc8da1b92f87959235af0859e6d966f1df15` |
| `artifacts/installed-delegate/claude-research-local-learning-claude-research-20260910a/result.json` | `fec3b0acd2f3c30b612bba8900d1a4a5789e41ec8ca61f1d3cbbabac824de28c` |
| `artifacts/installed-delegate/codex-research-local-learning-codex-research-20260910a/result.json` | `c1e8feba1a8ddea123f9919adab585828ca228f75f3011ad00d3f5f98f33cb48` |
| `artifacts/local-learning-validation/audit.json` | `7c8aa3e1dcdedab3426e7e582384c9b9628623c950c9894fe3ab796b31e02a5f` |
| `artifacts/local-learning-validation/release-proof.json` | `32a8ef516d77f8e332ce4648ec782998d42a80f5fd36892c0ab16c4cf67d6e45` |

The original rows keep their verdicts. Later reruns are a new evidence generation and are recorded under their own dated heading, never as completions of these rows.

## 2026-09-11 counted pending-row reruns

The original PR #5 rows retain their original verdicts. These later trials used the current folder, requested coordinator effort high, and isolated learning state. They are qualification evaluations with no qualification authority. Model attempts include failed launches. The [M4 evidence index](evidence/delegate-direct-vs-delegated-2026-09-11/evidence.json) binds raw results, stdout and independent maintainer reviews.

| Trial | Later outcome | Attempts | Matched receipt | Result digest |
| --- | --- | ---: | --- | --- |
| m4-pending-claude-research | INCOMPLETE: Coordinator inspected retrieved source passages and found a substantive fs.cp claim defect. A second Haiku execution was launched for repair, but coordinator returned before repair completion; host reported stopped and no matched receipt/captured check/finish exists. | 3 | false | `sha256:b134aef51d0dd55c8374a9e0da67a63a69bed43bf0088e01195822f72be376bb` |
| m4-pending-codex-tinybug | PASS: Final code uses nullish default and preserves explicit zero; external grader passes, direct coordinator read the actual resulting file using nl. No child model launch. | 1 | true | `sha256:5b90af4faded846d2ded42d40ef85242286b57beafb9068851b0d427fee37777` |
| m4-pending-codex-research | PASS: Decision-critical fsPromises.cp options and os.tmpdir precedence match the preserved live official pages. Coordinator independently inspected the exact API sections, read the worker report, applied the facts to the final recommendation, passed structural capture, and finished with a matched live_web qualification_evaluation receipt. | 3 | true | `sha256:9a6a0746f95f31c4a24dcc1d60aa9a2581b618ab5ff2465068e666d5d4bce30d` |

Captured identities (helper folder digest, canonical pack digest, raw copied-pack SHA256):

- m4-pending-claude-research: `sha256:c26f10f0133603809068886da893c2073d4765ce924cd1d9a89dc3e19c923317`; `sha256:e6e532af2fe5f0b572b0c0cc338e837e60eda8fb03248981ce1ec47ef9622b3f`; `51781af8a6757d7ebcd6b011d3cd683b01a2b94294e40766bc57ab7d6570710e`.

- m4-pending-codex-tinybug: `sha256:c26f10f0133603809068886da893c2073d4765ce924cd1d9a89dc3e19c923317`; `sha256:e6e532af2fe5f0b572b0c0cc338e837e60eda8fb03248981ce1ec47ef9622b3f`; `51781af8a6757d7ebcd6b011d3cd683b01a2b94294e40766bc57ab7d6570710e`.

- m4-pending-codex-research: `sha256:c26f10f0133603809068886da893c2073d4765ce924cd1d9a89dc3e19c923317`; `sha256:e6e532af2fe5f0b572b0c0cc338e837e60eda8fb03248981ce1ec47ef9622b3f`; `51781af8a6757d7ebcd6b011d3cd683b01a2b94294e40766bc57ab7d6570710e`.

Codex research passed source inspection and receipt binding. Claude research remains incomplete after its repair worker failed to finish within the coordinator run. Neither result changes supplied-source routing or establishes live-web routing. The research completion condition cannot replace the failed expansion tally.
