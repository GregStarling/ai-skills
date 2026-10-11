# CTO Ledger

Plan source / revision: `.checklists/delegate-model-currency-2026-10.md` (the item record; IDs below point into it), created 2026-10-11 from the live model-currency look.
Project root: /Users/gregpro/ai-skills/.claude/worktrees/vigorous-blackburn-92bab2 (git worktree of GregStarling/ai-skills)
Branch: claude/delegate-model-currency-2026-10, from origin/main f8166d2
Started: 2026-10-11T21:44Z
Last updated: 2026-10-11T22:32Z
Delivery destination and authorization: merged into main with CI green, a disposable install from main, then Greg's installed Delegate copies synced. Greg, 2026-10-11: "work through this entire workstream, use /cto mode and /ship when complete"; later "yes, /ship ship it once the review passes, and sync my installs".
Companion skills / available capabilities: delegate (routing and review), ponytail (minimal means), checklist (item record and gate), ship (release). Live hosts: Claude Code 2.1.296 and codex-cli 0.162.1, both authenticated.
Routing assignment ID / origin / risk / review requirement: `5d28a013:delegate-model-currency`, implement_plan / approved_execution, origin `public_contract_design`, risk high. Review: fresh frontier review required (IMPLEMENTED_BEHAVIOR_REQUIRES_FRONTIER).

## Definition of Shipped
- [ ] Every model Delegate names or routes is current or kept by a recorded decision. Verify: checklist C-005, C-006, C-007, C-014, C-016, C-017 and C-025.
- [ ] The renewed pack is built on fresh live evidence with no substitution and expires after 2026-11-09T00:25Z. Verify: C-009 to C-014.
- [ ] Repo checks pass and a fresh frontier review returns PASS. Verify: C-019 to C-021.
- [ ] Merged into main with CI green, installable from main, and Greg's installs synced. Verify: C-023, C-024 and C-026.

## Work Items
| # | Item / original requirement | Depends on | Verify with | Status | Evidence |
|---|-----------------------------|------------|-------------|--------|----------|
| 1 | Decisions: C-001, C-002, C-022 | - | checklist | done | checklist Decisions |
| 2 | Host prerequisites: C-003, C-004 | 1 | checklist | done | checklist evidence |
| 3 | Consumer source: C-005, C-006, C-007, C-025 | 1 | checklist | done | C-005 and C-025 re-verified after review repair |
| 4 | Renewal prep (free): C-008, C-009, C-010, C-016, C-017 | 1 | checklist | done | checklist evidence |
| 5 | Live campaign: C-011, C-012, C-013 | 2, 4 | checklist | done | 46/62 executions; 14/14 PASS |
| 6 | Pack and records: C-014, C-018 | 5 | checklist | done | pack sha256:37377985…, folder sha256:3df782b9… |
| 7 | Verify and review: C-019, C-020, C-021 | 3, 6 | checklist | done | round 1 REPAIR (F-001 to F-008 fixed in 9aaa842); round 2 fresh Opus review PASS on 9aaa842 |
| 8 | Release: C-023, C-024, C-026, C-027 | 7 | checklist | doing | |
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
  Outcome: collector extended; after review finding F-005, made receiver-exact and the evidence chain regenerated.
- 2026-10-11T22:19Z
  Item: C-021 fresh frontier review
  Capability/model actually used: fresh Opus 5.5 agent (Agent tool, model opus), given the verbatim requests, repo and commit range, without the checklist or decision rationale.
  Result: REPAIR, 2 material and 6 minor findings (checklist F-001 to F-008), no blockers. All resolved in 9aaa842; round 2 fresh Opus review returned PASS with four minor items (F-009 to F-012).

## External Blockers
- None.

## Verification and Checkpoints
- 2026-10-11T21:44Z / commit 087c578: checklist and ledger committed.
- 2026-10-11T22:13:44Z / commit 5c23504: npm test 1184 passed, typecheck, build, skills check passed; disposable installs matched sha256:283ed46a….
- 2026-10-11T22:24:28Z / repair working tree: npm test 1185 passed, typecheck, build, skills check passed.

## Resume Here
Current item: 8 (release)
Next action: push, open the PR, wait for CI, merge, verify the install from main (C-024), sync Greg's installs (C-026), then a follow-up records change (C-027 and release evidence).
Uncommitted scoped work / unrelated work to preserve: none after the repair commit.
Pending processes, reviews, or release checks: release.

After compaction or handoff, reconcile this ledger with files and version history.
