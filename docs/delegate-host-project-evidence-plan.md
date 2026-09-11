> This earlier pilot plan is historical for receipt collection. The current local feedback and reminder lifecycle is specified in [local learning](../skills/delegate/local-learning.md); new tasks use helper-generated v2 records. Historical pilot results below retain their original scope and versions.

# Delegate usability and provisional evidence plan

Status: the evidence increment was approved and completed on 2026-09-10; actual results are recorded in [delegate-usability-results.md](delegate-usability-results.md). The consumer contract was subsequently updated on the same date as described below. The recorded pilots and their budgets remain historical evidence, not new validation of the updated contract.

## Current consumer contract

The approved [Delegate skill](../skills/delegate/SKILL.md) and [repository guidance](../AGENTS.md) now require:

1. Complete small work directly when a handoff adds more effort.
2. Delegate substantial bounded work when it improves total efficiency.
3. Spend stronger reasoning on ambiguity and consequential decisions.
4. Preserve relevant tests, visual checks and required independent review.
5. Include coordination, failed attempts and repairs when judging efficiency.
6. Stop when the requested quality is achieved.

This supersedes mandatory worker dispatch for every task size. Direct execution uses ordinary host/project checks and makes no pack-qualification claim. Explicit requests for workers or strict pack governance still apply. Worker-first repair remains the rule for work already delegated; it does not require a worker for a task selected for direct execution. The v5 qualification thresholds, evidence boundaries, risk floors and delegated review controls are unchanged.

The installed-skill pilots below explicitly require workers because their purpose is to prove worker edit access, frontier review and receipt capture. They are not the default execution contract for ordinary small tasks.

## Deliver this increment

Improve delegation practices with writable implementation workers, concise context guidance, accurate host facts, scoped provisional reviewer evidence where admissible, and an original receipt preserved for later assessment. This increment proves installed-skill execution on an in-scope JavaScript fixture; it does not establish general everyday TypeScript capability in `ebay-lego`.

Quality and successful completion come first. Measure elapsed time and observable usage across the workflow without making token reduction the goal. Keep v5 architecture, qualification thresholds, economics, risk floors and reviewer independence unchanged. Preserve worker-first repair for delegated work, subject to the current direct-versus-delegated contract above. Existing authority stays in [identity assurance](v5-identity-assurance.md), [pack lookup](../skills/delegate/pack-format.md), and [receipt assessment](production-receipts.md); this plan does not redefine it.

The baseline pack at commit `0d27fde59f9f1bd7634571b5c84e26ac3015d91d` has 15 provisional routes and zero qualified routes. Fable/Astra diagnostic probes are not reviewer qualification. Full qualification and accepted production-evidence assessment are a separately budgeted follow-on, not release gates for this increment.

## 1. Worker edit access and context guidance first

**Project instructions: applied locally; actual worker execution still needs proof.**

`ebay-lego/CLAUDE.md` now permits implementation subagents to create and edit assigned application code, tests, and documentation and run relevant checks without asking again for already-authorized work. The coordinator owns integration, final acceptance, and shared PRD tracking. Research/review packets can remain read-only. The new project `AGENTS.md` tells Codex to read the same CLAUDE.md.

Before a trial, reconcile the intended instruction changes with the project's dirty checkout, carry the reviewed instructions into an isolated checkout, then record the exact starting tree and instruction bytes. HEAD alone does not contain the local edits. Preserve unrelated work; do not copy or commit the entire dirty tree.

**Skill change: one reference and one link.**

Add `skills/delegate/context-discipline.md` and one short link at the relevant step in SKILL.md. Keep SKILL.md's current compact, progressive-loading structure. Reuse the [worker contract](../skills/delegate/delegation-contract.md) and [verification policy](../skills/delegate/verification-policy.md); do not repeat their packet, ownership, repair, or artifact-inspection rules.

Limit the new reference to:

- **Boundary handoffs:** start fresh at meaningful delivery boundaries, carrying objectives, decisions, constraints, checkout/change state, evidence locations, and remaining work. Keep coherent investigations together when a restart would cause rediscovery. A full-history fork is not a compact handoff.
- **Targeted inspection:** prefer bounded reads and text/DOM inspection for structural questions. Use screenshots for visual judgments and avoid redundant captures. Keep full evidence accessible by reference. Saving or deleting an image file does not establish its removal from context.
- **When exploration earns a worker:** delegate substantial bounded investigations when noise isolation, parallelism, or model economics justify the overhead. Return findings, exact sources, and uncertainties. A single targeted search need not spawn an agent; select the underlying task's work shape under the current consumer contract. Apply the worker-and-verifier contract only when delegation is selected or explicitly required.

Use existing admissible routes for exploratory or visual workers. Do not introduce new task classes to support the guidance. A worker summary cannot replace the frontier's inspection of the evidence needed for acceptance.

**Gate:** shared instructions permit implementation edits, the isolated baseline includes them, and the skill adds focused guidance without duplicating existing references.

## 2. Record host controls as evidence, not a plumbing project

Create one concise maintainer document covering Claude Code Agent, Claude CLI, Codex native subagents, and Codex CLI. Record available model/alias controls, effort controls, context inheritance, write permissions, and observable usage, with dates, host versions where exposed, and raw schema/capture references.

The reported Claude Agent schema exposes a `fable` alias and no effort control. Preserve the actual schema before treating that as a verified host fact. An alias being selectable does not establish its resolution or reviewer eligibility. Reuse the [Claude guide's](../skills/delegate/hosts/claude-code.md) authenticated CLI fallback when the selected effort cannot be expressed. Follow the actual [Codex controls](../skills/delegate/hosts/codex.md) separately; CLI success does not prove native Agent availability.

Both current CLI probes record `native_agent_status: not_probed`. Capture the actual native schema and record only the selectability it demonstrates. Update native-agent status only with preserved native evidence supporting that value; alias selectability does not prove exact model resolution, expressible effort, or reviewer admission. A CLI probe cannot supply this missing native fact.

Reuse preserved valid captures and existing validators. Requested, configured, and observed settings stay distinct. Host inventory requires documentation by default; host plumbing changes need a reproduced defect. The bounded calibration-script change in section 4 is explicitly in scope. No new host abstraction, global configuration change, or client upgrade.

**Gate:** each intended treatment has a supported dispatch path or a precise limitation. Record missing telemetry as unavailable and move on; prose cannot manufacture assurance.

## 3. Prove installed-skill edits, then capture a pending receipt

**Pilot choice: a local JavaScript fixture through the installed skill.** Run the same suitable bounded fixture once per host in an isolated `ebay-lego` checkout containing the reconciled instructions. Use the exact updated skill folder, explicit ownership, an existing in-scope worker, and an existing eligible verifier. These pilots precede calibration and do not depend on Fable/Astra admission.

This proves skill invocation, actual worker edit access, verification, and receipt capture. It does not prove TypeScript or broader application capability. A real TypeScript task belongs to a separately scoped maintainer qualification evaluation; do not dispatch it through a JavaScript-only route.

Record checks against the exact trial baseline before dispatch: command, exit status, output, and source digest. The review reports three current dirty-tree typecheck errors; treat that as a reported baseline issue, not a fresh result for the isolated checkout. Run its baseline typecheck and retain any failures without repairing unrelated work. Choose a fixture with green existing checks, and separately label any intentional failing reproduction. Afterward compare the same checks to distinguish worker regressions from baseline failures.

Verify worker-written files, executed assertions, eligible frontier acceptance, and model/effort/fallback facts. The coordinator does not make the worker's edits to manufacture a pass. Use local artifacts or emulators; project permissions do not lower risk floors for pricing, purchases, authorization, or user data.

Preserve both receipts and import at least one original through `receipt-ingest` using [production-receipts.md](production-receipts.md). Use a new run directory under `artifacts/delegate-usability/` in this repository, or an explicitly recorded private store. Historical `artifacts/receipt-ingestion/status.json` references the former `claude-commands` path; do not reuse that path as an active destination or rewrite historical receipts. Record the importer’s returned directory and record ID in the new run manifest.

Label deliberate fixtures `qualification_evaluation`. Preserve stable task IDs, starting digests, all attempts, checks, and raw source references. Keep sensitive originals private; sanitized artifacts receive distinct provenance and digests.

**Expected evidence status: `PENDING_EVIDENCE`.** Provisional frontier acceptance of the task does not satisfy accepted governor assessment, which requires an independently qualified reviewer. Record that specific gap. Existing tests cover pending/rejection behavior; do not spend extra live runs to re-prove it.

**Gate:** report actual write/verification outcomes for both hosts and archive at least one original receipt. Explicitly label blocked hosts, baseline failures, and the limited JavaScript scope. Do not call the pilot proof of everyday TypeScript delegation.

## 4. Calibrate reviewers and gate provisional admission

Target Fable on Claude Code and Astra on Codex as exact host/model/effort treatments within a declared scope. Confirm current official metadata and availability; no silent model substitutions.

**Reuse probes only while the refresh preflight accepts them.** Current v2 CLI probes are available, independently reviewed, and passed on September 10. The seven-day check in `src/routing/frontier-refresh.ts` covers discovery, official-source check times, and probe times. The earliest current cutoff is September 17, 2026 at 04:09:41.232 UTC; the probe timestamps alone expire later that morning. Re-evaluate freshness against the actual publication clock rather than assuming the entire calendar day is valid.

If required, refresh metadata and re-probe using `scripts/probe-frontiers.mjs`, then obtain its independent frontier review using `scripts/review-frontier-probes.mjs`. Count both executions. Changed target metadata can invalidate a prior probe even before its time limit. Reuse valid evidence; never edit timestamps to extend it.

**Allow the small fixture-runner change.** `scripts/evaluate-frontier-reviewers.mjs` currently hardcodes one corrected artifact and prompt. Extend it to take a bounded fixture manifest with stable IDs, artifact/check references, review requirements, and predetermined expected verdicts. Keep expected verdicts and hidden grader material outside reviewer prompts. Preserve raw captures and historical reports using the existing machinery; no new governor schema is required.

For each host, execute:

1. **Positive admission case:** one worker creates the intended correct artifact; objective checks must pass. The new reviewer independently inspects it and returns ACCEPT. Preserve matching host, model, configured effort, artifact, and worker/reviewer stdout digests.
2. **Defective case:** the reviewer inspects a deterministic defective artifact with a known expected REPAIR verdict.
3. **Edge case:** the reviewer inspects an independently graded boundary case with an expected verdict fixed before execution.

The positive case costs two executions; the other cases cost one each. Prepare defective/edge artifacts deterministically, not with extra unbudgeted model calls.

**Maintainer admission gate:** all three reviewer verdicts must match their independent oracles, with valid captures and unchanged reviewed artifacts. A wrong verdict, missing case, timeout, or inadmissible capture blocks this target's admission. Do not retry until a lucky pass replaces the failure.

This gate must be checked by the calibration script and explicitly enforced by the maintainer before staging publication. `buildProvisionalPilotRoutes` in `src/routing/acceptance.ts` currently admits from an objectively passed worker run and matching reviewer ACCEPT; it does not consult negative/edge calibration results. Keep those results in the calibration report, and do not describe the compiler as enforcing this new maintainer check.

Only after that gate passes, stage the positive run and treatment evidence in the existing host-observations shape used by `data/routing/host-observations.json`. A standalone reviewer report alone is not admission input. Preserve failed calibration evidence separately; never encode defective cases as successful worker observations. Validate staged scope, evidence digests, existing routes, and medium-smoke audit source bindings before publication.

**Gate:** each target is either provisionally admitted for supported scope or explicitly unadmitted with a reason. Preserve existing eligible reviewers. Calibration is neither full qualification nor authority for other efforts or broader task classes.

## Execution budget

Ceilings count every fresh model invocation, including pilot coordinators, nested workers/reviewers, repairs, failed launches, and independent probe reviews. Count a reused execution once; script invocations are not a substitute for counting their model calls.

| Work | Ceiling |
| --- | --- |
| Calibration with valid probes reused | 4 executions per host; 8 total |
| Re-probe plus independent review, only when required | Up to 2 additional executions per affected host |
| Installed-skill pilots, including coordinator/worker/reviewer/repair calls | 6 executions across both hosts |
| Each bounded execution | 240 seconds maximum; retain stricter existing probe/review limits |
| Manual results-table assembly | 30 minutes |

The total ceiling is 14 executions with probes reused, 16 if one host needs a probe/review pair, or 18 if both do: at most 56, 64, or 72 aggregate execution-minutes respectively. These are conservative ceilings, not subscription-credit estimates. The current probe-review script can review both hosts in one execution; count that shared review once when used.

No automatic calibration reruns. Keep repairs worker-first within the pilot allowance. If required work cannot fit, retain the evidence and report the unmet gate rather than silently borrowing another budget or dropping a required calibration case. Check capacity before a batch; do not purchase credits, consume resets, or launch the full qualification campaign.

## 5. Assemble one small results table and finish

Hand-assemble one table from the captured receipts, checks, and timing. Include task/host, worker and verifier settings, acceptance or defects, repair outcome, elapsed time, and observable usage. Mark missing coordinator or child usage explicitly.

Native CLI token counters can be useful; they do not necessarily establish attributable subscription consumption. Preserve cached/uncached/output distinctions where exposed. Shared-account usage deltas, screenshot counts, and transcript size do not establish per-task billing.

Note concrete context problems encountered: redundant reads/captures, missing facts in summaries, or rediscovery after a handoff. Use natural opportunities within the pilots; do not dispatch extra agents just to collect metrics. If the sample supports no savings conclusion, say so. No reporting pipeline or telemetry-schema expansion.

**Gate:** the table reports actual results and limitations within the time box. Preserve visual acceptance quality and worker-first repair. Defer a watcher until observed active-context growth justifies a separate proposal; do not adopt arbitrary 150K/250K alarms or promise percentage savings.

## Validation and completion

Run the existing repository sequence after implementation: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, `node scripts/verify/skills.mjs`, and the routing-pack publication check in `.github/workflows/ci.yml`. Cover the fixture runner and maintainer gate with focused offline regression checks: a valid positive case plus a wrong defective/edge verdict must block staging; missing cases or unresolved evidence must also block. Reuse existing compiler/receipt tests rather than duplicating them. Validate any changed pack against its evidence and current clock. Report executed checks accurately; do not rewrite historical validation reports.

Deliver the short skill reference/link, shared project edit contract, host evidence document, calibration/admission results, two host pilot outcomes, one imported pending receipt, and the manual results table. Keep raw evidence available through appropriate private/local storage. Global installation remains separate; if publishing repository changes, require green CI.

The instruction/reference improvement can be delivered even if a new frontier remains unadmitted. Report partial host acceptance explicitly. Stop when the applicable gates pass and no material defect remains; do not expand the release to justify more infrastructure.

## Separately budgeted follow-on

Full reviewer qualification requires at least 20 independent oracle-graded matching tasks for each exact treatment and stratum, plus every existing quality, identity, latency, and freshness requirement. Failures or inadmissible observations may require more runs; 20 executions is not a guaranteed pass.

Before that program begins, name the target hosts, reviewers, efforts, classes/strata, fixture coverage, and numerical execution budget. Only after suitable qualified reviewer evidence exists should accepted receipts proceed through assessment, refresh, selection, and staged compilation. Start project evidence with a real small TypeScript task through the maintainer harness, with a recorded green scoped baseline and an explicit evaluation scope. It remains a qualification evaluation, not an installed-skill dispatch through an unsupported route. Broader worker qualification and paired challenger promotion retain their own requirements.

This follow-on is not a prerequisite for delivering the context and edit-access improvements, and is not included in the execution budget above.

## Approved commit and publication plan

Use separate branches from current remote main: `codex/delegate-usability` for
this repository and `codex/delegate-worker-permissions` for the private project.
Reconstruct only the project subagent-strategy hunk, AGENTS.md pointer, and its
implementation-subagent lesson. Never copy unrelated working-tree changes.

The installed-trial harness must accept an isolated project and fixture directory,
preserve the real instruction files byte-for-byte, and refuse existing fixtures.
Use the mechanical rename fixture with green behavior-only baseline assertions;
record its expected failing new-name acceptance separately.

Create one project commit, `Allow implementation subagents to edit assigned files`.
In ai-skills, use three logical commits for context guidance/plan, harnesses/tests,
and observed pilot/calibration results. Exclude installs, private traces, generated
build output, and unrelated files. Publish only appropriate evidence metadata.

Open one PR per repository, require current CI, squash-merge the project PR, and
verify its expected deployed commit, 3600-second timeout, cron tag, post-deploy
checks, signed-in smoke, login, and protected redirect. Then merge ai-skills and
verify main CI and published skill integrity. Preserve a failed trial or admission
as failed; full qualification and global installation remain out of scope.

Baseline failures are distinguished from introduced failures. Fix introduced
failures; leave a PR unmerged if unrelated failures prevent required CI. Keep the
original checkouts and indexes intact and report merged counterparts of their
local task-owned changes. Report both PRs, merged SHAs, CI/deployment proof, actual
pilot outcomes, and admission decisions. No other repositories are in scope.
