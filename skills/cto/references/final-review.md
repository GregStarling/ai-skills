# Adversarial acceptance

Try to prove it is not shipped. Read the original plan independently of the
ledger. Map every requirement to actual behavior and current evidence. Inspect
the full resulting diff, including new files and configuration.

Check applicable surfaces; record non-applicability instead of inventing work:

- Requirements absent from the ledger; superficial acceptance; stubs, unfinished
  TODOs, stale mocks, development hardcoding, debug code, experimental dead code.
- Critical paths never exercised end to end; green tests masking wrong behavior;
  integration failures between separately verified components.
- Error paths, recovery, state management, concurrency, data integrity.
- Missing migrations, schema incompatibilities, stale configuration, environment
  or setup omissions, documentation inconsistent with behavior.
- Authorization/security regressions, accidental public API changes, regressions
  beyond the immediate files changed.

Run the broadest practical relevant test suite plus build, type, and lint checks
where applicable. Exercise important user flows end to end; verify migrations
and configuration. Reuse current applicable evidence when no relevant change has
invalidated it; avoid purposeless repeats. Investigate failures rather than
shrinking acceptance. Required unavailable verification remains incomplete.

Verify the requested release destination: integration/CI, package publication,
installation, or deployment and live behavior, as the plan requires. Use an
available release skill when appropriate and authorized, without transferring
ownership of acceptance. Do not invent production work for a local-only plan.

A fresh reviewer receives original requirements, final artifact paths/diff,
checks and results, and constraints, without the executor's persuasive transcript.
Require evidence-backed findings and a verdict. Follow delegate's review tier
when available. Inspect actual artifacts rather than trusting summaries.

For material findings, reopen/create an item, fix, verify, and repeat the affected
reviews. Confirm no technical blockers, incomplete criteria, required reviews,
or requested release steps remain. Reconcile the ledger with reality before
SHIPPED.
