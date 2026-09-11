# Worker contract

For investigation, five fields suffice:

- **Question:** what to establish, with unknown answers allowed.
- **Scope:** relevant files or sources and boundaries.
- **Permitted actions:** allowed reads/checks; read-only by default.
- **Stopping point:** answered, a consequential decision is needed, or progress stalls.
- **Expected return:** concise findings, exact evidence references, checks and the specific unresolved decision.

The coordinator supplies the selected model/effort through host controls and retains the route result; workers need no hashes, receipt instructions or copied routing policy. Keep explicit tool constraints in the brief when the host cannot encode them. Untracked investigations still need eligible routing and frontier verification.

For implementation, supply a compact work order:

- **Outcome:** a bounded investigation question or implementation result, with acceptance criteria.
- **Context:** relevant source/artifact paths, established decisions and interfaces.
- **Ownership:** files/components or an isolated workspace; preserve unrelated work.
- **Constraints:** tools, permissions, task risks, deadlines and authorized budget.
- **Route:** `candidate_id`, `model`, `effort` and `serving` as returned by lookup. The sha256 identity belongs in the receipt, not the packet.
- **Return:** artifacts or concise findings with exact source locations, checks/results, uncertainties and any specific decision needed from the frontier.

For investigation, specify permitted sources and commands, whether edits are allowed (default read-only), and a stopping point: evidence answers the question, a consequential decision is needed, or progress stalls. Example: “Trace where this value gets its default in these modules; return source locations, a supported explanation, alternatives still open, and the smallest proposed next step. Do not edit.” Unknown answers do not require pre-solving by the coordinator. A supported finding that isolates the next decision may complete the investigation while the overall task remains open; incomplete investigation stays incomplete.

Escalate conflicting evidence, an architectural or product choice, a required action outside the assignment, or repeated investigation without new evidence. Return the exact question, relevant evidence references, attempted checks and their results, and a proposed next step. Avoid raw logs and reasoning transcripts. The frontier checks decisive evidence, answers that question and returns a bounded follow-up; it does not repeat the entire search by default.

Send only necessary history. Keep worker reasoning transcripts out of the verifier package. Reuse a worker's useful context for targeted repairs and keep its route explicit on resume if the host supports that control.

The coordinator handles dependencies and integration while workers execute. Do not duplicate their assignments. Inspect completed artifacts, not only summaries. A repair packet includes the concrete failure, affected artifact, expected correction and relevant acceptance check. Simple defects go back to the same worker; repeated capability failure re-runs lookup with `failed_candidate_ids`. Architectural ambiguity goes to frontier planning, then back to an appropriate worker.

On interruption, preserve completed artifacts, current owners, unfinished work and relevant failures in the task's existing plan or status file. Resume from those facts. A worker crash or partial attempt is not a pass and its cost is not zero.
