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

## Validation

Pending; recorded here from executed checks only.
