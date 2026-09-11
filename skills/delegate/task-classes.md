# Classify the work

Use these eight labels. Classify each workstream separately. A label is not permission to extend a route beyond its scope, risk, tools or evidence. `lookup` returns the same `shape` with the route.

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

- single worker: one worker, then frontier verification.
- specify-then-delegate: the frontier establishes layout, hierarchy, interaction and responsive requirements; a worker implements; the frontier inspects the rendered result.
- diagnose-then-delegate: a worker may gather reproduction evidence and propose a diagnosis through a separately eligible investigation route. The frontier checks that evidence and settles the cause and fix before implementation. Source reading alone is insufficient; resolve or report a blocked reproduction before assigning implementation.
- plan-then-delegate: the frontier settles architecture, interfaces and the implementation plan; workers implement bounded assignments.
- decompose: the frontier coordinator owns planning, interfaces and acceptance; capability comes from eligible routes for the required workstreams, never a full-project worker.

Classify the current assignment: locating behavior may fit `repo_exploration` even when the eventual task is debugging or architecture. Check its literal route scope; source-reading coverage alone does not authorize reproduction, edits or broader diagnosis. If only source investigation fits, delegate that portion and return the remaining decisions to the frontier. Before resuming an investigator as an implementer, look up and confirm the implementation route and model/effort eligibility; reuse its context only when eligible.
