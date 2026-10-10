# Checklist

> A checklist written by the worker and graded by the worker is a diary. A
> checklist that can prove the worker wrong is quality control.

Checklist sets the finish line before the work starts and holds the agent to
it. It derives the explicit, implied and forgotten requirements and makes each
one a falsifiable item. Each item needs evidence before it can be checked off.
A blind reviewer then tries to prove the work incomplete before the agent may
call it done.

## Install

```sh
npx skills add GregStarling/ai-skills --skill checklist --agent codex claude-code --copy
```

Run this from your project, or add `--global` for a personal installation. You
can also copy this complete folder into your agent's skill directory. The
instructions need no build. The bundled validator needs only Node.js.

## Use

- Codex: `$checklist Add CSV export to the reports page`
- Claude Code: `/checklist Add CSV export to the reports page`
- Natural language: "Checklist mode: make sure this is actually complete."

Choose a mode in the request:

| Mode | You get |
| --- | --- |
| **BUILD** (default) | A checklist, the implementation, evidence for every item, and a blind close-out |
| **AUDIT** | An independent completeness audit of existing work, without code changes unless you authorize them |
| **PLAN** | The checklist and completion contract, without implementation |

The checklist lives at `.checklists/<task-id>.md` with the request, the
definition of complete, items, decisions, a pre-mortem, exclusions, an
append-only change log, verification, close-out and a resume point. A later
session reads it and reconciles it with the code before continuing. Checklist
does not run in the background and cannot bypass permissions; invoke it again
to resume.

## What it refuses to do

- Treat a passing build, a green test run or a checked box as proof of
  completion.
- Delete, merge or weaken a difficult requirement. Only you can waive one, and
  "keep it simple" is not a waiver.
- Call a technical problem an external blocker.
- Present self-review as independent review, or invent a reviewer.
- Report VERIFIED COMPLETE while any required item, review or authorized release
  step is unresolved.

## The validator

```sh
node "<installed-skill-directory>/scripts/validate-checklist.mjs" .checklists/<task-id>.md
node "<installed-skill-directory>/scripts/validate-checklist.mjs" .checklists/<task-id>.md --baseline <earlier-copy.md>
```

The validator rejects malformed or hidden items and missing fields. It rejects
markup that could hide them: HTML, comments, character references and
invisible characters. It rejects checked boxes whose evidence is a placeholder
or a bare assertion, or has no anchor such as a command, path or revision apart
from a date. It also rejects exceptions without authority and inconsistent
dependencies. It keeps the record open until a blind review is
recorded as passed with no open findings.

With `--baseline`, it rejects silently removed or weakened items and findings,
reused IDs, and edits to earlier Change Log entries. It prints the status and
real counts.

The validator checks the record, not the work. Behavioral checks and the blind
close-out decide whether the work is complete.

## Combine with other skills

Checklist needs no other skill. When they are installed:

- **CTO** keeps the plan and ledger, and the checklist becomes the ledger's
  single item record.
- **Delegate** routes the work and sets the required review.
- **Debug** supplies the regression evidence for defect items.
- **Ship** supplies the release proof for `[release]` items.
- **Ponytail** keeps implementations simple without shrinking the accepted
  outcome.

[Canonical instructions](SKILL.md) · [Discovery passes](references/discovery.md) ·
[Checklist format](references/checklist-format.md) · [Close-out](references/close-out.md)
