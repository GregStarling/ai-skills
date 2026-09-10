# Classify the work

Use these eight labels and the pack's `routing_modes` to choose the work shape. A label is not permission to extend a route beyond its scope, risk, tools or evidence. Classify each workstream separately.

| Class | Work shape | Typical acceptance evidence |
| --- | --- | --- |
| `repo_exploration` | Locate behavior, dependencies or change surfaces without implementation. | Source locations and a checked account of the actual flow. |
| `mechanical_work` | A specified transformation with little design ambiguity. | Exact scope, expected transformation and regression checks. |
| `bounded_implementation` | A contained feature against settled interfaces. | Required behavior and affected integration checks. |
| `ui_implementation` | Implement an agreed interface and interactions. | Rendered output, interaction checks and responsive behavior. |
| `hard_debugging` | Implement a precise fix after frontier reproduction and diagnosis. | Reproduction, causal explanation, targeted fix and frontier regression verification. |
| `complex_implementation` | Implement a coupled change after frontier architecture, interfaces and planning are settled. | Explicit contracts, integration behavior and consequential edge cases. |
| `research` | Source-based investigation, analysis or writing. | Verifiable sources, calculations and the requested artifact. |
| `full_project` | Plan and integrate a multi-component outcome. | Requirement coverage and complete critical user flows. |

`full_project` uses `decompose`: the frontier coordinator owns planning, interfaces and acceptance. Its capability comes from eligible routes for the required workstreams, not a full-project worker entry. For UI, `frontier_specify_then_delegate` establishes layout, hierarchy, interaction and responsive requirements; a worker implements them, and frontier review inspects the result. `frontier_diagnose_then_delegate` keeps reproduction, causal diagnosis and the precise fix with the frontier; an inexpensive capable worker implements the fix, then the frontier verifies the regression. `frontier_plan_then_delegate` settles architecture, interfaces and the implementation plan at the frontier before workers implement bounded assignments. Keep targeted repairs with the same worker when useful context carries over; return architectural uncertainty to the frontier. `direct` means one worker followed by frontier verification.

The current governor's `bounded_backend` evidence is not general evidence for every bounded implementation. Its `hard_debugging` evidence is also tied to a particular bucket and constraints. Do not translate a familiar-sounding label into broader capability.
