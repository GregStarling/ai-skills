> Latest targeted live checks: Codex bug and research passed with native completion evidence. Claude remains pending its recorded quota stop; full rollout remains incomplete. See [live validation](completion-remediation-live.md).

# Completion recording and research contract remediation

Locally verified source: `sha256:2cbf84e8943f3085838eb7f76937790c232365441c2db6e24ccabead3d9528dd`. This remediation used 51 focused tests, typecheck, packaging validation and whitespace checking. No models, agents, live pilots, probes, personal installation checks or default changes were performed.

The new complete command reuses accepted v3 observation validation and atomic persistence. Routing decisions and reviewer PASS results alone are not completion. The research prompt now explicitly requires bare filenames, matching its existing strict grader.

- [x] **COMPLETE:** complete validates accepted v3 evidence and persists before reporting completed.
- [x] **COMPATIBILITY:** Existing observe, legacy interpretation, task-ID idempotency and conflict handling remain intact.
- [x] **HOST-GUIDANCE:** Both host guides and the shared skill use one final complete operation.
- [x] **RESEARCH-CONTRACT:** Prompt requires exact bare source filenames; strict grader remains unchanged.
- [x] **FOCUSED-TESTS:** 51 tests passed in the two requested files; no full suite or model calls.
- [x] **LOCAL-CHECKS:** Typecheck, packaging and whitespace checks passed once.
- [x] **EVIDENCE:** Commands, hashed results and final source fingerprint recorded.
- [x] **HISTORY:** Historical failures and original report bytes preserved; previous live evidence applies only to earlier source.
- [x] **LIMITED-ACCEPTANCE:** Repairs are locally verified; live model adherence and activation remain incomplete.
- [x] **NO-EXECUTIONS:** Zero additional model/agent/pilot/probe executions; no personal installation or default mutations.

Budget preserved: 78/100 executions; 22 remain.

Live acceptance and activation remain incomplete. Prior live records remain intact and are historical for earlier source fingerprints.

Machine-readable report and hashed evidence (`artifacts/completion-remediation/completion-report.json`; retained locally)
