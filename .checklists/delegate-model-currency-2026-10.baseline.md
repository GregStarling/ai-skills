# Checklist: delegate-model-currency-2026-10

## Request

- Objective: "I want you to do a live look into both claude and codex to ensure our delegate skill is up to date on the latest models. If not, create a /checklist for a plan to update them" (Greg, 2026-10-11).
- Conversation-only requirements: the live look found Delegate is not fully current (see Verification), so this file is the requested update plan. Earlier in the same conversation Greg required commits authored as Greg Starling and a PR only when he asks.
- Date / revision: 2026-10-11, branch `claude/delegate-model-currency-2026-10` from origin/main `38f06c6`.
- Mode: PLAN. Implementation is the next action and needs Greg's go-ahead.
- Constraints and authority:
  - No live model executions until Greg approves an execution ceiling (repo practice in `docs/routing-pack-maintenance.md`: "authorize a new execution ceiling first").
  - Updating Claude Code or Codex host software, installed skill copies, saved models or permission settings is Greg's action (`skills/refresh-models/SKILL.md`: "Do not ... update global host software as part of a routing refresh").
  - Historical evidence and `data/routing/archive/` stay byte-identical; canonical inputs move to a dated archive with a preservation record before replacement.
  - Routing-pack and model-role changes are public contracts of the skill: Delegate requires a frontier decision and a fresh frontier review of implemented behavior.
  - Publication (push, PR, merge) only when Greg asks.

## Definition of Complete

- Every model Delegate names or routes is a current model on the official pages fetched on completion day, or a recorded decision explains why it stays. That covers the SKILL.md Roles table, `hosts/claude-md-snippet.md`, `routing-pack.json` treatments, `data/routing/frontier-targets.json` and the maintainer defaults used by the renewal flow.
- Each routed treatment is backed by fresh live evidence from the installed hosts, with no observed model substitution.
- The renewed pack expires after 2026-11-09T00:25Z, the current pack's expiry.
- `npm test`, `npm run typecheck`, `npm run build` and `node scripts/verify/skills.mjs` pass; a fresh frontier review returns PASS.
- Usage measurement prices every model the current Claude roles serve.
- Delivery destination: a reviewed branch ready for a PR to GregStarling/ai-skills main. A PR, merge and reinstalling Greg's installed copies need his separate authorization, so no `[release]` items exist yet.

## Items

### Decisions (frontier)

- [ ] C-001 [build] A recorded decision sets Delegate's Codex coordinator and worker models in light of `gpt-6.1-sol`.
  - Source: Implied, the Codex models page now recommends `gpt-6.1-sol` for complex coding and agentic work, and Delegate names only `gpt-6-sol`.
  - Accept: The Decisions section records the choice for coordinator, workers and fallback. It cites official price per token for `gpt-6-sol` and `gpt-6.1-sol`, plan availability (Free/Go excluded, Enterprise/Edu admin-gated) and installed-CLI support. It also says whether the change belongs in the portable Roles table or in Greg's personal AGENTS.md binding.
  - Verify: Open the Decisions entry and confirm each of those four inputs is cited with a source URL and fetch date; a missing input fails the item.
  - Evidence: Pending.
  - Depends on: None.
- [ ] C-002 [build] A recorded decision confirms or changes the Claude role split for the 5.5 lineup.
  - Source: Implied, `sonnet`, `opus` and `haiku` now resolve to Sonnet 5.5, Opus 5.5 and Haiku 5.5 with new prices (Opus 5.5 at $4/$20 against Sonnet 5.5 at $2/$10), changing the cost gap the 2026-09-22 role decision assumed.
  - Accept: The Decisions section records coordinator, frontier and worker aliases for Claude Code with the official prices and positioning. Changing the frontier from `opus` needs evidence beyond positioning.
  - Verify: Open the Decisions entry and confirm the prices match the official pricing page fetched that day.
  - Evidence: Pending.
  - Depends on: None.

### Host prerequisites (Greg's action)

- [ ] C-003 [build] The terminal Claude Code CLI is at 2.1.293 or later, so `haiku` serves Haiku 5.5.
  - Source: Implied, Claude Code model-config docs say Haiku 5.5 requires v2.1.293; the installed CLI is 2.1.292.
  - Accept: `claude --version` reports 2.1.293 or later, and a `haiku` Agent launch records `message.model` `claude-haiku-5-5` in its transcript.
  - Verify: Run `claude --version`, then grep the launch transcript for the served model; `claude-haiku-4-5` fails the item.
  - Evidence: Pending.
  - Depends on: None.
- [ ] C-004 [build] The terminal Codex CLI's catalog includes every Codex model chosen in C-001.
  - Source: Implied, installed Codex CLI 0.156.1 `codex debug models` omits `gpt-6.1-sol`, which the 0.162.0 client's cache lists; latest npm is 0.162.1.
  - Accept: `codex debug models` on the terminal CLI lists each chosen Codex model, and a smoke run's rollout records it as configured.
  - Verify: Run `codex --version` and `codex debug models`; a missing chosen model fails the item.
  - Evidence: Pending.
  - Depends on: C-001.

### Consumer skill source

- [ ] C-005 [build] The SKILL.md Roles table names the models chosen in C-001 and C-002.
  - Source: Explicit requirement, "ensure our delegate skill is up to date on the latest models".
  - Accept: Each Roles cell matches the decisions; no row names a model the official pages list as legacy, retired or retiring.
  - Verify: Diff the Roles table against the Decisions entries and the official pages fetched that day.
  - Evidence: Pending.
  - Depends on: C-001, C-002.
- [ ] C-006 [build] `hosts/claude-md-snippet.md` mirrors the Roles table exactly.
  - Source: Implied, SKILL.md says "The CLAUDE.md activation snippet only mirrors this table".
  - Accept: Every model or alias in the snippet equals the Roles table entry for the same role.
  - Verify: Compare the role names and models in both files; any mismatch fails.
  - Evidence: Pending.
  - Depends on: C-005.
- [ ] C-007 [build] The host guides' version and source statements match the live docs.
  - Source: Implied, `hosts/codex.md` cites sources checked 2026-09-10, and alias resolution now depends on Claude Code version (Opus 5.5 from 2.1.280, Sonnet 5.5 from 2.1.284, Haiku 5.5 from 2.1.293).
  - Accept: Any minimum-version or source-date statement in `hosts/claude-code.md` and `hosts/codex.md` matches the docs fetched that day, and no stale model claim remains.
  - Verify: Grep both guides for versions, dates and model names and compare each with the fetched docs.
  - Evidence: Pending.
  - Depends on: C-001, C-002.

### Routing pack renewal (live, counted)

- [ ] C-008 [build] Greg approves an execution ceiling for a counted renewal on the current models.
  - Source: Decision, repo practice requires a new ceiling before any renewal; the October renewal used 49 of 62.
  - Accept: The ceiling, its date and Greg's words are recorded under Decisions, and a new campaign ledger is initialized with it.
  - Verify: Open the ledger created by `scripts/verify/campaign-budget.mjs` and confirm its ceiling equals the approved number.
  - Evidence: Pending.
  - Depends on: C-001, C-002.
- [ ] C-009 [build] The October canonical routing inputs are archived byte-identically before replacement.
  - Source: Explicit constraint, historical evidence stays untouched.
  - Accept: A new `data/routing/archive/2026-10-09/` holds every replaced file with a `preservation.json` whose digests equal the originals.
  - Verify: Recompute SHA-256 of each archived file and compare with `git show 38f06c6:` of the original path.
  - Evidence: Pending.
  - Depends on: C-008.
- [ ] C-010 [build] `data/routing/frontier-targets.json` names each provider's current most capable model from a fresh official fetch.
  - Source: Implied, `skills/refresh-models/SKILL.md` requires it for every refresh.
  - Accept: Targets carry `checked_at` from the renewal day and a content digest; the models equal the most capable models on the fetched pages (today `claude-fable-5-1` and `gpt-6-astra`).
  - Verify: Re-fetch both pages, recompute the digests, and compare models and digests.
  - Evidence: Pending.
  - Depends on: C-009.
- [ ] C-011 [build] Fresh host observations exist for every treatment the renewed pack routes, each with matching served identity.
  - Source: Explicit requirement, latest models; implied by the identity-assurance policy (an observed substitution rejects a treatment).
  - Accept: `data/routing/host-observations.json` has passing smoke runs for the decided Claude treatments (expected `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-1`) and Codex treatments (expected `gpt-6-luna`, `gpt-6-sol` or `gpt-6.1-sol`, `gpt-6-astra`). Every run's observed model equals its requested model.
  - Verify: Run the repo's identity validation over the assembled observations; a substitution or missing treatment fails it.
  - Evidence: Pending.
  - Depends on: C-003, C-004, C-008, C-009.
- [ ] C-012 [build] Reviewer calibrations exist for each renewed reviewer treatment.
  - Source: Implied, the pack admits reviewers only through `stage-calibration.mjs`, which rejects a calibration worker absent from host observations (WORKER_OBSERVATION_MISMATCH).
  - Accept: Calibration files stage without error, and each calibration worker is a non-frontier treatment from C-011.
  - Verify: Run `scripts/stage-calibration.mjs` on the new calibrations; any mismatch error fails.
  - Evidence: Pending.
  - Depends on: C-011, C-016.
- [ ] C-013 [build] Installed acceptance is re-run on the renewed folder for all 14 cases, or each withheld case is recorded with its reason.
  - Source: Implied, matching installed acceptance outranks smoke extrapolation in the pack.
  - Accept: `data/routing/installed-acceptance.json` holds the new cases with host versions, digests and verdicts; withheld cases keep their failure evidence.
  - Verify: Run the acceptance publication test for the new renewal; it fails on missing or relabeled cases.
  - Evidence: Pending.
  - Depends on: C-011, C-012.
- [ ] C-014 [build] The recompiled pack routes only current models and expires after 2026-11-09T00:25Z.
  - Source: Pre-mortem P5; explicit requirement, latest models.
  - Accept: Treatments in `skills/delegate/routing-pack.json` contain none of `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001` or `gpt-5.5` unless a Decision keeps one. `expires_at` is later than 2026-11-09T00:25Z, and every route entry outlives the pack.
  - Verify: A new renewal publication test, modeled on `test/routing/renewal-2026-10-publication.test.ts`, asserts the treatment list, the digests and the expiry; reverting one treatment makes it fail.
  - Evidence: Pending.
  - Depends on: C-010, C-011, C-012, C-013.

### Maintainer tooling

- [ ] C-015 [build] `scripts/usage-prices.json` prices `claude-sonnet-5-5` and `claude-haiku-5-5` at official rates.
  - Source: Implied, the Claude coordinator alias `sonnet` now serves Sonnet 5.5; recent transcripts show 2540 Sonnet 5.5 messages that measure-usage cannot price.
  - Accept: Both models have input, output, cache-read and both cache-write rates from the official pricing page. `node scripts/measure-usage.mjs` lists neither model as unpriced.
  - Verify: Run measure-usage over recent transcripts and read its "Unpriced models" line; a test asserts both entries exist.
  - Evidence: Pending.
  - Depends on: None.
- [ ] C-016 [build] Model defaults in the scripts the renewal flow runs match renewed host-observation treatments.
  - Source: Pre-mortem P3; the same mismatch was fixed for Codex in PR #13.
  - Accept: `host-evidence.mjs`, `installed-delegate.mjs`, `completion-campaign.mjs`, `direct-vs-delegated.mjs`, `evaluate-frontier-reviewers.mjs`, `review-frontier-probes.mjs` and `assemble-evidence.mjs` default only to treatments in the renewed `host-observations.json` (today they default to `claude-opus-5`, `claude-sonnet-5` and `claude-haiku-4-5-20251001` on the Claude side).
  - Verify: A test reads each script's exported or literal defaults and asserts each matches a current observation treatment; setting one to a legacy ID makes it fail.
  - Evidence: Pending.
  - Depends on: C-011.
- [ ] C-017 [build] Each script still pinned to a retiring or superseded model is updated or marked historical by recorded decision.
  - Source: Implied, `scripts/verify/v1-live.mjs` calls `gpt-5.5`, which leaves Codex on 2026-10-14; `cheaper-completion.mjs` and `cheaper-pilot.mjs` pin `gpt-5.6-terra` and `claude-sonnet-5`.
  - Accept: Each listed script is updated to current models, or carries a header stating it reproduces a dated historical run and is not part of current maintenance, with a Decisions entry.
  - Verify: Grep `scripts/` for `gpt-5.5`, `gpt-5.6-`, `claude-sonnet-5'`, `claude-opus-5'` and `claude-haiku-4-5`; every hit is in a file covered by that decision.
  - Evidence: Pending.
  - Depends on: C-001, C-002.

### Records

- [ ] C-018 [build] Project records describe the new roles, host minimums and renewal accurately.
  - Source: Implied, the repo already records model roles in `CLAUDE.md`, `docs/validation-status.md`, `docs/routing-pack-maintenance.md` and dated results docs.
  - Accept: `CLAUDE.md` gains a dated scope entry for this request. `docs/validation-status.md` names the new pack and folder digests and host versions. A dated renewal results doc and a maintenance section exist. Earlier entries stay unchanged.
  - Verify: Compare the digests in `docs/validation-status.md` with `skills/delegate/routing-pack.json` and the folder digest from `node scripts/verify/skills.mjs`; `git diff` shows only additions to earlier dated sections.
  - Evidence: Pending.
  - Depends on: C-014.

### Verification and review

- [ ] C-019 [build] The repository checks pass on the final revision.
  - Source: Explicit project instruction in `CLAUDE.md`.
  - Accept: `npm test`, `npm run typecheck`, `npm run build` and `node scripts/verify/skills.mjs` all exit 0 on the final commit.
  - Verify: Run all four on the final commit and record counts.
  - Evidence: Pending.
  - Depends on: C-005, C-006, C-007, C-014, C-015, C-016, C-017, C-018.
- [ ] C-020 [build] A disposable install of the updated Delegate folder works on both hosts.
  - Source: Implied, `CLAUDE.md` requires validating clean installs in disposable projects.
  - Accept: The folder installs into a temporary project for Claude Code and Codex; `local-learning.mjs check` returns a review requirement; the installed folder digest equals the source digest.
  - Verify: Install into a `mktemp -d` project, run the check, and compare digests.
  - Evidence: Pending.
  - Depends on: C-019.
- [ ] C-021 [build] A fresh frontier review of the implemented change returns PASS.
  - Source: Implied, Delegate requires fresh frontier review for public contracts and consequential decisions; Delegate task ID `5d28a013:delegate-model-currency` with `origin_work_type` `frontier_decision`.
  - Accept: An `opus` reviewer given only the requirements, the final diff and the check results returns PASS, or each REPAIR finding is fixed and re-reviewed.
  - Verify: Record the reviewer's verdict and findings; any edit after the review invalidates it.
  - Evidence: Pending.
  - Depends on: C-019, C-020.

## Decisions

- 2026-10-11 Keep Delegate's Claude roles as aliases rather than exact IDs. Reason: the live look shows `opus` and `sonnet` already serve Opus 5.5 and Sonnet 5.5, so aliases track releases without a skill update. Reversal cost: low.
- 2026-10-11 Plan a counted renewal rather than editing pack treatments by hand. Reason: pack entries need live evidence and the generator rejects synthetic authority. Reversal cost: high, since a hand-edited pack fails CI publication validation.
- 2026-10-11 Ship C-015 (usage prices) independently of the renewal if Greg wants it sooner. Reason: it needs no live runs and unblocks measuring Sonnet 5.5 coordinator sessions. Reversal cost: low.

## Pre-Mortem

- P1: The renewal runs on the un-updated CLIs, so `haiku` serves Haiku 4.5 and `gpt-6.1-sol` is unavailable, and the observations record a substitution. Covered by C-003, C-004 and C-011.
- P2: `gpt-6.1-sol` becomes the portable default, and Free/Go or Enterprise/Edu users cannot run Delegate's coordinator. Covered by C-001.
- P3: Maintainer script defaults diverge from renewed observations, and calibration staging throws WORKER_OBSERVATION_MISMATCH mid-campaign. Covered by C-016 and C-012.
- P4: Sonnet 5.5 sessions stay unpriced, so direct-versus-delegated comparisons understate coordinator cost. Covered by C-015.
- P5: The renewal lands after 2026-11-09T00:25Z; the pack expires, `lookup` returns gaps and CI publication validation fails. Covered by C-014; the campaign must start by early November.
- P6: The renewal overwrites the October evidence. Covered by C-009.

## Exclusions

- Moving the Claude frontier from `opus` to `fable`: settled on 2026-09-22; C-002 reopens it only with evidence.
- Pricing Codex models in `usage-prices.json`: `measure-usage.mjs` prices Claude Code transcripts only.
- Updating global host software, installed skill copies or saved settings: Greg's action, tracked as prerequisites C-003 and C-004; reinstalling copies follows his publication approval.
- API-provider alias mappings (Bedrock, Vertex, Foundry): Delegate targets the Claude Code and Codex hosts; the alias behavior on the Anthropic API is what matters here.

## Change Log

- 2026-10-11T20:52Z Created C-001 to C-021 from passes A to D after the live look (file mtime 20:52:33Z).

## Verification

- Between 2026-10-11T20:46Z and 2026-10-11T20:51Z: live look, read-only, no model executions (bounded by `date -u` readings before and after):
  - `claude --version`: 2.1.292; `npm view @anthropic-ai/claude-code version`: 2.1.296.
  - https://platform.claude.com/docs/en/models/overview: current Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5; legacy Opus 5, Sonnet 5, Haiku 4.5, Fable 5.
  - https://code.claude.com/docs/en/model-config: on the Anthropic API `opus` is Opus 5.5 (from 2.1.280), `sonnet` is Sonnet 5.5 (from 2.1.284), `haiku` is Haiku 5.5 (from 2.1.293).
  - Transcripts in `~/.claude/projects` (last 3 days): served `claude-opus-5-5` 29588 messages, `claude-sonnet-5-5` 2540, `claude-fable-5-1` 664.
  - `codex --version`: 0.156.1; `npm view @openai/codex version`: 0.162.1; `codex debug models`: gpt-6-astra, gpt-6-sol, gpt-6-luna, gpt-5.6-sol/terra/luna, hidden gpt-5.5; `~/.codex/models_cache.json` (client 0.162.0, fetched 2026-10-11T20:46Z) lists `gpt-6.1-sol` first.
  - https://learn.chatgpt.com/docs/models: `gpt-6-astra` most capable; `gpt-6.1-sol` recommended for complex coding where available, near-Astra at lower cost; gpt-5.5 retires from Codex 2026-10-14.
  - Repo at `38f06c6`: Roles table uses `sonnet`/`opus`/`haiku` and `gpt-6-sol`/`gpt-6-astra`/`gpt-6-luna`; pack treatments `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`, `claude-fable-5-1`, `gpt-6-luna`, `gpt-6-sol`, `gpt-6-astra`, expiring 2026-11-09T00:25Z; `scripts/usage-prices.json` lacks `claude-sonnet-5-5` and `claude-haiku-5-5`.

## Close-Out

- Review: pending
- Inventory: pending
- Result: pending

## Resume

- State: plan written; no implementation started.
- Open: C-001 to C-021.
- Blockers: C-003 and C-004 need Greg to update the terminal CLIs; C-008 needs his execution ceiling.
- Next: Greg reviews this plan. Then make the C-001 and C-002 decisions, ship C-015 if wanted, and ask Greg for the CLI updates and a ceiling.
