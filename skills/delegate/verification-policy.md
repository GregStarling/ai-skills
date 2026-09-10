# Frontier acceptance

The artifact checks and stopping condition below apply to both direct and delegated work. Direct execution follows ordinary host/project review requirements, including required independence; it does not use pack qualification; its lightweight outcome is captured by the local helper. The remaining worker, routing and receipt rules govern delegated work.

Frontier verification is mandatory for delegated work at every risk level; its depth is proportional to the task. The verifier must be eligible in the pack for the actual scope and host. It may have qualified or explicitly provisional evidence. For low risk, the eligible frontier coordinator reviews the worker's actual result itself. A separate frontier process is only necessary for required model/family/context independence or an ineligible coordinator; do not duplicate frontier review by default.

For a small edit, inspect the actual diff and relevant test evidence. For a bug, establish the original failure and verify the corrected behavior. For UI, inspect the rendered result and exercise relevant interactions and narrow layouts; a successful build is insufficient. For research and analysis, check sources, reasoning and calculations. For a project, test integrated critical flows and missing requirements, not just individual worker reports.

Provide the reviewer with requirements, final artifacts or diff, checks and known constraints. Use a new context containing that evidence when required; do not send the implementer's reasoning transcript or earlier review verdict as authority. If a required tool or review boundary is unavailable, say what could not be verified.

Return **PASS**, **REPAIR** with concrete findings, or **BLOCKED** with the actual cause. Repairs go to the original worker first. Do not silently perform worker corrections at frontier rates. Repeated failures justify a different eligible treatment; architectural uncertainty requires a frontier decision. Verify the corrected final artifact again, including after integration.

Stop when acceptance is satisfied and no material defect remains. Do not repeat reviews or reopen finished work for speculative polish. Report the worker/verifier model and effort actually used, fallback reasons, number of useful workstreams/corrections and checks. Report costs/tokens only when observed. Never present a requested model as proof of the served model or a provider estimate as a bill.

## Local receipt

Use the [local helper](local-learning.md) to generate canonical `delegate_receipt.v2` records for direct and delegated tasks. Its append-only local events preserve originals and its returned `receipt_path` names the canonical export. Keep available attempt evidence as work proceeds; report learning/storage failure without blocking task completion. Never rewrite old receipts or invent missing telemetry. Historical v1 receipts remain importable but are not the format for new helper records.

The helper records task/run identity, actual times, full attempt history, pack binding for delegated work, installed-folder binding, checks and final acceptance. A coordinator acting as verifier records its actual routed identity and a review check. These are local execution records, not automatic qualification or claims of billed savings. Direct and v2 local records cannot be used as governor qualification without a separately supported governed evidence workflow.

Assign a stable `task_id` when work starts; preserve it across repairs and intentional challenger replays of that same starting task. Retain the starting artifact/baseline digest, task scope and native trace/check/review references when the host exposes them. Keep every worker, review and rework attempt, including failures and fallback identities. Missing lineage remains unknown. Maintainers archive receipt versions and independently validate those sources before counting a run; a final accepted receipt cannot make an earlier failed treatment successful.

Record the actual `execution_environment` (`claude_code`, `codex`, or `api`; use `unknown` if unavailable). An API result and a subscription-host result have distinct provenance even when model and effort match. Billed dollars may remain null without implying lack of capability. Any attached API-equivalent economics are a separately sourced relative-cost proxy, never the user's subscription bill; raw token count alone cannot establish the cheaper treatment.

Preserve native request/configuration, host version, process and trace references when available. Maintainer validators derive v5 identity assurance from those sources; the receipt must not self-attest configuration or served identity. Keep configured values separate from observed values, and preserve contradictions and unknown provider fallback behavior.
