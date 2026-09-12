> Latest targeted live checks: Codex bug and research passed with native completion evidence. Claude remains pending its recorded quota stop; full rollout remains incomplete. See [live validation](completion-remediation-live.md).

> Current status: completion recording and the research prompt contract are repaired and locally verified. See [remediation checklist](completion-remediation.md). The campaign/checklist below is historical for its recorded source; it does not establish live acceptance of the corrected source. Activation remains incomplete.

# Deterministic routing refinement results

Source fingerprint: `sha256:e0502b0886684702592b1900f790f9a4d8f9c4e90d058ed7a056c260d0e0e3cb`. Full offline checks and independent source review passed; 863 tests passed. Global rollout is incomplete.

The canonical skill and helper implement separate execution and review rules. Plans and prescribed consequential decisions use frontier; settled execution stays economical; implemented behavior requires a fresh frontier review; research and PDF analysis remain economical, including sampled audits.

The Codex bug candidate passed all 21 held-out regression checks and obtained a native Astra/high reviewer PASS, but Terra omitted the required v3 observation. This is a failed workflow acceptance, not an accepted rollout. Claude remains stopped after its native Fable quota rejection. Neither personal skill nor saved starting model was changed.

Cumulative execution budget: 78/100, 0 reserved. Failures, continuations and unknown costs remain in the ledger.

| Final-source run | Output criteria | Required candidate observation |
| --- | --- | --- |
| refined4-codex-bug-baseline | passed | not applicable |
| refined4-codex-bug-candidate | passed | failed |
| refined4-codex-mechanical-baseline | passed | not applicable |
| refined4-codex-mechanical-candidate | passed | passed |
| refined4-codex-multicomponent-baseline | passed | not applicable |
| refined4-codex-multicomponent-candidate | passed | passed |
| refined4-codex-pdf-candidate | passed | passed |
| refined4-codex-planning-baseline | passed | not applicable |
| refined4-codex-planning-candidate | passed | passed |
| refined4-codex-research-candidate | failed | passed |
| refined4-codex-seeded_defect | passed | not applicable |
| refined4-codex-simple_audit | passed | not applicable |

Saved models remain Codex Astra/high and Claude Fable/xhigh. Complete backups and temporary restoration verification are retained. No remote publication occurred.

Evidence: machine checklist (`artifacts/cheaper-refinement/completion-report.json`; retained locally), validation summary (`artifacts/cheaper-refinement/validation-summary.json`; retained locally), offline checks (`artifacts/cheaper-refinement/offline-final-5/test-results.json`; retained locally), cumulative budget (`artifacts/cheaper-coordination/budget.json`; retained locally), and rollback instructions (`artifacts/cheaper-refinement/backups/rollback.md`; retained locally).

Remaining work: make post-review completion reliably persist its required evidence, align the research prompt and exact-filename grader, pass both host campaigns, then install and verify fresh sessions. Existing failed runs cannot be relabeled or filled in retrospectively to claim automatic acceptance.
