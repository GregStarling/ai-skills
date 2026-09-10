# Delegation implementation plan

Implement a strict work order and actual filesystem/index manifests first. Compare real before/after bytes, modes, links and Git index entries; forbid traversal, escaped links and changes outside explicit scope. Derive protected-path risk from actual changed paths and combine with the policy's pre-dispatch risk.

Compose current production binding validation, the shared native runner, bounded objective check subprocesses, retries, an isolated final-artifact review package and the append-only Ledger. Native unknown identity or unsupported fresh context yields escalation. Simulation remains an explicit test-only route. Tests use disposable Git repositories and actual local child processes; they do not provide production qualification evidence.

## Public boundary

`plan` and `executeDelegate` require a current production binding and its complete selection evidence. Input includes an explicit workspace, a ledger directory outside that workspace, the rendered native adapter, and an optional separately bound reviewer. `simulateDelegate` is an explicitly synthetic route using real local subprocesses, never an injectable production transport. All commands use argv arrays through the shared timeout/cleanup runner.

`WorkOrder` requires objective command checks, exact or `directory/**` path scope, forbidden paths, escalation conditions, explicit retry/time limits and a structured worker return. Path-based protected risk detection is conservative and observable; callers add task-specific `protected_paths` rules and pre-dispatch signals. Semantic completeness is not inferred from a worker's risk claim. A post-change risk above the bound treatment escalates for a new qualified binding.

Snapshots include ordinary files, directories, symlink targets, modes, Git staged identities and relevant Git controls. A full scan is deliberately limited to 20,000 entries and 256 MiB of regular-file bytes; larger workspaces escalate instead of silently omitting ignored files. These are operational resource limits, not qualification thresholds. Existing unrelated dirty content remains part of the baseline.

Review packages contain the task, actual before/after manifests and source objects, and captured objective checks. Digest filenames prevent repository instruction filenames from becoming active review instructions. They exclude worker transcripts and prior verdicts. Acceptance recomputes the artifact after review. Unknown served effort, model, material fallback control or context isolation remains an explicit production escalation; live CLI execution alone is not governed acceptance.
