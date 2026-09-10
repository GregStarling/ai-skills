# Evidence ordering and receipt ingestion validation

Validated locally on September 10, 2026. This change adds evidence-first provisional ordering, a maintainer receipt bridge into the existing governor, and GitHub CI. It does not add new native task performance evidence or promote a model.

## Executed checks

- `npm test`: **251 tests pass across 25 files**, including 32 receipt tests and five new routing cases.
- `npm run typecheck` and `npm run build`: pass.
- `node scripts/verify/skills.mjs`: both portable skills pass; the copied delegate folder has complete reference closure.
- Built `validateRoutingPackPublication`: exact checked-in pack passes structural, digest and real-clock publication validation.
- Built `receipt-ingest` and `ledger-status`: seven original native receipts captured across hard debugging (3), bounded implementation (2) and complex implementation (2). Importing every receipt twice creates no duplicate record. All seven remain `PENDING_EVIDENCE` with no qualification authority. [Intake results](../data/routing/receipt-ingestion-validation.json).

Routing regressions put matching installed acceptance above a cheaper smoke-only treatment for both workers and reviewers, preserve qualified incumbents, price-order within evidence levels only, retain maintainer order for unknown/crossing prices, and exercise unavailable/failed/expired fallback and old-pack resolution.

Receipt tests exercise capture, independently evidenced assessment, refresh, class-specific qualification and paired challenger promotion. They reject altered bytes, unresolved streams, omitted attempts or review costs, mismatched model/review scope, changed policy, missing or inconsistent starting baselines, understated native latency, and duplicate task counting. Unknown evidence remains unknown; mismatched challenger baselines do not promote. Positive qualification/promotion cases use **controlled test data and explicitly reduced test-only thresholds**, never the checked-in production policy or live performance evidence.

## Exact artifacts

- Pack content digest: `sha256:8bb7c420bae78ef9278c0c0df3ce9df74ccf535be45cf9b9604afbaa83639e34`.
- Complete delegate folder digest: `sha256:2fc92a8a4d4f073fe6e66b70d95da324987daa0c8bb95c0aa1b4af8dac16cfc5` (canonical JSON SHA256 of code-point-sorted `{path, content_digest}` entries, each file hashed as bytes).
- Pack generated: `2026-09-10T05:43:38.950Z`; refresh due September 17; pack expiry October 10. Individual treatments keep their original evidence dates and expiries.
- Fourteen provisional routes, zero qualified routes. Provisional cost ordering uses comparable advertised prices; no trusted measured provisional cost field or savings estimate was invented.

The original [installed-host validation](routing-pack-validation.md) and [frontier workflow audit](../data/routing/frontier-ownership-acceptance.json) identify the exact older copied folders they exercised. Their native runs were not repeated for this code/ordering change. Receipt intake used those original bytes, explicitly tagged `qualification_evaluation`; the unsuccessful first Claude hardbug workflow remains recorded despite its model-written receipt claiming acceptance.

## Enforcement and operational limits

[GitHub Actions](../.github/workflows/ci.yml) runs `npm ci`, tests, types, build, skill validation and publication/integrity validation on every PR and main push. Actions are pinned to release commit identities with read-only repository access. The workflow validates the committed pack without regenerating it or hiding stale evidence. Its execution result belongs to the published commit's GitHub checks.

The [receipt workflow](production-receipts.md) is a working ingestion/assessment bridge, not automatic promotion. Current native trials still lack some served identity/effort, cost and independent governor-review evidence. Many public classes do not yet have governed evaluation strata. Original receipts remain useful archived observations until those prerequisites can be supported. Repeating the same task or relabeling benchmark data cannot fill the gaps.

Maintainer Claude Code/Codex client upgrades and fresh frontier probes remain a separate manual operation. Existing [probe failures](../data/routing/frontier-probes.json) remain intact; no new availability claim is made without upgraded-host evidence.
