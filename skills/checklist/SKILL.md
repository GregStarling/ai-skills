---
name: checklist
description: >-
  Defines what complete means as a persisted, falsifiable acceptance checklist,
  verifies work against it, and refuses to declare completion until every
  required item has evidence and survives a blind adversarial close-out.
  Supports BUILD, AUDIT and PLAN modes. Use when the user asks to define or
  prove done, e.g. "/checklist", "$checklist", "checklist mode", "define done",
  "make sure this is actually complete", "prove it is finished", "completion
  audit", "acceptance checklist". Do not use to execute a supplied plan end to
  end, to write a checklist as content (packing, onboarding, shopping or launch
  lists), for simple to-do tracking, casual questions or trivial edits.
---

# Checklist

> A checklist written by the worker and graded by the worker is a diary. A
> checklist that can prove the worker wrong is quality control.

Make sure the requested work is genuinely complete, not merely that it looks
finished. You own the whole completion process. Understand the real need, and
discover the explicit, implicit and overlooked requirements. Define verifiable
acceptance criteria and persist them as a checklist. Execute the authorized work
against it, and keep correcting its omissions. Challenge the result and its
evidence independently, and refuse to declare completion until every required
outcome is verified.

**Work is not complete until every required item is implemented, verified with
evidence and checked off, and an adversarial review finds no material
omissions.** Your job is not to finish the list; it is to finish the work.

Never confuse code written with functionality delivered, tests passing with
requirements satisfied, features implemented with features integrated, local
success with production success, a checked box with proof, or a completed
checklist with a complete one.

This skill is self-contained. Use the tools the environment actually provides;
never assume a particular agent, model, command, service or execution capability
exists. It grants no permissions beyond those the user and the environment give.

## 1. Intake

Before writing the checklist or making substantial changes, read what is
available:

- the request and its later corrections;
- specifications, plans, issues and acceptance criteria;
- the implementation, architecture and conventions;
- callers, dependencies, interfaces and integrations;
- tests, configuration and the delivery process;
- any existing checklist or progress record.

Inspect the actual system before deciding what it needs. Copy the request and
its references into the checklist, including conversation-only requirements that
compaction could lose. Do not invent product requirements or reconstruct history
from guesses. If a checklist exists, read it first and reconcile it with the
current implementation; no previously checked item is assumed still valid.

Honor the requested **mode**:

- **BUILD** (default): define complete, build, verify and accept.
- **AUDIT**: derive requirements independently, inspect the work and record
  findings as items. Do not modify the implementation unless explicitly
  authorized.
- **PLAN**: produce the checklist and completion contract without implementing.
  A plan ends CHECKLIST OPEN, with implementation as the next action.

An audit or plan request does not authorize code changes, deployment or
publication. Writing the checklist file is a record, not an implementation
change; if the user forbids writes, keep the checklist in the conversation and
say so.

In AUDIT mode, check an item only when the audited work demonstrably meets it.
A gap stays `[ ]`, with the observed failure as evidence prefixed `FAILED:`. Run
the close-out once every item has a recorded result. A material omission it finds
becomes another open item, not a fix. The close-out's Result reports the
review's outcome, not the audited work's. An audit that finds gaps ends
CHECKLIST OPEN, with the fixes (or the authorization to make them) as the next
action.

Identify restrictions on scope and compatibility, spending and external
services, data changes and destructive actions, security and access, commits,
publication and deployment, and required human approvals.

Make ordinary, reversible decisions yourself. Ask only when essential
information or authority is missing, or when a wrong choice would materially
change the product or be expensive or irreversible. Keep working wherever useful
authorized work remains.

## 2. Discover what complete means

Before substantial implementation, read [discovery](references/discovery.md) and
run its four passes. Take the perspectives of the CTO, architect, product owner,
QA engineer, end user and operator.

- **A. Explicit:** every stated requirement, constraint, acceptance criterion and
  non-goal, traced to the request. "Preserve the existing API" is a requirement.
  Nothing explicit may disappear.
- **B. Implied:** what the result needs in order to work. Apply the **Scope
  Gate**: *"If this were missing, would the requester or a competent reviewer
  reasonably consider the requested work incomplete, defective, or unusable?"*
  If yes, it is a required item. If no, exclude it, optionally recording it as
  beyond scope. Thoroughness is not feature accumulation.
- **C. Systematic:** evaluate every relevant dimension against the actual system,
  adapted for non-software work. Do not generate items mechanically, and record
  meaningful exclusions with reasons.
- **D. Pre-mortem:** assume it failed in its first week. For substantial tasks,
  find at least three credible failure scenarios. Each material scenario becomes
  an item, or maps to an existing item or a demonstrated protection.
  Speculation does not become mandatory work.

## 3. Build and persist the checklist

Create the checklist before substantial implementation, grouped and in
dependency order. Every item has these parts:

- a stable ID that is never reused;
- a stage: `[build]` if it can be verified before release, or `[release]` if it
  needs the published result;
- one observable outcome;
- a **Source**: an explicit requirement, implied necessity, pre-mortem or
  decision;
- an **Accept** condition;
- a **Verify** method able to demonstrate failure;
- **Evidence**, which stays `Pending.` until the item is verified;
- **Depends on**, when needed.

```text
- [ ] C-002 [build] Invalid submissions preserve previously entered valid data.
  - Source: Implied, input validation.
  - Accept: The user receives an actionable error without losing valid inputs.
  - Verify: Submit malformed data and inspect the resulting application state.
  - Evidence: Pending.
  - Depends on: C-001.
```

Create `[release]` items only when publication or deployment is authorized.
Prefer small, independently verifiable outcomes: write "an unauthorized user
cannot retrieve another user's records", not "handle errors" or "make it
production-ready". A check that cannot fail proves nothing, and reading code
does not by itself prove runtime behavior. Scale detail to the real complexity.
Aim for complete coverage without unnecessary work, not for fewer items.

Persist the checklist at `.checklists/<task-id>.md` with a stable task ID, so
that tasks never overwrite each other. When writing or updating it, follow the
[checklist format](references/checklist-format.md) and its sections: Request,
Definition of Complete, Items, Decisions, Pre-Mortem, Exclusions, Change Log,
Verification, Close-Out and Resume.

If the project already has an authoritative task or acceptance record, extend it
instead of introducing a competing tracker. Keep the items there only if it can
carry every field and section above. Otherwise, as with a ledger table or an
issue tracker, keep them in `.checklists/<task-id>.md` and link that file from
the record as its single item record.

In the record, point each entry to its checklist IDs instead of repeating
acceptance and evidence. Write state changes back to the record, and mark its
entries done only after the checklist gate passes for them. Do not delete or
close entries in an external system without authority.

Commit the checklist with the work when commits are authorized and fit the
project's conventions. If no durable file can be written, keep the checklist in
the task context and disclose that. Never claim that a file was written unless
the write succeeded.

`[ ]` means open, incomplete or unverified, and `[x]` means implemented and
verified. An exception stays unchecked and records its reason, evidence and
authority:

- `BLOCKED`: a genuine external dependency, such as a capability this
  environment genuinely lacks and cannot obtain (a required independent
  reviewer, for example), or unavailable authorization;
- `WAIVED`: the user explicitly removed the item from scope;
- `NOT APPLICABLE`: evidence shows the item does not apply.

A waiver is not implementation, and an excluded item is not verified. Only `[x]`
means verified.

## 4. The completion ratchet

The checklist may grow, gain evidence and gain verified items. It never silently
shrinks. Once a requirement is on it, do not:

- delete it because it became hard;
- weaken its acceptance to obtain a pass;
- merge items to hide unfinished behavior;
- quietly defer it;
- replace verification with assertion;
- turn a technical problem into an external blocker.

Correct an item only when it is demonstrably erroneous, duplicated, superseded
or genuinely inapplicable. Record the original text, the correction, the
justification and the authority in the Change Log. An explicit user requirement
is never "not applicable" because it is inconvenient.

Only the user may waive a required outcome; "keep it simple", "ship quickly" and
"MVP is fine" waive nothing specific.

When requirements conflict, record the conflict as a Decision. An explicit
requirement outranks an implied one: correct the implied item through the Change
Log. When explicit requirements conflict with each other, ask, because narrowing
one is a waiver. Optional improvements that fail the Scope
Gate never block completion. Completion is earned through implementation and
verification, never by redefining success.

## 5. Execute until verified

In BUILD mode, work in dependency order. For each item:

1. Inspect the affected system and its current behavior.
2. Implement the smallest complete solution.
3. Run the declared verification and the surrounding regression checks.
4. Fix the causes of failures.
5. Record the actual evidence.
6. Check the item off immediately, then continue.

Never batch check-offs. Do not stop after the primary implementation, a passing
build, the happy path, one green run, another agent's completion claim or a
progress summary.

**Evidence** lets another engineer inspect or reproduce the result. Record the
check, inputs and conditions, the observed result, the revision or artifact and
the environment, plus time and location where practical. Take times from the
system clock when the event happens; never estimate them.

For a regression, show the failure before the fix when feasible, then the
passing equivalent. For a new feature, run meaningful acceptance checks without
manufacturing a failing before-state. For external, irreversible or expensive
actions, use safe verification and inspectable evidence instead of rerunning
dangerous operations. Never claim an unexecuted check passed, and never weaken,
delete or skip a legitimate failing test to close an item. Likewise, never pass a
lint, type, format or CI check by loosening its configuration or suppressing its
diagnostics. Fix the cause. To pass a check, change a setting or suppress a
diagnostic only when evidence shows it is wrong, such as a false positive, and
record that as a Decision.

**Freshness.** Evidence covers only what it exercised. When a later change may
affect a verified item, directly or through shared code such as authentication:

1. Identify the affected acceptance criteria.
2. Uncheck the item and mark its old evidence `STALE:`.
3. Reopen the items that depend on it, and log the reopening in the Change Log.
4. Rerun the verification.
5. Record new evidence.

Keep an earlier check only when evidence shows a change cannot affect it, such
as a diff that does not touch the exercised path. Skip needless full-suite
reruns, but never reuse stale evidence.

**When stuck** (a failure survives two genuinely different corrections, or you
are about to repeat a failed approach):

1. Stop patching.
2. Re-examine the failing path and its dependencies.
3. Record the failure and the explanations already tried.
4. Form a new falsifiable hypothesis, using fresh-context investigation or
   stronger reasoning if available.
5. Make a materially different attempt and verify it.

Cosmetic variations are not new attempts. Technical difficulty is not an
external blocker; keep diagnosing, redesigning or simplifying while viable
approaches remain. Record a genuine tool, resource, authorization or execution
limit exactly, and preserve the unfinished work.

## 6. Keep challenging completeness

The checklist is a hypothesis about what complete means, not a protected
specification. Throughout the work, ask the
[challenge questions](references/discovery.md#keep-challenging), which cover
unmet expectations, unexercised paths, failure handling, disconnected features,
meaningless tests and assumption-only items.

When you find a material gap:

1. Apply the Scope Gate.
2. Add the item at once, with acceptance and verification.
3. Execute and verify it.
4. Log the discovery in the Change Log.

Never postpone necessary work until after declaring success, and never grow the
list with unrelated enhancements.

## 7. Blind adversarial close-out

When every required implementation item appears complete, follow the
[close-out procedure](references/close-out.md). Release items awaiting
publication and blocked items may still be open at this point. Its question is
*"What is required for this task to be complete that the original checklist
failed to discover?"* Do not start by reading the checklist.

**Re-derive blind.** Prefer a fresh-context reviewer that did not write the
checklist. Give it:

- the requirements;
- the system context;
- the delivered change;
- the constraints.

Withhold:

- the checklist;
- the completion summary;
- any arguments defending decisions.

The reviewer records its own inventory before it sees the checklist.

Without an independent reviewer, write your own fresh inventory first, compare
it with the checklist only afterwards, and disclose that the review was not
independent. Never manufacture a reviewer or equate self-review with independent
review. If the user requires independent review and none is available, that
requirement stays unresolved. Mark it `BLOCKED`, with the action needed, such as
a person or a separate session reviewing the work.

**Compare and challenge.**

- Add new requirements that pass the Scope Gate.
- Reject others only with a recorded reason.
- Reopen items whose acceptance was too weak.
- Check exclusions, waivers, blocked items and corrections for unjustified scope
  reduction.
- Inspect the actual artifacts, and rerun high-risk or questionable checks when
  practical and safe.

A finding must name a requirement, defect, missing verification or credible
failure mechanism; neither reviewers nor executors prove anything by assertion,
and reviewers do not add unrelated features. Fix and verify each material
finding (in AUDIT mode, record it as an open item instead), then repeat the
affected review. After two full rounds, new
requirements need an explicit requirement, a demonstrated defect or a concrete
failure risk.

**Reconcile.** Re-read the request. Confirm traceability for every requirement,
inspect the final diff, and match the checkbox states to the evidence. Confirm
that no material finding is open, that the required checks are still valid, and
that no authorized delivery step is outstanding. If release items were still
open during the review, reconcile again and rerun the gate once they close.

## 8. The completion gate

Do not trust a statement that every box is checked: read the persisted checklist
and inspect its state. When Node.js is available, run the bundled validator from
the project directory, pointing at the folder where this skill is installed:

```sh
node "<installed-skill-directory>/scripts/validate-checklist.mjs" ".checklists/<task-id>.md"
```

To enforce the ratchet, add `--baseline <earlier copy>`. The copy is the last
committed version or, without commits, `.checklists/<task-id>.baseline.md`.
Save that file as soon as the first items are written by running the validator
with `--init-baseline`, which refuses to overwrite an existing baseline; never
edit it. If no
early copy exists, say so; never present a later copy as the baseline. The
baseline check
rejects removed or changed items and findings that lack a new Change Log entry
recording the correction. It also rejects edits to earlier entries and reused
IDs.

The validator checks the following:

- IDs and fields;
- that the evidence on checked items names something inspectable;
- exception authority;
- dependencies;
- open findings;
- that the review was recorded with a passing result.

It prints the status with real counts. That line is a gate result, not the final
report; §9's line comes from `--status-line`. The validator
proves the record is consistent, not that the work behaves correctly.

If the validator cannot run, parse the entries and their fields with another
available tool; never use a text search for `[x]` or `[release]`. Read each item
yourself only when no tool can run. Either way, say that the validator did not
run, and never claim that it ran unless it did.

Every `[build]` item must be verified before the work is called ready for
release. If release is not part of the objective, build acceptance can be overall
completion. When release is authorized, `[release]` items stay open until real
publication and live verification; neither a passing build nor a deployment
proves that the published functionality works. If publication needs more
authorization, finish the independent preparation. Keep the release items
unchecked and marked `BLOCKED`, and report the exact outstanding action.

The final status is one of these:

- **VERIFIED COMPLETE:** all required items are verified, the final review has no
  outstanding material finding, and nothing accepted is waived or unresolved.
- **ACCEPTED WITH EXCEPTIONS:** the user explicitly waived specific outcomes and
  everything else is verified. This is an accepted delivery, not 100% of the
  original requirements.
- **CHECKLIST OPEN:** required work remains incomplete, actionable or
  insufficiently verified.
- **CHECKLIST BLOCKED:** every remaining required item is stopped by a specific,
  genuine external constraint, with its dependency and required action recorded.

Never call technical difficulty an external blocker, and never use waivers to
manufacture VERIFIED COMPLETE. If the user or the environment interrupts the
work, preserve the state and report the interruption honestly.

## 9. Continuity and reporting

The checklist is also the handoff record. At meaningful checkpoints, update the
items and their evidence, new and reopened requirements, decisions, failed
attempts and hypotheses, blockers, and the next action in Resume.

Before ending a session:

1. Reconcile the checklist with the project.
2. Identify the open items.
3. Keep executing while authorized work is possible.
4. Otherwise leave a precise handoff.

Do not stop because a phase ended or the context is long, and do not keep asking
whether to continue authorized work. Persistence lets a later session resume; it
is not background execution, so never promise work after the session ends. A
restart begins by reading the checklist and reconciling it with the
implementation, and never assumes that historical claims are still valid.

Report concrete counts and outcomes; "almost finished" is not a status. At
milestones, summarize:

- required, verified and open items;
- decisions;
- verification results;
- material review findings;
- blockers and the actions they need.

Do not interrupt useful authorized work merely to report. End with exactly one
status line. Generate it with the validator's `--status-line` option, which
fills counts, IDs, the recorded next action, the file and the time from the
record and the clock; replace each remaining `<fill: …>` with a real value.
Without the validator, fill the same form by hand:

```text
CHECKLIST VERIFIED COMPLETE | verified=<n>/<n> | review=<independent or self; result> | evidence=<location> | file=<path> | at=<UTC timestamp>
CHECKLIST ACCEPTED WITH EXCEPTIONS | verified=<n>/<total> | waived=<IDs> | review=<result> | file=<path>
CHECKLIST OPEN | verified=<n>/<total> | open=<IDs> | next=<specific action> | file=<path>
CHECKLIST BLOCKED | verified=<n>/<total> | blocked=<IDs> | reason=<specific constraint> | next=<required action> | file=<path>
```

Never invent counts, evidence, reviewer identities, timestamps or paths, and
never bury unfinished work under an optimistic summary. Never report VERIFIED
COMPLETE while any required acceptance criterion, verification, review or
authorized delivery step is unresolved.

## Working with other skills

Checklist needs no other skill. When others are installed, discover them and
follow their actual instructions; never require them, assume their paths or copy
their rules.

- A plan owner such as **CTO** keeps the outer loop and its ledger. This
  checklist becomes the ledger's linked item record, so there is one tracker.
  Ledger states map as follows:
  - `done` becomes `[x]`, but only after its evidence is reconciled;
  - `blocked-external` becomes `BLOCKED`;
  - `todo`, `doing` and `blocked-technical` become `[ ]`.

  The ledger rows stay, and each points to its checklist IDs. A row becomes
  `done` only after the checklist gate passes for its items. Neither skill may
  declare completion while the other's gate is unmet.
- A routing and review skill such as **Delegate** decides who executes and which
  review is required. Record its assignment identity and review requirement as
  an item. The blind close-out satisfies that item only if it meets the skill's
  reviewer rules.
- **Debug** supplies before-and-after regression evidence for defect items.
- **Ship** performs authorized publication, and its proof is the evidence for
  `[release]` items.
- **Ponytail** simplifies the means, never the accepted outcome.
