# Evidence-path assessment — 2026-09-11

**Recommendation: keep compatibility now; separate the optional evidence path in a later, explicitly scoped change.** Ordinary delegation should not pay its reading cost. Deleting it today would break real consumers, not just remove unused instructions. No extraction, route deletion, receipt migration or qualification change was performed in this assessment.

## Measured footprint

Measured with Node `readdir`/`readFile` over the trial's frozen portable folder (`0c0c39a5`) after the Claude host-guide update, before the one-sentence helper host-name clarification. Words are whitespace-delimited counts, not model tokens.

| Component | Bytes | Words | Interpretation |
| --- | ---: | ---: | --- |
| Entire portable folder, 14 files | 231,642 | — | Download footprint, not automatically read context |
| Routing pack | 131,852 | 3,056 | 56.9% of folder bytes; strict evidence only |
| Shared helper | 55,445 | 2,171 | 531 lines; includes both ordinary and evidence paths |
| Local-learning reference | 11,849 | 1,424 | Conditional receipts, optional telemetry and history controls |
| Pack-format reference | 1,482 | 175 | Strict evidence only |
| Entrypoint + Claude host guide | 11,442 | 1,520 | Ordinary startup guidance; other references load when relevant |

The pack and its format reference alone account for 57.6% of folder bytes. Including the shared helper and learning reference gives 86.6%, but **that is not a removable-code estimate**: shared validation, identity, observation and history code still serves ordinary delegation. Running the helper does not load its source into model context. Splitting files alone cannot establish subscription savings.

## Actual dependencies

- **Publisher:** `refresh-models` explicitly compiles and publishes the portable routing pack. The refresh script, publication validators and CI validate that location and its identity/expiry rules.
- **Production receipt ingestion:** the engine's ledger imports `normalizeReceipt` directly from the portable helper. Historic receipt versions remain readable and their authority restrictions must survive any move.
- **Ordinary execution:** `dispatchAssignment` is pack-independent. Stateful dispatch and `observe` share canonical project identity, event storage, settings and folder hashing with the evidence helper.
- **Maintainer tooling:** installed trials, comparison campaigns, publication checks and renewal tools import helper exports such as `folderDigest`. Existing evidence trials still exercise start/capture/finish and read historical receipt formats.
- **Packaging and tests:** the portable-folder validator requires all references to resolve from an isolated copy, no external imports/symlinks, a valid pack and a current status digest. Tests import both ordinary and evidence functions from the same helper; public type declarations describe both.

## Smallest later separation

Move strict pack selection and evidence receipt operations behind an optional evidence module while retaining ordinary dispatch/observe and shared state primitives. Preserve existing helper command names and exports with a compatibility wrapper for maintainer consumers; keep historic record parsing and identity semantics unchanged. Update `refresh-models`, packaging and installation guidance together before making the pack optional.

Do not delete evidence-required functionality unless its publisher and production ingestion consumers are explicitly retired. A later separation needs tests for ordinary use without a pack, legacy commands/imports, receipt round trips, personal-history continuity and standalone reference closure. This report does not authorize that work or another model campaign.
