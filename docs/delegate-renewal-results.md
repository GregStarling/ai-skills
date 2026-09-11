# Delegate renewal results — 2026-09-11

The full existing-scope renewal attempted all 14 installed cases: **11 passed trace-bound acceptance; 3 remain incomplete**. All six incumbent treatments have fresh smoke evidence and official availability/pricing citations. Fresh three-case calibration admits Astra and Fable only as additional low-risk mechanical reviewers. These observations grant no qualification.

| Host | Case | Acceptance | Execution attempts | Failed launches |
| --- | --- | --- | --- | --- |
| claude | tinybug | PASS | 2 | 0 |
| claude | mechanical | PASS | 2 | 0 |
| claude | backend | PASS | 2 | 0 |
| claude | ui | INCOMPLETE | 2 | 0 |
| claude | hardbug | PASS | 2 | 0 |
| claude | multicomponent | PASS | 2 | 0 |
| claude | fullproject | INCOMPLETE | 3 | 0 |
| codex | tinybug | PASS | 2 | 0 |
| codex | mechanical | PASS | 3 | 1 |
| codex | backend | PASS | 2 | 0 |
| codex | ui | PASS | 2 | 0 |
| codex | hardbug | PASS | 3 | 1 |
| codex | multicomponent | INCOMPLETE | 3 | 1 |
| codex | fullproject | PASS | 3 | 0 |

Incomplete cases are excluded from canonical installed acceptance:

- renewal-installed-claude-ui: INCOMPLETE: coordinator ended while the background worker was stopped. The saved artifact passes structural and later rendered review, but no valid matched receipt or final coordinator artifact inspection exists. Separate rendered review grants no replacement lifecycle acceptance.
- renewal-installed-claude-fullproject: INCOMPLETE: coordinator ended after starting two background Haiku workers; both were stopped at shutdown. All three saved artifacts remain the original stubs, the external grader fails, no final artifact inspection or integration occurred, and both receipt files are empty invalid JSON.
- renewal-installed-codex-multicomponent: INCOMPLETE: final modules pass source inspection and external checks, but finish returned RECEIPT_V3_MALFORMED. Only an unofficial coordinator receipt was written; no matched valid receipt exists. Withheld from acceptance.

Each passing case binds the grader result, saved artifact hashes, actual final coordinator inspection IDs, requested/configured worker identity and matched raw receipt bytes. The [evidence index](evidence/delegate-renewal-2026-09-11/evidence.json) preserves all 14 results, including incomplete cases, trace and review digests, execution ledgers and accounting corrections. No replacement trials ran. Whole-project cases test decomposition and integration; they never create a whole-project worker route.

Both UI artifacts passed rendered checks at 320 and 1280 pixels. Claude's separate Opus review includes actual image Read events, but cannot repair the original run's missing receipt and final inspection. The Codex image review export omits image-tool events; its image-viewing claim is not raw proof. The maintainer separately viewed both actual Codex screenshots, inspected source and checked captured focus, labels and overflow. This limitation remains in the review artifact.

Claude summary-only worker attribution is explicitly an inference from a sole child process, before/after checks and the absence of parent source edits; it is not an observed Edit event. Codex native child sessions preserve configuration and patch events. Configured model/effort is distinct from served identity. The Codex multicomponent native parent session also proves a failed CLI launch omitted from exported stdout; a separate reconciliation adds it without changing the original result.

## Accounting and freshness

The complete authorized campaign used **101/130 model-execution attempts**, including implementation, independent reviews, failures, M4 comparisons, calibration and renewal. The installed matrix accounts for 33; fresh frontier checks cost 3, fresh calibration 8, smoke completion 6 additional and rendered reviewers 2. Two calibration-positive workers are reused byte-identically for smoke evidence and counted once. Native maintenance collection/review turns are separately listed. The final ledger has zero reservations and no unresolved accounting. Host token counters and list-price estimates are not subscription spending.

Official metadata was captured at 2026-09-11T02:29:16.954Z. The two Claude medium audits bind fresh reviewer execution and artifact digests with the unchanged scope: zero/nullish quantity-default fixes in local plain JavaScript only. Eight historical inputs were archived byte-identically in their own commit, with blob hashes in [preservation.json](../data/routing/archive/2026-09-10/preservation.json).

The published pack remains routing_pack.v3 with 15 routes and zero qualified entries. Astra and Fable follow incumbent reviewers only in mechanical_work/low; they are not workers or medium reviewers. Earliest entry expiry is 2026-10-11T02:29:16.954Z; pack expiry is 2026-10-11T04:20:31.230Z. The compiler enforces that entries outlive the pack's expiry minus 24 hours. Full scope and expiry checks run offline before publication.

## Consumer provenance and expansion decision

The live renewal used consumer folder sha256:c26f10f0133603809068886da893c2073d4765ce924cd1d9a89dc3e19c923317 with pack sha256:e6e532af2fe5f0b572b0c0cc338e837e60eda8fb03248981ce1ec47ef9622b3f. Publication changes the pack to sha256:0dc26099e7ead306d8dd499ef6ecec324a8d163df2b50971ee16bef42f60fb57 and the complete folder to sha256:e797626848d489bb3a14fca1dece3072ca650a62bd9a03825c454a6d08d3ee91. Guidance bytes remain sha256:522f5a0e7e8d661fb374ba3fbffe01da40cf37bd1f52d9522ce767382dfccae0. The evidence belongs to the captured prior pack iteration; this publication was validated offline and is not claimed as a new live run of the exact resulting folder.

M4 found no evidence supporting delegation for either tested TypeScript shape: bounded_backend and hard_debugging each had two quality-gated pairs and zero delegated wins or ties. The [M4 report](delegate-direct-vs-delegated-results.md#2026-09-11-counted-campaign) records the pairs and research gate. M5.5 and M5.6 stay unfunded; M5.4's v4 change does not apply. This gate is a declared proposal authorizing evidence spending only, never route authority. The direct rule remains in place.

Validation passed: all 717 tests, typecheck, build, portable skills and the CI publication check. The pre-build run also passed 715 tests with only its two build-dependent fixture checks skipped. [Validation evidence](evidence/delegate-renewal-2026-09-11/validation.json) retains the initial failures and subsequent checks. No remote push or global installation is part of this delivery.
