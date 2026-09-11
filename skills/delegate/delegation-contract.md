# Worker contract

Supply a compact work order in the conversation, not a user-authored configuration file:

- **Outcome:** the requested result and acceptance criteria.
- **Context:** relevant source/artifact paths, established decisions and interfaces.
- **Ownership:** files/components or an isolated workspace; preserve unrelated work.
- **Constraints:** tools, permissions, task risks, deadlines and authorized budget.
- **Route:** `candidate_id`, `model`, `effort` and `serving` as returned by lookup. The sha256 identity belongs in the receipt, not the packet.
- **Return:** actual changed artifacts, checks and results, blockers and concise findings.

Send only necessary history. Keep worker reasoning transcripts out of the verifier package. Reuse a worker's useful context for targeted repairs and keep its route explicit on resume if the host supports that control.

The coordinator handles dependencies and integration while workers execute. Do not duplicate their assignments. Inspect completed artifacts, not only summaries. A repair packet includes the concrete failure, affected artifact, expected correction and relevant acceptance check. Simple defects go back to the same worker; repeated capability failure re-runs lookup with `failed_candidate_ids`. Architectural ambiguity goes to frontier planning, then back to an appropriate worker.

On interruption, preserve completed artifacts, current owners, unfinished work and relevant failures in the task's existing plan or status file. Resume from those facts. A worker crash or partial attempt is not a pass and its cost is not zero.
