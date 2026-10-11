# Blind inventory — Delegate model currency (written before reading the change)

Request: live look at Claude + Codex models; if stale, plan (checklist) and execute the update; ship
price fix (done in PR #14); update CLIs; run Haiku check; commit checklist; CTO through /ship.

## Model currency (official docs, 2026-10-11)
1. Every model ID/alias the skill names (SKILL.md Roles table, hosts/*.md, claude-md-snippet,
   routing-pack.json, examples) is current: not deprecated, retiring, or legacy per Anthropic models
   overview/deprecations page and OpenAI/Codex model docs.
2. Claude Code roles: coordinator `sonnet` (Sonnet 5.5), escalation `opus` (Opus 5.5 on >=2.1.280),
   any cheap/mechanical tier (Haiku 5.5) has its effort support stated correctly (Haiku may not
   support effort levels the way Sonnet/Opus do — must not be recorded as a fabricated effort).
3. Codex roles: coordinator/escalation/workers point at current GPT-6.x IDs (e.g. GPT-6.1 Sol if it
   superseded gpt-6-sol); retired IDs removed from active routing; aliases vs pinned IDs consistent.
4. Fallback wording for older clients (alias resolves to older model) is accurate and not
   overclaiming.

## Routing pack + evidence
5. routing-pack.json recompiled by scripts/refresh-routing-pack.mjs from data/routing/*; digest
   checks pass; pack wire version unchanged or handled; expiry/renewal date set and documented.
6. Every qualified route traces to real live evidence: host-observations, installed-acceptance,
   frontier probes, reviewer calibration — each record's model ID/host/version/effort matches raw
   artifacts (transcripts/traces) under artifacts/renewal-2026-10-11/. No synthetic or hand-edited
   authority; hashes in data match raw files.
7. Any "interim" pack used to run acceptance before the final pack is honestly disclosed and not
   itself shipped as authority; acceptance evidence binds the final pack or the chain is explained.
8. data/routing/archive/ and historical evidence byte-identical vs origin/main (git diff shows only
   additions there).
9. Retired-model routes moved out of active pack (or marked expired), not silently kept.

## Scripts / tests
10. Script changes (trace collectors, refresh, probes) are minimal and correct; any collector change
    does not relax identity checks (e.g. accepting missing model IDs).
11. Modified tests: no assertions weakened/removed without justification; new models get positive
    and negative tests (retired IDs rejected/flagged).
12. npm test, typecheck, build, scripts/verify/skills.mjs pass on HEAD.

## Docs
13. docs/validation-status.md, renewal results doc, evidence index, CLAUDE.md model-roles section,
    routing-pack-maintenance, install docs all agree with the actual files and counts (no stale
    model names, dates, test counts, digests).
14. Checklist committed (per request), evidence for each item.

## Install / release
15. Disposable install of skills/delegate in Claude and Codex layouts matches source digest.
16. Maintainer CLIs updated (claude, codex versions recorded). Personal installs only changed if
    authorized (CLAUDE.md 2026-09-22 says authorized for maintainer's installed copies).
17. Shipped via branch + PR (ship step); release state honestly reported if not yet merged.
