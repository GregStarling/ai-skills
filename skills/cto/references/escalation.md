# Escalation protocol

Use at CTO's stuck threshold, or when delegate requires it sooner. Discover
capabilities in order: environment routing policy; delegation mechanisms;
model-selection controls; high-reasoning modes; available frontier agents;
other installed compatible assistants; fresh context with the strongest current
model. Use only exposed controls and capabilities. Read applicable host guidance
rather than guessing commands or model IDs. Missing a preferred model must not
stop progress while useful alternatives exist. Do not install assistants, change
credentials, relax permissions, or change saved defaults to obtain escalation.

## Clean engineering brief

Provide relevant context, not the full conversation:

- Work-item goal and relation to the overall plan.
- Exact failure, reproducing command, complete relevant error output, and minimal
  reproduction where practical. Redact secrets without hiding diagnostic facts.
- Every tested hypothesis, attempted fix, and measured result.
- Relevant files, architectural constraints, and behavior that must remain.
- Verification command or observable acceptance test defining success.
- Permitted write scope and whether the expert implements or advises.

Request explicit root cause, proposed fix, implementation or actionable guidance,
and verification. Record the capability actually used and its result.

## Rungs

1. **Strongest available reasoning:** route the bounded failure using current
   policy and actual capabilities. Implement and verify the result.
2. **Fresh diagnosis:** if that fails, use a fresh context and, when available,
   another frontier model family. Include prior evidence and findings, but ask
   for independent diagnosis rather than endorsement of the previous solution.
   Verify the new result.
3. **Reroute architecture:** after repeated expert failures, question the approach
   while preserving the required outcome. Consider simpler architectures,
   alternative libraries/APIs, replacement dependencies, different state models,
   reduced coupling, or different integration boundaries. Log the decision and
   reversal cost; implement and verify the best supported route.

If no separate expert is available, perform a deliberate fresh diagnostic pass
with the strongest current capability; disclose that it is not independent
review. Never invent a model switch or expert verdict. An unavailable mandatory
review or exhausted execution allowance is an external limitation; record it
specifically and still complete all useful independent work.

Never cycle through the same failed attempts. Select a new hypothesis, gather
decisive evidence, or replace the strategy. Failed technical approaches remain
unfinished technical work, never successful completion.
