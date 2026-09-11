# Delegate closeout — 2026-09-11

The M0–M5 update and three reliability follow-ups are complete and integrated into local `main` by fast-forward. The implementation and evidence commits remain identifiable: `dd2a890` (original squash), `8b6a803` (repairs), and `9166c00` (three passing follow-ups). The closeout commit adds accounting and manifest references only. Nothing is pushed or globally installed.

All three targeted follow-ups passed: Claude UI, Claude full-project, and Codex multicomponent. Current acceptance contains eleven unchanged original records plus three new records from the repaired consumer iteration. The three original failed run IDs remain excluded. The pack remains v3 with 15 provisional routes, zero qualified entries, unchanged reviewer admissions, and the narrow medium mechanical scope. The negative M4 result and closed expansion/research gates remain unchanged.

See the [completed checklist](delegate-reliability-followup-plan.md), [follow-up results](delegate-reliability-followup-results-2026-09-11.md), [validation proof](evidence/delegate-reliability-followup-2026-09-11/validation.json), and [current status](validation-status.md).

## Separate review accounting reconciled

The external review pasted by the user ran between 04:26 and 04:37 UTC, before the reliability follow-up campaign. Its native session establishes five executions:

| Execution | Outcome |
| --- | --- |
| Initial Fable coordinator review of `dd2a890` | Provider limit |
| Fable compiler-invariants reviewer | Provider limit |
| Fable evidence/docs reviewer | Provider limit |
| Fable harness/consumer reviewer | Provider limit |
| User-requested Opus coordinator continuation | Completed; approved `dd2a890` |

The coordinator's initial Fable turn must be counted in addition to the three failed reviewers. The switch to Opus followed an explicit user continuation. A reviewer command containing CLI strings was an offline `executionLedger` fixture test; it launched no model. No additional nested launches were found.

**Reconciled observed total: 101 + 10 + 5 = 116 executions.** The original ledger remains 101; the reliability ledger remains 10/17. Their previously reported sum of 111 describes those two recorded campaigns, not the separately discovered external review. Both ledgers are byte-identical to their completed versions. The external executions are recorded retrospectively in a separate supplement, with no invented prior reservation or retroactive approval. This closeout uses zero new model executions and authorizes no further spending.

[Reconciliation evidence](evidence/delegate-closeout-2026-09-11/reconciliation.json) records native excerpt and child trace digests, model identities, launch/error references, timestamps, and preserved ledger hashes. Raw native evidence is retained privately under `artifacts/delegate-closeout-2026-09-11/`.

## Manifest references and remaining review notes

The supplement also directly binds all 17 installed run manifests: fourteen original attempts and three follow-ups. For each, the indexed result digest already covered its sanitized environment and override-name list; those values match the manifest exactly. Direct manifest hashes now make that relationship easier to audit without modifying either historical index.

The publication used the normal expiry guard, without `--allow-short-entries`. Recording use of that optional escape hatch, cosmetic metadata alignment, and making machine-specific maintainer dependencies configurable remain optional future maintenance, outside this completed reliability change. No additional probe, calibration, acceptance rerun, recompile, or implementation agent was launched for closeout.

The reviewed stack is ready for a separately authorized push. Existing historical branches and worktrees are retained; no force deletion or history rewrite was needed.

Closeout verification passed: 736 tests across 43 files, typecheck, build, skills verification, CI publication validation, seventeen manifest bindings and all reconciliation source hashes. No code, routing pack, policy, acceptance records, or historical report changed after `9166c00`. [Closeout validation proof](evidence/delegate-closeout-2026-09-11/validation.json).
