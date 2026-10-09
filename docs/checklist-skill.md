# Checklist skill — 2026-10-09

## Plan and acceptance

Add `skills/checklist`: a portable skill that defines what complete means,
persists a falsifiable checklist, executes or audits work against it, and
withholds completion until every required item has evidence and survives a
blind adversarial close-out. The maintainer's guiding prompt is preserved in
[checklist-source-prompt.md](checklist-source-prompt.md).

1. Package the skill as SKILL.md, a README, Codex metadata, three references
   (discovery, format and close-out), and a dependency-free validator.
2. Adapt the prompt rather than paste it, keeping every rule traceable (see
   below).
3. Keep the skill standalone. Companion skills are discovered and optional. With
   CTO, the checklist becomes the ledger's single item record. Delegate's
   required review becomes an item. Debug and Ship supply evidence. No other
   skill folder changes.
4. The validator enforces the structural completion gate and, with
   `--baseline`, the ratchet. Contract tests cover passing, failing and status
   cases, and keep the format reference's template and example valid.
5. Update the catalog, install guide and repository scope notes to seven skills.
6. Validate:
   - repository checks;
   - disposable installs for both hosts;
   - real Claude Code trigger checks;
   - behavior exercises in BUILD, AUDIT, composition and pressure scenarios;
   - blind fidelity and frontier reviews.
7. Install personal copies for Claude Code and Codex, open a pull request, and
   release through /ship.

## Prompt trace

| Prompt part | Skill location |
| --- | --- |
| Opening quote, mission steps 1–8, governing principle | SKILL.md introduction; README |
| Self-contained; no assumed agent, model, command or capability | SKILL.md introduction |
| "Never confuse" pairs | SKILL.md introduction |
| §1 Source of truth, inspection, preserving the request and conversation-only requirements, reconciling an existing checklist, no invented requirements | SKILL.md §1; format: Request section |
| §1 BUILD, AUDIT and PLAN modes; no implied authority | SKILL.md §1 |
| §1 Authority restrictions; no granted permissions; when to ask; continue working | SKILL.md introduction and §1 |
| §2 Perspectives | SKILL.md §2; discovery: Perspectives |
| §2 Passes A–D, Scope Gate (verbatim), dimensions, non-software adaptation, exclusions, pre-mortem with at least three scenarios | SKILL.md §2 (summary and Scope Gate); discovery (full lists and questions) |
| §3 Item fields 1–7, small outcomes, bad and good examples, required format, `[build]` and `[release]`, release only when authorized, falsifiable verification, code reading versus runtime, scaling | SKILL.md §3; format: Items; discovery: Writing good items |
| §4 Default path, stable task ID, extending an existing record, ten required sections, version control, disclosing non-persistence, never claiming a write | SKILL.md §3; format: Location and Sections |
| §4 Item states, exceptions with reason, evidence and authority, "Only `[x]` means verified" | SKILL.md §3; format: States; validator |
| §5 Ratchet prohibitions, legitimate corrections, explicit requirements never N/A, only the user waives, optional work never blocks | SKILL.md §4; format: Change Log; validator `--baseline` |
| §6 Per-item loop, no batching, "do not stop after" list, completion by evidence | SKILL.md §5 |
| §6 Evidence contents, regression before and after, new features, external actions, unexecuted checks, failing tests | SKILL.md §5; format: States |
| §6 Freshness, including indirect dependencies and no stale reuse | SKILL.md §5; format: Reopening; validator `STALE:` rule |
| §6 When stuck; technical difficulty is not an external blocker; genuine limits | SKILL.md §5 |
| §7 Challenge questions, the material-gap procedure, no postponing, no unrelated growth | SKILL.md §6; discovery: Keep challenging |
| §8 Phases A–D, reviewer packet, withheld material, self-review protocol, no manufactured reviewer, explicit independent review, findings grounded in evidence, two-round limit, final reconciliation | SKILL.md §7; close-out (full procedure) |
| §9 Gate points 1–10, structured parsing, validator limits, never claiming a run | SKILL.md §8; close-out: The completion gate; validator |
| §9 Build and release completion, publication needing authorization | SKILL.md §8 |
| §9 Four outcomes, no technical blocker labels, no waivers manufacturing completion, interruptions | SKILL.md §8; validator status |
| §10 Checkpoint updates, ending a session, no stopping for phase or context length, no repeated asking, no background promise, restart reconciliation | SKILL.md §9 |
| §11 Counts not impressions, milestone summary, four report lines (verbatim), no invented values or buried work | SKILL.md §9 |
| Non-negotiable rules 1–15 | SKILL.md: Non-negotiable rules |
| Final standard and closing statement | SKILL.md: final standard; close-out: Final standard |

## Deliberate adaptations

- **Checkbox on every item.** The prompt shows the item fields without a
  checkbox but makes checkboxes authoritative. Each item line therefore carries
  both: `- [ ] C-001 [build] Outcome`.
- **Machine-readable exceptions.** Exceptions use `Status`, `Reason` and
  `Authority` fields. A waiver or non-applicability must appear in a Change Log
  entry naming the ID.
- **Reopened evidence.** Old evidence on a reopened item is marked `STALE:` or
  `FAILED:`, so a checked item cannot quietly keep it.
- **Structured close-out.** Close-Out records `Review`, `Inventory` and `Result`
  fields, and findings as `F-` items.
- **Ratchet check.** `--baseline` makes the ratchet checkable against an earlier
  copy.
- **Composition.** The composition section implements the request that Checklist
  work alongside the collection's other skills without depending on them.
- **Checklist file in AUDIT and PLAN.** Writing the checklist file counts as a
  record rather than an implementation change. A user who forbids writes keeps
  it in the conversation.
- **A strict validator.** The gate rejects anything that could hide or disguise
  an entry rather than emulating Markdown rendering:
  - HTML comments, raw HTML, character references and invisible formatting
    characters;
  - unclosed fences, and indented fences outside items;
  - task checkboxes outside Items and Close-Out;
  - IDs disguised by emphasis, escapes, links or look-alike characters;
  - checked evidence that is a placeholder, says nothing was recorded, is a
    bare assertion, or has no anchor apart from a date or time;
  - evidence still marked `STALE` or `FAILED`;
  - a review whose Result is not an unqualified `PASS`;
  - exceptions without authority;
  - future-dated event times.

  Correction and waiver wording, and whether a count or version really
  identifies a check, remain close-out judgments.

## Validation

All results below come from executed checks on 2026-10-09 (UTC).

### Validator contract tests

`test/routing/checklist.test.ts` has 192 cases. They cover:

- valid records, including the guiding prompt's sample items with checkboxes;
- every structural rejection;
- the OPEN, BLOCKED, ACCEPTED WITH EXCEPTIONS and VERIFIED COMPLETE statuses;
- the `--baseline` ratchet;
- usage errors;
- a drift guard that validates the format reference's template (OPEN) and
  completed example (VERIFIED COMPLETE).

All 192 pass. The first 104 cases failed 44 times against the original
validator, which shows they can fail. Typecheck passes.

### Adversarial validator review

Three independent attack rounds probed the validator, and a fourth close-out
review tried about 120 more probes:

| Round | Probe files | Issues found | Material |
| --- | --- | --- | --- |
| 1 | 63 | 25 | 15 |
| 2 | 43 | 21 | 17 |
| 3 | 60 | 18 | 9 |
| 4 (close-out) | about 120 | 3 plus minor issues | 2 |

The round-4 material findings were both fixed:

- A fence quirk, present since round 1, could hide an entry.
- Overly broad "not recorded" words, introduced in round 3, rejected real
  evidence.

The material issues were records that reached a passing status. They used:

- hidden items behind comments, fences, processing instructions, invisible
  characters, entities or look-alike IDs;
- placeholder, unrecorded or date-only evidence;
- a struck, qualified or `FAIL` result;
- a prototype-name status;
- erased findings or a reused ID.

The third round's close-out review also found two regressions from round 2: a
waiver rule that rejected legitimately open records, and a quadratic link
pattern. Both are fixed.

All material probes now give INVALID or OPEN, and each class has a regression
test. The former false rejects now pass: tabs, indented headings, non-Latin
text, link sub-bullets, code spans, ASCII arrows, planned IDs, and expiry times
inside evidence. Adversarial 300 KB lines take 0.02–0.03 s.

### Fidelity to the guiding prompt

- `docs/checklist-source-prompt.md` matches the pasted prompt word for word
  (4,084 words, 0 differences after normalizing Markdown markers).
- A blind fidelity review traced about 340 prompt rules. It found one material
  issue: a blocked release item let the record report BLOCKED before the
  adversarial close-out ran. The validator now keeps the record OPEN until a
  review passes.
- Round 2 confirmed all six round-1 issues fixed, and its minor clarifications
  were applied. The four status lines are verbatim.
- Round 3 found two material gaps, both now fixed:
  - `close-out.md` still offered reading items by hand as an equal fallback
    when Node.js is unavailable. It now requires parsing with another tool, as
    `SKILL.md` already did.
  - The waiver rule contradicted the PLAN end state.

### Trigger checks

These ran in Claude Code 2.1.292 headless with the skill installed:

- Four completion-discipline prompts invoked `checklist` as their first tool
  call.
- Four content-checklist prompts made no skill call: camping packing, engineer
  onboarding, a Cessna pre-flight list and a launch-day email list.

### Behavior exercises

Sonnet executors followed the installed skill, and fresh Opus evaluators
inspected the results:

| Exercise | Result |
| --- | --- |
| BUILD: `--lines` for a word-count CLI | PASS, VERIFIED COMPLETE 13/13, `npm test` 10/10 |
| AUDIT: notes CLI, run twice | PASS both times. Real gaps found (delete does not remove, unknown id accepted, empty notes accepted, missing tests); implementation files unchanged; CHECKLIST OPEN |
| CTO ledger composition: CSV export, run twice | PASS both times. One `.checklists` record linked from `.cto/ledger.md`, no duplicated items, correct RFC 4180 output, VERIFIED COMPLETE |

A pressure-scenario review of S1–S15 covered:

- waiver by implication;
- false BLOCKED;
- an unavailable reviewer;
- shared-code freshness;
- release authorization;
- audit fixes;
- resume;
- the Node.js fallback;
- conflicting requirements;
- the baseline;
- the report line.

Its two rounds of ambiguities were resolved in the text. These are simulations
judged against the text, not live runs.

### Standalone host run

A real Claude Code session (2.1.292, Sonnet) ran with
`--setting-sources project,local`, so only the project's `checklist` skill was
loaded and no personal companion skills.

It completed a BUILD task, used a fresh reviewer, ran the installed validator
and reported VERIFIED COMPLETE 4/4. The validator, rerun independently, agrees,
and `npm test` passes.

### Installs and discovery

- Skills CLI 1.7.2 installed `checklist` alone, and all seven skills, into
  disposable projects for Codex and Claude Code. The installed files match the
  source byte for byte, and the installed validator runs from the consumer
  directory.
- Personal copies are discovered by Claude Code 2.1.292 (init skill inventory)
  and by Codex 0.156.1 (`skills/list`: enabled, user scope).

### Repository

The full suite surfaced one existing failure that also occurs on `main`.
`test/routing/routing.test.ts` "refuses a header that outlives evidence" did not
pin its clock, unlike its sibling cases. Its fixture evidence had aged out
against the real date. The test now pins 2026-09-09 like the others; no source
or routing-pack bytes changed.

Separately, the published routing pack expires 2026-10-11T05:16:44Z, after which
CI's pack-validation step fails. Refreshing it is outside this change.

### Limits

- Fixtures and simulations are bounded checks. They do not prove the skill's
  behavior on every project.
- The validator checks the record's consistency, not whether the work behaves
  correctly.
