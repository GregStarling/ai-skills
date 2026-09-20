# Conceptual contract

Use these rules for every route:

1. The universal floor protects truthfulness, user autonomy, accessibility,
   semantic behavior, relevant states and recovery, responsive/platform
   integrity, and proof against the real product. It does not prescribe taste
   and is mandatory (`MUST`).
2. Design principles are strong, context-sensitive defaults (`SHOULD`). Apply
   the relevant principles, but rebut them when trustworthy product evidence
   shows a better fit. Record material deviations in the rationale or task
   decision rather than silently ignoring the principle.
3. The constitution is one product's evidence-backed working theory: identity,
   users, surfaces,
   protected behavior, voice, interaction character, outcomes, countermetrics,
   and unresolved hypotheses.
4. Task context selects the relevant surfaces, clauses, practices, principles,
   and proof obligations for the immediate assignment. It cannot waive the
   floor or silently contradict the pinned constitution.
5. Evidence outranks categories, trends, and principles. Explicit direction, verified facts,
   observed outcomes, research, and coherent incumbent design outrank heuristics.
6. Autonomy is the default: assess, explore when justified, choose, implement,
   verify, and amend without routine checkpoints.
7. Every execution task must receive a pinned constitution revision and only
   its relevant clauses, practices, principles, and proof obligations.
8. Verification distinguishes implementation mismatch, content/data failure,
   and constitutional failure.
9. Strong clause-specific evidence may change any product clause immediately.
   Amend surgically and rollbackably; never amend the universal floor.

The authority hierarchy is: floor `MUST` > principles `SHOULD` and rebuttable >
evidence-backed constitution > immediate task context. A product-specific
constitution may override a generic principle when supported by stronger
evidence, but neither a principle nor its violation can establish a clause or
constitutional failure on its own.

Clause lifecycle is `established | provisional | experimental | retired`.
Weaker evidence may support provisional or experimental clauses, never an
established claim.

## Resolution contract

Emit exactly one `design_resolution.v1` object:

- `not_applicable`: no product-design theory is relevant to this work.
- `preserve`: current clauses still fit; no proposal.
- `create`: no current revision; include a full semantic proposal and no base.
- `amend`: include the expected base revision/hash and a full proposed snapshot
  with a surgical change set.

The top-level fields are `schema_version`, `resolution`, `rationale`, `evidence`,
`expected_base`, and `proposal`. A proposal contains `work_kind`, `maturity`,
`surfaces`, `clauses`, `unknowns`, and `change_set`. Use stable semantic ids but
do not assign revision metadata, storage provenance, or a semantic hash.

Use `node scripts/validate-proposal.mjs <file>` from the installed skill
directory as the bundled executable schema authority. The script may also be
invoked by absolute path from any working directory.

A host runtime with a durable constitution store may adopt valid resolutions.
Without one, a resolution remains an advisory design artifact: do not invent a
revision id, semantic hash, adoption event, or persistence claim.

Choose a clause domain for the assertion being made, not the widget that happens
to express it. For example, role disclosure may be product truth or an ethical
boundary when it governs a promise, voice/content when it governs wording, or
interaction when it governs timing. Use identity only when it truly defines the
product's character.
