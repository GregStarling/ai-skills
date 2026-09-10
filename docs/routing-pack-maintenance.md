# Maintain the portable routing pack

The governor prepares routing knowledge; the consumer skill reads the complete `skills/delegate/` folder with native host tools. Only maintainers need this checkout, Node and evaluation dependencies.

## Evidence into a pack

1. Capture versioned metadata with `discover`, preserving source bytes, pricing basis, model identity and unknowns. Official capabilities and benchmarks help choose evaluation candidates; they do not qualify a task route.
2. Run authorized real evaluations and independent reviews. Retain actual task/fixture/harness/cohort identities, failures, costs and raw receipts. Existing `evaluate`, `refresh` and ledger commands provide those building blocks; see [the engine guide](usage-cli.md). An unreviewed objective pass must not be rewritten as accepted.
3. Supply a worker and reviewer selection envelope for each exact scope. They must share the governing policy, registry, task, risk, constraints and evaluation bucket, differing in their worker/reviewer roles. Preserve incumbents in those envelopes so paired promotion rules still apply.
4. Compile and inspect the staged JSON. The compiler uses existing qualification and selection functions. Only qualified candidates enter a worker ladder, and only qualified frontier candidates enter its verifier ladder. Cost ordering uses observed cost per accepted task, including all attempts in the evidence; it is not a claim about a user's subscription invoice.
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

`data/routing/compile-request.json` remains the empty governed-envelope example. Empty v2 packs report seven missing worker classes; `full_project` is a decomposition mode. Real bootstrap inputs are in `data/routing/host-observations.json`. After a build, `node scripts/refresh-routing-pack.mjs` compiles the scoped provisional pilot from those actual observations and source dates. It replaces the local skill pack for review; publishing remains the normal authorized Git workflow.

The pilot compiler also consumes `data/routing/installed-acceptance.json`. It joins successful cases by task class, host, model, effort and worker/reviewer role, preserving source/record/artifact/trace/receipt digests. `provisional.task_evidence.basis` identifies `installed_acceptance` or `smoke_extrapolation` for each treatment. Existing role metadata replaces description-prefix matching. A different worker's pass cannot upgrade a fallback candidate. Recovered UI evidence retains the browser artifact and assistance limits; full-project results support decomposition, never a whole-project worker route. Original smoke/source dates remain unchanged.

Library `compileRoutingPack` also has an explicit `simulation_test` mode for deterministic algorithm tests. Those packs cannot resolve production routes and must never be published as consumer authority.

## Inspect and resolve

`validate-routing-pack --input pack.json` validates shape, identities, content digest, production mode and publication timestamps against the current clock. A digest detects corruption; it is not a signature or independent proof of model performance. Authority depends on trusted compiler inputs and reviewed publication. A production pack may contain explicitly provisional treatments; `simulation_test` cannot be published or dispatched.

The maintainer `resolve-routing` command accepts `{pack,request}`. The request identifies a public class, exact `stratumDigest`, current `now`, optional `failedCandidateIds` and an explicit host inventory. It performs the same intersection described in the skill without invoking a model. The host inventory contains exact model/snapshot/effort/serving treatments, effective tools and capabilities, context capacity and fresh-context support. Unknown requirements cannot be treated as supported.

The exact host fields are `host: "claude" | "codex"`, `treatments: [{provider, model_id, snapshot_id, effort, serving}]`, `tools`, `capabilities`, `context_window_tokens` and `supports_fresh_context`. Capture these from the active host. Provisional snapshots may be null, with explicit configured-versus-observed identity limits. The consumer follows these rules without running the command.

`routing_pack` policy controls seven-day refresh and thirty-day pack expiry separately from `binding`. Every treatment also has an expiry bounded by its evidence/source dates; one old treatment does not disable newer entries. Republishing cannot renew evidence. A host may skip unavailable or failed treatments within eligible compiled ladders. Qualified treatments precede matching provisional installed acceptance, which precedes smoke extrapolation; retained qualified incumbents still respect promotion rules. Economics apply within each level. Qualified evidence supplies measured cost per accepted task. Provisional evidence currently supplies advertised prices or unknown cost, never a fabricated measured task cost. Token-price ordering applies only when input and output price order agree within the evidence level; otherwise maintainer order remains stable. Compiler and resolver enforce the same preference, including when resolving an older price-first pack.

The portable skill's eight labels do not broaden the governor's current two evaluation classes. A `bounded_backend` stratum can be labeled `bounded_implementation`, but remains valid only for its compiled backend scope. Other domains need their own human policy and real task evidence.

## Provisional admission and receipts

`compile-routing-pack` also accepts `provisional`, an array validated by the exported `provisionalRouteInputSchema`. Each entry supplies class, explicit scope, low/medium risk, tools/capabilities/context requirements, worker treatments and frontier reviewer treatments. An optional `qualifiedStratumDigest` attaches provisional alternatives to a governed stratum with matching risk/requirements and provider constraints.

Each treatment requires official availability/pricing citations with dates, an actual accepted host-smoke artifact and execution/review digests, host/version, requested configuration, observed identity/effort or explicit limitations, and no known disqualifying failure. Unknown subscription cost remains unknown. Unsupported effort uses `not_applicable`; unobserved served effort is null alongside its reproducible configured value/source. A successful smoke is deliberately weaker evidence than full qualification. Scope extrapolation remains explicit and must be challenged by installed-host acceptance.

Missing full evidence (`HOLD`) can bootstrap; an actual rejection in the same scope and lane cannot be relabeled provisional. Existing qualified thresholds and production identity/cost checks are unchanged. Provisional records are never silently counted as qualified.

Consumers write `delegate_receipt.v1` files using native file tools. Maintainers use `receipt-ingest` to archive exact versions in the existing append-only ledger, then `receipt-assess` to validate independent task, attempt, artifact and review evidence. Validated records feed the existing `refresh` command through `evaluationLedgers`; qualification and same-task paired promotion remain unchanged. Unassessed records grant no authority. See [production receipt ingestion](production-receipts.md). No central service or automatic upload is required.

## Current-frontier refresh checkpoint

Every maintainer refresh starts with fetched official model documentation. Record each provider's current generally available frontier in `data/routing/frontier-targets.json`, including model/effort, source URL, observation date and source-byte digest. The targets are discovered metadata, not model IDs in constitution policy.

Run `npm run build`, then `node scripts/probe-frontiers.mjs`. It invokes those exact models through existing authenticated Claude/Codex CLIs in disposable read-only fixtures and preserves raw traces under `artifacts/frontier-probes/`. The checked-in `data/routing/frontier-probes.json` records attempted controls, CLI versions, actual completion/error, observed identities and unavailable/unknown reasons. CLI observations do not establish native Agent-tool availability; that surface is marked separately. Error-envelope identities such as Claude's `<synthetic>` are not served model observations or routing authority.

An available model must complete a task evaluation and independent maintainer review. The probe runs a diagnostic fixture and initially records `pending_review`; inspect the actual file/test execution and diagnosis, then record `passed` or `failed` with the review artifact digest. A successful process or greeting alone cannot satisfy this checkpoint. Evaluation success still does not automatically qualify or promote a model; route evidence and economics apply. Preserve the original trace and review artifact.

The pilot refresh script refuses missing, changed-target, future-dated or older-than-seven-day frontier discovery/probe records, and available models with unreviewed evaluations. Unavailable or indeterminate models retain their observed reason while eligible evidenced reviewers remain usable. These are publication preconditions for the maintainer refresh, not a new consumer runtime dependency or a shorter pack lifetime. The low-level compiler remains usable independently for governed envelopes and algorithm tests.

On September 10, 2026, actual probes of [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra) and [Claude Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview) were rejected by Codex CLI 0.142.5 and Claude Code 2.1.222 respectively because newer clients are required. The Claude response names 2.1.251 as its minimum; the Codex response gives no minimum version. The existing GPT5.5/high and Opus5/high reviewers are therefore deliberately retained for these tested CLI routes. See the exact [probe record](../data/routing/frontier-probes.json). No global host update was performed.
