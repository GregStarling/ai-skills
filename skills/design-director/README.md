# Design Director

## Give Your Agent Design Judgment It Has to Defend.

An interface needs a reason for its choices. Design Director grounds decisions
in the product's users, jobs, existing behavior, and observed outcomes. It turns
that evidence into an explicit design direction, with unknowns kept visible.

A mandatory floor protects accessibility, truthfulness, user autonomy, recovery,
and platform integrity. Nineteen design principles guide the work. Product-specific
clauses record the direction and the evidence behind it; strong new evidence can
change those clauses without weakening the floor.

## Install

```sh
npx skills add GregStarling/ai-skills --skill design-director --agent codex claude-code --copy
```

Run from your project; add `--global` for personal installation. Or copy this
complete folder into your agent's skill directory. Node.js 18+ runs the bundled
validator, which has no package dependencies. No repository build or external
constitution service is needed for standalone use.

## Use

- Codex: `$design-director analyze the onboarding flow`
- Claude Code: `/design-director evaluate the implemented dashboard`
- Derive a direction when none exists; analyze a conflict; evaluate a built
  artifact; or propose an evidence-backed amendment.

The skill reads only the guidance needed for the route. It distinguishes a
problem in the implementation, a problem in content or data, and evidence that
the design direction itself needs to change.

Each pass returns one `design_resolution.v1` artifact. The bundled validator
checks its structure and encoded evidence requirements. Passing validation does
not prove that the evidence is true or that the design works; rendered and
behavioral verification remain part of the design workflow.

Invoke the validator using its installed path, for example after a project
installation for Codex:

```sh
node .agents/skills/design-director/scripts/validate-proposal.mjs design-resolution.json
```

For a Claude-only project install, use `.claude/skills/design-director/` instead.
Personal installs require their actual installed path. The proposal file belongs
to the project, not the installed skill folder.

## Composition and scope

Design Director owns design reasoning and its evidence contract. CTO can include
that work in a larger plan, Delegate can route decisions and required review,
and Ship can handle a separately authorized release. No companion is required.
Use their actual installed instructions; this bundle does not pin model names or
change host permissions.

Standalone resolutions are **advisory**. This skill does not supply a durable
constitution store or invent adoption events, stored revision identities, or
persistence claims. A host runtime can provide those capabilities separately.

## Source and migration

Imported from [GregStarling/design-director](https://github.com/GregStarling/design-director/tree/fdde87494b4f6ccefc6cce9ebff6c7c396cb459d).
The validator, reference guidance, and host metadata are preserved. Installation
docs use the collection's installer; the original custom installer is not needed.
The [MIT license](LICENSE) travels with this complete skill folder, and the
[source ledger](references/source-ledger.md) retains its conceptual lineage.

An existing manual or old-installer copy should be backed up outside the host's
discovery folders before replacing the complete folder. Confirm the loaded source
in a fresh session. This migration does not uninstall the old copy or archive
the original repository.

[Canonical instructions](SKILL.md) · [Resolution contract](references/contract.md)
