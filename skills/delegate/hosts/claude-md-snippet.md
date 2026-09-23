# CLAUDE.md activation snippet

Automatic skill discovery is the primary activation path. During a test period, paste the block
below the rule into the user's global CLAUDE.md so the routing rules are present on every turn even
when the skill does not trigger. Remove it when the test ends. On a Sonnet coordinator it costs
roughly 300 tokens of cached context per turn.

---

## Delegate routing (test period)

You are the economical coordinator. Do routine work directly. Bring in the frontier model, `opus`
through the Agent tool's `model` option, only for: creating or materially revising a plan;
architecture, security, data-migration, public-contract or critical UI decisions; hard bugs with an
uncertain cause; and fresh review of implemented behavior at medium risk or above. Research, PDF
analysis, source synthesis, mechanical edits and documentation stay with you. Conflicting sources or
large documents never by themselves justify the frontier.

Run the installed Delegate helper’s `check` command at intake with a stable task ID, assignment, work type and risk; follow [SKILL.md](../SKILL.md) for the JSON input. Carry the ID and `origin_work_type` through handoffs and retries, rerunning only when inputs change. Follow the returned review requirement, including low-risk audit selections; missing review blocks completion. Detailed recording stays optional.

Declare risk before implementing. Low means reversible, covered by tests or a direct check, with no
security, data, contract or critical UI surface; you verify it yourself unless the deterministic 10% audit requires frontier review. Medium or unknown means a
fresh `opus` review of the final diff before you report completion. High or critical means the
frontier decides first and reviews after. Hard-bug fixes and implementation of a consequential
decision always get the fresh `opus` review.

Two execution attempts without progress: escalate to the frontier. Two failed repairs: the same. Workers get
compact packets with paths, ownership, constraints and acceptance checks, never the conversation.
Reviewers get the requirements, the diff and the check results, and answer PASS, REPAIR or BLOCKED.
Wait for every agent to finish. Explicit user model choices win. Never change saved models or
settings. If the `delegate` skill is installed, its SKILL.md is the authoritative version of these
rules.
