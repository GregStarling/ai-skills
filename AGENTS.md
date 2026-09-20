# AI Skills

## Catchup and Debug — 2026-09-19

Add portable Catchup and Debug (renamed from Repro) skills and update the catalog
and install guide. Catchup must remain read-only; Debug must establish failure
evidence and verify scoped repairs. Extend the existing collection PR, preserving
other skills and historical evidence. Validate disposable installs and independent
behavioral exercises; do not alter personal installations or the old command repo.
See docs/catchup-debug.md.

## Ship skill migration — 2026-09-19

Add an improved portable Ship skill from claude-commands and the personal Ship
variant. Keep its release instructions self-contained, update the catalog and
installation guide, and validate disposable installs plus release behavior.
Preserve CTO, Delegate, routing packs, and historical evidence. Publish this scoped
addition as a branch and pull request; no retirement of claude-commands or change
to personal installations is part of the migration. See docs/ship-skill.md.

## Skill collection — 2026-09-19

The current request turns this repository into a collection of independently
installable skills: add CTO alongside Delegate, give each its own overview, and
make the root README a catalog with installation instructions. Preserve Delegate
behavior, routing-pack bytes, maintainer tooling and historical evidence. Generalize
packaging checks to protect every consumer skill. Validate clean installs in
disposable projects and obtain independent review. This request authorizes a
GitHub branch and pull request for the collection; it does not change personal
installations or saved model settings. Earlier phase restrictions below remain
historical and do not expand this scope. See docs/skills-collection.md.


## Local middle-ground revision

The current user request authorizes updating this local repository with GitHub's simpler workflow plus a mandatory lightweight review check. `check` selects audits using a stable task ID; `origin_work_type` preserves consequential-decision and hard-bug review through implementation handoffs, with unknown handoff origins requiring review. Detailed dispatch/completion recording stays optional for ordinary consumers. Keep source inert, preserve historical evidence and routing-pack bytes, and validate locally with independent review. No publication, personal installation or saved-model change is part of this request. This scoped revision supersedes the earlier ordinary-workflow instructions below. See docs/middle-ground.md.

## Test-readiness simplification — 2026-09-13

Branch `test-readiness`. Goal: make the Sonnet→Fable (Claude Code) and Terra→Astra (Codex) design measurable in long real sessions. Four changes: (1) implemented-behavior review is tiered by declared risk in `reviewRequirement`; declared low risk gets coordinator checks plus a stable 10% frontier audit, medium and above keep mandatory fresh frontier review, hard-bug fixes always take frontier review, unknown risk is medium. (2) The helper's `dispatch`/`complete` protocol is optional and not part of ordinary completion; usage is measured from host transcripts with `scripts/measure-usage.mjs`. (3) SKILL.md and the host guides are cut to about a page, with supporting docs as optional reads. (4) `skills/delegate/hosts/claude-md-snippet.md` provides a CLAUDE.md activation path for test periods. Historical evidence, the routing pack, the evidence-required `route` path and the engine are unchanged. Personal installation and saved-model changes remain the user's action. See docs/test-readiness-2026-09-13.md.

## Current product scope — standalone delegate

The current user-authorized release uses capable economical coordinators with automatic frontier escalation and fresh review. Implement the approved checklist in docs/cheaper-coordination-plan.md. Personal skill installation and Terra/Sonnet saved-default activation are authorized only after host gates pass; no remote publication. The user amended the cumulative live campaign ceiling from 50 to 100 executions, preserving the first 40 and all original approvals/reservations. Count implementation agents, reviewers, continuations, failures and retries. Historical budgets do not add capacity.

The skill explicitly requests automatic bounded agents for eligible tasks and required frontier decisions/reviews. Plans and consequential decisions use frontier; hard bugs strongly default to frontier with evidence-backed economical handoffs. Accepted routine execution stays cheap. Features, behavior-changing fixes and substantial refactors require fresh frontier review. Research, PDFs, source comparison and synthesis stay economical even when substantial, sources conflict or attempts fail; sampled document audits use an independent cheaper reviewer. Separate consequential decisions arising from research into focused frontier packets. No automatic second frontier for a plan alone. Explicit user model choices and no-delegation restrictions remain authoritative. Classify, apply prescribed execution and review rules separately, and record reasons; preserve no recursive coordination inside agent packets.

Keep ordinary routing separate from evidence-required route/lookup. Preserve literal scopes, expiry, identity, reviewer rules, routing-pack bytes and historical results. Ordinary observations include direct work, coordinator identity, escalations, reviews, repairs and unknown usage; they do not establish qualification or subscription savings. Native artifacts and actual checks establish acceptance, not self-attesting booleans.

Source stays inert. Update the whole installed folder only after validation, preserve unrelated settings and back up changed configuration. Reuse existing harnesses and accounting. A provider or budget blocker leaves checklist items incomplete; never fabricate acceptance. The current approved release supersedes earlier no-global-install restrictions only for this scoped rollout.

## V5 identity assurance — 2026-09-10

Policy v5 derives native treatment identity assurance from preserved request/configuration, process, version and trace bytes. Never accept agent-written assurance labels. Low/medium allow exact configuration assurance with unchanged capability/review thresholds; contradictions reject, API provenance stays separate, high/critical remain restricted. Preserve exact policy/constitution-v4.json and v3 history. See docs/v5-identity-assurance.md.

## Installable release scope — 2026-09-10

Policy v4 now separates capability qualification from normalized API-equivalent economic ordering. Missing subscription dollar telemetry does not block capability; exact host/model/effort, review, sample, quality, latency and freshness requirements remain. API evidence cannot qualify a Claude Code/Codex treatment without its own matching execution evidence. Preserve exact v3 history in policy/constitution-v3.json. Routing-pack v3 factors treatment metadata and explicitly rejects older wire versions; update the whole portable folder. See docs/v4-economics.md and docs/v4-validation.md. One derived Claude medium mechanical stratum has narrow audited fresh-review authority; do not broaden its scope.

The earlier policy-v3/pack-v2 release required frontier verification at every risk and separated qualified evidence from scoped provisional host observations and pack expiry from binding expiry. Full projects decompose; no whole-project worker route exists. See docs/installable-delegate-plan.md and docs/routing-pack-validation.md for that historical acceptance, including harness recoveries and observation limits. The user authorized this public ai-skills repository and fixes through completion; disposable project skill installations and normal publication of this scoped work are authorized. Global skill/configuration changes remain outside this task. Older release restrictions below describe their original phase.

## Earlier engine scope

The user's latest instruction is to own the complete v1 build. docs/model-governor-spec.md is the original source; its final instruction to stop after Phase 1 is superseded by that explicit follow-up. See lessons/2026-09-09-v1-scope.md. Prove the validator milestone first, then continue through Claude adapter, Codex adapter, real evaluation fixtures, evidence/production ledgers, paired statistics, qualification, discovery, refresh and delegation. Optional UI is excluded.

## Invariants

Keep model IDs out of constitution policy. Never invent universal quality/confidence scores. Initial policy thresholds are declared proposals, not empirical facts. Bind exact policy and evidence identity, recompute decisions independently, and reject synthetic evidence in production mode. Insufficient evidence yields HOLD or escalation; never manufacture real model qualification to demonstrate a successful dispatch.

Foreman owns adaptive task planning, isolated worker execution, gate evidence and integration. Stabilize shared schemas before consumers, use disjoint ownership, and preserve acceptance evidence. Cap parallel execution workers at three. The supervising agent may inspect, test and repair issues at safe ownership boundaries.

Use local authenticated coding CLIs for live implementation/evaluation work; do not introduce provider API keys or universal proxies. Read-only official metadata discovery is in scope after earlier milestones. Do not globally install skills, change user provider configuration, create remote repositories or publish unless separately requested. Local Git commits and worktrees are part of the authorized Foreman build.

Write a short implementation plan before substantial code. Prefer strict TypeScript schemas, pure functions, stable rule IDs and table-driven adversarial tests. Run npm test, npm run typecheck and npm run build once scripts exist; exercise the built CLI and adapters. Record real observed results and runtime limits. Validate the final artifact after any repair.

## Planning recovery constraints

Use one full-v1 execution phase, covering all 20 requirements and 44 scenarios, with ordered internal task checkpoints. Read docs/implementation-handoff.md before planning. This supersedes the earlier foundation-only phase decomposition, while preserving the foundation-before-adapters construction order. Build inert portable skill source under skills/; do not activate it in this development checkout. Final verification must reference real executed checks and hashed artifacts, and must exercise available local provider CLIs separately from production qualification.

## CTO execution correction — 2026-09-09

The user requires quality with timely product delivery (GEMO). Foreman has stopped; the supervising CTO now owns direct bounded parallel implementation and integration. Use Foreman for substantive checkpoint reviews, not as a mandatory dispatcher for every edit. Fix demonstrated correctness defects and required outcomes; do not block usable increments on nits, speculative refinements, or repeated tool-recovery cycles. Preserve existing Foreman history and report its state honestly. No global installation or remote publication.
