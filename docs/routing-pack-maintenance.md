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

Selection envelopes are actual versioned policy/registry/candidates/observations/request data, plus source bytes and runtime reports. Shortlist frontier candidates for the reviewer selection: a governed decision selecting a non-frontier reviewer cannot authorize a frontier substitute. Refresh's text or base64 source encoding is retained losslessly. Do not invent IDs or use an adapter-test envelope in production.

The CLI loads current policy and compiles in production mode using the current clock. It does not invoke models. If `output` is supplied, the destination must be a new staging file; existing files and global skill/config locations are refused. Otherwise the result includes the complete pack on stdout. `COMPILED` means compilation succeeded, not that every class has an eligible route.

`data/routing/compile-request.json` intentionally has no admitted strata. It regenerates an empty production pack with all eight classes recorded as missing. The existing one-task trials and native smokes do not meet the qualification requirements; no hardcoded fallback ladder is hidden behind those gaps.

Library `compileRoutingPack` also has an explicit `simulation_test` mode for deterministic algorithm tests. Those packs cannot resolve production routes and must never be published as consumer authority.

## Inspect and resolve

`validate-routing-pack --input pack.json` validates the versioned shape, internal identities and content digest. A digest detects corruption; it is not a signature or independent proof of model performance. Production authority depends on trusted compiler inputs and the maintainer's reviewed publication.

The maintainer `resolve-routing` command accepts `{pack,request}`. The request identifies a public class, exact `stratumDigest`, current `now`, optional `failedCandidateIds` and an explicit host inventory. It performs the same intersection described in the skill without invoking a model. The host inventory contains exact model/snapshot/effort/serving treatments, effective tools and capabilities, context capacity and fresh-context support. Unknown requirements cannot be treated as supported.

The exact host fields are `treatments: [{provider, model_id, snapshot_id, effort, serving}]`, `tools`, `capabilities`, `context_window_tokens` and `supports_fresh_context`. Capture these from the active host; this input is an inventory, not a model discovery mechanism. The consumer follows the same rules from the copied folder without running this command.

`refresh_after` requests an update; it is not a license to extend `expires_at`. Hard expiry is bounded by policy and qualification evidence freshness. A host may skip an unavailable candidate or a previously failed treatment only within an eligible compiled ladder. A retained incumbent's position reflects promotion rules, not a fresh price-only ranking.

The portable skill's eight labels do not broaden the governor's current two evaluation classes. A `bounded_backend` stratum can be labeled `bounded_implementation`, but remains valid only for its compiled backend scope. Other domains need their own human policy and real task evidence.
