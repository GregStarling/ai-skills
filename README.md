# Delegate

A portable skill for completing tasks with efficient use of models, tokens and coordination. The entrypoint is [skills/delegate/SKILL.md](skills/delegate/SKILL.md). It runs in Claude or Codex using the tools available to the calling assistant; it does not require Foreman, Model Governor, a Node build, API keys or a separate service.

The intended interaction is `/delegate <task>`: fix a bug, build a feature or interface, carry a project through delivery, or produce a research, writing or analysis artifact. The default is **cheapest capable worker → frontier verification → targeted correction**. Large tasks may be split into useful workstreams, but every assignment retains that loop and the combined result is verified. Small tasks use smaller work orders; they do not bypass routing or review.

The worker is the least expensive available model with credible capability for the task; the verifier is an available frontier model. Model selection uses actual host capabilities and known economics, with no hardcoded model leaderboard. Coordination, context duplication, failed attempts and review count toward efficiency. Unknown token/cost accounting stays unknown.

## Current status

The standalone skill source is implemented. It remains intentionally uninstalled while this library is developed; slash-command discovery and invocation in both installed hosts have not been verified. The source can be supplied directly to a calling assistant for testing. Host-specific discovery belongs to installation, not to the skill's runtime dependencies.

[Standalone delivery plan](docs/standalone-delegate-plan.md) defines the corrected product scope. [Validation notes](docs/standalone-delegate-validation.md) record the explicit Luna-worker/frontier-verifier trial and its limits. The earlier Model Governor v1 release was an engine release, not proof of a complete standalone delegator. Its native smoke tests demonstrated candidate evaluation, not an accepted end-to-end delegated project.

## Optional governance engine

The repository also contains the separate Model Governor TypeScript library and CLI for policy-driven candidate qualification, provenance, paired evaluation, bindings, native execution and refresh. This engine remains useful when those controls are explicitly required; the standalone skill does not invoke it by default. Its qualified production path currently returns HOLD/escalation for missing evidence and unsupported native guarantees.

[Engine CLI guide](docs/usage-cli.md) · [Engine release evidence](docs/v1-release.json) · [Engine acceptance mapping](docs/v1-coverage.json) · [Foreman findings from the build](docs/foreman-scratchpad.md)

For engine development:

```sh
npm ci
npm test
npm run typecheck
npm run build
node scripts/verify/skills.mjs
```

`npm run verify:v1` runs the engine's full offline release proof, including harvested grader calibration against a local Foreman source checkout. `npm run verify:v1:live` verifies retained engine evaluation receipts without new provider calls. Those are engine development checks, not requirements for using the standalone skill.
