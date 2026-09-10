# Capability first, API-equivalent economics second

Policy v4 separates three claims: task capability, actual execution-host evidence, and relative economics. `QUALIFIED` answers the first two for an exact request. Missing dollar telemetry no longer blocks it. Selection then applies economic ceilings and ordering; a capability-qualified candidate may remain unselected for economic reasons.

The unchanged capability floor is 20 independent tasks, 90% accepted tasks, a 300,000 ms p95 latency ceiling, 30-day evidence freshness and the existing failure ceilings. These are inherited declared thresholds, not new empirical claims. Exact model/snapshot, effort, material serving controls, task stratum and required review remain mandatory.

## Supply economic evidence separately

`select`, `create-binding`, `refresh` and the pack compiler accept the existing selection envelope plus:

```text
economics: {
  schema_version: "economic_evidence.v1",
  pricing: [{
    candidate_identity,
    source: {url, kind: "openai_model" | "claude_models", version},
    source_digest,
    checked_at
  }],
  tasks: [{
    observation: <API task_observation.v1>,
    attempts: [{
      attempt_id, candidate_id, candidate_identity,
      runtime_receipt_digest, usage_source_digest
    }]
  }],
  maintainer_order: [<candidate IDs in declared fallback order>]
}
```

The selection's `sources` and `runtimeReports` resolve the referenced original bytes and reports. The compiler reparses official pricing through the existing discovery parser; a supplied numeric cost is not accepted as authority. Each API observation must resolve its task baseline, grader, final artifact and every native attempt. The captured API response must match the exact snapshot; its runtime report must attest the exact model/effort and `execution_environment: "api"`. Include failed tasks and all worker, review and rework attempts. Duplicate task/attempt/report identities, missing attempts, changed bytes and mismatched strata are rejected.

The API records remain in `economics.tasks`. Subscription capability records remain in `observations`, with `request.execution_environment: "claude_code"` or `"codex"` and matching runtime reports. They may share exact treatment identities and source storage without claiming the environments are equivalent. This implementation permits no automatic API-to-host capability transfer. The native adapters and portable resolver enforce the same boundary.

## Calculate and order

For a supported provider/category combination:

```text
API-equivalent cost per accepted task
  = sum(all attributable attempts' category tokens × official category USD / 1,000,000)
    / accepted API tasks
```

OpenAI ordinary input excludes cached-read and cache-write subdivisions; output already includes reasoning. Anthropic input, cache reads and output are separate. Positive cache-write TTLs and other categories without defensible current rates remain unknown; zero-valued metadata adds no charge. Unknown service/context/geography modifiers or unpriced hosted-tool fees do not become a blended estimate. See the [verified provider category semantics and limits](v4-host-evidence.md#api-equivalent-pricing-categories).

Results expose `MEASURED_API_EQUIVALENT`, `API_PRICE_PROXY` or `UNKNOWN`, with the metric, nullable value, source digests, task costs and diagnostics. All are explicitly described as normalized API proxies, **not subscription bills**. Raw token totals and host client cost estimates are not cross-model routing authority.

Compare measured task economics when eligible peers have comparable measurements. Otherwise use comparable official input/output rates only when their order does not cross. Otherwise require a complete explicit maintainer order. A known value is not proof that it beats an unknown value. These rules apply after capability admission and inside the qualified/installed-acceptance/smoke evidence levels.

The inherited $5 API-equivalent ceiling now lives under `economics`. A known excess excludes selection while preserving `QUALIFIED`. Missing economics can use a permitted proxy or declared order under that default; an explicit task dollar ceiling requires measured task economics to prove compliance. Promotion still requires same-task paired quality evidence and measured paired API-equivalent economics. List prices cannot establish measured savings or automatically replace an incumbent.

## Migration

`policy/constitution-v3.json` preserves v3 exactly, including its historical dollar-dependent qualification. Active policy v4 changes the policy digest, so old bindings and receipt assessments cannot silently become v4 authority. Reassess evidence with actual execution-environment provenance and compile a fresh pack.

The portable wire format is `routing_pack.v3`: shared treatments once, route-specific evidence and explicit ordering on references. V2 packs produce a clear version error in the new compiler/validator; recompile and update the **whole** folder. Existing old installed folders are not modified. No Node process, API credentials, client upgrade or global configuration change is added to consumer execution.
