# Portable routing-pack validation

Validated 2026-09-10 UTC. The governor now compiles the pack shipped in the dependency-free `skills/delegate/` folder. This validates the refactor, not empirical routing readiness.

## Repository and compiler checks

- All 185 tests across 22 files passed, including nine new routing and CLI tests.
- Type checking and build passed.
- The real CLI compiled the checked-in production pack and validated its schema and content digest.
- The copied-folder validator passed: all eight consumer files are present, every local Markdown reference stays inside that folder, and the source checkout remains uninstalled.

The routing tests exercise host intersection, failed-worker fallback, mandatory frontier review, unavailable capabilities, wrong task strata, future/expired packs, altered identities, retained incumbents, multiple scopes within one class, synthetic-evidence rejection and explicit empty packs. CLI tests cover production-only inputs, staging without overwrite and integrity validation. Test-generated receipts are algorithm fixtures, not provider observations or production qualification evidence.

Published pack generation: `2026-09-10T01:36:55.155Z`.

Pack content digest: `sha256:29d30b72ca517f272b7856d53891faf85231f8a49d9115449dd8a6138e5cdc9f`.

## Independent consumer trial

A native `gpt-5.6-luna` worker at low reasoning effort received only a disposable copy of the complete folder and a small JavaScript quantity-default bug. It classified the task, found the empty route list and stopped without changing the target or inventing a worker route. The frontier coordinator inspected that result and the unchanged fixture.

The trial also incorrectly inferred that a UTC timestamp was future-dated from the host's local calendar date. The coordinator rejected that claim using the actual UTC clock and clarified the skill to compare full timestamps with time zones. That wording correction has structural validation; it has not had a second independent behavioral trial. The empty-route refusal was valid independently of the date error.

## Remaining product evidence

The checked-in pack contains zero routes and eight explicitly missing classes. Existing native smokes and one-task trials do not meet the current qualification policy. No illustrative model ladder, synthetic receipt or unknown cost has been promoted into routing authority.

Productive dispatch with a qualified pack, installed skill invocation in both Claude Code and Codex, full-project coordination and measured token/cost savings remain unverified. The compiler can support those routes when maintainer evaluations supply the required observations; an empty compiled pack cannot demonstrate them. See [maintenance](routing-pack-maintenance.md) and the [earlier trial history](standalone-delegate-validation.md).
