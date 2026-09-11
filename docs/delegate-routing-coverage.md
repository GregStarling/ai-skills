# Assignment routing and coverage

Audited 2026-09-11 against pack `sha256:ebda991b38d0a2eaba7434fbd577d447d5288412c9f195a9206cbc2498685619`. The new assignment names select existing evidence routes; the pack still has 15 provisional routes and zero qualified entries. These mappings make dispatch deterministic, without claiming broader capability or measured subscription savings.

| Assignment | Existing class | Both hosts at low risk |
| --- | --- | --- |
| `locate_behavior` | `repo_exploration` | Read and explain small local JavaScript/HTML codebases with file evidence |
| `summarize_sources` | `research` | Analyze supplied local source files or supplied facts; no live discovery |
| `specified_edit` | `mechanical_work` | Specified local JavaScript API renames, nullish defaults and equivalent mechanical edits |
| `implement_feature` | `bounded_implementation` | Contained local JavaScript functions with settled interfaces and executable checks |
| `implement_fix` | `hard_debugging` | Local JavaScript logic/async bugs with deterministic reproduction and accepted diagnosis |
| `implement_ui` | `ui_implementation` | Small plain HTML/CSS interfaces with a specification and rendered acceptance |
| `implement_plan` | `complex_implementation` | Small multi-file JavaScript features with settled contracts and integration checks |
| `reproduce_failure` | none | Explicit gap for standalone reproduction investigation; delegate a covered source-reading portion if useful |
| `frontier_decision` | none | Resolve consequential decisions, then route the next bounded assignment |

At medium risk, only Claude's narrow JavaScript zero/nullish quantity-default mechanical route exists, with separate fresh review. Other medium assignments and all high/critical assignments have no route. Source analysis does not imply permission to execute code, edit it, retrieve live sources or perform arbitrary diagnosis. Other languages/frameworks require matching evidence before expanding implementation coverage.

`node <skill-folder>/scripts/local-learning.mjs route -` accepts `{host, risk, assignment, coordinator:{model,effort}}` on stdin. Omit `assignment` for coverage with actual scope text and gaps. The helper preserves evidence ordering, expiry, fallback and review rules. Pass actual host treatments when known; otherwise it reports `host_verified:false`. Literal scope still requires coordinator judgment. A class match alone does not authorize dispatch.

The returned `worker` is the first eligible candidate; `verification` selects coordinator review only when the existing reviewer lane permits it. Otherwise it returns a separate reviewer. A stronger initial model is not automatically admitted to every reviewer lane, so this extra review can reduce expected savings. On failure, rerun with `failed_candidate_ids` and use the replacement verification choice. A changed assignment requires a fresh route check before reusing a worker.

The routine investigation path is one routing call, a five-field brief, worker evidence and frontier verification. Recording is optional for read-only investigation and remains required by explicit comparisons/evaluations. Unrecorded work does not influence learning. Recorded preferences use quality and repair burden, then complete comparable observed allowance, actual cost or tokens; elapsed time and estimated pricing cannot break ties. Tests cover slower-but-cheaper completion, missing/mixed/partial observations, invalid evidence, deterministic mapping, fallback, host constraints and route gaps. These are software checks, not new live model qualification.
