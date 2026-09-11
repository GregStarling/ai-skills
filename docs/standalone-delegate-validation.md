# Historical Standalone Validation

This is a pre-refactor trial record, not the current installation or host-support status. The trial did not test installation or slash-command discovery at the time. For the current install path, use the [README](../README.md#install) and [install guide](install.md). These trials do not qualify routes in the current pack; see [routing-pack validation](routing-pack-validation.md) for that implementation.

## Pre-refactor routing trial

A fresh disposable cart bug was assigned explicitly through the native subagent tool to `gpt-5.6-luna`, low reasoning effort. The host describes this model as fast and affordable; the trial does not establish that its pricing is the absolute minimum among every eligible model.

The worker changed the quantity default from `|| 1` to `?? 1`. The frontier coordinator independently inspected the exact change, confirmed that the worker had not altered the tests, and reran all three tests. The pre-change zero-quantity regression failed; all three tests passed afterward. The coordinator did not implement the fix. No Foreman, governor binding, dependencies, global installation or provider configuration changes were involved.

Retained local evidence: `artifacts/standalone-delegate/routed-result.json`, `routed-before.txt`, `routed-after.txt`, and the copied `routed-bug/` fixture. Token/cost totals were not exposed by the trial tools, so no savings claim is made.

## Earlier exploratory trials

The superseded draft was exercised on a local bug, supplied-facts plan comparison and a small issue-triage UI. All chose direct execution. The UI had four passing Node tests plus actual desktop/mobile browser interaction checks; the coordinator inspected its source and screenshots and independently reran the four tests. Those artifacts demonstrate task execution and relevant verification, but do not validate the current model-routing rule. They are retained under `artifacts/standalone-delegate/` rather than relabeled as current routing evidence.

## Repository checks and limits

All 176 existing library tests, type checking and build passed. The Node/YAML source validator passed; the bundled Python validator could not run because that interpreter lacks PyYAML. Source validation is explicitly structural and requires no built governor CLI.

The routed trial covers one bounded task with native Codex subagent tools and explicitly supplied skill source. It did not establish automatic cheapest-model selection across accounts, a large project's complete repair/integration cycle, Claude-host execution, installed slash-command invocation, or measured token savings. Those claims require their own observations.
