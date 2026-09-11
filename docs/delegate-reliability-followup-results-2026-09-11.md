# Delegate reliability follow-up — 2026-09-11

Both reliability repairs are implemented, and all three targeted live follow-up cases passed once. The refreshed pack retains 15 provisional routes, zero qualified entries, the existing reviewer admissions, and the narrow Claude mechanical medium scope. Final publication review and full validation are recorded below.

Implementation: `8b6a803`, on `codex/delegate-reliability-followup` from local `main` at `dd2a890`. No push or global installation. The [implementation checklist](delegate-reliability-followup-plan.md) tracks the gates; the [evidence index](evidence/delegate-reliability-followup-2026-09-11/evidence.json) records attempts, verdicts, bindings, digests, limits, and raw artifact references.

## Repairs and offline verification

The consumer now requires terminal completion of every launched worker before integration, final inspection, or delivery. Claude guidance covers foreground execution, waiting for background completion, collecting each child's result, and disjoint store/view ownership with coordinator integration. The acceptance assembler rejects missing or unsuccessful worker completion, including native error and shutdown states.

Compact `finish` attempt inputs alone accept `unavailable` as shorthand for canonical `blocked`, meaning inability to execute. Canonical receipts and `record` remain strict. Explicit `null` and arbitrary invalid attempt outcomes fail before artifact snapshots, checks, or receipt writes. Documentation distinguishes unsuccessful launches (`failed`) from unavailable execution (`blocked`), and preserves unknown identity fields.

Offline regression reproduces unavailable plus successful fallback, retaining both attempts in a valid receipt. Strict canonical validation, finish idempotence, unknown identities, no-side-effect rejection, and completed/stopped/missing native worker evidence remain covered. Runner overrides provide unique run IDs, output directories, and a separate budget ledger; tests cover duplicates, exhaustion, and uncertain launches. Independent review passed; 732 tests, typecheck, build, and skills verification passed before the repair commit.

## Three new cases

| Case | Verdict | Executions | Evidence |
| --- | --- | ---: | --- |
| Claude UI | PASS | 2 | Native Haiku worker completed at 04:55:19.872Z; coordinator read final HTML at 04:55:40.776Z and 04:56:48.659Z. Structural checks and matched receipt passed. |
| Claude full-project | PASS | 3 | Two completed Haiku CLI workers owned store/view separately; coordinator integrated app at 05:03:39.654Z after both completed, then inspected every module. External checks and matched receipts passed. |
| Codex multicomponent | PASS | 2 | Native gpt-5.5/low worker completed at 05:08:37.563Z; coordinator read all three final modules at 05:08:49Z. Checks and `finish` passed with a valid matched receipt. |

One fresh Claude Opus 5/high image review used one further execution. Both 320×900 and 1280×900 screenshots were actually read (tool IDs in the index); the reviewer returned ACCEPT. Captured input hashes remained unchanged. Semantic labels, visible input keyboard focus, readable layout, and absence of horizontal overflow passed. The coordinator also inspected a checkbox-focus screenshot. This fixture requires no add-task JavaScript behavior.

No case required a failed launch, fallback, artifact repair, or replacement run. Codex used an eligible gpt-5.5 worker directly; the unavailable-plus-fallback receipt path is established by the offline saved-input regression, not a claimed live fallback. Parent and child native sessions confirm the execution count.

## Evidence publication and provenance

The previous canonical acceptance file is [archived byte-identically](../data/routing/archive/2026-09-11-pre-reliability/installed-acceptance.json), with content digest `sha256:501ef35a1cddadf79595ffa36d18020f1888c90f109aa44bdcceba109cfebe13` and Git blob `7e9e9d0a5f9f5f2ecd103f72e2b7751d03810bf1`. Its eleven case records remain unchanged. Three new run IDs were appended; the [three original failures](delegate-renewal-results.md) remain excluded and preserved in the [original evidence index](evidence/delegate-renewal-2026-09-11/evidence.json).

The resulting fourteen-case coverage spans multiple consumer iterations. All three new runs used frozen repaired folder `sha256:3b5f56fefda262915fd11d6dd0914ff1f2b0568bfd372d9dc5567857628ea391`, with guidance digest `sha256:f78d3f7e5cee1370e75dfd469db9c85ae49a38244c839f8255d78a02439759d1`. Recompilation changed only routing-pack bytes after the runs. This is not fourteen new runs of the repaired folder or a live run of the final published folder.

Final pack: `sha256:ebda991b38d0a2eaba7434fbd577d447d5288412c9f195a9206cbc2498685619`. Published folder: `sha256:603f405245b835466650a577657805970a2b0ae0da1c6792f00588cd6b3e0725`. [Current status](validation-status.md) contains the exact generation and expiry times.

The publication binding regression caught an incorrect maintainer metadata field for Claude UI: native alias `haiku` had been described as an exact canonical configuration. A preserved correction retains the literal requested alias and binds the canonical model from nested worker `message.model`. No raw run, artifact, receipt, or verdict changed. Both relevant new case bindings now validate; full-project evidence creates no whole-project worker route.

Smoke observations, frontier evidence, calibration reports/admissions, policies, medium audits, and historical reports remain unchanged. Host versions matched the canonical acceptance file. Frontier freshness and entry expiry passed a one-hour publication-window guard before spending; recompilation used the real clock and normal expiry guard without `--allow-short-entries`.

## Budget and final checks

The separate approved ceiling is 17 additional executions, cumulative maximum 118. Final usage is **10/17**, cumulative **101 + 10 = 111**, with **7 executions remaining** in this campaign: two code/review turns, seven case executions, and one image review. The original 101-execution ledger remains byte-identical. No probes, calibration, implementation agents, or provider setting changes occurred. Host counters and list-price estimates are not measured subscription spending.

Final independent publication review: **PASS**, including nine targeted publication tests and independent hash/binding checks. The complete suite passed before build (734 tests, two expected build-dependent skips), followed by typecheck, build, skills verification, all 736 built-artifact tests, and the CI publication check (**VALID**). The settled index also passes the targeted publication tests. [Validation evidence](evidence/delegate-reliability-followup-2026-09-11/validation.json) records command logs and hashes. The evidence refresh is committed separately from `8b6a803`; the final handoff supplies both commit hashes.

## Limits

Claude full-project worker file attribution combines disjoint packets, successful child CLI results, before/after artifacts and absence of coordinator store/view edits; child summaries do not expose their Edit events. Native configuration is distinct from served identity. Codex child usage is unavailable and parent/child counters are not summed. The ledger's later close-agent observation is not the first completion timestamp; the preserved terminal wait event proves completion before inspection. These cases establish the narrow tested workflow, without qualification or wider routing authority.
