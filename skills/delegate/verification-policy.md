# Verification by deliverable

Verification depth follows the assignment's declared risk and affected behavior, not repository size.

| Deliverable | Verification |
| --- | --- |
| Implemented behavior at medium risk or above | Fresh frontier review of the final artifact, mandatory, including when the coordinator or the frontier executed it |
| Implemented behavior at declared low risk | Coordinator runs the relevant checks and inspects the diff, callers and contracts. A stable 10% sample keyed to the task ID gets a fresh frontier review |
| Hard-bug fixes, and implementation of a consequential decision | Fresh frontier review at any risk |
| Plan-only or decision-only work | The frontier decision plus checks of sources, constraints and acceptance criteria; no automatic second frontier |
| Research, PDF, synthesis | Source, extraction, citation and calculation checks; a stable 10% sample gets a fresh independent economical audit |
| Mechanical and other simple work | Proportionate checks; a stable 10% sample gets a frontier audit |

Explicitly requested independent review is always frontier. Explicit no-delegation instructions are
binding; a required but unavailable review is blocked, not skipped.

Inspect the actual artifact, not the worker's verdict. For investigation, check the decisive source
locations and unresolved dependencies; source inspection can establish a passed check without running
a command. For a tweak or feature, inspect the diff, affected callers and contracts, and regression
evidence. For a bug, verify reproduction and corrected behavior. For UI, inspect rendering,
interactions and relevant viewport sizes; a build alone is insufficient. Check integrated behavior and
project-required gates after combining workstreams.

Give an independent reviewer the requirements, the final artifacts, the checks that ran and known
constraints; never the implementer's reasoning transcript or prior verdict as authority. Reviewers
return **PASS**, **REPAIR** with concrete findings, or **BLOCKED** with the actual cause. Send
targeted repairs to the executor; repeated failure justifies stronger execution. Reverify repairs and
integration. Any later edit invalidates a review. Stop when acceptance is met.

Ordinary work needs no recording. Explicit evaluations may record outcomes through
[local learning](local-learning.md); observations and receipts are never proof of savings or
qualification.
