---
name: debug
description: >-
  Investigate a reported software defect, reproduce the failure, fix its cause,
  and verify the correction with regression evidence. Use for $debug, /debug,
  debug this bug, reproduce and fix, or a request to diagnose failing behavior.
  Honor diagnosis-only requests. Do not activate for new features, general
  programming explanations, or a review without a reported defect.
---

# Debug

Make the failure observable, explain its cause, and prove the correction. A
plausible hypothesis is a reason to investigate, not evidence that a fix works.
This is the portable successor to the Repro command; its invocation name is
`debug`, not `repro`.

## Establish the problem and authority

Use the current conversation, supplied error, issue, or failing check as the bug
report. Identify expected behavior, actual behavior, reproduction conditions,
affected revision and environment where known, and the user's requested scope.
Ask for missing input only when it prevents useful investigation. Read repository
instructions and the failing path before editing; inspect relevant callers and
existing tests. Separate observations from hypotheses.

A request to diagnose permits investigation, not an implementation change. A
request to fix permits a scoped correction and its checks. Honor explicit limits
such as no edits or local-only work. Preserve unrelated staged, unstaged, and
untracked changes. Use an isolated reproduction when shared state or user work
would otherwise be at risk.

Do not use destructive production experiments, expose sensitive data, change
permissions or saved settings, or install new services to get a reproduction.
Prefer sanitized fixtures and existing tools. Debug alone does not authorize
commits, pushes, deployment, or issue closure. An already authorized outer CTO or
Ship workflow can continue those steps after receiving Debug's evidence.

## Reproduce before repairing

1. Establish the baseline and form a specific, falsifiable hypothesis. Choose
   the smallest check that faithfully exercises the failure: unit test,
   integration test, CLI invocation, browser flow, or environment harness. Use
   the repository's existing conventions rather than introducing a test stack.
2. For an automatable defect, add a focused regression test and run it **against
   the faulty implementation before changing production code**. Capture the
   command, inputs, relevant environment, and failure. Confirm that it fails for
   the reported behavior; setup errors, broken imports, and incorrect assertions
   do not reproduce the bug. Avoid mocks that remove the behavior under test.
3. For failures needing a browser, external system, or special environment,
   record repeatable steps and observed behavior. Automate the meaningful part
   when practical. A local surrogate can prove a mechanism without proving the
   original environment; keep that distinction explicit.
4. For intermittent bugs, investigate timing, versions, configuration, data, and
   logs. Prefer a controlled schedule, seed, clock, or fixture that exposes the
   mechanism. Otherwise compare bounded repeated trials under recorded
   conditions, including failures and total trials. One passing retry does not
   prove resolution. Keep instrumentation narrow and authorized; remove temporary
   diagnostics once they are no longer needed unless retention has a clear use.

If reproduction fails, continue useful diagnosis: test another evidence-backed
hypothesis or identify the missing condition. Do not patch production code on
speculation. When no supported next experiment is available, report what was
tried, what happened, remaining hypotheses, and the precise evidence or access
needed. “Not reproduced” is an investigation result, never “fixed.” If the issue
is already corrected at the inspected revision, substantiate that observation
rather than manufacturing another fix.

## Correct the demonstrated cause

Trace the observed failure to its cause and choose the smallest complete
correction. If new evidence contradicts the hypothesis, revise it before editing.
Do not weaken a regression assertion, skip a failing check, or change the intended
behavior to make the result green. If a test's expectation is wrong, establish the
authoritative requirement and explain the corrected test; that is not proof of a
production defect.

Inspect directly related callers and shared logic for the same failure mechanism.
Include another affected path only when the demonstrated cause and authorized
scope apply, and verify it. A nearby unrelated defect belongs in a follow-up,
even if its fix looks easy. Avoid drive-by refactoring.

Rerun the reproduction with equivalent inputs and conditions, then the relevant
surrounding suite and required repository checks. Include directly affected
callers and useful boundary cases. Report commands actually run, outcomes, and
skips. An environment-dependent fix may have passing local regression coverage
while original-environment verification remains incomplete; say so plainly.

## Keep investigation moving

Track hypotheses, experiments, failure signatures, and outcomes in the existing
task context or ledger when applicable. After two materially different attempts
without new evidence or progress, change the diagnostic approach or seek fresh
expert reasoning when available. Do not loop on identical retries or expand the
fix to unrelated work. If further progress requires unavailable input, access,
or capability, report the exact limit and preserve a usable handoff.

Discover available companion skills and follow their actual instructions:

- **Delegate** owns routing, escalation, and required independent review. Preserve
  its assignment identity, origin, and review requirements through repairs;
  renaming work as a routine fix does not remove hard-bug review.
- **Ponytail** favors the simplest correct repair without dropping reproduction
  evidence, checks, or requested behavior.
- **CTO** retains the plan, ledger, and final acceptance. Return the root cause,
  changed files, checks, and remaining limits to its existing loop.

All companions are optional. Without them, use available tools directly and seek
fresh review for consequential fixes when supported. Disclose unavailable required
review; do not represent self-review as independent review. Do not hardcode model
names, host APIs, or install companions as part of debugging.

## Report the result

Keep the report concise and evidence-backed:

- **Status:** verified fix, diagnosis only, not reproduced, or verification
  incomplete. State the tested environment and any remaining uncertainty.
- **Cause and correction:** the demonstrated mechanism and affected paths.
- **Proof:** the before-fix failure and after-fix result, regression test or
  repeatable steps, and surrounding checks.
- **Remaining work:** only material gaps, unrelated findings, or the exact next
  experiment/access needed. Omit if none.

Do not call the issue resolved while required checks or review remain incomplete.
Leave publication to the authorized release workflow.
