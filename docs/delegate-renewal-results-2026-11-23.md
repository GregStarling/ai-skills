# Delegate renewal, November 23, 2026

The full renewal covers the existing 15 routes. All entries are provisional. The pack expires at **2026-12-23T05:27:02.548Z** and its earliest entry expires at 2026-12-23T04:51:30.027Z. [Evidence index](evidence/delegate-renewal-2026-11-23/evidence.json)

## Models and scope

Nine dated official sources informed the metadata refresh. Vendor discovery identified GPT-6.2 Astra and Claude Fable 5.2. The repository's primary-frontier policy selected GPT-6.1 Sol/high on Codex and Opus 5.5/high on Claude Code. Both ran the diagnostic. A fresh Opus process reviewed each fixture, failed test and raw trace. After source review identified that the first native review request omitted the input-manifest digest, a new Opus process reviewed the same diagnostics with that digest committed in its native prompt. The earlier Fable calibration and October pack are preserved in the [archive](../data/routing/archive/2026-10-11/preservation.json).

| Host | Worker treatments | Reviewer |
| --- | --- | --- |
| Codex CLI 0.162.1 | GPT-6 Luna/low and GPT-6.1 Sol/low | GPT-6.1 Sol/high |
| Claude Code 2.1.296 | Haiku 5.5 with uncontrolled worker effort and Sonnet 5.5/low | Opus 5.5/high |

Four accepted worker/reviewer smoke pairs support the six treatments. The first Haiku smoke combined its read and a printed separator in a command the assembler could not bind. Its result and two calls are recorded. A fresh pair issued separate reads and passed the existing check.

## Installed cases

Both hosts used the same frozen folder, `sha256:aed17d145f3ec7f86f259c982c371cebf988762bc9f71d690d72d6daa1824b52`, containing pack `sha256:266bb4d4c8549246877361a63775a17103152562cc46aac11dbf39ae85187762`. The final pack incorporates the accepted cases and has content digest `sha256:707241633a83f35dc4cc4f7b0b6024719e31cab4caab8d128e8b1a7c092bb941`. The published consumer folder digest is `sha256:015d0b89b3b299704efaa02699e30e01b21edd3f209f24bb913ab06094ba7c2a`. Both folder revisions have guidance digest `sha256:9ea52dff8acedcff7d3595f5566934249dad4279a9bf66630fb84036c94afd9e`.

| Fixture | Codex | Claude Code |
| --- | --- | --- |
| tinybug | PASS | PASS |
| mechanical | PASS | PASS |
| backend | PASS | PASS |
| ui | PASS | PASS |
| hardbug | PASS | PASS |
| multicomponent | PASS | PASS |
| fullproject | PASS | PASS |

14 of 14 cases had a passing external grader, bound receipts, observed worker edits and a coordinator read of the finished files. UI acceptance includes first-hand screenshot review and DOM checks at 320 and 1280 pixels. The project fixture requires separate store and view workers followed by coordinator integration.

In the original Codex multicomponent run, the automated grader passed but manual review found that a whitespace-only ID was rejected. The fixture specifies a nonempty ID and only trims the title. A supplemental assertion reproduced the error in the original bytes and passed on the original Claude output. The index preserves the excluded attempt and names its fresh Codex replacement.

The pack contains 20 role entries with matching installed-case evidence and 25 backed by smoke extrapolation. Claude Agent worker effort is unavailable. Codex provides configured model and effort in its native rollout. The trials support the named fixtures and carry no model qualification or subscription savings estimate. [Installed acceptance](../data/routing/installed-acceptance.json)

The authorized ceiling was 62 calls. The evidence snapshot records 55 through the repaired candidate, including preflights, diagnostics, both independent diagnostic reviews, the smoke and installed-case retries, execution helpers, prompt checks and the first release review. All reservations in that snapshot have settled. The subsequent independent release review is accounted for separately in the release record. [Execution index](evidence/delegate-renewal-2026-11-23/evidence.json)
