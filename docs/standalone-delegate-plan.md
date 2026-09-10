# Standalone delegate skill

Historical implementation plan. Its requirement to dispatch a worker for every task size is superseded by the [current consumer contract](delegate-host-project-evidence-plan.md#current-consumer-contract) and [installed skill source](../skills/delegate/SKILL.md). The earlier implementation scope and acceptance evidence below are preserved as history; they do not override the current direct-versus-delegated choice.

At the time of this plan, the product definition superseded the earlier engine-first scope and the initial direct/single/parallel draft: route the task to the cheapest capable available model, then have a frontier model verify completion. Targeted repairs return to the worker; demonstrated capability failures justify escalation. This was the default for every task size in that release.

Foreman is not a runtime prerequisite. Model Governor remains an optional governed-execution capability; mandatory user/project policy still applies when used. The user supplies the task, not engine bindings or work-order JSON.

1. Keep the skill centered on worker routing, compact context, frontier verification and targeted correction. Split large tasks only when useful, retaining the same loop per assignment and final integration verification.
2. Verify observable worker execution and frontier review using explicitly selected models. Earlier direct-execution trials are exploratory evidence of the superseded draft and did not validate that release’s routing rule.
3. Keep library documentation and structural checks honest. Do not globally install skills or claim slash-command discovery in either host from source validation.

Completion of the source update does not establish numerical cheapest-model optimality or installed-host slash invocation. Report those limits separately; do not manufacture prices or token savings.
