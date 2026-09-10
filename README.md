# Model Governor

Model Governor **1.0.0** is a local TypeScript library and CLI for choosing model/effort assignments from explicit policy and reproducible task evidence. Portable Claude and Codex skills call the same engine. Model names are data; the constitution holds the rules.

[Local v1 release record](docs/v1-release.json): 176 passing tests, complete offline gates, and separately verified actual live evidence. The record includes artifact hashes and the remaining qualification limits.

The decision path is registry → immutable observations → hard qualification → cheapest qualified candidate → independently validated binding → native adapter. Replacement requires paired same-task evidence. Missing evidence produces HOLD or escalation; it does not become a confidence score.

## Local use

Requires Node 22.12+, 24, or 26+ and npm. Run from this checkout; no global installation is needed.

```sh
npm ci
npm run build
node dist/cli/index.js help
node dist/cli/index.js validate-policy policy/constitution.json
node dist/cli/index.js validate-binding --input fixtures/bindings/valid-initial-backend.json
```

Commands accept one JSON or YAML request file and emit one JSON result. Malformed requests and invalid bindings exit nonzero. A decision request explicitly declares `simulation` or `production`; simulation fixtures cannot authorize production execution. The source policy is never rewritten by the runtime.

[The CLI guide](docs/usage-cli.md) includes a runnable render → refresh → apply example and request contracts for native evaluation, delegation, discovery and shadow replay. Portable sources are [delegate](skills/delegate/SKILL.md) and [refresh-models](skills/refresh-models/SKILL.md). They remain inert in this development checkout; nothing has been installed globally.

`compare` accepts raw `{pairs:[{taskId,cohortId,incumbentAccepted,candidateAccepted}],options:{alpha,nonInferiorityMargin}}`. It calculates exact McNemar probabilities and a conservative paired interval. Identical outcomes in a tiny sample still have uncertainty.

`ledger-append` accepts `{directory,record:{id,provenance:{source,observed_at,methodology},payload}}`. `ledger-status` verifies every record in a supplied `{directory}`. Identical appends are idempotent; changing an existing ID is an error.

## Evidence and policy

The initial constitution is a proposal, with thresholds explicitly labeled as such. Costs include unsuccessful attempts, review and rework. Unknown cost stays unknown. CLI dollar estimates describe their cost basis; they are not subscription invoices. Provider metadata establishes capabilities and identity, not task qualification.

Artificial Analysis reported Fable 5.1 at max effort scoring 66 on [September 1](https://artificialanalysis.ai/articles/claude-fable-5-1), with fallback contributing roughly 4% of output tokens. Its [September 7 v4.3 announcement](https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-3) reported 53 for max effort with fallback after changing the evaluation composition. These are different dated measurements. Model Governor preserves methodology, version and serving configuration so a leaderboard change cannot silently become evidence of model regression or improvement. See [source notes](docs/benchmark-provenance.md).

## Verification

```sh
npm test
npm run typecheck
npm run build
node scripts/verify/foundation.mjs
npm run verify:v1
npm run verify:v1:live
```

`verify:v1` runs the offline release gates, including the real harvested grader calibration. Set `MODEL_GOVERNOR_SOURCE_REPOSITORY` to a local Foreman checkout containing the pinned revisions and optionally `MODEL_GOVERNOR_GRADER_DEPENDENCIES` to dependencies matching its pinned lock file. It never invokes a model. See [coverage](docs/v1-coverage.json) for the assertion-to-scenario mapping.

`verify:v1:live` verifies the retained actual native invocation and independent grader evidence from this build. It does not spend again. To intentionally collect fresh live evidence, use `scripts/verify/live-smoke.mjs` with an explicit source repository, dependency directory and candidate treatments; the wrapper also accepts `--report <path>`.

Both live compatible candidates fixed the same real harvested regression: Claude Opus 5/high and GPT-5.5/low each passed all 21 independent tests. The original Fable 5.1/Astra experiments were rejected by the installed older runtimes and remain recorded. See [successful live receipts](artifacts/live-smoke/run-fWuF7K/report.json) and [original failures](artifacts/live-smoke/run-FoBWWG/report.json).

**No production-qualified assignment is claimed.** The successful observations remain `accepted:false`: independent governed review is absent, served effort is unknown, Codex identity/cost telemetry is unknown, and Claude reported mixed Opus/auxiliary-model identity. Its $0.322887 is a provider estimate, not a subscription invoice. Policy also requires more evidence. The engine returns HOLD or escalation instead of weakening those requirements. [Runtime capability evidence](docs/runtime-capabilities.json) lists the controls available in the installed versions.

Shadow is disabled by proposed policy and refuses native graders whose sandbox guarantees are unavailable. Its bounded replay, isolation, incumbent preservation and cleanup contracts are exercised with actual local processes. Configuration conformance, actual provider execution and empirical qualification are separate outcomes; synthetic tests never become production observations.

The implementation uses `src/schema` for strict contracts, `src/core` for canonical hashes, `src/registry` and `src/evidence` for provenance, `src/governance` for policy decisions and binding recomputation, `src/statistics` for paired inference, `src/ledger` for immutable atomic records, and `src/cli` for deterministic commands. `policy/` is human-owned; `fixtures/` labels synthetic and harvested evidence separately.

Build sequencing and current work are recorded in [delivery plan](docs/delivery-plan.md). Foreman failures and their smallest unblocks are retained in [the scratchpad](docs/foreman-scratchpad.md); broader Foreman cleanup follows this build.
