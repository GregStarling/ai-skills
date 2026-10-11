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
- Delivery destination (2026-10-11, superseding the line above): merged into GregStarling/ai-skills main with CI green, authorized by Greg's "/ship when complete". Reinstalling his personal skill copies is not part of it.

## Items

### Decisions (frontier)

- [x] C-001 [build] A recorded decision sets Delegate's Codex coordinator and worker models in light of `gpt-6.1-sol`.
  - Source: Implied, the Codex models page now recommends `gpt-6.1-sol` for complex coding and agentic work, and Delegate names only `gpt-6-sol`.
  - Accept: The Decisions section records the choice for coordinator, workers and fallback. It cites official price per token for `gpt-6-sol` and `gpt-6.1-sol`, plan availability (Free/Go excluded, Enterprise/Edu admin-gated) and installed-CLI support. It also says whether the change belongs in the portable Roles table or in Greg's personal AGENTS.md binding.
  - Verify: Open the Decisions entry and confirm each of those four inputs is cited with a source URL and fetch date; a missing input fails the item.
  - Evidence: Decisions entry "C-001 Codex roles" cites https://developers.openai.com/api/docs/models/gpt-6.1-sol and https://developers.openai.com/api/docs/models/gpt-6-sol (prices, "superseded by GPT-6.1 Sol"), https://learn.chatgpt.com/docs/models (plan availability) and the codex-cli 0.162.1 `codex debug models` catalog. It places the change in the portable Roles table.
  - Depends on: None.
- [x] C-002 [build] A recorded decision confirms or changes the Claude role split for the 5.5 lineup.
  - Source: Implied, `sonnet`, `opus` and `haiku` now resolve to Sonnet 5.5, Opus 5.5 and Haiku 5.5 with new prices (Opus 5.5 at $4/$20 against Sonnet 5.5 at $2/$10), changing the cost gap the 2026-09-22 role decision assumed.
  - Accept: The Decisions section records coordinator, frontier and worker aliases for Claude Code with the official prices and positioning. Changing the frontier from `opus` needs evidence beyond positioning.
  - Verify: Open the Decisions entry and confirm the prices match the official pricing page fetched that day.
  - Evidence: Decisions entry "C-002 Claude roles" records `sonnet`, `opus` and `sonnet`/`haiku`. Its prices match the rows of https://platform.claude.com/docs/en/about-claude/pricing (fetch saved 2026-10-11T20:55:25Z): Sonnet 5.5 $2/$10, Opus 5.5 $4/$20, Haiku 5.5 $0.10/$0.50 up to 100k-token prompts.
  - Depends on: None.

### Host prerequisites (Greg's action)

- [x] C-003 [build] The terminal Claude Code CLI is at 2.1.293 or later, so `haiku` serves Haiku 5.5.
  - Source: Implied, Claude Code model-config docs say Haiku 5.5 requires v2.1.293; the installed CLI is 2.1.292.
  - Accept: `claude --version` reports 2.1.293 or later, and a `haiku` Agent launch records `message.model` `claude-haiku-5-5` in its transcript.
  - Verify: Run `claude --version`, then grep the launch transcript for the served model; `claude-haiku-4-5` fails the item.
  - Evidence: 2026-10-11T21:41:11Z `claude --version` gave 2.1.296. Two `haiku` launches:
    - Terminal: `claude -p --model haiku --output-format json` reported `modelUsage` `claude-haiku-5-5` (session f247ec9e, `~/.claude/projects/-private-tmp/f247ec9e-e60a-4b44-a654-2caedffcb7aa.jsonl`).
    - Agent tool: the `model: haiku` launch's transcript `subagents/agent-a844111e028460dc0.jsonl` records `"model":"claude-haiku-5-5"` 4 times and `claude-haiku-4-5` 0 times.
  - Depends on: None.
- [x] C-004 [build] The terminal Codex CLI's catalog includes every Codex model chosen in C-001.
  - Source: Implied, installed Codex CLI 0.156.1 `codex debug models` omits `gpt-6.1-sol`, which the 0.162.0 client's cache lists; latest npm is 0.162.1.
  - Accept: `codex debug models` on the terminal CLI lists each chosen Codex model, and a smoke run's rollout records it as configured.
  - Verify: Run `codex --version` and `codex debug models`; a missing chosen model fails the item.
  - Evidence: `codex --version` gave codex-cli 0.162.1. `codex debug models` lists gpt-6.1-sol, gpt-6-astra, gpt-6-sol and gpt-6-luna. Smoke `artifacts/renewal-2026-10-11/smoke-codex-standard/worker/request.json` ran `-m gpt-6.1-sol` with `model_reasoning_effort="low"`; the assembled treatment `codex-gpt-6.1-sol-low` was observed at 2026-10-11T21:54:03Z on codex-cli 0.162.1.
  - Depends on: C-001.

### Consumer skill source

- [x] C-005 [build] The SKILL.md Roles table names the models chosen in C-001 and C-002.
  - Source: Explicit requirement, "ensure our delegate skill is up to date on the latest models".
  - Accept: Each Roles cell matches the decisions; no row names a model the official pages list as legacy, retired or retiring.
  - Verify: Diff the Roles table against the Decisions entries and the official pages fetched that day.
  - Evidence: `skills/delegate/SKILL.md` Roles table now reads: coordinator `sonnet` / `gpt-6.1-sol` medium; frontier `opus` / `gpt-6-astra` high; workers `sonnet` or `haiku` / `gpt-6.1-sol` or `gpt-6-luna`. It adds the `gpt-6-sol` fallback line, matching decisions C-001 and C-002. None of the named models is legacy or retiring in `artifacts/renewal-2026-10-11/metadata/claude-models.html` or `openai-models.html` (fetched 2026-10-11T21:46:04Z).
  - Depends on: C-001, C-002.
- [x] C-006 [build] `hosts/claude-md-snippet.md` mirrors the Roles table exactly.
  - Source: Implied, SKILL.md says "The CLAUDE.md activation snippet only mirrors this table".
  - Accept: Every model or alias in the snippet equals the Roles table entry for the same role.
  - Verify: Compare the role names and models in both files; any mismatch fails.
  - Evidence: `hosts/claude-md-snippet.md` names only the Claude frontier `opus` (3 mentions) and "a Sonnet coordinator", and both are unchanged in the Roles table. It names no Codex model and no worker model, so no edit was needed.
  - Depends on: C-005.
- [x] C-007 [build] The host guides' version and source statements match the live docs.
  - Source: Implied, `hosts/codex.md` cites sources checked 2026-09-10, and alias resolution now depends on Claude Code version (Opus 5.5 from 2.1.280, Sonnet 5.5 from 2.1.284, Haiku 5.5 from 2.1.293).
  - Accept: Any minimum-version or source-date statement in `hosts/claude-code.md` and `hosts/codex.md` matches the docs fetched that day, and no stale model claim remains.
  - Verify: Grep both guides for versions, dates and model names and compare each with the fetched docs.
  - Evidence: `hosts/claude-code.md` has no version or date statements and names only the aliases `haiku`/`sonnet`/`opus`. In `hosts/codex.md`, the source date moved from 2026-09-10 to 2026-10-11 after re-fetching both cited pages: https://learn.chatgpt.com/docs/build-skills (`.agents/skills`, `SKILL.md`, `$` invocation) and https://learn.chatgpt.com/docs/agent-configuration/subagents (per-spawn model and reasoning effort). Its `fork_turns` instruction is conditional on the spawn tool exposing it.
  - Depends on: C-001, C-002.

### Routing pack renewal (live, counted)

- [x] C-008 [build] Greg approves an execution ceiling for a counted renewal on the current models.
  - Source: Decision, repo practice requires a new ceiling before any renewal; the October renewal used 49 of 62.
  - Accept: The ceiling, its date and Greg's words are recorded under Decisions, and a new campaign ledger is initialized with it.
  - Verify: Open the ledger created by `scripts/verify/campaign-budget.mjs` and confirm its ceiling equals the approved number.
  - Evidence: `artifacts/renewal-2026-10-11/budget.json`, created by `initializeBudget` before any execution, has `ceiling` 62 and an `authorization` that quotes Greg's 2026-10-11 message; the Decisions entry "C-008 execution ceiling" records the number.
  - Depends on: C-001, C-002.
- [x] C-009 [build] The October canonical routing inputs are archived byte-identically before replacement.
  - Source: Explicit constraint, historical evidence stays untouched.
  - Accept: A new `data/routing/archive/2026-10-09/` holds every replaced file with a `preservation.json` whose digests equal the originals.
  - Verify: Recompute SHA-256 of each archived file and compare with `git show 38f06c6:` of the original path.
  - Evidence: `artifacts/renewal-2026-10-11/archive-october.mjs` wrote 9 files plus `data/routing/archive/2026-10-09/preservation.json` (`preserved_at` 2026-10-11T21:46:29.530Z; source revision f8166d2, unchanged from 38f06c6 for these paths). Recomputed SHA-256 of all 9 archived files matched `git show 38f06c6:` of each original (9/9).
  - Depends on: C-008.
- [x] C-010 [build] `data/routing/frontier-targets.json` names each provider's current most capable model from a fresh official fetch.
  - Source: Implied, `skills/refresh-models/SKILL.md` requires it for every refresh.
  - Accept: Targets carry `checked_at` from the renewal day and a content digest. Each model equals the one its official page recommends for the most demanding work. Today that is `claude-fable-5-1` ("for demanding reasoning and long-horizon agentic work"; the page does not say "most capable") and `gpt-6-astra` ("most capable").
  - Verify: Re-fetch both pages, recompute the digests, and compare models and digests.
  - Evidence: `data/routing/frontier-targets.json` (`discovered_at` 2026-10-11T21:46:04.000Z) targets `gpt-6-astra` and `claude-fable-5-1`. Its digests equal `artifacts/renewal-2026-10-11/metadata/sha256.txt` for `openai-models.html` (66ceb21b…) and `claude-models.html` (400903df…), captured with curl at 21:46:04Z. Probes then ran on codex-cli 0.162.1 (21:47:53Z) and Claude Code 2.1.296 (21:48:08Z), and the Opus 5.5 review passed both (review digest `sha256:5286b201…`). `test/routing/frontier-refresh.test.ts` passed 5/5.
  - Depends on: C-009.
- [x] C-011 [build] Fresh host observations exist for every treatment the renewed pack routes, each with matching served identity.
  - Source: Explicit requirement, latest models; implied by the identity-assurance policy (an observed substitution rejects a treatment).
  - Accept: `data/routing/host-observations.json` has passing smoke runs for the decided Claude treatments (expected `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-1`) and Codex treatments (expected `gpt-6-luna`, `gpt-6-sol` or `gpt-6.1-sol`, `gpt-6-astra`). Every run's observed model equals its requested model.
  - Verify: Run the repo's identity validation over the assembled observations; a substitution or missing treatment fails it.
  - Evidence: `assembleSmokeEvidence` (via `artifacts/renewal-2026-10-11/assemble-observations.mjs`) accepted all 4 smoke runs with ACCEPT reviews and wrote 6 treatments between 21:50:38Z and 21:54:17Z: Haiku 5.5/not_applicable, Sonnet 5.5/low, Opus 5.5/high, Luna/low, 6.1 Sol/low and Astra/high. Claude stdout served models equal the requested ones (worker `claude-haiku-5-5` and `claude-sonnet-5-5`, reviewers `claude-opus-5-5`), and Codex records the configured model. `refresh-routing-pack.mjs` then parsed them into a 15-route pack (`sha256:6e135a0c…`). Fable 5.1 is covered by C-012.
  - Depends on: C-003, C-004, C-008, C-009.
- [x] C-012 [build] Reviewer calibrations exist for each renewed reviewer treatment.
  - Source: Implied, the pack admits reviewers only through `stage-calibration.mjs`, which rejects a calibration worker absent from host observations (WORKER_OBSERVATION_MISMATCH).
  - Accept: Calibration files stage without error, and each calibration worker is a non-frontier treatment from C-011.
  - Verify: Run `scripts/stage-calibration.mjs` on the new calibrations; any mismatch error fails.
  - Evidence: The Fable 5.1/high calibration (`artifacts/renewal-2026-10-11/calibration/report.json`) was admitted with positive ACCEPT, defective REPAIR and boundary ACCEPT; its worker served `claude-haiku-5-5`. `node scripts/stage-calibration.mjs --observations` against the renewed observations exited 0 at 2026-10-11T21:54:56Z with report `sha256:4cfb64bb…`, so its worker matched treatment `claude-claude-haiku-5-5-not_applicable`. The admission was copied to `data/routing/reviewer-calibration/claude.json` (mechanical_work, low). Opus 5.5 and Astra are primary reviewers with fresh smokes, so they need no separate admission.
  - Depends on: C-011, C-016.
- [x] C-013 [build] Installed acceptance is re-run on the renewed folder for all 14 cases, or each withheld case is recorded with its reason.
  - Source: Implied, matching installed acceptance outranks smoke extrapolation in the pack.
  - Accept: `data/routing/installed-acceptance.json` holds the new cases with host versions, digests and verdicts; withheld cases keep their failure evidence.
  - Verify: Run the acceptance publication test for the new renewal; it fails on missing or relabeled cases.
  - Evidence: All 14 cases ran on frozen folder `sha256:beba70c3…` (Claude Code 2.1.296, codex-cli 0.162.1). Each passed its grader and the maintainer trace review recorded in `artifacts/renewal-2026-10-11/reasons.json`, which read every final artifact and viewed both UI renders at 320 and 1280 px. Claude workers served `claude-haiku-5-5`; Codex workers were configured `gpt-6-luna`/low. `data/routing/installed-acceptance.json` holds 14 cases with host versions. `test/routing/renewal-2026-10-11-publication.test.ts` passed 6/6 at 2026-10-11T22:12Z, including its 14-case binding to `docs/evidence/delegate-renewal-2026-10-11/evidence.json`. Budget 46/62, 0 reserved.
  - Depends on: C-011, C-012.
- [x] C-014 [build] The recompiled pack routes only current models and expires after 2026-11-09T00:25Z.
  - Source: Pre-mortem P5; explicit requirement, latest models.
  - Accept: Treatments in `skills/delegate/routing-pack.json` contain none of `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001` or `gpt-5.5` unless a Decision keeps one. `expires_at` is later than 2026-11-09T00:25Z, and every route entry outlives the pack.
  - Verify: A new renewal publication test, modeled on `test/routing/renewal-2026-10-publication.test.ts`, asserts the treatment list, the digests and the expiry; reverting one treatment makes it fail.
  - Evidence: `skills/delegate/routing-pack.json` is `sha256:7a674aa8…`, generated 2026-10-11T22:10:18Z and expiring 2026-11-10T22:10:18Z; its earliest entry expires 2026-11-10T21:46:04Z. Its treatments are exactly the 5.5 Claude models, Fable 5.1, Luna, 6.1 Sol and Astra. `test/routing/renewal-2026-10-11-publication.test.ts` asserts that exact sorted list, the expiry beyond 2026-11-09T00:25:04Z and `assertEntriesOutlivePack`, and passed 6/6. A reverted treatment changes the list, so the equality fails.
  - Depends on: C-010, C-011, C-012, C-013.

### Maintainer tooling

- [x] C-015 [build] `scripts/usage-prices.json` prices `claude-sonnet-5-5` and `claude-haiku-5-5` at official rates.
  - Source: Implied, the Claude coordinator alias `sonnet` now serves Sonnet 5.5; recent transcripts show 2540 Sonnet 5.5 messages that measure-usage cannot price.
  - Accept: Both models have input, output, cache-read and both cache-write rates from the official pricing page. `node scripts/measure-usage.mjs` lists neither model as unpriced.
  - Verify: Run measure-usage over recent transcripts and read its "Unpriced models" line; a test asserts both entries exist.
  - Evidence: `node scripts/measure-usage.mjs --since 2026-10-08 --json` reported `unpriced_models` `{"claude-sonnet-5-5":845}` with the `38f06c6` prices and `{}` with commit `f368f60`. Rates match the pricing table rows for Sonnet 5.5 and both Haiku 5.5 prompt-length tiers at https://platform.claude.com/docs/en/about-claude/pricing. `test/routing/measure-usage.test.ts` passed 1/1 and failed when the tier line was removed. Full checks on `f368f60`: `npm test` 1175 passed / 3 skipped, typecheck, build and `node scripts/verify/skills.mjs` passed. Merged as PR #14, main `f8166d2`; main CI run 38174524450 succeeded.
  - Depends on: None.
- [x] C-016 [build] Model defaults in the scripts the renewal flow runs match renewed host-observation treatments.
  - Source: Pre-mortem P3; the same mismatch was fixed for Codex in PR #13.
  - Accept: `host-evidence.mjs`, `installed-delegate.mjs`, `completion-campaign.mjs`, `direct-vs-delegated.mjs`, `evaluate-frontier-reviewers.mjs`, `review-frontier-probes.mjs` and `assemble-evidence.mjs` default only to treatments in the renewed `host-observations.json` (today they default to `claude-opus-5`, `claude-sonnet-5` and `claude-haiku-4-5-20251001` on the Claude side).
  - Verify: A test reads each script's exported or literal defaults and asserts each matches a current observation treatment; setting one to a legacy ID makes it fail.
  - Evidence: `test/routing/maintainer-defaults.test.ts` reads the model literals of the 7 listed scripts. It passed 1/1, and failed with `"model": "claude-opus-5"` when that legacy ID was put back in `scripts/review-frontier-probes.mjs`, then passed after restoring. Defaults now name `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `gpt-6.1-sol`, `gpt-6-luna` and `gpt-6-astra`.
  - Depends on: C-011.
- [x] C-017 [build] Each script still pinned to a retiring or superseded model is updated or marked historical by recorded decision.
  - Source: Implied, `scripts/verify/v1-live.mjs` pins `gpt-5.5` (it re-verifies retained evidence and makes no provider calls; corrected 2026-10-11); `cheaper-completion.mjs` and `cheaper-pilot.mjs` pin `gpt-5.6-terra` and `claude-sonnet-5`.
  - Accept: Each listed script is updated to current models, or carries a header stating it reproduces a dated historical run and is not part of current maintenance, with a Decisions entry.
  - Verify: Grep `scripts/` for `gpt-5.5`, `gpt-5.6-`, `claude-sonnet-5'`, `claude-opus-5'` and `claude-haiku-4-5`; every hit is in a file covered by that decision.
  - Evidence: The grep hits 4 files: `scripts/verify/cheaper-completion.mjs`, `scripts/verify/cheaper-pilot.mjs`, `scripts/verify/v1-live.mjs` and `scripts/usage-prices.json`. All four are covered by Decisions entry "C-017 historical model pins". The three scripts now carry a first-line "Historical:" header. `test/routing/cheaper-pilot.test.ts` and `test/routing/cheaper-completion.test.ts` passed 33/33 after the headers.
  - Depends on: C-001, C-002.

### Records

- [x] C-018 [build] Project records describe the new roles, host minimums and renewal accurately.
  - Source: Implied, the repo already records model roles in `CLAUDE.md`, `docs/validation-status.md`, `docs/routing-pack-maintenance.md` and dated results docs.
  - Accept: `CLAUDE.md` gains a dated scope entry for this request. `docs/validation-status.md` names the new pack and folder digests and host versions. A dated renewal results doc and a maintenance section exist. Earlier entries stay unchanged.
  - Verify: Compare the digests in `docs/validation-status.md` with `skills/delegate/routing-pack.json` and the folder digest from `node scripts/verify/skills.mjs`; `git diff` shows only additions to earlier dated sections.
  - Evidence: `node scripts/verify/skills.mjs` passed. It asserts that `docs/validation-status.md` cites the shipped pack `sha256:7a674aa8…` and folder `sha256:283ed46a…`.
    - Records: `CLAUDE.md` and `AGENTS.md` gained the dated "Model currency renewal — 2026-10-11" entry. `docs/delegate-renewal-results-2026-10-11.md` and the `docs/routing-pack-maintenance.md` "2026-10-11 counted full renewal" section exist, and `docs/delegate.md` gained a dated note.
    - `git diff` removes only current-state lines: the validation-status pack table, digest table and current acceptance line, plus the `docs/delegate.md` current role row. Every dated section is unchanged.
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

### Added after the independent audit

- [x] C-022 [build] The plan records whether Claude Mythos 5.1 is available to Claude Code, and routes it only if it is.
  - Source: Independent audit 2026-10-11: the models overview's pricing footnote names "Claude Mythos 5.1", but the lineup table and the Claude Code alias table do not.
  - Accept: A Decisions entry cites the official source on Mythos 5.1's availability and its Claude Code alias or model ID, if any. It records whether Mythos joins C-002 and C-010, or why it does not.
  - Verify: Fetch the Mythos 5.1 model page or the deprecations and availability docs, and compare with the Decisions entry; an uncited claim fails.
  - Evidence: Decisions entry "C-022 Mythos 5.1" cites https://support.claude.com/en/articles/14604842: access only through the Cyber Verification Program, with no model ID or Claude Code alias. The pricing table marks it "limited availability", and the Claude Code alias table lists no Mythos alias. Recorded as not routed.
  - Depends on: None.

### Release (authorized 2026-10-11)

- [ ] C-023 [release] The workstream is merged into GregStarling/ai-skills main, and CI passes on the merge commit.
  - Source: Explicit requirement, "/ship when complete".
  - Accept: The PR is merged; the CI run on that exact merge commit concludes success.
  - Verify: `gh pr view` shows MERGED with the merge SHA, and `gh run view` for that SHA shows success.
  - Evidence: Pending.
  - Depends on: C-021.
- [ ] C-024 [release] A disposable install from published main carries the renewed pack and roles.
  - Source: Implied, Ship verification for an installable skill.
  - Accept: The Delegate folder installed from `origin/main` into a temporary project has the renewed pack digest and Roles table, and its `check` command runs.
  - Verify: Install from a fresh `origin/main` worktree, compare digests with `docs/validation-status.md`, and run the check.
  - Evidence: Pending.
  - Depends on: C-023.

## Decisions

- 2026-10-11 Keep Delegate's Claude roles as aliases rather than exact IDs. Reason: the live look shows `opus` and `sonnet` already serve Opus 5.5 and Sonnet 5.5, so aliases track releases without a skill update. Reversal cost: low.
- 2026-10-11 Plan a counted renewal rather than editing pack treatments by hand. Reason: pack entries need live evidence and the generator rejects synthetic authority. Reversal cost: high, since a hand-edited pack fails CI publication validation.
- 2026-10-11 Ship C-015 (usage prices) independently of the renewal if Greg wants it sooner. Reason: it needs no live runs and unblocks measuring Sonnet 5.5 coordinator sessions. Reversal cost: low.
- 2026-10-11 C-001 Codex roles. Coordinator `gpt-6.1-sol` at medium; workers `gpt-6.1-sol` or `gpt-6-luna`; frontier `gpt-6-astra` at high; `gpt-6-sol` is the fallback wherever 6.1 Sol is not enabled. Inputs:
  - Price, from https://developers.openai.com/api/docs/models/gpt-6.1-sol and https://developers.openai.com/api/docs/models/gpt-6-sol (fetched between 21:41Z and 21:43Z). 6.1 Sol is $2 input, $0.10 cached, $10 output. 6 Sol is $2, $0.20 and $10, and its page says it is "superseded by GPT-6.1 Sol".
  - Availability, from https://learn.chatgpt.com/docs/models (fetched between 20:46Z and 20:51Z): Plus, Pro, Business, Enterprise and Edu at launch, not Free or Go, and off for Enterprise and Edu until an admin enables it.
  - CLI support: codex-cli 0.162.1 `codex debug models` lists `gpt-6.1-sol`.
  Reason: same price, newer and stronger, so it belongs in the portable Roles table, with fallback wording for plans without it; Greg's personal Codex default already uses it. The pack's `codex-standard` smoke worker moves to `gpt-6.1-sol` at low; `gpt-6-sol` is not re-observed, and consumers without 6.1 Sol keep the Luna worker and Astra reviewer routes. Reversal cost: medium, 2 smoke executions plus a recompile.
- 2026-10-11 C-002 Claude roles unchanged. Coordinator `sonnet` (Sonnet 5.5, $2/$10); frontier `opus` (Opus 5.5, $4/$20, "start with Claude Opus 5.5 for most workloads"); workers `sonnet` or `haiku` (Haiku 5.5, $0.10/$0.50 up to 100k-token prompts and $0.50/$2.50 above). Sources: the pricing page (fetch saved 20:55:25Z) and the models overview. The coordinator-to-frontier price ratio narrowed from 2.5x (Sonnet 5 to Opus 5) to 2x. No measured evidence favors moving either role, so the 2026-09-22 split stands, and Fable 5.1 stays the additional mechanical reviewer in the pack. Reversal cost: low.
- 2026-10-11 C-022 Mythos 5.1 is not routed. https://support.claude.com/en/articles/14604842 (fetched between 21:41Z and 21:43Z) offers it only through the Cyber Verification Program and gives no model ID or alias. The pricing table marks it "limited availability", and the Claude Code alias table (fetched between 20:46Z and 20:51Z) has no Mythos alias, so it is not generally available to Delegate users. Reversal cost: low.
- 2026-10-11 C-008 execution ceiling: 62 model executions. Greg's words, received between 21:01Z and 21:41Z: "yes, run the haiku check and commit the checklist, work through this entire workstream, use /cto mode and /ship when complete". That instruction authorizes the counted renewal, and 62 is the ceiling he approved on 2026-10-09 for the same campaign shape, which used 49. Reason: the same treatment count plus one Sol replacement. Reversal cost: low; the budget halts at the ceiling.
- 2026-10-11 C-017 historical model pins:
  - `cheaper-completion.mjs` and `cheaper-pilot.mjs` reproduce the dated cheaper-coordination campaign (docs/cheaper-coordination-results.md). Their models are the experiment's subjects, and their tests bind them, so they are marked historical rather than changed.
  - `v1-live.mjs` re-verifies retained v1 live-smoke evidence with `new_provider_calls: 0`, so the gpt-5.5 retirement cannot break it; it is marked historical too.
  - `scripts/usage-prices.json` keeps the Haiku 4.5 rates so that older transcripts stay priced.
  Reversal cost: low.
- 2026-10-11 Haiku 5.5 worker effort is recorded as `not_applicable`, with an explicit limitation. Neither the smoke CLI launch nor the Claude Code Agent tool requests an effort, so the host default applies. The schema has no "uncontrolled" value, and `src/routing/acceptance.ts` binds an Agent-tool worker with no requested effort only to a `not_applicable` treatment. Recording a specific effort would claim a control that was never exercised and would leave the Claude acceptance cases unbound. Flagged for the frontier review. Reversal cost: medium, a schema or matcher change plus a recompile.
- 2026-10-11 The interim pack used for installed acceptance was compiled with an empty acceptance placeholder (`artifacts/renewal-2026-10-11/canonical/installed-acceptance-interim.json`). October's placeholder records match the unchanged Luna and Astra treatments, which would cap those entries at 2026-11-08 and fail the 24-hour outlive check. With no records, every interim entry is smoke extrapolation, the same state as October's interim pack. Reversal cost: low; publication recompiles with the new acceptance.
- 2026-10-11 Delivery destination widened to merged main: Greg's "/ship when complete" authorizes a PR and merge. Reinstalling his personal skill copies is still not requested; Ship avoids altering personal installations.

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
- 2026-10-11T20:53Z Fixed this log's creation time (first written as an estimated 20:55Z) and the live-look time in Verification to clock readings. The baseline copy made seconds earlier, before any item changed, was deleted and recreated at 20:53:19Z with those two lines fixed.
- 2026-10-11T20:53Z Corrected C-010 Accept: it said "the most capable models on the fetched pages"; it now quotes each page, because the audit found the Claude overview never calls Fable 5.1 "most capable". Authority: independent audit 2026-10-11.
- 2026-10-11T20:53Z Added C-022 from the independent audit (Claude Mythos 5.1 named in a pricing footnote).
- 2026-10-11T21:01Z Greg asked to "ship the price fix now, and update the CLIs". Verified C-015 (PR #14, main `f8166d2`). Updated both terminal CLIs with his authorization. C-003 and C-004 stay open: the served Haiku 5.5 identity and the C-001 model choice are not verified yet.
- 2026-10-11T21:44Z Greg: "yes, run the haiku check and commit the checklist, work through this entire workstream, use /cto mode and /ship when complete". Verified C-003 (two `haiku` launches served `claude-haiku-5-5`). Recorded and verified decisions C-001, C-002 and C-022. Set the C-008 ceiling decision at 62. Added C-023 and C-024 as `[release]` items, and appended a delivery-destination line to Definition of Complete, because publication is now authorized. C-004 stays open until a `gpt-6.1-sol` smoke rollout records the configured model.
- 2026-10-11T21:58Z Verified C-004 through C-012 and C-016 from the campaign's free steps, probes, preflights, calibration and smokes (budget 16/62 before acceptance). Corrected C-017 Source: it said `v1-live.mjs` "calls `gpt-5.5`, which leaves Codex on 2026-10-14"; the script re-verifies retained evidence with no provider calls, so the Source now says it pins `gpt-5.5`. Authority: reading `scripts/verify/v1-live.mjs` lines 80 to 101. Verified C-017 by decision and headers.

## Verification

- Between 2026-10-11T20:46Z and 2026-10-11T20:51Z: live look, read-only, no model executions (bounded by `date -u` readings before and after):
  - `claude --version`: 2.1.292; `npm view @anthropic-ai/claude-code version`: 2.1.296.
  - https://platform.claude.com/docs/en/models/overview: current Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 5.5; legacy Opus 5, Sonnet 5, Haiku 4.5, Fable 5.
  - https://code.claude.com/docs/en/model-config: on the Anthropic API `opus` is Opus 5.5 (from 2.1.280), `sonnet` is Sonnet 5.5 (from 2.1.284), `haiku` is Haiku 5.5 (from 2.1.293).
  - Transcripts in `~/.claude/projects` (last 3 days): served `claude-opus-5-5` 29588 messages, `claude-sonnet-5-5` 2540, `claude-fable-5-1` 664.
  - `codex --version`: 0.156.1; `npm view @openai/codex version`: 0.162.1; `codex debug models`: gpt-6-astra, gpt-6-sol, gpt-6-luna, gpt-5.6-sol/terra/luna, hidden gpt-5.5; `~/.codex/models_cache.json` (client 0.162.0, fetched 2026-10-11T20:46Z) lists `gpt-6.1-sol` first.
  - https://learn.chatgpt.com/docs/models: `gpt-6-astra` most capable; `gpt-6.1-sol` recommended for complex coding where available, near-Astra at lower cost; gpt-5.5 retires from Codex 2026-10-14.
  - Repo at `38f06c6`: Roles table uses `sonnet`/`opus`/`haiku` and `gpt-6-sol`/`gpt-6-astra`/`gpt-6-luna`; pack treatments `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`, `claude-fable-5-1`, `gpt-6-luna`, `gpt-6-sol`, `gpt-6-astra`, expiring 2026-11-09T00:25Z; `scripts/usage-prices.json` lacks `claude-sonnet-5-5` and `claude-haiku-5-5`.

- 2026-10-11T20:52Z Independent economy audit (a `sonnet` agent with no transcript access, given the 10 claims and the sources): PASS on all 10 claims. Caveats:
  - The Claude overview never literally calls Fable 5.1 "most capable".
  - "Claude Mythos 5.1" appears only in a pricing footnote.
  - `~/.codex/models_cache.json` is rewritten by two clients: ChatGPT.app's bundled Codex 0.162.0 lists `gpt-6.1-sol`, and the terminal CLI 0.156.1 does not.
  - `~/.codex/config.toml` already sets `model = "gpt-6.1-sol"`.
  - This audit was the Delegate check's selected 10% sample for task `5d28a013:model-currency-audit`.

- 2026-10-11T20:56Z CLI updates through each tool's own updater (update logs written 20:55:59Z to 20:56:10Z):
  - `claude update`: "Successfully updated from 2.1.292 to version 2.1.296"; `~/.local/bin/claude` now points to `versions/2.1.296`.
  - `codex update`: "Codex CLI 0.162.1 installed successfully"; `codex --version` reports codex-cli 0.162.1.
  - `codex debug models` on 0.162.1 lists gpt-6.1-sol, gpt-6-astra, gpt-6-sol, gpt-6-luna, gpt-5.6-sol/terra/luna and hidden gpt-reserve, gpt-5.5 and codex-auto-review.
  - No model was executed, so the served identity of `haiku` (C-003) is not yet observed.
- 2026-10-11T20:55Z (fetch saved 20:55:25Z) The pricing page's table lists "Claude Mythos 5.1 (limited availability)" at the Fable 5.1 rates; this is input for C-022, not its decision.

## Close-Out

- Review: pending
- Inventory: pending
- Result: pending

## Resume

- State: executing under CTO; ledger at `.cto/ledger.md`. Verified C-001, C-002, C-003, C-015 and C-022.
- Open: C-004 to C-014, C-016 to C-021, C-023 and C-024.
- Blockers: none.
- Next: free preparation for the renewal: C-009 archive, C-010 metadata and targets, C-016 script defaults, and the campaign budget. Then the live campaign.
