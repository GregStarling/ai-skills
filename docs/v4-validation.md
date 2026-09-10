# Subscription-first v4 validation

Validated September 10, 2026, against the final compiled artifact. This release changes capability/economic semantics, execution-host provenance, portable pack serialization and probe parsing. No model was promoted, API task run fabricated, subscription savings asserted, or global client updated.

## Policy and behavior

The exact old policy is preserved in `policy/constitution-v3.json`. Active v4 removes dollar cost and the dollar ceiling from capability qualification. It preserves the 20-task minimum, 90% success floor, latency and failure ceilings, freshness, exact identity/effort and review requirements. The same $5 ceiling now applies to normalized economic selection. Candidates excluded economically remain capability-qualified and retain explicit economic exclusion diagnostics through pack compilation; provisional relabeling cannot bypass that exclusion.

API-equivalent task economics use separately captured API token categories multiplied by current official category rates, including failed, review and rework attempts, divided by accepted API tasks. The economic levels are `MEASURED_API_EQUIVALENT`, `API_PRICE_PROXY` and `UNKNOWN`. Comparable measured task economics precede comparable non-crossing list prices, then explicit maintainer order. Raw token count, unknown service tier and list-price proxies cannot establish measured promotion or subscription billing. Unsupported token/pricing categories remain unknown. [Contract and calculation limits](v4-economics.md).

Subscription capability observations carry `claude_code` or `codex` provenance; economic API observations remain separate. Qualification rejects different environments and holds unknown evidence. Receipt assessment checks every attempt's environment, and native adapters/portable routing refuse API-only execution authority. No environment-equivalence shortcut was added.

## Executed verification

| Check | Result |
| --- | --- |
| Full `npm test` | **320 passed, 26 files** |
| Typecheck and build | PASS |
| Portable skill validation | PASS for delegate and refresh-models; all nine copied delegate files resolve |
| Built CLI publication/integrity validation | PASS on the exact checked-in v3 pack |
| Built CLI route resolution | PASS for all 15 routes and a failed-worker fallback for each |
| Medium fresh-context denial | PASS: unavailable fresh context prevents dispatch |
| Old pack migration | PASS: built CLI rejects v2 with explicit recompile/reinstall guidance |
| Historical preservation | Exact policy-v3 bytes and six existing native/probe/intake source files unchanged |
| GitHub CI | The unchanged workflow runs all required gates on the published commit; its check result is attached to that commit |

The adversarial suite includes unknown-dollar subscription qualification at the unchanged 20-task floor; cheap incapable and expensive capable treatments; exact effort identities; API/host separation through qualification and native dispatch; category arithmetic and missing-tier refusal; economics bound into decisions/bindings; paired promotion with independent API economics; incumbent capability/economic distinctions; receipt lineage and duplication; shared-reference tampering; evidence-first fallback; and synthetic/error model placeholders. These semantic tests use explicitly marked controlled data, not real model-performance evidence.

Native host behavior was not re-run after the format change. Existing [installed-host](routing-pack-validation.md) and [frontier workflow](../data/routing/frontier-ownership-acceptance.json) reports identify the older copied folders they exercised. Current checks validate the new instructions' closure and compiled route behavior; they do not relabel older native trials as execution of this exact new folder.

## Artifacts and route scope

| Artifact | Before | After |
| --- | ---: | ---: |
| Routing pack | 182,456 bytes | **123,721 bytes (32.19% smaller)** |
| SKILL.md | 6,947 bytes / 914 words | **4,882 bytes / 613 words** |
| Shared treatments | Repeated across routes | **6 exact treatment records** |
| Qualified / provisional routes | 0 / 14 | **0 / 15** |

Pack content digest: `sha256:3cdadd605a8315a7dddfdff7c2503b0b9e77f307d8596f16229da363c9332d69`. Complete delegate folder digest: `sha256:efed8290ff36d23616cb2d29e9723ff43c128285978c48bab453e33338c13f56` (canonical JSON SHA256 of code-point-sorted file paths and byte digests). See the [machine-readable validation and per-route results](../data/routing/v4-validation.json).

One additional provisional medium `mechanical_work` route is restricted to the actually observed quantity zero/nullish-default fix family. Claude Haiku/Sonnet workers use a different, separately launched, artifact-only fresh Opus reviewer. It remains smoke-derived, with configured effort limits explicit. Other medium domains and high/critical work remain unsupported. [Original hashes and control assessment](v4-host-evidence.md).

The frontier parser's offline replay excludes `<synthetic>` and error-envelope model echoes while retaining the exact Fable client-version error. Historical raw bytes and the older derived probe file are preserved; new probes use the fixed parser.

## Remaining real-evidence work

No first real qualified route is claimed. Real records still lack sufficient matched independent tasks in the current governed buckets, complete served snapshot/effort and material-control evidence, and the independently qualified frontier-review lineage required by policy. Many portable task classes lack a declared governor evaluation stratum. Missing subscription dollar telemetry is no longer a capability blocker.

Economic records can improve ordering separately, but additional tokens or cheap list prices cannot fill capability gaps. Positive unsupported cache TTLs, pricing formats/modifiers or absent actual service tier can leave measured economics unavailable while allowing defensible proxies or declared order.

Manual operational follow-up: upgrade Claude Code and Codex, rerun frontier discovery and probes, evaluate newly available frontiers, then recompile. No user-global settings or installations were changed.

Files changed are concentrated in policy/governance, runtime/adapters/receipts/refresh, routing serialization/admission/resolution, both portable skill references, probe scripts and their focused tests. Existing CI gates remain intact. The published commit contains the complete file-level diff.
