# V5 release validation

Validated September 10, 2026. V5 makes native subscription qualification reachable
through validator-derived identity assurance without changing economics or task
qualification thresholds. It does not manufacture real qualified routes.

## Executed checks

| Check | Result |
| --- | --- |
| Full test suite | 375 passed in 29 files |
| Typecheck / build | PASS |
| Portable skills | PASS; both skills and all nine copied delegate files resolve |
| Built CLI pack publication | PASS |
| Built CLI route resolution / failed-worker fallback | PASS for all 15 routes |
| Medium missing fresh-context refusal | PASS |
| Old wire-version refusal | PASS |
| Current frontier identity re-derivation | PASS from preserved raw request/environment/process/version/trace sources |
| Original policy | Exact v4 archived; v3 unchanged; all non-identity policy fields unchanged |

The machine-readable result is [v5-validation.json](../data/routing/v5-validation.json).
The recompiled pack is policy v5 / routing-pack v3, with **15 provisional routes
and zero real qualified routes**. The pack digest is
`sha256:e65c17c8910146e621095f4f94e252603fa39a3a27b6749d2124c1788974f5cc`.
The complete delegate-folder digest is
`sha256:1ea6ffa22cb623804258bb2b57d3aad96dbf5f613ea7c2424fad823de0d1ebde`.

## Identity, policy and actual clients

Starting and ending versions are Claude Code **2.1.267** and Codex CLI **0.154.0**.
Neither client nor global configuration was changed. Fresh probes and independent
Opus 5/high review both passed. Fable/high derives `PARTIALLY_RUNTIME_ATTESTED`
(runtime model, configured effort); Astra/high derives `CONFIGURATION_ATTESTED`
(configured model and effort). See [native host evidence](v5-host-evidence.md)
for actual trace/diagnosis/fixture/review hashes and preserved failed attempts.

Low and medium admit configuration assurance or stronger. Medium retains
different-model, fresh-context frontier review. High/critical retain runtime
attestation and stronger existing guards. Exact archived v4 bytes hash to
`sha256:2f2ba7be3d18392f1dc3f97015d8e8c21ed24bd242e1bbe03e614cb5eebaa051`.
The 20-task floor, 90% acceptance, latency, freshness, failure/review rules and
paired-promotion thresholds are unchanged. API provenance and all three v4
economic evidence levels are unchanged.

Assurance is an output of raw evidence validation. Neither a receipt nor an
observation can author its own authority. Negative runtime evidence is checked
even if configuration is incomplete or the process failed. Bindings recompute
assurance; compiled route summaries retain its evidence digest and limitations.
Current host contradictions override historical eligibility.

## Remaining evidence work

Neither Fable nor Astra was added to a frontier route. The new diagnostics prove
availability and identity evidence, not class-specific reviewer qualification.
Separate one-artifact reviewer ACCEPT runs are preserved, but their captures
predate the complete environment requirement and remain `UNVERIFIED`; they were
not retroactively upgraded.

The first real qualified worker needs at least 20 independent, matching native
task observations with complete v5 captures, accepted artifacts, actual review
lineage and the existing quality/latency/freshness requirements. A qualified
reviewer needs its own matching role/risk evidence and required independence.
Many public task classes also lack declared governor evaluation buckets. No
additional task classes or medium/high/critical scope were created here.

The new copied folder has structural closure and built-CLI resolution proof.
Earlier installed-host task acceptance is preserved; this release does not claim
a new seven-task installed-folder acceptance cycle.

## Recoveries and scope

An intermittent existing process-cleanup test failed once in the final full run.
Cleanup used an `instanceof Error` check that can misclassify an `ESRCH` from a
different JavaScript context. It now checks the native error code structurally;
a regression test exercises that boundary. The final full suite passed. There
are no skipped or quarantined failures presented as passes.

Live harness recoveries included verdict punctuation, an overly narrow test
command allowlist, and incomplete early environment captures. Original raw
traces remain unchanged; failed/incomplete attempts remain failed/incomplete.

Changes cover identity schemas/validator, policy and historical policy archive,
native capture/adapters, qualification/receipt/refresh/binding/routing integration,
probe/review scripts and evidence, portable instructions, adversarial tests and
regenerated synthetic binding/schema fixtures. The existing GitHub Actions
workflow validates the published commit; its run link is supplied with delivery.
