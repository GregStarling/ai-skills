---
name: delegate
description: Use automatically for implementation, bug fixes, planning, critical decisions, research, PDF analysis, source synthesis, mechanical edits and review. Choose direct execution or bounded agents using prescribed execution and verification rules. Research and document processing stay economical; plans, consequential decisions and implemented-behavior reviews use frontier. Simple edits still receive a routing/audit decision. Exclude casual conversation, simple factual answers, creative drafting, voice-sensitive editing, and worker/reviewer packets.
---

Choose the least expensive complete path that preserves the requested quality, including
coordination, execution, checks and repairs. Unknown usage stays unknown. Ordinary routing
never changes saved models, permissions or configuration. If given a worker, decision or
reviewer packet, execute it and return without reactivating coordination.

## 1. Automatic coordination and authority

For tasks covered by this skill, proactively launch bounded agents when required for execution,
escalation, or review. This skill explicitly requests that delegation. Do not ask for confirmation
for routine agent launches within the user's authorized task. Preserve host permissions, task
boundaries, and any explicit restriction on delegation.

Activation chooses a path, not a mandatory worker. Direct execution is normal. Run intake dispatch and
final `complete` even for simple mechanical tasks so stable audits remain visible. Use bounded
workers for useful independent investigations or settled workstreams. Respect creative/voice exclusions.

Inspect actual host controls. For a genuine permission block, name the blocked action, controlling
tool/instruction and smallest needed permission change; ask once and retain the answer. Continue
independent authorized preparation. Missing tools/models and provider limits are availability
failures, not permission requests. Do not substitute or skip a required frontier decision/review.

Read the [Codex](hosts/codex.md) or [Claude](hosts/claude-code.md) guide. Bind the actual coordinator
and selected available roles as `{model,effort}` from host session metadata, not generic model
self-description. Null effort means unknown or uncontrollable. Preserve requested versus observed
identity. An observed substitution rejects the treatment; never relabel it eligible. Research can finish without any frontier access. Explicit user model choices apply only
to their stated execution/review scope; record exceptions without calling them ordinary-policy acceptance.

## 2. Classify the work, then apply the rule

Execution destination and review requirement are separate. Classify before routing and reclassify
when evidence changes. Work size, document length, file type and source count never independently
trigger frontier. A known prescribed rule overrides coordinator preference; unmatched work needs a
concrete routing reason after brief inspection. Unresolved classification goes to frontier unless
it is clearly information collection/processing, which stays economical.

| Work type | Execution and completion |
| --- | --- |
| `planning` | Frontier creates or materially revises plans. Check sources, constraints and acceptance criteria. Do not launch a second frontier solely because a plan was produced. Routine next-step bookkeeping is not planning. |
| `architecture`, `critical_ui_ux`, `accessibility_decision`, `security_decision`, `data_migration_design`, `public_contract_design`, `consequential_decision` | Frontier makes the consequential decision. Routine implementation may return to the coordinator; implemented behavior requires fresh frontier review. |
| `conflicting_evidence` | Compare source authority and report unresolved facts economically. A consequential choice arising from the conflict is a separate `consequential_decision` assignment. |
| `hard_bug`, `concurrency_bug`, `incident_diagnosis`, `performance_diagnosis` | Strong frontier default for uncertain causes and difficult fixes. Frontier may finish execution when handoff would lose context or duplicate work. Behavior-changing fixes receive fresh frontier review. |
| `approved_execution` | Coordinator follows a recorded accepted decision. New unresolved choices return to their prescribed route. Implemented behavior receives fresh frontier review. |
| `routine_implementation`, `routine_fix`, `substantial_refactor`, `regression_test` | Coordinator handles settled behavior; fresh frontier review is mandatory. A small diff cannot waive it. |
| `research`, `pdf_analysis`, `source_synthesis`, `source_lookup` | Coordinator or bounded cheaper workers gather, extract, compare, calculate and synthesize. Verify sources, citations, extraction and completeness. No automatic frontier execution/review, even when substantial or sources conflict. |
| `mechanical_edit`, `format_conversion`, `documentation_sync`, `cosmetic_ui`, `dependency_inventory`, `test_execution` | Coordinator performs exact edits, settled cosmetic changes, inventories or existing checks. Use proportionate checks and stable audits. Inventing behavior is not mechanical. |
| `other` | Provide `fallback_route` and a concrete `routing_reason`; uncertainty after inspection defaults to frontier. |

A request to read PDFs and create a plan has separate assignments: economical document analysis,
then a focused frontier planning packet with decisive passages and source paths. Frontier must not
repeat bulk collection. Contradictions alone, failed extraction, source access failures and two
unsuccessful research attempts do not authorize frontier; use suitable cheaper tools/workers or
report the limitation. Consequential decisions arising from findings are separate frontier work.

Before a cheaper hard-bug handoff, preserve evidence of reproduction, root cause, bounded correction
and regression check in `hard_bug_handoff`, each `{path,digest}` under the task directory. An
accepted plan/decision uses `decision_evidence:{path,digest}`. The helper verifies these referenced
bytes; unsupported flags or model confidence do not establish settled work. Record why the handoff
helps. Do not force a handoff when frontier can finish the difficult segment more effectively.

Two attempts without new evidence or measurable progress trigger frontier escalation for eligible
execution, sooner for decisive limitations. Keep bounded repairs with the executor, retest, and
obtain required frontier re-review of the new artifact digest. Two unsuccessful repair attempts
move difficult execution to frontier. User authorization remains separate from frontier judgment.

## 3. Dispatch and agent packets

Run `node <skill-folder>/scripts/local-learning.mjs dispatch -` at intake, when signals change and
to determine required review. Use a stable `task_id` through every retry. Read [local learning](local-learning.md)
for current v3 fields; never use historical compatibility modes for new observations.
The only dispatch phases are `execute` and `complete`; use `phase:"complete"` to determine required review.
`review` and `escalate` are outcomes, not valid phases. Supply the selected `frontier` identity whenever
its decision, execution or review is required, and resolve blocked dispatches before proceeding.
Inspect the returned JSON outcome; shell exit zero alone does not mean the dispatch was accepted.

Example research input (substitute actual identity and paths):

```json
{"host":"codex","cwd":"/absolute/project","task_id":"stable-task-id","assignment":"summarize_sources","work_type":"research","risk":"low","bounded":true,"phase":"execute","coordinator":{"model":"gpt-5.6-terra","effort":"medium"}}
```

Assignments are `locate_behavior`, `summarize_sources`, `specified_edit`, `reproduce_failure`,
`implement_feature`, `implement_fix`, `implement_ui`, `implement_plan`, and `frontier_decision`.
Use `specified_edit` for mechanical changes; do not invent assignment names.

For fixes, carry `diagnosis_accepted:true` after verifying the cause, including final observation.
Preserve the same workspace `cwd` and artifact paths from intake through review and observation;
use host session metadata for these paths when supplied. See complete fix example in local learning.

For a plan-only assignment use `assignment:"frontier_decision",work_type:"planning"`. Implementing
an accepted plan is `assignment:"implement_plan",work_type:"approved_execution"` with verified
decision evidence. Mixed decision-and-implementation segments set `implemented_behavior:true`;
implementation assignments cannot be relabeled as research to evade review.

Follow `outcome`: direct, delegate, escalate, review or blocked. Keep actual permission, tool and
limit signals separate. Supply `cheap_reviewer` for sampled research/document audits; this must be
an independent fresh cheaper context, never frontier. Stable 10% auditing remains keyed to task ID.
A research task is not escalated if no suitable independent cheap reviewer is available: report the
audit blocker. Other simple-task audits retain their frontier review requirement.

Use compact [work orders](delegation-contract.md) containing the original request, ownership,
permitted actions, sources, checks and stopping point. Reuse context for related decision/execution
follow-ups, but independent reviewers receive no inherited conversation. Read [context discipline](context-discipline.md),
[research](research.md), [task classes](task-classes.md) and [parallel work](swarm-policy.md) only when relevant.

For a frontier planning/decision child, name it beginning `decision`, select the frontier model and
supported effort explicitly, and require it to save the decision artifact. Its final response must
include `{ "role":"decision", "verdict":"PASS", "artifact_digest":"sha256:..." }` after checking
sources and acceptance criteria. Compute the digest with the helper's `artifacts` command over the
final owned files, not by hashing just their text. The coordinator verifies returned evidence.

## 4. Verify the completed deliverable

Fresh frontier review is mandatory for implemented features, behavior-changing fixes, substantial
refactors and other implemented behavior, regardless of who executed it. Planning or research alone
does not imply a second frontier review. For research/document outputs, directly inspect decisive
source locations, verify extracted values and citations, reproduce calculations and disclose gaps.

Compute `artifact_digest` with `node <skill-folder>/scripts/local-learning.mjs artifacts -` and
`{"cwd":"/absolute/project","files":["relative-owned-file"]}`. Include every final owned artifact.
Pass the digest to the required reviewer with original requirements, artifact paths, decisive sources
and actual checks. On Codex use `fork_turns:"none"`, explicit model/effort and a task name beginning
`review`. Never inherit execution history for independent review. Require terminal JSON with
`role:"reviewer"`, `verdict:"PASS"|"REPAIR"|"BLOCKED"`, and the matching `artifact_digest`, plus findings.
Use the same fresh-context protocol for a cheaper research audit. Any subsequent edit invalidates review.

Wait for every launched agent to reach a terminal state. Missing checks remain unverified. A partial
summary, launch acknowledgment or self-attested boolean never proves independent completion.
See [verification policy](verification-policy.md) for checks by artifact type.

## 5. Complete and deliver

After saving check evidence, hashing final artifacts and obtaining required review, call
`node <skill-folder>/scripts/local-learning.mjs complete -` once with the accepted v3 observation
payload. It validates and persists the observation before returning `status:"completed"`.
Only then deliver accepted completion. `dispatch` selects a route; even `phase:"complete"` with a
direct outcome does not record completion. A reviewer PASS alone does not complete the assignment.
If `complete` fails, repair the input using the documented assignment names and retry locally;
do not silently skip it. If file restrictions prevent required evidence, report the concrete blocker.
Record direct and delegated tasks, including all attempts, applicable
rules, handoff/escalation evidence, review role/result, actual identities, elapsed time and usage.
Honor an existing `DELEGATE_STATE_HOME`; never redirect evaluation observations to personal learning.
Pass JSON through a file or quoted heredoc. Accepted requires checks and the review required by the
shared policy; explicit user exceptions are recorded separately from normal acceptance.

Report results and material limitations. Unknown usage is not zero, qualification, or a savings claim.
Historical observations remain immutable. When evidence-qualified routing is required, use `route`
and [pack format](pack-format.md); preserve exact scope, identity, expiry and reviewer requirements.
The assignment must fit route.scope literally. Never switch to ordinary routing to bypass a qualification gap.
