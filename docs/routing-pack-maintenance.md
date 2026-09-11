# Maintain the portable routing pack

The governor prepares routing knowledge; the consumer skill reads the complete `skills/delegate/` folder with native host tools. Only maintainers need this checkout, Node and evaluation dependencies.

## Evidence into a pack

1. Capture versioned metadata with `discover`, preserving source bytes, pricing basis, model identity and unknowns. Official capabilities and benchmarks help choose evaluation candidates; they do not qualify a task route.
2. Run authorized real evaluations and independent reviews. Retain actual task/fixture/harness/cohort identities, failures, costs and raw receipts. Existing `evaluate`, `refresh` and ledger commands provide those building blocks; see [the engine guide](usage-cli.md). An unreviewed objective pass must not be rewritten as accepted.
3. Supply a worker and reviewer selection envelope for each exact scope. They must share the governing policy, registry, task, risk, constraints and evaluation bucket, differing in their worker/reviewer roles. Preserve incumbents in those envelopes so paired promotion rules still apply.
4. Compile and inspect the staged JSON. The compiler uses existing qualification and selection functions. Qualified lanes require capability-qualified, economically eligible candidates and frontier reviewers. V4 economic ordering uses separately sourced API-equivalent task costs, comparable API-price proxies or explicit maintainer order. Unknown billed dollars do not block capability; API execution does not qualify a subscription-host treatment. See [v4 economics](v4-economics.md).
5. Review the pack diff and update `skills/delegate/routing-pack.json` through the authorized Git release workflow. Users receive the pack when they update the whole folder. Do not alter global skills/configuration as part of compilation.

`refresh` may stage native bindings as part of its existing engine workflow; pack publication does not require applying those bindings. Feed its returned `selection` envelope into compilation. Missing controls/evidence remain gaps, not an excuse to activate a weaker policy.

## Compile command

After `npm run build`, `node dist/cli/index.js compile-routing-pack --input request.json` accepts:

```text
{
  policyFile?: "policy/constitution.json",
  output?: "artifacts/next-routing-pack.json",
  strata: [{
    publicTaskClass: "bounded_implementation",
    workerSelection: <governed selection envelope>,
    reviewerSelection: <governed selection envelope>
  }]
}
```

Selection envelopes are actual versioned policy/registry/candidates/observations/request data, plus source bytes and runtime reports. The compiler applies frontier eligibility before governed reviewer selection, retaining eligible incumbent decisions; a non-frontier incumbent requires explicit escalation. Refresh's text or base64 source encoding is retained losslessly. Do not invent IDs or use an adapter-test envelope in production.

The CLI loads current policy and compiles in production mode using the current clock. It does not invoke models. If `output` is supplied, the destination must be a new staging file; existing files and global skill/config locations are refused. Otherwise the result includes the complete pack on stdout. `COMPILED` means compilation succeeded, not that every class has an eligible route.

`data/routing/compile-request.json` remains the empty governed-envelope example. Empty packs report seven missing worker classes; `full_project` is a decomposition mode. Real bootstrap inputs are in `data/routing/host-observations.json`. After a build, `node scripts/refresh-routing-pack.mjs` compiles the scoped provisional pilot from those actual observations and source dates. It replaces the local skill pack for review; publishing remains the normal authorized Git workflow. Wire format `routing_pack.v3` factors treatment metadata once; route entries retain specific evidence and ordering. Old packs fail with explicit recompile/reinstall guidance. Update the complete folder, including `pack-format.md`.

The pilot compiler also consumes `data/routing/installed-acceptance.json`. It joins successful cases by task class, host, model, effort and worker/reviewer role, preserving source/record/artifact/trace/receipt digests. `provisional.task_evidence.basis` identifies `installed_acceptance` or `smoke_extrapolation` for each treatment. Existing role metadata replaces description-prefix matching. A different worker's pass cannot upgrade a fallback candidate. Recovered UI evidence retains the browser artifact and assistance limits; full-project results support decomposition, never a whole-project worker route. Original smoke/source dates remain unchanged.

Library `compileRoutingPack` also has an explicit `simulation_test` mode for deterministic algorithm tests. Those packs cannot resolve production routes and must never be published as consumer authority.

## Inspect and resolve

`validate-routing-pack --input pack.json` validates shape, identities, content digest, production mode and publication timestamps against the current clock. A digest detects corruption; it is not a signature or independent proof of model performance. Authority depends on trusted compiler inputs and reviewed publication. A production pack may contain explicitly provisional treatments; `simulation_test` cannot be published or dispatched.

The maintainer `resolve-routing` command accepts `{pack,request}`. The request identifies a public class, exact `stratumDigest`, current `now`, optional `failedCandidateIds` and an explicit host inventory. It performs the same intersection described in the skill without invoking a model. The host inventory contains exact model/snapshot/effort/serving treatments, effective tools and capabilities, context capacity and fresh-context support. Unknown requirements cannot be treated as supported.

The exact host fields are `host: "claude" | "codex"`, `treatments: [{provider, model_id, snapshot_id, effort, serving}]`, `tools`, `capabilities`, `context_window_tokens` and `supports_fresh_context`. Capture these from the active host. Provisional snapshots may be null, with explicit configured-versus-observed identity limits. The consumer follows these rules without running the command.

`routing_pack` policy controls seven-day refresh and thirty-day pack expiry separately from `binding`. Every treatment also has an expiry bounded by its evidence/source dates; one old treatment does not disable newer entries. Republishing cannot renew evidence. A host may skip unavailable or failed treatments within eligible compiled ladders. Qualified treatments precede matching provisional installed acceptance, which precedes smoke extrapolation; retained qualified incumbents still respect promotion rules. Economics apply within each level. Measured API-equivalent task costs are preferred when comparable; otherwise non-crossing official API prices or explicit maintainer order apply. Unknown task economics remain unknown, even when capability qualifies. Compiler and resolver enforce the same preference.

The portable skill's eight labels do not broaden the governor's current two evaluation classes. A `bounded_backend` stratum can be labeled `bounded_implementation`, but remains valid only for its compiled backend scope. Other domains need their own human policy and real task evidence.

## Provisional admission and receipts

`compile-routing-pack` also accepts `provisional`, an array validated by the exported `provisionalRouteInputSchema`. Each entry supplies class, explicit scope, low/medium risk, tools/capabilities/context requirements, worker treatments and frontier reviewer treatments. An optional `qualifiedStratumDigest` attaches provisional alternatives to a governed stratum with matching risk/requirements and provider constraints.

Each treatment requires official availability/pricing citations with dates, an actual accepted host-smoke artifact and execution/review digests, host/version, requested configuration, observed identity/effort or explicit limitations, and no known disqualifying failure. Unknown subscription cost remains unknown. Unsupported effort uses `not_applicable`; unobserved served effort is null alongside its reproducible configured value/source. A successful smoke is deliberately weaker evidence than full qualification. Scope extrapolation remains explicit and must be challenged by installed-host acceptance.

Missing full evidence (`HOLD`) can bootstrap; an actual rejection in the same scope and lane cannot be relabeled provisional. V4 preserves capability thresholds and exact identity/host checks, moving dollar ceilings to economic selection. Provisional records are never silently counted as qualified. The separately audited Claude quantity smoke supports one narrow medium-risk mechanical stratum, with distinct worker/reviewer models and a fresh artifact-only reviewer process; it does not expand other task scopes.

The packaged helper (`skills/delegate/scripts/local-learning.mjs`, called through its `record` command) writes `delegate_receipt.v2` files locally; `delegate_receipt.v1` remains the maintainer-ingestible shape, and older v1 receipts stay importable. Maintainers use `receipt-ingest` to archive exact versions in the existing append-only ledger, then `receipt-assess` to validate independent task, attempt, artifact and review evidence. Validated records feed the existing `refresh` command through `evaluationLedgers`; qualification and same-task paired promotion remain unchanged. Unassessed records grant no authority. See [production receipt ingestion](production-receipts.md). No central service or automatic upload is required.

## Current-frontier refresh checkpoint

Every maintainer refresh starts with fetched official model documentation. Record each provider's current generally available frontier in `data/routing/frontier-targets.json`, including model/effort, source URL, observation date and source-byte digest. The targets are discovered metadata, not model IDs in constitution policy.

Run `npm run build`, then `node scripts/probe-frontiers.mjs`. It invokes those exact models through existing authenticated Claude/Codex CLIs in disposable read-only fixtures and preserves raw traces under `artifacts/frontier-probes/`. The checked-in `data/routing/frontier-probes.json` records attempted controls, CLI versions, actual completion/error, observed identities and unavailable/unknown reasons. CLI observations do not establish native Agent-tool availability; that surface is marked separately. Error-envelope identities such as Claude's `<synthetic>` are not served model observations or routing authority.

An available model must complete a task evaluation and independent maintainer review. The probe runs a diagnostic fixture and initially records `pending_review`; inspect the actual file/test execution and diagnosis, then record `passed` or `failed` with the review artifact digest. A successful process or greeting alone cannot satisfy this checkpoint. Evaluation success still does not automatically qualify or promote a model; route evidence and economics apply. Preserve the original trace and review artifact.

The pilot refresh script refuses missing, changed-target, future-dated or older-than-seven-day frontier discovery/probe records, and available models with unreviewed evaluations. Unavailable or indeterminate models retain their observed reason while eligible evidenced reviewers remain usable. These are publication preconditions for the maintainer refresh, not a new consumer runtime dependency or a shorter pack lifetime. The low-level compiler remains usable independently for governed envelopes and algorithm tests.

On September 10, 2026, actual probes of [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) and [Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview) were rejected by Codex CLI 0.142.5 and Claude Code 2.1.222 respectively because newer clients are required. The Claude response names 2.1.251 as its minimum; the Codex response gives no minimum version. The existing GPT5.5/high and Opus5/high reviewers are therefore deliberately retained for these tested CLI routes. That rejection record was later overwritten in place by the upgraded-client probe; the upgraded-client history is in [v5 host evidence](v5-host-evidence.md) and the preserved pre-v5 upgraded-host report is [`frontier-probes-pre-v5.json`](../data/routing/frontier-probes-pre-v5.json). No global host update was performed.

Later on 2026-09-10 the current [`data/routing/frontier-probes.json`](../data/routing/frontier-probes.json) (`frontier_probes.v2`, same `targets_digest`) records both frontiers as `available` on codex-cli 0.154.0 and Claude Code 2.1.267, attempted at 07:19:54Z, with `evaluation.status` `passed` under the fresh independent Opus 5 / high review bound in `data/routing/frontier-probe-reviews.json` (review digest `sha256:392f983b…`). Derived assurance is `CONFIGURATION_ATTESTED` for Astra and `PARTIALLY_RUNTIME_ATTESTED` for Fable. Fable and Astra are deliberately not admitted as workers or reviewers: their reviewer executions predate the complete environment capture and stay `not_admitted` in `data/routing/frontier-reviewer-evaluations.json`, and the calibration runs in [delegate usability results](delegate-usability-results.md) carry no qualification authority. GPT-5.5/high and Opus 5/high remain the published reviewer lanes.

## Refresh runbook

Windows from `policy/constitution.json` `routing_pack`: `refresh_after_days` 7 (frontier preflight), `provisional_evidence_max_age_days` 30 (entry evidence), `hard_expiry_days` 30 (pack). Each provisional entry expires 30 days after the earliest of its smoke `observed_at`, `availability.checked_at`, `pricing.checked_at` and every joined acceptance record's `observed_at`, so citation dates and acceptance record dates both bound entry expiry. A recompile is free only while `data/routing/frontier-targets.json` is younger than 7 days: it was checked at 2026-09-10T04:09:41.232Z, so until 2026-09-17T04:09:41.232Z. `scripts/probe-frontiers.mjs` overwrites `data/routing/frontier-probes.json` and `data/routing/frontier-identity-evidence.json` in place (it also copies them under `artifacts/frontier-probes/<timestamp>/`), so archive both byte-identical before any re-probe (precedent: `frontier-probes-pre-v5.json` and `v5-frontier-history.json`).

Steps in order; every launched model execution counts, including failed launches and repairs.

| Step | Model executions |
| --- | --- |
| 1. Refetch official model docs; rewrite `data/routing/frontier-targets.json` with model/effort, source URL, `checked_at` and source-byte digest | free |
| 2. Archive `frontier-probes.json` and `frontier-identity-evidence.json` byte-identical with a digest record | free |
| 3. `npm run build && node scripts/probe-frontiers.mjs` | 2 (one per frontier) |
| 4. `node scripts/review-frontier-probes.mjs <artifactRoot>` with the `artifacts/frontier-probes/<timestamp>` path printed by step 3 | 1 (fresh independent reviewer) |
| 5. Hand-edit `data/routing/frontier-probes.json`: set each probe's `evaluation.status` to `passed` or `failed` and `evaluation.review_digest` to the review artifact digest | free |
| 6. Hand-write `data/routing/frontier-probe-reviews.json` binding the diagnosis, probe trace, fixture, review manifest, review request and reviewer trace digests | free |
| 7. Smoke re-observation of the six treatments: `node scripts/verify/host-evidence.mjs` runs `codex`, `codex-standard`, `claude` and `claude-haiku` (each a worker plus a fresh reviewer) into `artifacts/portable-host-evidence/<host>-<timestamp>/result.json`; assemble those into a new `data/routing/host-observations.json` | 8 (4 worker runs + 4 fresh reviews) |
| 8. Refresh the six treatments' `availability` and `pricing` citations (`url`, `checked_at`) in the new `host-observations.json` | free, manual, required: those `checked_at` values bound entry expiry |
| 9. Derive `data/routing/medium-smoke-audit.json` from the two Claude runs' reviewer executions in step 7 with the unchanged literal scope | 0; the `MEDIUM_SMOKE_RUN_MISMATCH` binding requires exactly those executions |
| 10. Installed acceptance re-run: `node scripts/verify/installed-delegate.mjs` into a new `data/routing/installed-acceptance.json` | about 28 to 42 |
| 11. `node scripts/refresh-routing-pack.mjs`, then `npm test`, `npm run typecheck`, `node scripts/verify/skills.mjs` and the CI pack validation heredoc | free |

Steps 3 to 6 are the preflight (3 executions); steps 7 to 9 are the smoke renewal (8); step 10 is the acceptance renewal.

## Renewal

Renewal decision (2026-09-10): pending, due 2026-10-02. Phrased against the published pack (`content_digest` `sha256:e65c17c8…`, `generated_at` 2026-09-10T07:25:11.453Z, `refresh_after` 2026-09-17T07:25:11.453Z, `expires_at` 2026-10-10T07:25:11.453Z; route entries expire 2026-10-10T02:07:24.124Z to 02:19:56.560Z):

- (a) Lapse, 0 executions: route entries expire 2026-10-10T02:07:24Z to 02:19:56Z, `lookup` returns gaps for every route from then, and CI publication validation fails from the published pack's own `expires_at` (its `generated_at` plus 30 days) until a renewal lands.
- (b) Smoke-only renewal, 11 executions: 3 preflight (steps 3 and 4) plus 8 smoke (step 7). The medium audit is derived free from the fresh Claude smoke reviewer executions, never a rebinding of the September reviews.
- (c) Full renewal, about 39 to 53 executions: (b) plus the installed acceptance re-run (step 10).

Under (b) and (c) stale acceptance records are demoted to `smoke_extrapolation` at compile time by a rule to be added in M5.2 of [the completion plan](delegate-completion-plan.md).

## 2026-09-11 counted full renewal

Full renewal was approved and executed under [the completion authorization](delegate-completion-authorization-2026-09-11.md). The earlier commands and captures above describe their original generation. Use [the new results](delegate-renewal-results.md) and [current status](validation-status.md) for this publication: 101/130 attempts, 11/14 installed cases accepted, 3 incomplete cases retained and excluded. Eight original inputs moved byte-identically to data/routing/archive/2026-09-10/ before fresh canonical inputs were staged.

For future renewals, authorize a new execution ceiling first; never reuse this campaign ledger or overwrite raw captures. Reserve every model execution through campaign-budget.mjs before launch and settle from preserved evidence, counting failed launches. Renewal-campaign.mjs supplies isolated learning state, sanitized host environment, a trace-bound final inspection request and the installed case cap. Run full-project cases serially when necessary to respect the three-worker limit. Preserve matched receipts and inspect actual final source; UI acceptance also requires actual rendered inspection. Missing evidence withholds a case instead of relabeling it a pass.

Assemble fresh treatment and acceptance files with assemble-evidence.mjs; derive the medium audit from the fresh Claude smoke reviews, retaining its exact quantity-default scope. Stage fresh three-case reviewer calibrations with stage-calibration.mjs and its named eight-execution ledger. Admission is only mechanical_work/low and follows the incumbent; never manufacture a new worker observation. Recompile with node scripts/refresh-routing-pack.mjs, update validation-status.md to the exact pack and folder digests, then run npm test, npm run typecheck, npm run build, node scripts/verify/skills.mjs and the CI publication heredoc. Do not use --allow-short-entries for an ordinary renewal. Preserve dated reports and publish the complete consumer folder together.

No evidence supports delegation for either M4 TypeScript shape, so M5.5/M5.6 and the conditional v4 bump were skipped. Renewal is scoped provisional evidence, not qualification or measured savings.
