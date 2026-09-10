---
name: delegate
description: Route a task to the least expensive available model capable of completing it, then have a frontier model verify the actual result. Use when the user invokes delegate or asks for cost-effective delegated execution of any task.
---

Use this loop: **cheapest capable worker → frontier verification → targeted correction when needed**. The coordinator owns the user's complete outcome. This applies to a bug, interface, project, research, writing or analysis task. Small tasks still use worker execution and frontier verification; their work orders and checks should simply be smaller.

The skill uses the host's available model and agent tools. It requires no Foreman or separate orchestration service. Do not require the user to construct a registry, binding or work-order JSON. Honor explicit user choices, task permissions and any mandatory project governance.

## Route

Identify the task's acceptance conditions and the capabilities it actually needs: tools, context, reasoning, modality and permissions. From the models available in this session, choose the lowest-cost candidate with credible evidence it can satisfy those needs. Use available pricing/configuration and relevant prior task results; do not assume the smallest model is always sufficient. Optimize cost to a correct accepted result, including retries and review.

Use an available frontier model as verifier. If the calling coordinator is already a frontier model, it performs that review; otherwise route review to one. Keep worker and verifier roles distinct even when a difficult task needs a frontier worker. Do not silently default execution to the current expensive model or skip verification to save a handoff.

Do not invent model availability, prices, capability evidence or savings. If the exact cheapest eligible model is uncertain, choose using the best available cost/capability information and label the uncertainty briefly. Do not launch a benchmark campaign before doing the task. If the host cannot select a worker model or provide frontier verification, state the missing capability and request a supported alternative rather than claim the required routing occurred.

## Execute

Give the worker a compact packet: outcome, necessary context and source/artifact paths, owned scope, constraints, acceptance checks and expected return. Send relevant decisions rather than the entire conversation. Ask for actual artifacts, checks and unresolved issues, not a transcript. Reuse the worker's context for repairs.

Default to one worker assignment. Split a large task only where independent work makes completion more efficient; route each assignment by the same rule. Establish shared interfaces, keep ownership disjoint or isolate overlapping edits, and integrate dependent work in order. Carry the project through the requested outcome, not just its first milestone.

## Verify and correct

The frontier verifier examines actual output and relevant evidence against the acceptance conditions; a worker's completion claim is insufficient. Check bug behavior, integrated feature flows, rendered UI interactions, source-supported claims or calculations as appropriate. Run required project checks. Review the final combined artifact after integration.

If a material defect remains, return the specific finding and expected correction to the worker. Keep the same worker when the repair is within its capability. If failure demonstrates a capability mismatch or repeats without progress, route the remaining work to the next more capable suitable model; do not loop blindly on the cheapest one. The frontier model verifies the corrected result before accepting it. Frontier execution is an escalation, not the default shortcut.

Once acceptance is met and meaningful checks pass, deliver and stop. Do not add review agents, speculative polish or infrastructure cleanup without a concrete need. Preserve permissions: routing does not authorize unrelated publication, messages, destructive actions or spending.

Report the result, worker/verifier models actually used, verification and material limitations. Include token/cost totals only when observed; otherwise leave them unknown. Distinguish tested source behavior from actual slash-command installation and host invocation.
