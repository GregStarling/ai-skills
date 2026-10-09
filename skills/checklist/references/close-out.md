# Blind adversarial close-out

Run this when every required implementation item appears complete. Release
items still awaiting publication and `BLOCKED` items may remain open. In AUDIT
mode, run it once every item has a recorded result. The central question is:

> What is required for this task to be complete that the original checklist
> failed to discover?

Do not start by reading the existing checklist.

## Phase A: re-derive the requirements blind

Work from the original request, the authoritative specifications and the
delivered artifacts.

**Prefer a fresh-context reviewer** that did not help write the checklist, if
the environment can provide one: a new agent, a separate session or a person.
Give it:

- the original requirements, including conversation-only requirements quoted verbatim from the checklist's Request section (the user's words only, never the item list);
- the relevant system context, as paths rather than a narrative;
- the delivered implementation or change, as the diff, revision or artifact paths;
- the applicable constraints.

Withhold at first:

- the existing checklist;
- the executor's completion summary;
- arguments defending implementation decisions.

Ask the reviewer to identify the necessary behaviors, important failure cases,
integration requirements and acceptance criteria independently. It must record
that inventory, for example in `.checklists/<task-id>.review.md` or in its
returned report, before it sees the checklist. Record where the inventory lives
in the Close-Out `Inventory` field.

**Without independent review capability,** do a distinct adversarial
self-review:

1. Reopen the original requirements.
2. Derive a fresh completion inventory without consulting the checklist.
3. Record that inventory.
4. Only then compare it with the checklist.
5. Record `Review: self (not independent)` and say so in the final report.

Never manufacture an independent reviewer, and never claim self-review gives the
same assurance. If the user explicitly required independent review and none is
available, that requirement stays unresolved. Record it as an item marked
`BLOCKED`, with the action needed, such as a person or a separate session
reviewing the work.

When another installed skill sets review rules (for example, which model or
reviewer tier is required for this risk), the blind reviewer must also meet
them. Otherwise run the required review separately.

## Phase B: compare requirements

Compare the independent inventory with the checklist. For each newly
identified requirement:

- add it as an item if it passes the Scope Gate;
- reject it as optional or beyond scope only with a recorded explanation, as an
  `F-` finding with a Resolution or as an Exclusion;
- reopen an existing item whose acceptance criteria were insufficient.

Review the Exclusions, waivers, `BLOCKED` items and Change Log corrections for
unjustified scope reduction. A technical problem relabelled as an external
blocker is a finding. Do not let a reviewer add unrelated features because they might
improve the product.

## Phase C: challenge the evidence

Examine the actual artifacts and verification results, not their summaries.
Pay particular attention to:

- explicitly requested functionality;
- critical user workflows;
- security and data integrity;
- previously failing behavior;
- integration boundaries;
- items with weak or stale evidence;
- user-visible functionality that could be stubbed or disconnected;
- scope exclusions and authorized waivers.

Re-execute high-risk or questionable verification yourself when that is
practical and safe. A reviewer's assertion is not proof either: each finding
must identify a requirement, an observed defect, a missing verification or a
credible failure mechanism. Record findings as `F-` entries in Close-Out.

For each material omission:

1. Add or reopen the affected item.
2. Correct the implementation.
3. Verify the result and record the evidence.
4. Repeat the affected review.

Later rounds focus on what changed or was newly discovered, while keeping
critical dependencies covered. After two full review rounds, a new requirement
must rest on an explicit requirement, a demonstrated defect or a concrete
failure risk. Speculative improvements belong under Exclusions.

## Phase D: final reconciliation

Before accepting the work:

- [ ] Re-read the original request.
- [ ] Confirm every requirement traces to an item.
- [ ] Inspect the final implementation and the relevant diff.
- [ ] Reconcile the checkbox states with the actual evidence.
- [ ] Confirm the review has no unresolved material findings.
- [ ] Confirm the required tests and acceptance checks are still valid for the final revision.
- [ ] Confirm no authorized delivery requirement remains outstanding.

The work must survive an attempt to prove it incomplete.

## The completion gate

Read the persisted checklist; do not rely on a statement that every box is
checked. Run the validator described in the [format reference](checklist-format.md#validator),
with `--baseline` when an earlier version exists. Confirm by inspection that:

1. every required item has a unique, stable ID;
2. every required item has a source, acceptance criterion and verification method;
3. every checked item has non-placeholder evidence;
4. the evidence identifies an actual check, observation or inspectable artifact;
5. no required item remains unchecked;
6. no required verification is failed, pending or invalidated;
7. no unresolved in-scope defect remains;
8. the required review has happened and all material findings are resolved;
9. scope changes and waivers have valid recorded authority;
10. all authorized delivery and release requirements are satisfied.

The validator covers some of these points mechanically:

| Points | What the validator does |
| --- | --- |
| 1–3, 5 and 9 | Checks the recorded structure |
| 4 | Rejects placeholder or bare-assertion evidence, and evidence that names nothing inspectable |
| 6 | Rejects checked evidence marked `STALE:` or `FAILED:` |
| 7 and 8 | Requires a recorded review whose Result starts with `PASS` and leaves no open finding |

Some judgments remain yours in this close-out:

- whether the evidence is real and sufficient;
- whether every defect was recorded as a finding;
- whether every authorized delivery requirement has a `[release]` item (point 10);
- whether exception wording means what its keywords suggest.

If the validator could not run, say so and apply the checks with another tool or
by reading each item.

## Final standard

Before declaring completion, ask:

> If a competent engineer who never saw my checklist started with the user's
> original request, inspected the delivered result, and attempted to prove it
> incomplete, would they find any required functionality missing, broken, or
> unverified?

If the evidence reveals a material gap, reopen the checklist and resolve it. If
the review is inconclusive, record and report that uncertainty rather than
claiming proof.
