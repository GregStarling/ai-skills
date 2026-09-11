# Classify the work

Use these eight labels. Classify each workstream separately. A label is not permission to extend a route beyond its scope, risk, tools or evidence. `lookup` returns the same `shape` with the route.

| Class | Shape | Work | Typical acceptance evidence |
| --- | --- | --- | --- |
| `repo_exploration` | single worker | Locate behavior, dependencies or change surfaces without implementation. | Source locations and a checked account of the actual flow. |
| `mechanical_work` | single worker | A specified transformation with little design ambiguity. | Exact scope, expected transformation and regression checks. |
| `bounded_implementation` | single worker | A contained feature against settled interfaces. | Required behavior and affected integration checks. |
| `ui_implementation` | specify-then-delegate | Implement an agreed interface and interactions. | Rendered output, interaction checks and responsive behavior. |
| `hard_debugging` | diagnose-then-delegate | Implement a precise fix after frontier reproduction and diagnosis. | Reproduction, causal explanation, targeted fix and frontier regression verification. |
| `complex_implementation` | plan-then-delegate | Implement a coupled change after architecture, interfaces and plan are settled. | Explicit contracts, integration behavior and consequential edge cases. |
| `research` | single worker | Source-based investigation, analysis or writing. | Verifiable sources, calculations and the requested artifact. |
| `full_project` | decompose | Plan and integrate a multi-component outcome. | Requirement coverage and complete critical user flows. |

Shapes:

- single worker: one worker, then frontier verification.
- specify-then-delegate: the frontier establishes layout, hierarchy, interaction and responsive requirements; a worker implements; the frontier inspects the rendered result.
- diagnose-then-delegate: the frontier reproduces the failure, diagnoses the cause and defines the precise fix; a worker implements it; the frontier verifies the regression. Source reading alone is insufficient; resolve or report a blocked reproduction before assigning implementation.
- plan-then-delegate: the frontier settles architecture, interfaces and the implementation plan; workers implement bounded assignments.
- decompose: the frontier coordinator owns planning, interfaces and acceptance; capability comes from eligible routes for the required workstreams, never a full-project worker.

Keep targeted repairs with the same worker when useful context carries over; return architectural uncertainty to the frontier. A route's evidence is tied to its own scope and constraints. Do not translate a familiar-sounding label into broader capability.
