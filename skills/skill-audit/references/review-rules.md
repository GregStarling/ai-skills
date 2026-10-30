# Review rules

## Contents

- [Structure (the lint checks these)](#structure-the-lint-checks-these)
- [Descriptions](#descriptions)
- [Body content](#body-content)
- [Scripts and templates](#scripts-and-templates)
- [Where skill-creator differs](#where-skill-creator-differs)

Source: Anthropic's skill-authoring best practices, plus what trigger tests on
this collection showed. Cite the rule by its heading when proposing a change.

## Structure (the lint checks these)

- `name`: at most 64 characters, lowercase letters, digits and hyphens, no
  "anthropic" or "claude", no XML tags. It is also the slash command, so a
  rename changes how users invoke the skill: always a proposal.
- `description`: non-empty, at most 1024 characters, no XML tags.
- SKILL.md body under 500 lines. Split by topic into references when longer.
- References sit one level below SKILL.md. SKILL.md names each one with the
  condition for reading it; a reference never sends the reader on to another.
- References over 100 lines start with a contents list, because a partial read
  of a long file otherwise misses what it covers.

## Descriptions

The description is the only text the agent sees when choosing among skills.

- Third person, stating what the skill does and when to use it: "Generates
  release notes from merged pull requests. Use when ...". Imperative openers
  still work but read as instructions to the agent.
- Concrete trigger phrases in quotes: the user's likely words, slash and
  dollar commands. Tests on this collection moved an explicit-only skill
  from 0/3 to 3/3 correct triggers by adding quoted phrases.
- A "Do not use for ..." line wherever a neighbouring skill could claim the
  same request. Name the boundary, not the neighbour.
- Ambient skills that should run without being named need an explicit
  "Use automatically at the start of ..." cue. Softer wording ("use alongside
  other skills") dropped one such skill from 3/3 to 1/3.
- Manual-only skills say "Use only when the user explicitly asks". In Claude
  Code, `disable-model-invocation: true` in the frontmatter enforces it; in
  Codex, `policy: allow_implicit_invocation: false` in `agents/openai.yaml`.
- No marketing, no history, no model names that will go stale.

## Body content

- Assume a capable agent. Cut explanations of things it already knows; keep
  what is specific to this task, codebase or organisation.
- Match freedom to fragility: exact commands where a mistake is costly,
  principles where many approaches work.
- One default per decision, with an escape hatch, rather than a menu.
- Consistent terms: one word per concept throughout the skill.
- No time-sensitive statements ("until August, use ..."). Move superseded
  practice to a clearly labelled section or delete it.
- Multi-step work gets numbered steps with a check between them; validation
  loops (run, fix, rerun) for anything a script can check.
- MCP tools by fully qualified name (`Server:tool`); forward-slash paths.

## Scripts and templates

- A procedure the agent repeats deterministically (parsing, validation,
  scanning, inventories) belongs in a script it runs, not prose it re-derives.
  Say whether to run the script or read it.
- Scripts handle their own errors with a clear message and exit code, explain
  every constant, and avoid dependencies the installed copy will not have.
- A strict output shape (status lines, reports, proofs) gets a template; a
  script that validates the shape is better still.

## Where skill-creator differs

Fix these in the skills it produced; report them for skill-creator itself,
which is synced and not edited here.

| Topic | skill-creator | This audit |
| --- | --- | --- |
| Contents list in references | Over 300 lines | Over 100 lines |
| Description style | "Pushy", listing every context, no voice rule | Third person, quoted triggers, exclusions where a neighbour competes; "Use automatically" only for ambient skills |
| References | "Clear pointers" | Each named in SKILL.md with a when-to-read condition, one level deep |
| Collisions | Not checked | Every description judged against installed neighbours |
| Trigger tests | Registers the description as a temporary command in the real project and runs `claude -p` with the full environment, so installed skills, global instructions and any `ANTHROPIC_API_KEY` affect the result | Throwaway project, stripped environment, chosen neighbours installed, Claude Code login only |
| Its own skill | SKILL.md body over 500 lines; long agent files without contents lists | Reported as findings for its maintainers |
