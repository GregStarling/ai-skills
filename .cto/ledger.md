# CTO Ledger

Plan source / revision: `.checklists/delegate-model-currency-2026-10.md` (the item record; IDs below point into it), created 2026-10-11 from the live model-currency look.
Project root: /Users/gregpro/ai-skills/.claude/worktrees/vigorous-blackburn-92bab2 (git worktree of GregStarling/ai-skills)
Branch: claude/delegate-model-currency-2026-10, from origin/main f8166d2
Started: 2026-10-11T21:44Z
Last updated: 2026-10-11T21:44Z
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
| 2 | Host prerequisites: C-003, C-004 | 1 | checklist | doing | C-003 verified; C-004 needs the smoke rollout |
| 3 | Consumer source: C-005, C-006, C-007 | 1 | checklist | todo | |
| 4 | Renewal prep (free): C-008, C-009, C-010, C-016, C-017 | 1 | checklist | todo | |
| 5 | Live campaign: C-011, C-012, C-013 | 2, 4 | checklist | todo | |
| 6 | Pack and records: C-014, C-018 | 5 | checklist | todo | |
| 7 | Verify and review: C-019, C-020, C-021 | 3, 6 | checklist | todo | |
| 8 | Release: C-023, C-024 | 7 | checklist | todo | |
| 9 | Usage prices: C-015 | - | checklist | done | PR #14, main f8166d2 |

## Decisions
- See the checklist Decisions section; the ledger does not duplicate them.

## Attempts and Escalations
- None yet.

## External Blockers
- None.

## Verification and Checkpoints
- 2026-10-11T21:44Z / branch from f8166d2: checklist validator, CHECKLIST OPEN (see checklist Verification).

## Resume Here
Current item: 4 (renewal prep)
Next action: archive the October canonical inputs, fetch metadata, update targets and script defaults, initialize the budget.
Uncommitted scoped work / unrelated work to preserve: none.
Pending processes, reviews, or release checks: none.

After compaction or handoff, reconcile this ledger with files and version history.
