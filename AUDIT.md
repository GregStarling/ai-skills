# Skill audit — 2026-10-29

Scope: the nine skills in `skills/`. Branch `claude/skill-audit`. Sections 1–5 are the Phase 2 audit as
approved, written before any skill was edited; the Phase 3 outcome is at the end. The regenerated skills (greg-voice-live, greg-heart-live, unautomatable-session) are not in this
repository, so none were in scope. Impeccable is installed beside these skills but lives elsewhere;
it appears below only where it collides with Design Director.

## 1. Lint results

`node scripts/lint-skills.mjs` (new; full output in [AUDIT.lint.txt](AUDIT.lint.txt); covered by
`test/foundation/lint-skills.test.ts`). FAIL blocks; WARN is advisory.

| Skill | Result | Failures |
| --- | --- | --- |
| catchup | FAIL | description uses "me" (the unquoted trigger phrase *catch me up*) |
| checklist | FAIL | 3 references over 100 lines with no TOC (`checklist-format.md` 505, `close-out.md` 176, `discovery.md` 132); `checklist-format.md` named without a when; `close-out.md` links to `checklist-format.md` |
| cto | PASS | — |
| debug | PASS | — |
| delegate | FAIL | 8 references sit in a "Further reading when relevant" list or an unconditioned "See"; `local-learning.md` 151 lines, no TOC; 3 reference-to-reference links (`context-discipline→research`, `verification-policy→local-learning`, `hosts/claude-code→hosts/claude-md-snippet`) |
| design-director | FAIL | `principles.md` 183 lines, no TOC; `practices.md` links to `principles.md` |
| focus | PASS | — |
| refresh-models | PASS | — |
| ship | PASS | — |

Totals: 4 failing skills, 20 failures. Every skill also gets one WARN: its description opens with
an imperative ("Give…", "Own…") rather than third person. The rewrites in §2 clear all of them.

Correction to my earlier estimate: Checklist's file is 507 lines, but its *body* is 495, so it
passes the 500-line rule. No skill is over the limit.

How the linter decides (so you can judge false positives):
- **"Says when"**: the sentence naming the file, or the one before it, contains a condition word
  (when, before, after, if, for, during…), or the file is a `Condition: [link]` list item.
  "When relevant", "as needed" and "further reading" count as vague.
- **TOC**: a "Contents" heading, or three or more `#anchor` links, within the first 25 lines.
- **Person**: first- and second-person words outside quotes. A quoted trigger phrase such as
  "catch me up" counts as the user's words.

## 2. Trigger collisions

**Root cause.** Two skills are meant to be ambient, applying on every substantive task: Delegate
("Use automatically for implementation, bug fixes, planning…") and Focus ("…or execution work
involving code, documents, edits, and tasks"). A description cannot make a skill always-on. Claude
matches it against each request, so an ambient skill fires on some tasks and not others, which is
the inconsistency you're seeing. Its broad wording also competes with the specific skills. Always-on
behaviour belongs in a CLAUDE.md line, which Delegate already ships as
`hosts/claude-md-snippet.md`. The description should then state the skill's specific triggers.

| Pair | Overlapping triggers | Wrong-fire example |
| --- | --- | --- |
| CTO ↔ Ship | CTO: "ship this plan"; Ship: "ship these changes", "deploy" | "Ship this" on unfinished work loads Ship; "ship the plan" on finished work loads CTO |
| CTO ↔ Checklist | CTO: "build the whole thing, don't stop until it's done"; Checklist: "make sure this is actually complete", BUILD mode | "Build this and make sure it's actually done" can load either; they compose, but only if both load |
| Delegate ↔ Debug / CTO / Checklist | Delegate claims "bug fixes", "implementation", "planning", "review" | "Fix this bug" loads Delegate's routing instead of Debug's reproduce-first loop |
| Focus ↔ everything | "execution work involving code, documents, edits, and tasks" | Any edit request may load Focus instead of the specific skill |
| Catchup ↔ CTO | CTO: "a bare CTO invocation resumes an existing ledger"; Catchup: "where did we leave off" | "Where did we leave off on the build?" can resume CTO execution instead of a read-only brief |
| Design Director ↔ Impeccable (installed) | Both claim UX, visual, interaction, motion, redesign, design review | "Review this screen's design" loads either; they produce different outputs |

### Proposed descriptions

All are in third person, put trigger phrases in quotes, keep the existing exclusions and add one
exclusion per collision. Model names leave Delegate's description; they stay in its Roles table,
where the repo's 2026-09-22 policy says operational names live.

**catchup**
> Gives a concise, read-only briefing on a repository or project: recent work, current changes, work in flight and the next supported step. Use when the user wants to get reoriented, e.g. "/catchup", "$catchup", "catch me up on this project", "where did we leave off". Do not use for general news summaries or to resume implementation.

**checklist**
> Defines what complete means as a persisted, falsifiable acceptance checklist, verifies work against it, and refuses to declare completion until every required item has evidence and survives a blind adversarial close-out. Supports BUILD, AUDIT and PLAN modes. Use when the user asks to define or prove done, e.g. "/checklist", "$checklist", "checklist mode", "define done", "make sure this is actually complete", "prove it is finished", "completion audit", "acceptance checklist". Do not use to execute a supplied plan end to end, to write a checklist as content (packing, onboarding, shopping or launch lists), for simple to-do tracking, casual questions or trivial edits.

**cto**
> Executes a supplied implementation plan, spec, PRD or task list end to end: keeps a durable ledger, verifies each item, escalates when stuck and carries the work through the authorized release. Use when the user hands over a plan to be built to completion, e.g. "/cto", "CTO mode", "implement this plan", "build the whole thing", "don't stop until it's done". Do not use without a plan to implement, for isolated edits, plan-only advice, status briefings, releasing already-finished work, or discussion of a CTO job title.

**debug**
> Investigates a reported software defect: reproduces the failure, fixes its demonstrated cause and proves the correction with before-and-after regression evidence, or stops at a diagnosis when only that was asked. Use when a bug, error, failing test or broken behavior is reported, e.g. "/debug", "$debug", "debug this", "reproduce and fix", "why is this failing". Do not use for new features, general programming explanations, or reviews without a reported defect.

**delegate**
> Routes substantive work to the least expensive path that keeps the requested quality. This session does routine work directly; a frontier model takes plans, consequential decisions, hard bugs and required reviews; a bundled check decides which review is mandatory. Use alongside task-specific skills at the start of implementation, bug fixes, planning, consequential decisions, research, PDF or source analysis, mechanical edits and review. Do not use for casual conversation, simple factual answers, creative drafting, voice-sensitive editing, or when executing a worker or reviewer packet.

**design-director**
> Makes and reviews product design decisions from evidence by deriving, evaluating, analyzing or amending a product-specific design constitution, and emits a validated design_resolution.v1 proposal. Use when a design choice needs a defensible, evidence-backed decision: autonomous UX, visual, interaction, motion or content/IA choices, assessing an interface against its constitution, or resolving a design conflict. Do not use for hands-on frontend building, styling or polish passes, or for picking a style from trends, product category or taste.

**focus** (switches from ambient to explicit-only; the ambient part moves to a CLAUDE.md line)
> Keeps execution inside the user's requested scope and stops when the deliverable and its necessary checks are done, noting adjacent findings instead of acting on them. Honors plan-only requests and keeps depth and pushback in analysis. Use when the user asks for it, e.g. "/focus", "$focus", "stay on task", "don't expand scope", "just do what I asked". Do not use as a reason to skip required checks or to shorten analysis and recommendations.

**ship**
> Releases completed repository work: reviews the scoped diff, commits and integrates, pushes through the required release process, chases CI and publication failures, and verifies the published result, ending with a SHIP PROOF or SHIP BLOCKED line. Use when the user intends publication, e.g. "/ship", "$ship", "ship these changes", "commit, push and chase", "deploy this". Do not use for unfinished implementation, deployment advice, preview-only work or editing this skill.

**refresh-models** (wording only; it has no collisions)
> Maintains the delegate skill's portable routing pack from model discovery, versioned evaluation evidence and governor qualification. Use when a maintainer requests a routing refresh or asks to evaluate new models for delegate.

## 3. Code candidates

These are deterministic steps currently written as prose. Each script would sit in the skill's own
`scripts/`, use Node built-ins only (the packaging check requires that) and be called from one line
of SKILL.md.

| # | Skill | Step written as instructions | Script | Value |
| --- | --- | --- | --- | --- |
| C1 | catchup | Establish context 3–4: branch/HEAD, staged, unstaged, untracked, stashes, recent commits, upstream and ahead/behind labeled "locally recorded" | `snapshot.mjs`: runs only `git --no-optional-locks` reads, never fetches, prints a fixed block | High: the "Current state" section stops varying and the read-only rule is enforced by code |
| C2 | ship | Prepare 1: scan the release diff for credentials, local settings, debug artifacts, generated or large files | `scan-release.mjs <base>`: lists outgoing commits and staged files; flags secret patterns, `.env`, `settings.local.json`, `.DS_Store`, files over 1 MB and debug statements on added lines; exit 1 on hits | High: the scan is easy to skip, and judging the hits stays with Claude |
| C3 | ship | Report: SHIP PROOF / SHIP BLOCKED field rules (`N/A` needs a reason, UTC time, real SHA) | `validate-proof.mjs "<line>"` | Medium: same pattern as the Checklist and Design Director validators |
| C4 | cto | Ledger: only five item states; `done` needs evidence; no SHIPPED while anything is `blocked-technical` or open | `validate-ledger.mjs .cto/ledger.md`: checks against `references/ledger-template.md`, prints counts and whether SHIPPED is allowed | High: this is CTO's completion gate, and it currently rests on self-assessment |
| C5 | checklist | §8: save `.baseline.md` once and never edit it; §9: compose the status line from the validator's counts | Add `--init-baseline` (refuses to overwrite) and `--status-line` to the existing `validate-checklist.mjs` | Medium: removes the last hand-composed counts |
| C6 | debug | Intermittent bugs: "bounded repeated trials… including failures and total trials" | `trials.mjs -n 20 -- <cmd>`: pass/fail counts and the first failure signature | Low: niche; skip unless you hit flaky bugs often |
| C7 | all | Structural lint | `scripts/lint-skills.mjs` (built), wired into `scripts/verify/skills.mjs` once every skill passes | Required for Phase 3 |

Not candidates: Focus (all judgment); Delegate and Design Director (already scripted); Ship's
"match checks to the released SHA" (needs a provider CLI, and the skill promises no provider
dependency).

## 4. Template gaps

Ship, Checklist and Design Director already end in fixed formats (proof line, status line,
validated JSON). These are the outputs that drift:

**T1 catchup brief.** "Roughly 20 lines" and "combine sections when little is happening" let the
shape change every run. Draft: the four headings always appear, one line each at minimum.
```text
**Current state** — <branch> @ <short sha>; <n> staged, <n> unstaged, <n> untracked. <recent work in one line>
**In flight** — <unfinished work / PR link (CI: green | red | not checked)>, or "Nothing in flight."
**Next** — <recorded action> (source: <path>)  |  Inferred: <step> (basis: <evidence>)
**Watch out** — <drift, conflicting records, unavailable evidence>, or "Nothing material."
Remote and CI: <checked at <UTC time> | not checked — <reason>>
```

**T2 debug report.** The four bullets are fixed, but nothing anchors the result. Draft: append a
status line in the same style as Ship and Checklist.
```text
DEBUG <VERIFIED FIX | DIAGNOSIS ONLY | NOT REPRODUCED | VERIFICATION INCOMPLETE> | cause=<mechanism, file:line> | before=<command → observed failure> | after=<command → result> | checks=<suite results> | env=<tested environment> | next=<gap or none>
```

**T3 cto final report.** The bullets are defined, but it has no status line, unlike the Ship and
Checklist reports it composes with. Draft:
```text
CTO SHIPPED | items=<done>/<total> | destination=<branch | package@version | URL> | review=<role; result> | ledger=.cto/ledger.md | at=<UTC>
CTO BLOCKED EXTERNALLY | items=<done>/<total> | blocked=<IDs> | need=<exact action> | ledger=.cto/ledger.md
CTO INTERRUPTED | items=<done>/<total> | last=<last verified item> | resume=<next item> | ledger=.cto/ledger.md
```

**T4 delegate delivery** (optional). "Report what was done, checks, review verdict, limitation"
comes out as different prose each time. Draft: one footer, only when review was required.
```text
Review: <required role> → <PASS | REPAIR | BLOCKED> (task <task_id>; <fresh frontier | 10% audit>)
```
I'd skip this unless you want routing to be visible in transcripts for measurement.

**T5 focus closing.** The report order is specified; only the adjacent-findings note drifts. Draft:
`Noted, not done: <finding> — <why it matters>`. It's low value; skip unless you see drift.

## 5. 3 Cs scores

**Clear**: the first 10 lines (frontmatter plus heading) say when the skill applies and what it
produces. **Concise**: no sentence restates another, and nothing tells Claude what it already does
by default. **Compliant**: passes the linter's name and description checks.

| Skill | Clear | Concise | Compliant | Notes |
| --- | --- | --- | --- | --- |
| catchup | ✅ | ✅ minor | ❌ | "say whether remote was checked" appears twice. Compliant once the trigger phrase is quoted |
| checklist | ✅ | ❌ | ✅ | "Non-negotiable rules" (15 items), "Final standard" and the closing paragraph restate §§2–9; the opening "Never confuse…" paragraph restates the intro. Cutting them saves about 50 lines, unprompted by the limit |
| cto | ⚠️ | ⚠️ | ✅ | Doesn't say it produces a ledger and a final report. "Do not ask whether to continue" appears twice, and Execution loop step 6 restates it |
| debug | ✅ | ⚠️ | ✅ | "Portable successor to the Repro command…" is history, not instruction. "Read repository instructions before editing" is default behaviour |
| delegate | ❌ | ⚠️ | ✅ | Doesn't say what it produces (a routing decision and review requirement); "automatically for" covers nearly all work. Fable is prohibited in 5 places in the body and again in the description |
| design-director | ⚠️ | ✅ | ✅ | "Design constitution" is undefined until `references/contract.md` |
| focus | ✅ | ⚠️ | ✅ | "Stop" is restated in four sections; reusing valid evidence is stated twice |
| refresh-models | ✅ | ❌ | ✅ | One 26-line wall; "Policy v4…" and "Policy v5…" paragraphs are version history. It's maintainer-only, so low priority |
| ship | ✅ | ✅ minor | ✅ | Long but specific. Its companion section repeats the Debug/CTO/Checklist pattern, which is deliberate for standalone use |

## Phase 3 constraints I'll respect

- **Delegate:** any edit changes its folder digest. `scripts/verify/skills.mjs` requires
  `docs/validation-status.md` to cite the new digest, so that doc gets updated in the same change.
- **Design Director:** an import with upstream lineage. Moving the `practices→principles` pointer
  and adding a TOC get recorded in `references/source-ledger.md` as local divergence.
- **Checklist:** `checklist-format.md` is the validator's spec. The TOC is additive and the
  validator tests must still pass.
- **Installed copies** in `~/.claude/skills` stay untouched until you merge and authorize a sync.
- **Before/after evaluation:** headless `claude -p` in a throwaway project with the skill folder
  installed, before and after. Trigger tests cover skills whose descriptions change; format tests
  cover T1–T3. Results go side by side in `docs/skill-audit-results.md`.

## Decisions for you

1. **Descriptions:** approve all of §2, or name the ones to change. The two bigger calls:
   - Delegate's description drops its model names and the Fable line (the body keeps both).
   - Focus becomes explicit-only, with its ambient rule added as a CLAUDE.md line.
2. **Scripts:** I recommend C1, C2, C4, C5 and C7, plus C3 as cheap. C6 is optional.
3. **Templates:** I recommend T1, T2 and T3. T4 and T5 are optional.
4. **Concision trims** (not required by the lint): Checklist's restated rules section, Debug's
   history line, refresh-models' version history. Approve, or leave as is?
5. **Evaluation size:** (a) one realistic prompt × 3 runs, before and after, per changed skill,
   about 50 headless runs; or (b) 3 should-fire + 2 should-not-fire prompts × 3 runs, about 250
   runs, which measures trigger reliability properly.

## Phase 3 outcome

Approved as recommended (all §2 descriptions, C1–C5 and C7, T1–T3, concision trims, evaluation (a)).

- **Lint:** 9 skills, 0 failures, 0 warnings ([AUDIT.lint-after.txt](AUDIT.lint-after.txt)). The lint now runs
  inside `scripts/verify/skills.mjs`, so a regression fails the packaging check.
- **Evaluation:** the correct skill fired first in 27/27 runs after the change, up from 23/27 before. Focus went
  from 0/3 to 3/3 and Delegate from 2/3 to 3/3. The new status lines appeared in 3/3 Debug and CTO runs, and the
  Catchup template in 2/3. Details, limits and side-by-side outputs:
  [docs/skill-audit-results.md](docs/skill-audit-results.md).
- **Deviations from the approved text:**
  - Delegate's description keeps "Use automatically…" because the first rewrite fired only 1/3 times. It also
    keeps the mechanical-edit routing clause, which an existing test requires.
  - Checklist keeps its "Never confuse…" paragraph: on reread it is a source-prompt rule, not a restatement of
    the introduction. The removed rules list and final standard are re-traced in `docs/checklist-skill.md`.
- **Review:** a fresh Opus 5.5 reviewer returned REPAIR with eight findings. All were fixed, with a regression
  test for each, and the re-review passed. The fixes:
  - Two packaging tests broken by the lint ordering.
  - Missed secret shapes and history-only secrets in the release scan.
  - A default scan base that skipped pushed commits.
  - Overstated CTO validator wording.
  - Brittle ledger parsing.
  - A false placeholder match in the proof validator.
  - A diff-header parsing bug.
  - A missing pending-review entry in Checklist's status line.
