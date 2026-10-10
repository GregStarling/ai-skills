# Checklist format

The checklist file is the acceptance contract and the handoff record. The
[validator](../scripts/validate-checklist.mjs) reads exactly this format, so keep
to it.

## Location

Default: `.checklists/<task-id>.md` at the project root. Use a stable,
descriptive task ID such as `export-dry-run`; several tasks can coexist. If the
project already keeps an authoritative task or acceptance record, extend it
instead. Hold the items there only if it can carry this whole format. Otherwise
link this file from the record as its single item list, and make the record's
entries point to checklist IDs instead of repeating them.

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
blocks is ignored, so examples never count as items. Every fence must be closed,
and every fence line (opening and closing) must start at column 0, outside items.
Put command output in a top-level fence, for example under Verification, and
refer to it from the item's Evidence.

Some constructs are rejected outright, because a renderer can hide or disguise
entries with them:

- HTML comments;
- raw HTML: tags, processing instructions and declarations;
- character references such as `&#45;`;
- invisible formatting characters, such as zero-width spaces;
- unusual whitespace, such as no-break spaces, form feeds or line separators.

A lone carriage return ends a line, as it does for renderers.

Inside code spans they are fine. Put angle-bracket text, such as a usage string
quoting `<id>`, in a code span; a renderer would drop it otherwise.

## Items

An item starts at the beginning of a line under `## Items`. Indented fields
follow it, one per line:

```text
- [ ] C-001 [build] One specific, observable outcome.
  - Source: Explicit requirement | Implied, {reason} | Pre-mortem P1 | Decision {date}
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
- Task checkboxes (`- [ ]`, `- [x]`) appear only under Items and Close-Out. Use
  plain bullets everywhere else.
- Anything a reader would take for an item must parse as one, or the record is
  invalid. That includes:
  - an item after an unknown heading, in a blockquote, in a table row, or
    without a bullet;
  - a checkbox before an ID anywhere outside Items (or, for findings, outside
    Close-Out);
  - an ID disguised by emphasis, an escape, a link, a look-alike letter or a
    look-alike hyphen.

  Item syntax quoted in a code span is fine.

## States

`[ ]` means open, incomplete or unverified. `[x]` means implemented and
verified, and it is the only state that means verified.

A checked item needs evidence that names the check, inputs or conditions, the
observed result, and the revision or artifact. Include the environment, time
and evidence location where practical, and take times from the system clock.
The validator rejects evidence on a checked item when it:

- is empty, or says or starts by saying the check has not happened, for
  example:
  - `Pending`, `TBD`, `TODO:`, `To do:`, `N/A` or `see above`;
  - `none yet`, `not yet`, `not run`, `not tested at …` or `Skipped.`;
  - any evidence that opens with `Will`, `Awaiting`, `Waiting`, `Queued`,
    `Planned`, `Scheduled` or `Unable`, even after a leading date or an opening
    bracket or quote;
  - `to be determined`.

  When in doubt the check rejects, so lead with the check that ran, for example
  "`npm test`: queued messages survive a restart". Hyphenated words such as
  "Will-call" are not read as markers, and nouns such as "Skipped rows …" are
  fine;
- only asserts success, for example "all unit tests passed", "works on my
  machine", "verified manually", "done" or "LGTM";
- has no anchor once dates and times are set aside. An anchor is a command or
  code span, a path or file name, a URL, or another number such as a revision or
  count.

The anchor check sets aside these date and time forms:

- ISO dates and timestamps;
- clock times, including `10am` and times suffixed `Z`, `UTC`, `am` or `pm`;
- month-name dates such as `Oct 9`, `9 October 2026` and `Oct 2026`;
- ordinals such as `the 9th`;
- `d/m/y` dates;
- `date -u` output;
- a year that ends a phrase or follows "in", "since", "during", "until" or
  "by", as in "in 2026".

Other numbers count as anchors, including a count such as "2000 requests" or
"2048-byte".

The Evidence line itself must name the check.

A timestamp that leads an Evidence value, or leads a bulleted or numbered Change
Log or Verification entry (optionally after "Between", "From" or "At"), is an
event time, and one later than now is rejected. Later timestamps, such as an expiry being verified,
are not checked.

These checks are mechanical minimums. A count, version or file name satisfies
them even in weak evidence such as "Tested 1 time". Whether evidence names an
actual check and is true is the close-out's judgment.

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
| `BLOCKED` | Genuine external dependency, a capability this environment genuinely lacks and cannot obtain, or unavailable authorization | Reason, Evidence, and the Authority or rule that imposes the constraint. Put the required action in Resume |
| `WAIVED` | The user explicitly removed it from accepted scope | Reason, Evidence, the user's Authority, and a Change Log entry naming the ID and the waiver |
| `NOT APPLICABLE` | Evidence shows the requirement does not apply | Reason, Evidence, Authority, and a Change Log entry naming the ID as not applicable |

A technical problem is never `BLOCKED`; it stays open. Waived items lead to
ACCEPTED WITH EXCEPTIONS, never VERIFIED COMPLETE. Not-applicable items leave
the denominator and are listed in the validator's output. A record needs at
least one required item. A record in which every item is waived or not
applicable is rejected, because nothing was delivered.

An Authority that says none exists ("none given", "n/a") is rejected. The
Change Log check is keyword-based, so the close-out still judges what each
entry means.

### Reopening

When later work may have invalidated an item, uncheck it and prefix its old
evidence with `STALE:` (or `FAILED:` when a rerun failed). Keep that text until
new evidence replaces it, and add a Change Log entry, for example
`Reopened C-004: shared auth helper changed`. Reopen the items that depend on
it as well.

The validator rejects a checked item whose evidence still starts with one of
these markers, even after a leading date, bolding or brackets:

- `STALE` (in any case);
- `FAILED`, `FAILING`, `OUTDATED`, `INVALIDATED` or `SUPERSEDED` in capitals;
- one of those words in any case followed by `:`, `.`, `)` or a dash.

"Failed before the fix; …" is still accepted as regression evidence.

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

A removed ID stays retired. `--baseline` enforces all of this. The correction
check looks for words such as "corrected", "removed", "replaced" or "Accept
changed" in the same clause as the ID (clauses are split at `;`, `,` and `.`),
and ignores negations such as "not changed". To correct several items in one
entry, join their IDs with "and", as in "Corrected C-001 and C-002 Accept: …".
The close-out still judges whether each correction was legitimate.

## Close-Out

```text
- Review: independent — {who or what reviewed, and what it was given}
- Inventory: {durable file where the blind inventory was recorded before comparison}
- Result: {outcome, such as PASS with no open material findings}

- [x] F-001 {A finding naming the requirement, defect, missing verification or failure mechanism.}
  - Resolution: Added C-009; fixed and verified at {revision}.
- [ ] F-002 {An unresolved finding.}
```

- **Review** starts with `independent` or `self`. A self review must contain
  the words "not independent".
- **Inventory** says where the blind inventory was recorded.
- **Result** must start with an unqualified `PASS` (or `Passed`) before the
  review counts. These keep the record open:
  - `FAIL` or `BLOCKED` anywhere in it;
  - an alternative such as `PASS/FAIL`, `PASS | FAIL` or `PASS or FAIL`;
  - a qualified pass:
    - `PASS expected` or `PASS?`;
    - `PASS if …`, `PASS unless …`, `PASS except …`, `PASS once …`,
      `PASS provided …`, `PASS assuming …`, `PASS when …` or `PASS until …`;
    - `PASS-ish`;
    - "for now", "tentatively", "conditionally" or "provisionally" anywhere;
  - `pending`.

  In AUDIT mode, Result reports the review's outcome, not the audited work's.
- Leave all three fields `pending` until the close-out happens. Struck-through
  text, as GitHub renders it (`~~x~~` or `~x~` with no space inside the
  tildes), is ignored.
- A field that says the work is still not done also keeps the record open:
  "not yet", "TBD", "to be …", "will be …", "will re-run …", "awaiting",
  "pending", "planned", "scheduled" or "outstanding".
- Only in Result, and only when the negation comes directly before the word
  (at most one word between, and never a conjunction), does a negation cancel
  it. "no findings pending" and "nothing is awaiting" count; "pending a re-run
  with no changes" and "no issues but retest pending" stay open. An Inventory
  that says "none" is not a recorded inventory.
- The validator prints a note on stderr for each reason a recorded review does
  not count yet.
- Write each field once, with no duplicates. Update it when a later round
  replaces it, and keep the earlier rounds' outcomes in Verification.
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
commits, copy the checklist to `.checklists/<task-id>.baseline.md` as soon as its
first items are written. Never edit or re-copy that file, and keep it until the
task ends so the check can be repeated. If no early copy exists, say so; a later
copy is not a baseline for the changes made before it.

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
prints them, into the report line. For VERIFIED COMPLETE, that line also needs
the evidence location and timestamp.

When a recorded review does not count yet, the validator prints a note on
stderr explaining why.

### Known limits

The validator is strict about anything that could hide or disguise an entry. It
cannot judge meaning, so wording checks are keyword minimums, and these remain
close-out judgments:

- **Evidence quality.** A count, version or file name satisfies the anchor
  check even in weak evidence ("Tested 1 time"). Lowercase "failed" in passing
  evidence or results is not read as a failure, because regression evidence
  often says "failed before the fix".
- **Exception and correction wording.** A Change Log entry that names an ID
  next to a matching keyword passes, even if it refuses the waiver or describes
  something else.
- **Contrived phrasing.** Hyphenated markers ("Awaiting-CI") are deliberately
  allowed, as are rare constructions such as "ticket no 42 pending".
- **Rendering.** Fences, HTML and unusual characters are handled by rejection,
  not by reproducing every renderer. A record the validator accepts should
  render as it reads. If a rendered record and the validator ever disagree,
  treat the record as invalid.

A record that passes the validator still needs the blind close-out.

## Template

```markdown
# Checklist: {task-id}

## Request

- Objective: {the user's request in their words, with links to specs, issues or plans}
- Conversation-only requirements: {the user's words, quoted verbatim, for anything said in chat that is not written elsewhere}
- Date / revision: {YYYY-MM-DD, branch and commit}
- Mode: BUILD | AUDIT | PLAN
- Constraints and authority: {scope, compatibility, spending, data, security, publication, approvals}

## Definition of Complete

- {Observable condition required for acceptance.}
- Delivery destination: {local build | merged branch | published package | live deployment}, authorized by {who, where}.

## Items

### {Group}

- [ ] C-001 [build] {One specific, observable outcome.}
  - Source: {Explicit requirement | Implied, reason | Pre-mortem P1 | Decision}
  - Accept: {Objective condition that defines success.}
  - Verify: {Check that would fail if the outcome were false.}
  - Evidence: Pending.
  - Depends on: None.

## Decisions

- {date} {choice}. Reason: {why}. Reversal cost: {low | medium | high}.

## Pre-Mortem

- P1: {credible failure in the first week}. Covered by C-001.

## Exclusions

- {dimension or optional work}: {why it is not required}.

## Change Log

- {timestamp from the clock} Created C-001 from passes A to D.

## Verification

- {timestamp} {revision} {environment}: {check} gave {result}; evidence at {location}.

## Close-Out

- Review: pending
- Inventory: pending
- Result: pending

## Resume

- State: {current state}
- Open: {IDs}
- Blockers: {none, or the specific external constraint and required action}
- Next: {specific next action}
```

Replace every `{…}` placeholder. Angle-bracket placeholders such as `<Group>`
render as HTML tags and are rejected.

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
