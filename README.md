# Model Governor

A local TypeScript library and CLI for choosing model/effort assignments from explicit policy and reproducible task evidence. Portable Claude and Codex skills call the same engine. Model names are data; the constitution holds the rules.

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

Final v1 proof distinguishes compiler conformance, actual local provider execution, and empirical production qualification. A successful provider call alone is not qualification. Tests using synthetic data never become production observations.

The implementation uses `src/schema` for strict contracts, `src/core` for canonical hashes, `src/registry` and `src/evidence` for provenance, `src/governance` for policy decisions and binding recomputation, `src/statistics` for paired inference, `src/ledger` for immutable atomic records, and `src/cli` for deterministic commands. `policy/` is human-owned; `fixtures/` labels synthetic and harvested evidence separately.

Build sequencing and current work are recorded in [delivery plan](docs/delivery-plan.md). Foreman failures and their smallest unblocks are retained in [the scratchpad](docs/foreman-scratchpad.md); broader Foreman cleanup follows this build.
