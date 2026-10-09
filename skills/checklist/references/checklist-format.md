# Checklist format

The checklist file is the acceptance contract and the handoff record. The
[validator](../scripts/validate-checklist.mjs) reads exactly this format, so keep
to it.

## Location

Default: `.checklists/<task-id>.md` at the project root. Use a stable,
descriptive task ID such as `export-dry-run`; several tasks can coexist. If the
project already keeps an authoritative task or acceptance record, extend it
instead. Either hold the items there in this format, or link this file from that
record as its single item list.

## Sections

Every checklist has these `##` sections. Headings match case-insensitively, and
punctuation is ignored, so `## Pre-mortem` and `## Closeout` are accepted.

| Section | Contents |
| --- | --- |
| Request | Original objective in the user's words, authoritative references, conversation-only requirements, date, revision, mode, constraints and authority |
| Definition of Complete | Observable acceptance conditions and the authorized delivery destination |
| Items | The checklist items, optionally grouped under `###` headings |
| Decisions | Important choices, reasons and reversal costs |
| Pre-Mortem | Credible failure scenarios and the item or protection that covers each |
| Exclusions | Non-applicable dimensions and optional work beyond scope, with reasons |
| Change Log | Append-only additions, corrections, waivers and reopened items |
| Verification | Checks run, results, environments, revisions and evidence locations |
| Close-Out | Review fields, the blind inventory location and findings |
| Resume | Current state, open items, blockers and the next action |

Request and Definition of Complete must not be empty. Text inside fenced code
blocks and HTML comments is ignored, so examples never count as items and hidden
text never counts as a record.

## Items

An item starts at the beginning of a line under `## Items`. Indented fields
follow it, one per line:

```text
- [ ] C-001 [build] One specific, observable outcome.
  - Source: Explicit requirement | Implied, <reason> | Pre-mortem P1 | Decision <date>
  - Accept: The objective condition that defines success.
  - Verify: A check that would fail if the outcome were false.
  - Evidence: Pending.
  - Depends on: None.
```

- **ID:** `C-` followed by digits. IDs are unique and never reused, and a removed
  ID stays retired.
- **Stage:** `[build]` for outcomes verifiable before release, `[release]` for
  outcomes that need the published result.
- **Required fields:** Source, Accept, Verify and Evidence. Evidence reads
  `Pending.` until the item is verified.
- **Depends on:** item IDs or `None`. A checked item cannot depend on an open
  one. If the dependency was reopened, reopen the dependent item too.
- `*` and `+` bullets work as well as `-`, followed by spaces or a tab.
- Lines indented deeper than the fields continue the previous field. A
  column-0 line that directly follows the field text, with no blank line between,
  also continues it.
- Every list entry under Items must be an item. Put notes in prose paragraphs or
  another section.
- Anything a reader would take for an item must parse as one, or the record is
  invalid. That includes an item after an unknown heading, in a blockquote, in a
  table row, without a bullet, or anywhere a checkbox appears before an ID
  outside Items (or outside Close-Out, for findings).

## States

`[ ]` means open, incomplete or unverified. `[x]` means implemented and
verified, and it is the only state that means verified.

A checked item needs evidence that names the check, inputs or conditions, the
observed result, and the revision or artifact. Include the environment, time
and evidence location where practical, and take times from the system clock.
The validator rejects evidence on a checked item when it:

- is empty, or says nothing was recorded: `Pending`, `TBD`, `TODO`, `N/A`,
  `none yet`, `not run`, `not tested`, `skipped`, `to be determined`,
  `see above`;
- only asserts success, for example "all unit tests passed", "works on my
  machine", "verified manually", "done" or "LGTM";
- names nothing inspectable, meaning no command or code span, path or file name,
  URL, revision, count or time.

The Evidence line itself must name the check. Fenced output may follow it but
does not count.

The validator cannot judge whether evidence is true. That is the job of the
close-out.

In AUDIT mode, a gap stays `[ ]`, and its Evidence records the observed failure
prefixed `FAILED:`.

### Exceptions

An exception keeps the box unchecked and adds fields:

```text
- [ ] C-007 [release] Release notes are published with the package.
  - Source: Explicit requirement.
  - Accept: The notes appear on the package's release page.
  - Verify: Open the release page for the published version.
  - Evidence: Publishing needs the registry owner's approval; requested 2026-10-09 in issue #51.
  - Depends on: C-006.
  - Status: BLOCKED
  - Reason: Registry publication requires an approval this session does not have.
  - Authority: The registry's publishing policy requires owner approval.
```

| Status | Meaning | Additional requirements |
| --- | --- | --- |
| `BLOCKED` | Genuine external dependency, a capability this environment lacks, or unavailable authorization | Reason, Evidence, and the Authority or rule that imposes the constraint. Put the required action in Resume |
| `WAIVED` | The user explicitly removed it from accepted scope | Reason, Evidence, the user's Authority, and a Change Log entry naming the ID and the waiver |
| `NOT APPLICABLE` | Evidence shows the requirement does not apply | Reason, Evidence, Authority, and a Change Log entry naming the ID as not applicable |

A technical problem is never `BLOCKED`; it stays open. Waived items lead to
ACCEPTED WITH EXCEPTIONS, never VERIFIED COMPLETE. Not-applicable items leave
the denominator and are listed in the validator's output. A record needs at
least one required item.

An Authority that says none exists ("none given", "n/a") is rejected. The
Change Log check is keyword-based, so the close-out still judges what each
entry means.

### Reopening

When later work may have invalidated an item, uncheck it and prefix its old
evidence with `STALE:` (or `FAILED:` when a rerun failed). Keep that text until
new evidence replaces it, and add a Change Log entry, for example
`Reopened C-004: shared auth helper changed`. Reopen the items that depend on
it as well. The validator rejects a checked item whose evidence still starts
with `STALE`, `FAILED` or `INVALIDATED`, even when bolded or followed by a dash.

## Change Log and corrections

The Change Log is append-only. Never edit, reorder or delete an entry; add new
entries at the end. Record every added item, waiver, non-applicability decision
and reopened item.

Corrections are allowed only when an item is demonstrably erroneous,
duplicated, superseded or inapplicable. Record the original text, the
correction, the justification and the authority. These changes each need a new
Change Log entry that names the ID and says what changed, for example
"Corrected C-004 Accept from …" or "Removed C-006: duplicate of C-002":

- removing an item;
- changing an item's stage, outcome, Accept or Verify text;
- removing a close-out finding.

A removed ID stays retired. `--baseline` enforces all of this.

## Close-Out

```text
- Review: independent — <who or what reviewed, and what it was given>
- Inventory: <where the blind requirement inventory was recorded before comparison>
- Result: <outcome, such as PASS with no open material findings>

- [x] F-001 <A finding naming the requirement, defect, missing verification or failure mechanism.>
  - Resolution: Added C-009; fixed and verified at <revision>.
- [ ] F-002 <An unresolved finding.>
```

- **Review** starts with `independent` or `self`. A self review must contain
  the words "not independent".
- **Inventory** says where the blind inventory was recorded.
- **Result** must start with `PASS` before the review counts. Anything else,
  such as `FAIL` or `pending`, keeps the record open.
- Leave all three fields `pending` until the close-out happens, and write each
  one only once.
- **Findings** are `F-` items. An open finding blocks completion, and a
  resolved finding needs a Resolution: fixed through an item, or rejected with
  the reason it fails the Scope Gate.

## Validator

Resolve the folder where the skill is installed, then run the validator from the
project directory:

```sh
node "<installed-skill-directory>/scripts/validate-checklist.mjs" ".checklists/<task-id>.md"
node "<installed-skill-directory>/scripts/validate-checklist.mjs" ".checklists/<task-id>.md" --baseline "<earlier-copy.md>"
```

For a baseline, use the last committed version, for example
`git show HEAD:.checklists/<task-id>.md > <temp-dir>/baseline.md`. Without
commits, copy the checklist to `.checklists/<task-id>.baseline.md` as soon as it
is first written. Never edit that copy, and keep it until the task ends so the
check can be repeated.

The validator prints one line with the computed status and real counts:

```text
CHECKLIST OPEN | verified=3/5 | open=C-004,C-005 | blocked=none | waived=none | not_applicable=none | findings_open=none | review=pending | build=3/4 | release=0/1 | file=.checklists/export-dry-run.md
```

| Exit | Meaning |
| --- | --- |
| 0 | `CHECKLIST VERIFIED COMPLETE` or `CHECKLIST ACCEPTED WITH EXCEPTIONS` |
| 1 | Invalid record or usage. The problems are listed on stderr |
| 2 | Valid but `CHECKLIST OPEN` or `CHECKLIST BLOCKED` |

The status is OPEN while any item is open, any finding is open, or the review
has not been recorded with a `PASS` result. That holds even when other items are
blocked, because the review is still actionable. The status is BLOCKED only
after a passing review, when every remaining item is BLOCKED. The validator
needs only Node.js and reads only the files it is given.

The validator establishes that the record is consistent. It does not prove the
work behaves correctly, and its output adds no evidence of its own. Its line is
a gate result, not the final report. Carry its counts and IDs, in the order it
prints them, into the report line, which also needs the evidence location and
timestamp.

## Template

```markdown
# Checklist: <task-id>

## Request

- Objective: <the user's request in their words, with links to specs, issues or plans>
- Conversation-only requirements: <anything said in chat that is not written elsewhere>
- Date / revision: <YYYY-MM-DD, branch and commit>
- Mode: BUILD | AUDIT | PLAN
- Constraints and authority: <scope, compatibility, spending, data, security, publication, approvals>

## Definition of Complete

- <Observable condition required for acceptance.>
- Delivery destination: <local build | merged branch | published package | live deployment>, authorized by <who, where>.

## Items

### <Group>

- [ ] C-001 [build] <One specific, observable outcome.>
  - Source: <Explicit requirement | Implied, reason | Pre-mortem P1 | Decision>
  - Accept: <Objective condition that defines success.>
  - Verify: <Check that would fail if the outcome were false.>
  - Evidence: Pending.
  - Depends on: None.

## Decisions

- <date> <choice>. Reason: <why>. Reversal cost: <low | medium | high>.

## Pre-Mortem

- P1: <credible failure in the first week>. Covered by C-001.

## Exclusions

- <dimension or optional work>: <why it is not required>.

## Change Log

- <timestamp> Created C-001 from passes A–D.

## Verification

- <timestamp> <revision> <environment>: <check> gave <result>; evidence at <location>.

## Close-Out

- Review: pending
- Inventory: pending
- Result: pending

## Resume

- State: <current state>
- Open: <IDs>
- Blockers: <none, or the specific external constraint and required action>
- Next: <specific next action>
```

## Completed example

```markdown
# Checklist: export-dry-run

## Request

- Objective: "Add a --dry-run flag to export that shows what would be written without writing it." (issue #42)
- Date / revision: 2026-10-09, branch feature/export-dry-run from a1b2c3d.
- Mode: BUILD
- Constraints and authority: keep existing flags compatible; publication not requested.

## Definition of Complete

- `export --dry-run` lists the files it would write and writes nothing; normal export is unchanged.
- Delivery destination: local branch ready for review; release not authorized.

## Items

### Behavior

- [x] C-001 [build] `export --dry-run` lists every file a real export would write.
  - Source: Explicit requirement.
  - Accept: The listed paths equal the paths a real export writes for the same input.
  - Verify: Run both modes on `fixtures/sample` and diff the path lists.
  - Evidence: 2026-10-09 rev d4e5f6a, macOS, Node 24: `npm test -- export-dry-run` passed 3/3; path lists identical (12 files).
  - Depends on: None.
- [x] C-002 [build] A dry run writes nothing.
  - Source: Implied, a dry run that writes files would destroy work.
  - Accept: The output directory is byte-identical before and after a dry run.
  - Verify: Hash the output directory before and after `export --dry-run`.
  - Evidence: rev d4e5f6a: the "writes nothing" test compares SHA-256 trees and passed.
    It failed before the guard was added, when the dry run wrote 12 files.
  - Depends on: C-001.
- [x] C-003 [build] Existing export behavior and flags are unchanged.
  - Source: Explicit constraint, keep existing flags compatible.
  - Accept: The existing export suite passes without modified assertions.
  - Verify: Run the full suite and inspect the test diff.
  - Evidence: rev d4e5f6a: `npm test` 149 passed, 0 failed; `git diff main -- test/` adds one file and changes none.
  - Depends on: None.
- [x] C-004 [build] A dry run reports an output directory that a real export could not write.
  - Source: Close-out finding F-001.
  - Accept: Dry run against a read-only directory exits non-zero with the same error a real export gives.
  - Verify: Run both modes against a read-only fixture and compare exit codes and messages.
  - Evidence: rev d4e5f6a: `npm test -- read-only` passed; both modes exit 3 with "output directory is not writable".
  - Depends on: C-001.

## Decisions

- 2026-10-09 Reuse the export planner for dry runs instead of a separate listing. Reason: one path list cannot drift. Reversal cost: low.

## Pre-Mortem

- P1: The dry run writes files through a code path that skips the flag. Covered by C-002.
- P2: The listing differs from the real export. Covered by C-001.
- P3: The new flag changes the parsing of existing flags. Covered by C-003.

## Exclusions

- JSON output for dry runs: optional; fails the Scope Gate for this issue.
- Performance: the planner already runs in every export.

## Change Log

- 2026-10-09T14:00Z Created C-001 to C-003 from passes A to D.
- 2026-10-09T15:10Z Added C-004 from close-out finding F-001.

## Verification

- 2026-10-09T15:20Z rev d4e5f6a, macOS 15, Node 24: `npm test` 150 passed; `npm run lint` clean.

## Close-Out

- Review: independent — a fresh reviewer given issue #42, the diff and test results, without this checklist.
- Inventory: recorded in `.checklists/export-dry-run.review.md` before comparison.
- Result: PASS after F-001 was fixed; no open material findings.

- [x] F-001 A dry run against a read-only directory reported success although a real export fails.
  - Resolution: Added C-004; fixed and verified at rev d4e5f6a.
- [x] F-002 Suggested a progress bar for long exports.
  - Resolution: Rejected as beyond scope; it fails the Scope Gate for this issue.

## Resume

- State: complete at rev d4e5f6a.
- Open: none
- Blockers: none
- Next: none
```
