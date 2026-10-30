---
name: skill-audit
description: >-
  Audits one skill or a whole collection against Anthropic's skill-authoring
  best practices, always checked against every installed skill: lints, maps
  trigger collisions and name clashes, fixes reference hygiene, proposes
  description and content changes for approval, then applies the approved
  changes and measures triggering before and after. Catches the problems
  skill-creator output tends to carry. Use only when the user explicitly asks,
  e.g. "/skill-audit", "$skill-audit", "audit my skills", "check the skill
  skill-creator just made". Do not use to create a new skill from scratch or for
  a routine edit to one skill.
disable-model-invocation: true
---

# Skill Audit

One manual pass that audits either one skill, typically one skill-creator just
made, or the whole collection. Either way the scope is checked against every
installed skill, so a single new skill cannot quietly take another skill's
requests or shadow its name. Anthropic's skill-authoring guidance is the standard;
where skill-creator's advice differs, the guidance wins and the report names
the rule. Mechanical fixes happen during the pass. Everything that changes how
a skill triggers or what it tells the agent waits for the user's approval.

`<skill-folder>` below is the folder containing this file.

## 1. Set the scope and protect the originals

1. Scope is what the user names: usually one new skill folder, sometimes a few.
   With nothing named, scope is everything installed: `~/.claude/skills`,
   `~/.agents/skills`, the current project's `skills/`, `.claude/skills` and
   `.agents/skills`, and installed Claude Code plugin skills (report-only).
   Either way the audit checks the scope against every installed skill. State
   the scope in one line; do not ask about defaults.
2. Run `node <skill-folder>/scripts/inventory.mjs [folders...]`. It lists each
   skill in scope as editable or report-only. It then lists:
   - **Neighbours:** with a named scope, every other installed skill, read-only.
   - **Copies:** identical installed copies of a skill in scope. They go stale
     once the audit edits it; list them for reinstalling.
   - **Same-name:** another skill elsewhere shares a name with one in scope but
     differs from it. Two skills count as copies of one skill when their content
     is identical, or their description or SKILL.md body mostly matches. The
     line names the effect:
     - stale installed copy of this repository skill: reinstall after the audit;
     - installed copy of a repository skill: the scoped copy is report-only, so
       fix it in the repository and reinstall;
     - drifted copies of one skill: ask the user which is the source;
     - shares only the name with a repository skill: ask the user whether it is
       a stale copy to reinstall or a different skill to rename. Reinstall only
       on a yes;
     - a different skill with the same name: a host loads only one, so propose
       a rename. Never reinstall over it, because it is someone's own skill;
     - namespaced plugin or synced skills: both load.
   - **Collision candidates:** pairs that involve at least one skill in scope.
   - Never edit a report-only skill. Fix generated skills in their generator and
     synced or plugin skills upstream. Fix installed copies of a repository skill
     in that repository, then reinstall. A skill installed in several places
     outside Git is reported until the user adds its source to the scope or
     confirms the copies are the source.
   - Treat a skill as report-only also when its text or the user says not to
     edit it, even if the inventory missed it.
3. Before the first edit, copy every editable skill into a fresh snapshot
   folder, `~/.agents/skill-backups/skill-audit-<YYYY-MM-DD>/<root>/<skill>`,
   where `<root>` is a short label for the folder it came from (add a suffix to
   the date folder if it exists). It is the backup and the source of the
   "before" copies for trigger tests. In a Git repository, also work on a new
   branch (`skill-audit/<YYYY-MM-DD>`) and leave unrelated changes alone.

## 2. Inspect everything

1. Run `node <skill-folder>/scripts/lint-skills.mjs <folders...>` on the
   scope. FAIL is a rule violation; WARN is a prompt for judgment.
2. Read every in-scope SKILL.md and each reference it names, in full. Read
   [review rules](references/review-rules.md) before judging any skill; it
   holds the guidance, the trigger lessons and the skill-creator divergences.
3. Check the scope against the collection. Read both descriptions of each
   collision candidate. Then scan the neighbours' descriptions for overlaps the
   word-based candidates miss. A collision is real when one plausible request
   fits both skills and neither description excludes it. Every same-name line is
   a finding, handled as its effect says. A rename of an editable skill in scope
   is a proposal like any other.
4. Look for procedures the agent re-derives each time (candidates for a
   script) and fixed outputs written freehand (candidates for a template).

## 3. Fix the mechanical problems now

On editable skills only, and nothing beyond these:

- add a contents list to any reference over 100 lines;
- add a when-to-read condition where SKILL.md names a reference without one,
  worded from what the reference actually covers;
- replace a reference-to-reference link by naming the second file in SKILL.md
  with its own condition;
- name an orphaned reference in SKILL.md with its condition, or list it in
  the report if it looks unused.

Rerun the lint. Descriptions, names, instructions and scripts are not
mechanical, even when the lint flags them.

## 4. Write AUDIT.md and stop

Write AUDIT.md in the audited repository's root, or next to the snapshot when
no repository is in scope. Use [audit template](references/audit-template.md)
when writing it; it fixes the sections, numbering and trigger-test plan. Each
proposed change is numbered with its before and after text and the rule or
evidence behind it.

End the turn with the AUDIT.md path, the counts and
`SKILL AUDIT AWAITING APPROVAL | skills=<audited>/<found> | lint=<FAIL before>-><FAIL now> | fixed=<mechanical> | proposed=<n> | report-only=<n> | audit=<path>`.
Apply nothing else until the user answers. The user may approve by number.

## 5. Apply approved changes and measure

1. Apply exactly the approved items. Rerun the lint; every editable skill
   passes or the report explains the remaining FAIL.
2. Write a trigger-test plan from the template's format. Cover each skill whose
   description changed, every skill in a named scope, and their collision
   neighbours: a prompt that should fire it, and a near miss that should fire
   the neighbour or nothing. Use real phrasing, not the skill's own name. Build
   flat folders that differ only in the changed skills:
   - `before`: the snapshot copies of the changed skills, plus current copies of
     the chosen neighbours;
   - `after`: the edited skills, plus the same neighbours;
   - `without`, always for a named scope: the neighbours alone. A neighbour case
     that scores lower in `before` or `after` than in `without` means the
     scoped skill is taking that neighbour's requests.
3. Run `node <skill-folder>/scripts/trigger-eval.mjs <plan.json> --dry-run`,
   tell the user the session count, then start the full run as a background
   command. It can outlast a foreground command limit. When it finishes, read
   its summary lines; `<plan>.results.json` keeps every finished session even
   if the run is interrupted. Sessions use the Claude Code login, so they count
   against the subscription's usage limits rather than an API bill.
   - If `claude` is unavailable (for example on Codex), report triggering as
     NOT RUN with the reason; never estimate it.
   - A `TRIGGER EVAL PARTIAL` line (usage limit, interruption, or errored
     sessions, which are listed but not scored) is reported as partial.
4. A change that lowers a skill's correct-trigger rate gets revised once and
   retested. If it still loses, restore the original text and report both
   results.

## 6. Report

Report what changed, the before/after scorecard (and without, for new skills),
collisions and same-name clashes with the rest of the collection, report-only
findings grouped by owner (generator, upstream source, repository), and
installed copies that need reinstalling. End with:

`SKILL AUDIT | skills=<audited>/<found> | lint=<FAIL before>-><FAIL after> | fixed=<mechanical>+<approved> | collisions=<resolved>/<real> | same-name=<n> | triggers=<before hits>/<runs> -> <after hits>/<runs>, or NOT RUN <reason> | report-only=<n> | audit=<path>`
