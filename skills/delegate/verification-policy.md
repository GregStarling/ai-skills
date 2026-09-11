# Frontier acceptance

The artifact checks and stopping condition apply to direct and delegated work. Direct work follows ordinary host and project review rules, including any required independence, and is not a pack route. The rules below govern delegated work.

Frontier verification is mandatory for delegated work at every risk level; its depth is proportional to the task. The verifier must be an entry in lookup's `reviewers` for the actual host and route; it may be provisional. Verify it yourself only when lookup returned `coordinator_may_verify: true` for your own model and effort; otherwise launch a separate reviewer, in a fresh process when `review_rule.fresh_context` is true. Do not duplicate frontier review by default.

For a small edit, inspect the actual diff and relevant test evidence. For a bug, establish the original failure and verify the corrected behavior. For UI, inspect the rendered result and exercise relevant interactions and narrow layouts; a successful build is insufficient. For research, check sources, reasoning and calculations. For a project, test integrated critical flows and missing requirements, not only worker reports.

Give the reviewer the requirements, final artifacts or diff, checks and known constraints, never the implementer's reasoning transcript or an earlier verdict as authority. If a required tool or boundary is unavailable, say what could not be verified.

Return **PASS**, **REPAIR** with concrete findings, or **BLOCKED** with the actual cause. Repairs go to the original worker first; do not silently perform worker corrections at frontier rates. Repeated failure justifies the next eligible worker; architectural uncertainty requires a frontier decision. Verify the corrected final artifact again, including after integration.

Stop when acceptance is satisfied and no material defect remains. Do not repeat reviews or reopen finished work for speculative polish. Report the worker and verifier model and effort actually used, fallback reasons, useful workstreams and corrections, and the checks run.

## Receipt rules

The helper's `finish` writes the receipt (`delegate_receipt.v3`); see [local learning](local-learning.md). Supply these four things:

1. One `task_id` across repairs and intentional replays of the same starting task, with the baseline digest and task scope preserved.
2. Every attempt, including failed launches, fallbacks, repairs and reviewers, with configured and observed settings kept separate and null when unknown. A coordinator that reviews keeps its coordinator attempt and adds an inspected review verdict; it does not invent a second execution.
3. `execution_environment` is recorded from the host; never self-attest served model identity or configuration. Preserve contradictions and unknown provider fallback behavior.
4. Costs and tokens only when observed; otherwise `usage` is null. Never present a requested model as proof of the served model, or a provider estimate as a bill.

Receipts are local execution records, not qualification or claims of billed savings. Never rewrite old receipts or invent missing telemetry; report a learning or storage failure without blocking delivery.
