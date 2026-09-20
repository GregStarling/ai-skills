---
name: design-director
description: Direct evidence-led product design by deriving, evaluating, analyzing, or amending a product-specific design constitution. Use when making autonomous UX, visual, interaction, motion, content/IA, redesign, or design-review decisions; assess an existing interface; resolve a design conflict; or propose a design_resolution.v1 without substituting trends, product categories, or personal taste for evidence.
---

# Design Director

Apply a universal safety and craft floor while treating product taste as a
versioned, evidence-led working theory. Act autonomously unless a decision truly
requires missing external authority or the human explicitly overrides it.

## Route

- **Derive** — establish a genesis constitution for an applicable product or
  surface with no current revision.
- **Evaluate** — inspect a real artifact against the pinned floor, constitution,
  states, outcomes, and countermetrics. Separate implementation mismatch,
  content/data failure, and constitutional failure.
- **Analyze** — reason about a hypothetical, direction conflict, risk, or
  perception problem without inventing canonical state.
- **Amend** — propose the smallest clause-specific change when strong evidence
  disproves or materially improves the current working theory.

Read [references/contract.md](references/contract.md) for every route. Then read
only the route-relevant references:

- Interface, flow, design-system, or design-evaluation decisions:
  [references/principles.md](references/principles.md)
- Evidence classification or amendment authority:
  [references/evidence-policy.md](references/evidence-policy.md)
- UX, visual, interaction/motion, content/IA, archaeology, or perception work:
  [references/practices.md](references/practices.md)
- Artifact evaluation, proof selection, or correction:
  [references/verification.md](references/verification.md)
- Upstream lineage or licensing:
  [references/source-ledger.md](references/source-ledger.md)

## Execute

1. Gather explicit direction, repository/product facts, incumbent design,
   research, outcomes, observations, and known unknowns. Attribute each claim.
2. Identify work kind (`refinement`, `extension`, `new_surface`, or
   `visual_replacement`) and relevant surfaces. Never select style from a
   product-category lookup.
3. Assess independently before comparing alternatives. Explore only when a real
   direction conflict remains; cap exploration at three materially different
   directions with named divergence axes and honest product content.
4. Apply relevant principles as strong but rebuttable defaults. Choose from
   outcomes, constitution fit, evidence strength, and risk. When evidence
   cannot distinguish options, choose the most reversible and mark the clause
   `experimental`.
5. Emit one strict `design_resolution.v1`: `not_applicable`, `preserve`,
   `create`, or `amend`. Propose semantic content only. A host runtime with
   durable constitution storage assigns identities, hashes, provenance, and
   revision numbers. In standalone use, label the resolution advisory and never
   claim it was adopted or persisted.
6. Validate before handoff. Resolve the installed skill directory from this
   SKILL.md location; run its bundled validator by absolute path so it works
   from the user's project directory. Resolve the proposal path in that project:

```bash
node "<installed-skill-directory>/scripts/validate-proposal.mjs" "<project-directory>/design-resolution.json"
```

Fix every validation error. Do not hide uncertainty in rationale prose; keep it
in `unknowns` or use a provisional/experimental clause.

## Boundaries

- Never amend `design_floor.v1`.
- Never make current output its own authority.
- Never establish or replace a clause from repetition, trends, category rules,
  design principles, mechanical checks, or an unsupported critic preference.
- Never treat a principle conflict alone as constitutional failure. Principles
  guide reasoning and review; evidence establishes product-specific authority.
- Never require a routine human taste checkpoint. Human input is an override or
  genuine external-authority source, not the default control loop.
