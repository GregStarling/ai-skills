# Skill Audit

## Keep Every Skill Firing When It Should.

Skills drift. A description written in a hurry steals requests from its
neighbour. A reference grows past the point anyone reads it. A skill made with
skill-creator arrives with a "pushy" description, no exclusions and long
reference files without a contents list. Each skill can look fine on its own
while the collection misfires.

Point Skill Audit at one skill, typically the one skill-creator just made, or
let it check everything you have installed. Either way it checks the scope
against every installed skill. It lints against Anthropic's authoring
guidance, finds descriptions that compete for the same request and names that
would shadow each other, and fixes reference hygiene on the spot. Then it
writes AUDIT.md with numbered proposals for everything that changes how a skill
triggers or what it says, and stops for your approval.

After you approve, it applies exactly those changes and measures triggering
before and after in isolated Claude Code sessions, so a description change has
to prove it helped. Generated, synced and installed copies are never edited;
their findings go to whoever owns the source.

## Install

```sh
npx skills add GregStarling/ai-skills --skill skill-audit --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory. Node.js runs the bundled
lint, inventory and trigger-test scripts; they have no dependencies.

## Use

- Codex: `$skill-audit`
- Claude Code: `/skill-audit`
- One skill: `/skill-audit .claude/skills/my-new-skill`, checked against
  everything installed
- Everything installed: `/skill-audit` with no folder

Skill Audit runs only through those commands. Asking in plain words does not
load it, by design. It does not create new skills; use skill-creator for that,
then run Skill Audit over the result.

Trigger tests need the `claude` CLI. Each session uses your Claude Code login,
so it counts against your subscription's usage limits; the audit shows the
session count before it starts and reports partial results if a limit stops
it. On Codex the lint, inventory, fixes and proposals still run, and the trigger
tests are reported as not run.

## What it checks

- Names, description length and voice, what-and-when, exclusions.
- SKILL.md under 500 lines; references one level deep, named with a reason to
  read them, and with a contents list past 100 lines.
- Collisions between the audited skills and every installed skill, and
  same-named skills where only one would load.
- For a skill you name, whether adding it takes requests away from the skills you
  already have (trigger tests with and without it).
- Procedures that should be scripts and outputs that should be templates.
- The places where skill-creator's advice differs from the guidance.
