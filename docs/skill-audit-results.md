# Skill audit: before and after — 2026-10-29

Evaluation option (a) from [AUDIT.md](../AUDIT.md): one realistic prompt per skill, three runs each, before and
after the Phase 3 changes. "Before" is the skills folder at `a78c317`; "after" is the edited folder on
`claude/skill-audit`.

## Method

- **Host:** headless `claude -p --model opus` (Claude Code 2.1.296), one fresh copy of a small Node fixture project
  per run (`rowkit`: a CSV exporter with a failing date test, a half-done CTO ledger, a `--json` plan and a
  settings page). All nine skills plus the installed Impeccable skill were installed as project skills.
- **Isolation:** `env -i`, `--setting-sources project`, no MCP servers, so no personal CLAUDE.md, plugins or
  personal skills could influence triggering. Prompts are natural language, never `/skill` commands, and several
  target the collisions in AUDIT.md §2 (a ledger in progress for Catchup, Impeccable installed for Design Director).
- **Tools:** Read, Edit, Write, Bash, Glob, Grep and Skill (no Agent tool); `gh`, `git push`, `npm publish` and
  `curl` denied; $2 cap per run ($4 for CTO). The fixture has no remote, so Ship cannot publish.
- **Measured:** the first skill invoked, whether the final message follows the T1–T3 templates, and whether the
  new scripts were actually called. Cost is Claude Code's API-equivalent estimate, drawn from subscription usage.

## Limits

- Three runs per prompt is a smoke test, not a reliability estimate; a 2/3 → 3/3 change can be noise.
- **Delegate** was run twice after the change. The first rewrite ("Use alongside task-specific skills…") fired
  1/3 times. The description was then changed back to "Use automatically at the start of…, alongside any
  task-specific skill", and the rerun fired 3/3; the table shows the rerun. CTO and Ship were rerun at the same
  time because review repairs touched their wording. Ship's default-base fallback was changed once more after
  that rerun; the Ship runs below blocked before needing a default base.
- **Catchup** run 3 wrote all five template sections but as `**Current state:**` paragraphs rather than the
  one-line `**Current state** —` form, so it counts as a miss below.
- Ship's runs all correctly refused to release unfinished work, before and after, so `SHIP PROOF` was never
  exercised live; its validator is covered by unit tests only.

## New scripts called by the after runs

| Skill | Script | Runs that called it |
| --- | --- | --- |
| catchup | `snapshot.mjs` | 3/3 |
| checklist | `validate-checklist.mjs --init-baseline` and `--status-line` | 3/3 |
| cto | `validate-ledger.mjs` | 3/3 |
| ship | `validate-proof.mjs` | 3/3 |
| ship | `scan-release.mjs` | 1/3 (the other two blocked at readiness before reviewing a diff) |

## Results

| Prompt targets | Correct skill first, before | after | Skills fired, before | after | Cost before | after |
| --- | --- | --- | --- | --- | --- | --- |
| catchup | 3/3 | 3/3 | catchup, catchup, catchup | catchup, catchup, catchup | $0.42 | $0.38 |
| checklist | 3/3 | 3/3 | checklist, checklist, checklist | checklist, checklist, checklist | $1.38 | $1.31 |
| cto | 3/3 | 3/3 | cto, cto, cto | cto, cto→delegate, cto | $0.94 | $1.53 |
| debug | 3/3 | 3/3 | debug, debug, debug | debug, debug, debug | $0.44 | $0.46 |
| delegate | 2/3 | 3/3 | delegate, delegate, (none) | delegate, delegate, delegate | $0.45 | $0.53 |
| design-director | 3/3 | 3/3 | design-director, design-director, design-director | design-director, design-director, design-director | $1.13 | $1.25 |
| focus | 0/3 | 3/3 | (none), (none), (none) | focus, focus, focus | $0.22 | $0.36 |
| refresh-models | 3/3 | 3/3 | refresh-models, refresh-models, refresh-models | refresh-models, refresh-models, refresh-models | $0.40 | $0.33 |
| ship | 3/3 | 3/3 | ship, ship, ship | ship, ship, ship | $0.40 | $0.45 |
| **all** | **23/27** | **27/27** | | | **$5.79** | **$6.59** |

| Template | Runs matching the format, before | after |
| --- | --- | --- |
| catchup | 0/3 | 2/3 |
| debug | 0/3 | 3/3 |
| cto | 0/3 | 3/3 |

Catchup left the fixture unchanged (read-only) in 3/3 runs before and 3/3 after.

## Side by side (run 1 of each)

### catchup

Prompt: “I've been away for a week. Where did we leave off on this project?”

Fired: before catchup, after catchup

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>You're on `main` with one commit, `58d6d4d` ("rowkit: CSV export and date parsing"). The one change since then is unfinished work on CSV quoting, which hasn't been committed.

**Current state**
- The only local change is in `src/export.js`. It adds one line, `// TODO quote fields`. The quoting itself hasn't been written yet.
- There are no stashes and no untracked files. No remote is configured, so there's no upstream, pull request or CI to check.

**In flight**, per `.cto/ledger.md`:
- **E1 – CSV header and rows:** marked done. It has a test in `test/export.test.js`.
- **E2 – quote fields that contain commas or quotes:** marked "doing". This is the TODO above.
- **E3 – empty input prints nothing:** marked "todo". Right now `toCsv([])` would throw, because it reads `Object.keys(rows[0])` without checking for an empty list.

**Next:** the ledger's next step is to finish E2, quoting fields to the standard CSV spec (RFC 4180), and then do E3.

**Watch out**
- **The ledger and plan don't match.** The ledger says it follows `PLAN-csv.md`, but that file doesn't exist. The repo's `PLAN.md` describes a different feature: a `--json` flag, rejecting unknown flags with exit code 2, tests, and README docs. None of that is in `src/cli.js` yet. Can you confirm which plan is current? Is CSV quoting the active work, or was `--json` meant to come next?
- **E1's proof doesn't check out.** The ledger cites commit `2b1c`, which isn't in this repo's history. A matching test does exist. I didn't run the tests (this check only reads files), so I haven't confirmed that it passes now.
- **One unexplained file:** `public/settings.html` has nothing to do with either plan. I didn't look into it.</pre></td>
<td valign="top"><pre>**Current state**: `main` @ `58d6d4d` ("rowkit: CSV export and date parsing"), the only commit. 0 staged, 1 unstaged, 0 untracked. The unstaged change only adds a `// TODO quote fields` line at the end of `src/export.js`.

**In flight**: The CTO ledger (`.cto/ledger.md`) shows E2, "Quote fields containing commas or quotes", as `doing` with no evidence. `toCsv` still joins raw values without any quoting, so the TODO line is the only progress. E3 ("Empty input prints nothing") is `todo`. No stashes.

**Next**: Finish E2 by adding RFC 4180 quoting to `toCsv` (source: `.cto/ledger.md`).

**Watch out**: Some of the records don't match the code:
- **Wrong plan file:** The ledger cites `PLAN-csv.md`, which doesn't exist. The only plan in the repo, `PLAN.md`, is a different plan: a `--json` flag for `src/cli.js`, rejecting unknown flags with exit code 2, plus tests and README updates. None of that is started.
- **Evidence I can't trace:** E1's evidence points at commit `2b1c`, which isn't in this repo's history.
- **E3 may already be done:** `toCsv` already returns `''` for empty input, though no test covers it. Because the CLI always appends a newline, empty input still prints one line.

It's also unclear which work comes first, the ledger's CSV items or the `--json` plan. Your call.

Remote and CI: not checked, because no remote is configured. I didn't run any tests either, since this briefing was read-only.</pre></td>
</tr></table>

### checklist

Prompt: “The CSV export in src/export.js is supposedly finished. Make sure it's actually complete before I tell the team. What's missing?”

Fired: before checklist, after checklist

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>The CSV export isn't finished, so I wouldn't tell the team it's done yet. Your own ledger (`.cto/ledger.md`) still has quoting as "doing" and empty input as "todo". The only uncommitted change to `src/export.js` adds a `// TODO quote fields` comment.

I ran the code to check each point.

**Blocking problems (the output is wrong):**
1. **No quoting.** Values containing commas or double quotes are written as-is. For example, `{name: "A, Inc"}` becomes `A, Inc,…`, which pushes every later column one place to the right. Header names with commas aren't quoted either. (ledger E2)
2. **Newlines inside a value split the record.** `"l1\nl2"` becomes two lines in the file.
3. **Every exported date is a month late.** `src/dates.js:4` passes the 1-based month straight to `Date.UTC`, which counts months from 0. So `2026-01-02` comes out as `2026-02-02`, and `2026-12-31` as `2027-01-31`. The CLI runs every `date` field through this function, so every export's date column is wrong. `test/dates.test.js` already fails because of it.
4. **`npm test` fails:** 1 of 2 tests fails (the date test above).

**Also incomplete:**
5. **Empty input still prints something.** `toCsv([])` returns `''`, but `src/cli.js:7` always adds `\n`, so the CLI outputs 1 byte instead of nothing. (ledger E3)
6. **Columns can disappear without warning.** Headers come only from the first row, so `[{a:1},{a:2,b:3}]` loses `b`.
7. **Nested values break.** An object becomes `[object Object]`, and an array like `[1,2]` spills into an extra column.
8. **Running `rowkit` with no file gives a raw Node stack trace** instead of a usage message.
9. **Only one test exists for the export.** It covers just the basic header and rows, with nothing for quoting, newlines or empty input.
10. **The ledger points to things that don't exist.** It cites `PLAN-csv.md`, which isn't in the repo, and revision `2b1c`, which isn't in the git history. `PLAN.md` describes an unrelated `--json` feature.

**What works:** header and rows for simple values, and `null`/`undefined` becoming empty fields.

I didn't change any code, since you asked for an audit. Nobody else reviewed this; I checked my own work. The full checklist, with what I ran and what came out, is in `.checklists/csv-export-audit.md`.

Most of the fix is small: RFC 4180 quoting in `toCsv`, `m - 1` in `parseDate`, no trailing newline when the output is empty, and tests for each. Want me to go ahead?

CHECKLIST OPEN | verified=2/12 | open=C-002,C-003,C-004,C-005,C-006,C-008,C-009,C-010,C-011,C-012 | next=get authorization, then add RFC 4180 quoting to toCsv and fix the parseDate month | file=.checklists/csv-export-audit.md</pre></td>
<td valign="top"><pre>The CSV export isn't finished. Only 1 of the 9 things I checked works: the basic header-and-rows output. The project's own progress log (`.cto/ledger.md`) agrees: quoting is still "doing" and empty input is still "todo". The only uncommitted change is a `// TODO quote fields` comment.

**What's missing (I ran each case):**

1. **Commas, quotes and newlines inside values aren't handled** (`src/export.js:5`). Values are joined with commas as-is:
   - `x,y` comes out as two columns, so the row no longer lines up with the header;
   - `say "hi"` isn't escaped;
   - a value containing a line break splits the row in two;
   - column names with commas have the same problem.

   Any value like "Acme, Inc." breaks the file.
2. **Every exported date is one month late.** `src/dates.js:4` passes the month to `Date.UTC` without subtracting 1, which the function requires. `2026-03-15` exports as `2026-04-15`. Since `rowkit` rewrites every row's `date` before exporting, every date in every export is wrong.
3. **`npm test` fails**: 1 passes, 1 fails. The failure is the date test, from the same bug.
4. **Empty input prints a blank line instead of nothing.** `toCsv([])` returns `''`, but `src/cli.js` always adds a line break.
5. **Rows without a `date` field crash the tool** with a TypeError in `src/dates.js:3`. The README doesn't say a date column is required.
6. **No tests for quoting or empty input.** `test/export.test.js` has only the one basic test.
7. **Columns are taken from the first row only**, so `[{a:1},{a:2,b:3}]` silently loses column `b`. That may be intended, but someone should decide.
8. **The progress log cites a plan, `PLAN-csv.md`, that isn't in the repo.** `PLAN.md` is a different plan, for a `--json` flag that hasn't been started.

Empty values (null or missing) come out as blank fields, which is fine.

I didn't change any code, since you asked for an audit. I saved the findings, with commands and output for each, to `.checklists/csv-export-audit.md`. The final review was my own, not an independent one. If you want, I can fix items 1–6 now. Items 7 and 8 need a decision from you or whoever owns the plan.

CHECKLIST OPEN | verified=1/9 | open=C-002,C-003,C-004,C-005,C-006,C-007,C-008,C-009 | next=get authorization to fix C-002 to C-007, plus the owner's decision on C-008 and C-009. | file=.checklists/csv-export-audit.md</pre></td>
</tr></table>

### cto

Prompt: “PLAN.md has the plan for the --json output flag. Build the whole thing and don't stop until it's done.”

Fired: before cto, after cto

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>**Status: SHIPPED.** Everything in PLAN.md is done and committed as `fd2965e` on a new local branch, `json-output`. Nothing was pushed or merged into `main`.

**Definition of Shipped, with evidence:**
- **`--json` flag:** `rowkit --json rows.json` prints the normalized rows as a JSON array. Without the flag it still prints CSV. Each mode has a test that passes.
- **Unknown flags:** these print the error, a usage line to stderr, and exit with code 2. This is tested. Running with no file argument also prints usage and exits 2; I added that, the plan didn't ask for it.
- **`npm test` passes:** 5 pass, 0 fail. It also passes with your uncommitted edit to `src/export.js` set aside.
- **README:** shows the default CSV mode, `--json`, and the exit-code-2 behaviour.

**Changes:**
- `src/cli.js`: argument parsing, the `--json` output path, and the usage/exit-2 handling.
- `test/cli.test.js` and `test/fixtures/rows.json`: new tests that run the actual CLI.
- `README.md`: usage for both modes.

**Decisions:**
- **Fixed an existing date bug.** `parseDate` returned the wrong month (`2026-03-15` came out as April), which made `npm test` fail before I touched anything. It would also have put wrong dates in both output modes. The fix is one line in `src/dates.js`.
- **Left your `src/export.js` edit alone.** The `// TODO quote fields` change is still unstaged and is not in the commit.
- **Kept the old ledger.** `.cto/ledger.md` was tracking a different plan (CSV quoting, still in progress). I added a new section for this plan below it rather than overwriting it.

**Review:** no independent reviewer was available, so the only review was my own.

**How to run:** `npm test`, or `node src/cli.js [--json] rows.json`. The ledger is at `.cto/ledger.md`.</pre></td>
<td valign="top"><pre>**Status: SHIPPED.** `--json` is built and `npm test` passes: 5 tests, 0 failures. Nothing is committed; the changes are in your working tree on `main`, since you didn't ask me to commit.

**What "done" meant, and how I checked it**
- **JSON output:** `rowkit rows.json --json` prints the normalized rows as a JSON array. Covered by a new test in `test/cli.test.js`.
- **CSV output:** `rowkit rows.json` still prints CSV. Also covered by a test.
- **Unknown flags:** an unknown flag such as `--yaml` or `-x` prints a usage message to stderr and exits with code 2. Covered by a test and tried by hand.
- **README:** it now shows both modes and the exit-code-2 behavior.

**Changes**
- `src/cli.js`: separates flags from the file argument, adds `--json`, and prints the usage message for unknown flags.
- `test/cli.test.js` (new): runs the actual CLI to test CSV, JSON and the unknown-flag error.
- `README.md`: documents both modes.
- `src/dates.js`: one-line bug fix, explained below.

**Decisions you should know about**
1. **I fixed a date bug that was already there.** `parseDate` was off by one month (`Date.UTC(y, m, d)` should be `m - 1`), so `npm test` was failing before I started. The plan needed tests passing, and the bug would also have written wrong dates into the JSON output (e.g. `2026-03-15` came out as `2026-04-15`).
2. **Running without a file now prints the usage message and exits 2.** Before, it crashed with a stack trace.
3. **I didn't touch the earlier CSV work.** The old `.cto/ledger.md` was for that build, which was unfinished: field quoting in progress, empty input not started. I saved a copy as `.cto/ledger-csv-export.md` before writing the new ledger. Your uncommitted `// TODO quote fields` in `src/export.js` is unchanged. CSV fields with commas or quotes still aren't quoted.

**Review:** no independent reviewer looked at this. I compared the full diff against `PLAN.md` myself and found nothing to fix.

**Try it:** `npm test`, or `node src/cli.js rows.json --json`. The ledger is at `.cto/ledger.md`.

CTO SHIPPED | items=5/5 | destination=local working tree on main (uncommitted; no commit/push/publish requested) | review=adversarial self-review; no findings | ledger=.cto/ledger.md | at=2026-10-29T19:21:26.812Z</pre></td>
</tr></table>

### debug

Prompt: “npm test started failing on the date parser. Fix it.”

Fired: before debug, after debug

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>The date parser is fixed and `npm test` passes again: 3 tests pass, 0 fail.

**Cause:** `parseDate` in `src/dates.js` passed the month from the string straight to `Date.UTC`, which counts months from 0 (January is 0). Every date came out one month late: `2026-03-15` became April 15, and `2026-12-31` rolled over to January 31, 2027. The CLI calls `parseDate` to normalise row dates, so its output was wrong too.

**Fix:** one line in `src/dates.js:4`, which now passes `m - 1` to `Date.UTC`.

**Proof:**
- **Before the fix:** the existing test failed with `2026-04-15T00:00:00.000Z` instead of March 15. I added a year-end test to `test/dates.test.js`, and it also failed on the old code, giving `2027-01-31T00:00:00.000Z`.
- **After the fix:** the full suite passes, and running the CLI on `[{"date":"2026-03-15"}]` prints `2026-03-15`.

I didn't touch your uncommitted `// TODO quote fields` change in `src/export.js`, and nothing has been committed.</pre></td>
<td valign="top"><pre>I fixed the date parser bug and `npm test` passes again (3/3).

**Cause:** `parseDate` in `src/dates.js:4` passed the month straight into `Date.UTC`, which counts months from 0. So `2026-03-15` came out as April 15, and `2026-12-31` rolled over to January 31, 2027.

**Fix:** I changed it to `Date.UTC(y, m - 1, d)`.

**Proof:**
- **Before:** `node --test test/dates.test.js` failed. The existing test got `2026-04-15T00:00:00.000Z` instead of `2026-03-15…`. I added a year-end test (`2026-12-31`), which got `2027-01-31…`.
- **After:** `npm test` passes all 3 tests: both date tests and the CSV export test.

The CLI (`src/cli.js:6`) uses the same parser for its `date` column, so its CSV output had dates shifted by a month too. The fix covers it, but I didn't run the CLI separately.

Your uncommitted `// TODO quote fields` line in `src/export.js` is untouched, and I haven't committed anything.

```text
DEBUG VERIFIED FIX | cause=1-based month passed to 0-based Date.UTC, src/dates.js:4 | before=node --test test/dates.test.js → 2 fail (2026-04-15 vs 2026-03-15; 2027-01-31 vs 2026-12-31) | after=npm test → 3 pass, 0 fail | checks=full node --test suite 3/3 pass | env=local darwin, node --test | next=none
```</pre></td>
</tr></table>

### delegate

Prompt: “Add a --verbose flag to src/cli.js that prints each parsed row to stderr.”

Fired: before delegate, after delegate

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>I added `--verbose` to `src/cli.js`. When it's set, each parsed row is printed to stderr as one line of JSON, and the CSV on stdout is unchanged. The flag can go before or after the file name.

```js
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const [file] = args.filter(a =&gt; a !== '--verbose');
...
if (verbose) for (const row of rows) process.stderr.write(JSON.stringify(row) + '\n');
```

**Checks:** I ran it on a two-row sample file. With `--verbose`, stderr got one JSON line per row and stdout got the normal CSV. Without the flag, the output matched what it was before. There's no test for this flag yet.

**Review is still outstanding:** The delegation skill's review check picked this change for its random 10% audit, which means a fresh review by Opus 5.5. I can't start a separate agent in this session, so that review hasn't happened. You can treat the change as done anyway, or I can run the review once a separate agent is available.

**A date bug from before my change, which I left alone:**
- **Dates come out a month late.** `src/dates.js:4` passes the month straight to `Date.UTC`, but `Date.UTC` counts months from 0, so `2024-01-05` becomes `2024-02-05`. The fix is `Date.UTC(y, m - 1, d)`.
- **It makes 1 of the 2 tests fail.** That's the `test/dates.test.js` test ("parses a date"), and it fails the same way with my change stashed. Want me to fix it?

I didn't touch your uncommitted `// TODO quote fields` line in `src/export.js`.</pre></td>
<td valign="top"><pre>I added the `--verbose` flag to `src/cli.js` and it works. You can put it before or after the file name. With the flag, each parsed row is printed to stderr as one line of JSON, after the date is normalized. Without it, nothing goes to stderr, and the CSV on stdout is the same either way.

**Checks:**
- **Manual test:** I ran a two-row file with and without `--verbose`. Each row appeared on stderr only when the flag was on, and the CSV output was identical in both runs.
- **`npm test`:** 1 passed, 1 failed. The failing test, `parses a date`, also fails without my change, so this didn't cause it.

**Existing date bug:** `src/dates.js:4` passes the month to `Date.UTC` without subtracting 1, so every date comes out one month late. In my test, `2026-01-02` became `2026-02-02`, which is why that test fails. Changing `m` to `m - 1` should fix it. I left it alone because it's outside this task; I can fix it if you'd like.

**Review not done:** I counted this as a low-risk change. The skill's check still picked it at random for an independent review by a separate model session, as it does for about 10% of tasks. I couldn't start that review because the tool for launching another agent isn't available in this session. Under the skill's rules, that means the change isn't formally accepted yet. You can run `/code-review` on this diff instead, or I can try again where agents are available.

I didn't touch your uncommitted change in `src/export.js` (the `// TODO quote fields` line), and nothing has been committed.</pre></td>
</tr></table>

### design-director

Prompt: “Look at public/settings.html and decide whether the delete-account section should be visually separated in red. I want a defensible decision, not a restyle.”

Fired: before design-director, after design-director

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>**Decision: yes, separate it, but red should only back up the separation, not be the main signal. The bigger problem is that there's no confirmation step.**

**What the page does now (`public/settings.html`)**
- The page says the action "Removes your data permanently."
- The "Delete account" button has exactly the same style as the "Save" button. The only button style rule is padding.
- The delete section is set apart the same way as the others: a 1px `#ddd` line under each section.
- The button has no form, handler or confirmation. It does nothing right now.

So the label is the only thing telling users this action is different from a routine save. That's a real gap, and it's the reason to separate the section.

**Why red can't carry the decision**
- Red for destructive actions is a common convention, and that's the only reason to use it here. There's no product evidence behind it: no users, no outcomes, no brand palette. That makes red a reasonable choice that's easy to undo, not something to treat as settled.
- If red is the only signal, people who can't see the colour difference lose the meaning. The separation also has to come from a clearly bounded group with consequence text and a distinct button treatment. Red goes on top of that.
- Use red sparingly: on the delete button and the section border only. Don't tint the whole section.

**The gap that matters more**
On a permanent action, styling doesn't stop an accidental click. The higher-value requirement is a confirmation step that restates the consequence before anything is deleted, and that works with the keyboard and screen readers.

**What would change this decision**
- Whether a backend deletion flow exists. Nothing in the repo references this page, and the rest of the repo is the rowkit CLI.
- Whether deletion really can't be undone. A grace period would justify a lighter confirmation.
- An existing brand colour for danger or errors.
- Any evidence of users deleting their account by mistake.

**How to check it once built**
- Take a grayscale screenshot: the delete section must still stand out from Save without colour.
- Red text needs a contrast ratio of at least 4.5:1, and the red border at least 3:1.
- A single click must never delete the account.

I didn't change `settings.html`. I recorded the decision as two rules for the settings page: "distinguish destructive actions" (experimental) and "require confirmation" (provisional). They're in `design-resolution.json` at the repo root and pass the skill's validator. It's a recommendation only and hasn't been saved as a project design rule, so you can delete the file if you don't want it in the repo.</pre></td>
<td valign="top"><pre>## Decision: Yes, set it apart, but red should only be a supporting cue

**Why it needs separating.** In `public/settings.html` all three sections look the same: the same padding, the same 1px `#ddd` bottom border and the same plain button. The only thing marking "Delete account" as different is its heading. Yet it's the one action on the page that can't be undone ("Removes your data permanently."). Right now it looks no more serious than the Weekly digest checkbox.

**Why red shouldn't do the work alone:**
- **People who can't see red.** If color is the only signal, colorblind and low-vision users miss the difference. Separate it with structure first: extra space above it, or its own outlined box. The page should still read correctly in grayscale.
- **Too much pull.** A solid red button would be the boldest thing on the page and would draw people toward the destructive action. Use a red outline or red text on the button instead. The Save button should stay at least as prominent as Delete account.
- **Red is safe to add as a second cue.** The page uses no accent color now, so one restrained red won't compete with anything. Any red you pick needs at least 4.5:1 contrast on white.
- **The copy should carry the weight too.** State the consequence plainly next to the button, not just "Removes your data permanently."

**How firm this is.** The only hard evidence is the page itself. The rest comes from general design principles, which are reasonable defaults rather than proof. There's no brand palette, no user data and no history of accidental deletions. So the rule is recorded as provisional: the principle is firm, but the exact red is open.

## A bigger problem than color

The Delete account button has no confirmation step and no way to recover. Making it red doesn't make it safer; a confirmation step (for example, typing to confirm) matters more than any styling. I haven't changed this, since you asked for a decision, not edits.

## What I wrote

I didn't touch the HTML. I wrote one file, `design-resolution.json`, which records this decision as a provisional rule, cites the page as evidence and lists the open questions. It passes the design-director skill's format checker. It's only a recommendation; nothing has been adopted or saved anywhere.

One open question: the repo is a CSV command-line tool, and this page has no script or backend behind it. It may be a mockup. If so, the confirmation gap matters only once it's connected.</pre></td>
</tr></table>

### focus

Prompt: “Rename parseDate to parseIsoDate everywhere. Just do what I asked, nothing else.”

Fired: before (none), after focus

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>I renamed `parseDate` to `parseIsoDate` everywhere it appeared:

- `src/dates.js:2`, where it's defined
- `src/cli.js:3` and `src/cli.js:6`, the import and the call
- `test/dates.test.js:3–4`, the import and the test

A search afterwards found no remaining uses of `parseDate`. I didn't run the tests, and I didn't touch any other files, including your uncommitted changes in `src/export.js`.</pre></td>
<td valign="top"><pre>I renamed `parseDate` to `parseIsoDate` in all five places it appeared:

- `src/dates.js:2`: the function definition
- `src/cli.js:3,6`: the import and the call
- `test/dates.test.js:3,4`: the import and the call

No uses of `parseDate` are left. I didn't touch your uncommitted change to `src/export.js`.

**Tests:** `npm test` gives 1 pass and 1 fail, and it gave the same result before the rename. The failing test is "parses a date": `parseIsoDate('2026-03-15')` returns `2026-04-15`, a month too late. That points to an off-by-one month bug in `src/dates.js`. I left it alone because it's outside what you asked; I can fix it if you want.</pre></td>
</tr></table>

### refresh-models

Prompt: “New models came out this week. Evaluate them for delegate and refresh the routing pack.”

Fired: before refresh-models, after refresh-models

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>I stopped before evaluating anything. This directory isn't the ai-skills maintainer checkout, so the refresh can't run here.

- **What this repo is:** `rowkit` (`package.json`), a CSV/date library. Your `src/export.js` has uncommitted changes.
- **What the refresh needs is missing:** there's no `docs/routing-pack-maintenance.md`, no `data/routing/frontier-targets.json`, no `scripts/probe-frontiers.mjs`, no governor or `compile-routing-pack`, and no `skills/delegate/` source folder.
- **What's here instead:** only an installed consumer copy of delegate at `.claude/skills/delegate/routing-pack.json`. Editing it by hand would put a pack in place that skipped discovery, probing, review and compilation, which the skill doesn't allow. It would also not update the published pack.

I made no changes, spent nothing on evaluation, and left your `src/export.js` edits alone.

To go ahead, tell me where the ai-skills checkout is (possibly `~/ai-skills`) and confirm I can work there. Then I'll:
1. Read the maintenance docs and the current policy and pack.
2. Fetch each provider's official docs to find this week's new generally available frontier models.
3. Probe them through your authenticated Claude Code and Codex hosts.
4. Evaluate and independently review their actual task output.
5. Compile and stage a new pack for your review before publishing it through Git.

The remaining budget is about $1.88, which covers only a few real task evaluations. Some new models will probably stay provisional or on HOLD rather than becoming qualified routes.</pre></td>
<td valign="top"><pre>I didn't run a model evaluation or change the routing pack, because this directory isn't the ai-skills repository the refresh needs. Nothing was probed, evaluated, staged or published, and no money was spent on evaluation.

The current directory is `rowkit` (version 0.3.0, a CSV export and date-parsing tool). It contains `package.json` and `src/{cli,dates,export}.js`, and has one uncommitted change in `src/export.js`. A search for every file and script the refresh uses found none here:

- `docs/routing-pack-maintenance.md`, `docs/v4-economics.md`, `docs/v5-identity-assurance.md` or `docs/production-receipts.md`
- `data/routing/frontier-targets.json`
- `scripts/probe-frontiers.mjs` or the `compile-routing-pack` command
- `skills/delegate/routing-pack.json`

Only the refresh-models instructions themselves are installed here, under `.claude/skills/`. The routing policy, the current pack and the evaluation tools all live in the ai-skills repository.

I could have looked up this week's model releases and written a new `frontier-targets.json` or routing pack here. I didn't, because that would mean making up routes with no evaluations behind them, and the refresh rules forbid that.

**To proceed:** give me the path to your ai-skills checkout, or open the session there. I'll then follow its maintenance doc: confirm the official model IDs from the providers' documentation, probe them on the hosts you're logged into, and evaluate and review each one within the $2 budget. I'll stage the compiled pack for your review before anything is published.</pre></td>
</tr></table>

### ship

Prompt: “The CSV export work is finished. Ship it.”

Fired: before ship, after ship

<table><tr><th>Before</th><th>After</th></tr><tr>
<td valign="top"><pre>I didn't ship this. The CSV export isn't finished, a test fails, and there's nowhere to publish to. Nothing has been committed or pushed.

**1. The CSV work isn't done.** The only uncommitted change is one line in `src/export.js`: `// TODO quote fields`. The task ledger (`.cto/ledger.md`) agrees:
- **E1**, CSV header and rows: done.
- **E2**, quoting fields that contain commas or quotes (the standard CSV quoting rules, RFC 4180): marked "doing". No quoting code exists yet.
- **E3**, empty input prints nothing: marked "todo". `toCsv` returns `''`, but `cli.js` still prints a newline, and no test covers it.

**2. `npm test` fails (1 pass, 1 fail).** `parseDate('2026-03-15')` returns April 15. In `src/dates.js:4`, `Date.UTC` counts months from 0, so it should be passed `m - 1`. Every date the CLI exports is a month late. The bug is already in the last commit; this change didn't introduce it.

**3. There's no destination.** The repo has no git remote, CI or publish config. `package.json` (rowkit 0.3.0) has no publish setup.

`PLAN.md` also describes a different, unstarted piece of work (a `--json` output flag). The ledger points to `PLAN-csv.md`, which doesn't exist.

If you want to go ahead, I can:
- finish E2 and E3 with tests, and fix the date bug (a one-line fix plus the existing test)
- commit those locally once `npm test` passes
- push and publish once you tell me where: a remote URL, or npm if you want the package published.

SHIP BLOCKED | stage=prepare/validate | revision=58d6d4d (uncommitted: TODO comment in src/export.js) | reason=CSV work incomplete (E2 quoting not written, E3 untested), `npm test` fails on the date month bug, no remote or publish target configured | evidence=.cto/ledger.md; `npm test`: 1 pass, 1 fail (parses a date) | next=confirm I should finish E2/E3 and fix parseDate, and give a remote or publish target</pre></td>
<td valign="top"><pre>I haven't shipped anything. Nothing was committed or pushed, because the repository shows the CSV export isn't finished yet:

1. **The CSV work is incomplete.** `.cto/ledger.md` shows E2 (quoting fields that contain commas or quotes) as *doing* and E3 (empty input prints nothing) as *todo*. The only uncommitted change is one line added to `src/export.js`: `// TODO quote fields`. `toCsv` still joins raw values, so a field containing a comma would break the CSV.
2. **Tests fail.** `npm test` passes 1 and fails 1. `test/dates.test.js:4` expects `2026-03-15T00:00:00.000Z` but gets `2026-04-15…`, which looks like an off-by-one month bug in date parsing.
3. **There's nowhere to push to.** `git remote -v` is empty, and I found no CI config.

Also, the ledger points to `PLAN-csv.md`, which doesn't exist. The `PLAN.md` that is in the repo describes a different feature, a `--json` flag.

To ship, I need:
- E2 and E3 finished, or your confirmation that they're out of scope for this release.
- The date test fixed.
- A remote added, or a destination named.

I can work on the first two now if you'd like.

SHIP BLOCKED | stage=readiness | revision=58d6d4d | reason=CSV export unfinished (ledger E2 quoting doing, E3 empty input todo; only uncommitted change is a '// TODO quote fields' comment), npm test fails 1/2 (dates.test.js expects 2026-03-15, got 2026-04-15), and no git remote is configured | evidence=.cto/ledger.md; npm test: 1 pass 1 fail; git remote -v empty | next=finish E2/E3, fix date parsing, and add a remote or name the release destination</pre></td>
</tr></table>

