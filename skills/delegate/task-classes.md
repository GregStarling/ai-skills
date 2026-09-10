# Classify the work

Use these eight labels and the pack's `routing_modes` to choose the work shape. A label is not permission to extend a route beyond its scope, risk, tools or evidence. Classify each workstream separately.

| Class | Work shape | Typical acceptance evidence |
| --- | --- | --- |
| `repo_exploration` | Locate behavior, dependencies or change surfaces without implementation. | Source locations and a checked account of the actual flow. |
| `mechanical_work` | A specified transformation with little design ambiguity. | Exact scope, expected transformation and regression checks. |
| `bounded_implementation` | A contained feature against settled interfaces. | Required behavior and affected integration checks. |
| `ui_implementation` | Implement an agreed interface and interactions. | Rendered output, interaction checks and responsive behavior. |
| `hard_debugging` | Diagnose an uncertain failure requiring a coherent model. | Reproduction, causal explanation, targeted fix and regression check. |
| `complex_implementation` | A coupled change involving significant architectural reasoning. | Explicit contracts, integration behavior and consequential edge cases. |
| `research` | Source-based investigation, analysis or writing. | Verifiable sources, calculations and the requested artifact. |
| `full_project` | Plan and integrate a multi-component outcome. | Requirement coverage and complete critical user flows. |

`full_project` uses `decompose`: the frontier coordinator owns planning, interfaces and acceptance. Its capability comes from eligible routes for the required workstreams, not a full-project worker entry. For UI, `frontier_specify_then_delegate` establishes layout, hierarchy, interaction and responsive requirements; a worker implements them, and frontier review inspects the result. `coherent_worker` keeps a hard diagnosis in one worker context. `direct` means one worker followed by frontier verification.

The current governor's `bounded_backend` evidence is not general evidence for every bounded implementation. Its `hard_debugging` evidence is also tied to a particular bucket and constraints. Do not translate a familiar-sounding label into broader capability.
