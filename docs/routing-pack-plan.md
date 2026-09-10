# Portable routing-pack refactor

Historical implementation plan. Its requirement to dispatch a worker for every task size is superseded by the [current consumer contract](delegate-host-project-evidence-plan.md#current-consumer-contract) and [installed skill source](../skills/delegate/SKILL.md). The earlier implementation scope and acceptance evidence below are preserved as history; they do not override the current direct-versus-delegated choice.

The consumer product is the complete `skills/delegate/` folder. A frontier coordinator classifies/plans work, intersects a compiled evidence-qualified ladder with host availability, dispatches the cheapest suitable worker, integrates output and performs mandatory frontier verification. Repairs return to the same worker; capability failures advance to another qualified treatment. Model and effort stay distinct.

The governor is maintainer tooling: existing discovery/evaluation/qualification → portable pack compilation → explicit file publication. Consumers do not run Node, a database, Foreman or governor services. Keep the public taxonomy at eight classes and load conditional references only when needed.

Implementation ownership: a bounded worker owns `src/routing/` and `test/routing/`, including strict pack contracts, production-only qualification compilation, evidence/freshness limits and deterministic host intersection. Root owns the skill folder, host references, CLI integration, refresh-models workflow, generated initial pack and documentation. Root reviews actual code, integrates and verifies. No changes to the governor constitution to manufacture qualification.

Acceptance: compiler rejects invented/tampered/synthetic production authority; candidate × effort identity and task/risk/constraints survive compilation; measured accepted-task costs order eligible routes; only qualified frontier reviewers verify; unavailable or failed candidates advance within qualified routes; expired packs and absent routes fail explicitly; no host/provider requirement is assumed; copied skill references resolve without the repo. Actual current evidence gaps stay explicit. Empty qualified ladders are an honest build result, not a completed operational routing claim.

Existing local evidence does not meet the governor's production qualification rules across these classes. Initial pack will record that limitation rather than convert illustrative model names or a one-task trial into a general qualification. Maintainer evaluation/policy work remains distinguishable from the dependency-free consumer workflow.
