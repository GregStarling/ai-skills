# Parallel work

Use one worker by default. Swarm only when all of these hold: at least two independent workstreams, settled interfaces, disjoint ownership or isolated workspaces, meaningful time saved, and a coordinator who can verify the integrated result.

Do not swarm a small task, unsettled architecture, repeatedly overlapping edits, a sequential dependency chain or one subtle bug needing a coherent mental model. Separate API endpoints may run in parallel. Frontend and backend may run together after agreeing on their interface. A full project usually needs several dependency-ordered waves.

Start with at most **three concurrent workers**. The normal ceiling is **five**, further limited by the host's available slots and any stricter project rule. Do not change host settings to reach these numbers. These are coordination defaults, not measured model-performance claims.

Finish prerequisite decisions before starting dependent work. Give each writer a concrete scope and acceptance check. Use new waves as capacity frees up; do not start idle workers, recursively delegate orchestration or create user-visible tasks as an implementation detail. Integrate the outputs and have the frontier verifier check the combined result. Parallel completion alone does not establish integration correctness.
