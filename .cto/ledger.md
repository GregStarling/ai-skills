# CTO Ledger

Plan source / revision: `.checklists/delegate-model-currency-2026-10.md` (the item record; IDs below point into it), created 2026-10-11 from the live model-currency look.
Project root: /Users/gregpro/ai-skills/.claude/worktrees/vigorous-blackburn-92bab2 (git worktree of GregStarling/ai-skills)
Branch: claude/delegate-model-currency-2026-10, from origin/main f8166d2
Started: 2026-10-11T21:44Z
Last updated: 2026-10-11T22:04Z
Delivery destination and authorization: merged into main with CI green, plus a disposable install from main. Greg, 2026-10-11: "work through this entire workstream, use /cto mode and /ship when complete".
Companion skills / available capabilities: delegate (routing and review), ponytail (minimal means), checklist (item record and gate), ship (release). Live hosts: Claude Code 2.1.296 and codex-cli 0.162.1, both authenticated.
Routing assignment ID / origin / risk / review requirement: `5d28a013:delegate-model-currency`, implement_plan / approved_execution, origin `public_contract_design`, risk high. Review: fresh frontier review required (IMPLEMENTED_BEHAVIOR_REQUIRES_FRONTIER).

## Definition of Shipped
- [ ] Every model Delegate names or routes is current or kept by a recorded decision. Verify: checklist C-005, C-006, C-007, C-014, C-016 and C-017.
- [ ] The renewed pack is built on fresh live evidence with no substitution and expires after 2026-11-09T00:25Z. Verify: C-009 to C-014.
- [ ] Repo checks pass and a fresh frontier review returns PASS. Verify: C-019 to C-021.
- [ ] Merged into main with CI green, and installable from main. Verify: C-023 and C-024.

## Work Items
| # | Item / original requirement | Depends on | Verify with | Status | Evidence |
|---|-----------------------------|------------|-------------|--------|----------|
| 1 | Decisions: C-001, C-002, C-022 | - | checklist | done | checklist Decisions |
| 2 | Host prerequisites: C-003, C-004 | 1 | checklist | done | checklist evidence |
| 3 | Consumer source: C-005, C-006, C-007 | 1 | checklist | done | checklist evidence |
| 4 | Renewal prep (free): C-008, C-009, C-010, C-016, C-017 | 1 | checklist | done | checklist evidence |
| 5 | Live campaign: C-011, C-012 done; C-013 acceptance | 2, 4 | checklist | doing | 9 of 14 cases finished; 8 reviewed PASS |
| 6 | Pack and records: C-014, C-018 | 5 | checklist | doing | records drafted (CLAUDE.md, AGENTS.md, docs/delegate.md); results doc and status pending |
| 7 | Verify and review: C-019, C-020, C-021 | 3, 6 | checklist | todo | |
| 8 | Release: C-023, C-024 | 7 | checklist | todo | |
| 9 | Usage prices: C-015 | - | checklist | done | PR #14, main f8166d2 |

## Decisions
- See the checklist Decisions section; the ledger does not duplicate them.

## Attempts and Escalations
- 2026-10-11T21:55Z
  Item: interim pack compile (C-013 prerequisite)
  Failure signature / reproducing command: `node scripts/refresh-routing-pack.mjs` threw ENTRIES_EXPIRE_BEFORE_PACK (earliest entry 2026-11-08T23:55:37Z).
  Hypothesis / attempt / result: October acceptance placeholder records match the unchanged Luna and Astra treatments, so their 2026-10-09 dates bound entry expiry. Compiled the interim pack with an empty-cases placeholder instead; compile succeeded (pack sha256:6e135a0c…).
  Root cause: placeholder evidence joined renewed treatments.
  Outcome: resolved; publication recompiles with the new acceptance.
- 2026-10-11T22:01Z
  Item: C-013 codex-tinybug review
  Failure signature: collector attributed no written file to the Luna worker although the grader passed.
  Root cause: Codex 0.162 children wrote through `python3 Path(...).write_text` inside the JS exec tool, which the collector's patch and heredoc patterns missed.
  Outcome: collector extended (workdir-aware python write_text attribution); the worker write is verified in the preserved rollout.

## External Blockers
- None.

## Verification and Checkpoints
- 2026-10-11T21:44Z / commit 087c578: checklist and ledger committed; validator CHECKLIST OPEN.
- 2026-10-11T21:58Z / uncommitted: checklist 16/24 verified against the committed baseline; frontier-refresh, historical publication and maintainer-defaults tests pass.
- Budget: 32/62 at 22:03Z, 8 reserved by running cases.

## Resume Here
Current item: 5 (installed acceptance; background runs for claude and codex)
Next action: review the remaining cases as they finish (claude multicomponent, fullproject; codex ui, hardbug, multicomponent, fullproject), finalize reviews, assemble acceptance, recompile the pack, build the evidence index, then results doc, validation status and checks.
Uncommitted scoped work / unrelated work to preserve: archive, canonical data, scripts, tests, docs on this branch (all scoped).
Pending processes, reviews, or release checks: two background acceptance runs; fresh frontier review (C-021).

After compaction or handoff, reconcile this ledger with files and version history.
