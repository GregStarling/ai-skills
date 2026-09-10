---
name: delegate
description: Use a portable evidence-qualified routing pack to assign any task to the cheapest suitable available worker, then have a frontier model verify completion. Use when the user invokes delegate or asks for cost-effective delegated execution.
---

Run **frontier coordination → qualified worker → integration → frontier verification → targeted repair → acceptance**. The user supplies the task. This entire folder is the consumer product: no Foreman, Node installation, governor service, registry setup or extra API keys are required.

## Read and route

Read [routing-pack.json](routing-pack.json) and the applicable [Claude](hosts/claude.md) or [Codex](hosts/codex.md) host guide. Use [task-classes.md](task-classes.md) to classify the task or its workstreams. Load other references only when their step applies.

Use the pack's exact task/risk/constraint stratum and evidence scope, not just a matching class label. Select from its compiled ladder intersected with the models, efforts, tools and material controls actually available in this host. Preserve candidate × effort identity and the compiled order, including any incumbent retained by promotion rules. Do not invent a fresh model hierarchy, reinterpret examples as routes or require both providers.

Before execution, ensure an eligible frontier coordinator/verifier is available. If the current coordinator matches the pack's frontier requirements, it can perform final review. Otherwise use an eligible frontier session. Unknown capability is not proof of eligibility. Inspect effective dispatch settings and record substitutions; a host's silent fallback does not count as the requested route.

Compare full timestamps against the actual current clock with time zones; a local calendar date alone does not establish that a UTC timestamp is in the future. Use `refresh_after` to report an update due; never use a future-dated, expired, malformed or simulation pack for real dispatch. Missing qualification, unmatched scope or an empty host intersection produces a specific blocked result. Do not manufacture a route, weaken policy or run maintainer evaluations during the user's task. Request an updated pack or an explicitly authorized alternative and preserve any useful planning already completed. The checked-in pack may honestly have no qualified routes; that does not establish operational readiness.

## Execute

Give one worker a compact [delegation contract](delegation-contract.md). Even a tiny task uses a worker followed by frontier verification; the packet and checks scale down. The frontier handles architecture, UI judgment, task boundaries and integration, while the worker implements.

For multiple independent workstreams, read [swarm-policy.md](swarm-policy.md). Default to at most three concurrent workers, with a normal ceiling of five further limited by the host/project. Settle interfaces and ownership first; use dependency-ordered waves. A full project remains your responsibility through its requested outcome, not its first milestone.

If a candidate is unavailable, try the next eligible compiled route and explain the fallback briefly. Keep repairable defects with the original worker. If a failure demonstrates insufficient capability or repeats without progress, advance to another eligible route; architectural ambiguity returns to frontier planning. Do not silently turn the frontier into the implementation worker or bypass required independence.

## Accept

Apply [verification-policy.md](verification-policy.md). Frontier verification is always required, with depth proportional to the task. Inspect actual artifacts and relevant tests, rendered UI/interaction evidence, source-supported claims or calculations. Verify the integrated final result and every material correction.

Deliver once acceptance is met and no material defect remains. Avoid repeated reviews, speculative polish and infrastructure work. Respect the user's scope and permissions throughout.

Report the models/efforts actually used, meaningful fallback or repair decisions, verification and material limits. Report token/cost totals only when observed. Do not conflate requested settings, measured evidence, source-format validation and installed host invocation.
