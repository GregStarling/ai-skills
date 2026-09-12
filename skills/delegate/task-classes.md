# Classify the work

These legacy classes describe evidence-route workstream shapes; ordinary coordination follows the decision and review rules in `SKILL.md`, including direct execution. A label never grants extra permissions. Evidence-required routes remain bound to their literal scopes; ordinary dispatch bounds the assignment independent of repository size or language.

| Class | Shape | Work | Typical acceptance evidence |
| --- | --- | --- | --- |
| `repo_exploration` | single worker | Locate behavior, dependencies or change surfaces without implementation. | Source locations and a checked account of the actual flow. |
| `mechanical_work` | single worker | A specified transformation with little design ambiguity. | Exact scope, expected transformation and regression checks. |
| `bounded_implementation` | single worker | A contained feature against settled interfaces. | Required behavior and affected integration checks. |
| `ui_implementation` | specify-then-delegate | Implement an agreed interface and interactions. | Rendered output, interaction checks and responsive behavior. |
| `hard_debugging` | diagnose-then-delegate | Implement a precise fix after frontier acceptance of reproduction evidence and diagnosis. | Reproduction, causal explanation, targeted fix and frontier regression verification. |
| `complex_implementation` | plan-then-delegate | Implement a coupled change after architecture, interfaces and plan are settled. | Explicit contracts, integration behavior and consequential edge cases. |
| `research` | single worker | Source-based investigation, analysis or writing. | Verifiable sources, calculations and the requested artifact. |
| `full_project` | decompose | Plan and integrate a multi-component outcome. | Requirement coverage and complete critical user flows. |

Shapes:

- single worker: verify by deliverable; research/PDF checks stay cheap, implemented behavior receives fresh frontier review.
- specify-then-delegate: the frontier establishes layout, hierarchy, interaction and responsive requirements; a worker implements; the frontier inspects the rendered result.
- diagnose-then-delegate: an ordinary `reproduce_failure` worker may run authorized local checks and propose a diagnosis. The frontier checks the evidence and settles the cause and fix before implementation. Under evidence-required routing, standalone reproduction remains a gap. Source reading alone is insufficient; resolve or report a blocked reproduction before assigning implementation.
- plan-then-delegate: the frontier settles architecture, interfaces and the implementation plan; workers implement bounded assignments.
- decompose: the coordinator gathers constraints and owns execution/integration; frontier makes plans/interfaces and reviews implemented behavior; capability comes from eligible routes for the required workstreams, never a full-project worker.

Classify the current assignment, not the entire repository: locating behavior is investigation even when the eventual task is debugging or architecture. Read scope may cross package boundaries; write ownership stays explicit. Before resuming an investigator as an implementer, confirm the new assignment's permissions, suitable model/effort and acceptance checks. For evidence-required routing also recheck the implementation route. Reuse useful context when the controls permit it.
