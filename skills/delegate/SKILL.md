---
name: delegate
description: Save subscription allowance by assigning bounded investigation and implementation to suitable lower-usage workers, from MVPs to large repositories. Use when the user invokes delegate or asks for usage-efficient delegation. Worker and reviewer packets do not reactivate it.
---

Optimize the complete path to the requested quality: coordinator, workers, integration, verification and repairs. Subscription allowance is the goal, not the smallest raw token total. Prefer attributable allowance measurements; model-specific cost estimates are provisional proxies, never bills. Missing usage stays unknown. Change no user configuration.

If given a worker or reviewer packet, execute it and return; do not reactivate this skill.

## 1. Choose the path

Direct execution is valid at any size when the complete delegated path is unlikely to save allowance. Tiny work usually stays direct without helper calls. Do not pre-solve an investigation merely to decide whether to delegate it. When evidence is missing, use the bounded workflow below as a declared heuristic, not a proven saving. Honor explicit worker/model/review requests and disclose material tradeoffs once.

Repository size and language do not determine eligibility. Bound the current assignment, not the whole repository. For unfamiliar or large repositories, cross-package features and bugs, read [context-discipline.md](context-discipline.md) before investigation. Keep frontier work for consequential decisions and acceptance; use workers for useful investigation and settled changes when the expected whole-task cost is lower.

## 2. Ordinary host dispatch

Ordinary delegation uses the actual host's available models and task permissions. It does not require a qualification-pack entry. This is an explicit product policy, not new evidence about model capability. If the user or project requires evidence-qualified routing, use step 3 instead; never silently fall back from that policy.

Read the [Codex](hosts/codex.md) or [Claude Code](hosts/claude-code.md) host guide. Once per session, bind two slots from the actual selectable model/effort controls: `economy` for straightforward search/extraction/precise edits, `standard` for reproduction and implementation. Choose the least expected allowance cost capable of each role using current host descriptions and available economic evidence. No extra model call, invented model roster, or universal price assumptions. Omit an unsupported slot; never silently downgrade standard work to economy. Explicit user model choices override this heuristic.

| Assignment | Starting slot | Boundary before dispatch |
| --- | --- | --- |
| `locate_behavior` | economy | Question, search anchors and permitted source area; read-only |
| `summarize_sources` | economy | Supplied sources and question; live discovery is a different task |
| `specified_edit` | economy; standard at medium risk | Exact transformation and regression checks |
| `reproduce_failure` | standard | Symptom and authorized local checks; no production side effects |
| `implement_feature` | standard | Behavior, owned change area, interfaces and acceptance checks |
| `implement_fix` | standard | Frontier-accepted reproduction and diagnosis |
| `implement_ui` | standard | Agreed interface and rendered/interaction acceptance |
| `implement_plan` | standard | Settled cross-component contracts and dependency order |
| `frontier_decision` | frontier | Conflicting evidence, architecture, product or consequential choices |

Run `node <skill-folder>/scripts/local-learning.mjs dispatch -` with `{host, assignment, risk, bounded:true, workers:{economy:{model,effort},standard:{model,effort}}, cwd}`. Use an absolute project working directory; the helper derives repository identity, shared across Git worktrees. No matching scope label is needed; the brief defines ownership. Use exact host controls, null for genuinely unavailable effort. Add `diagnosis_accepted:true` for fixes or `plan_settled:true` for plans only after those conditions hold. The helper selects one slot and returns a verification choice, not a savings claim.

Assess risk from the actual actions and blast radius, not the repository's size. A read-only investigation inside a critical system can be low risk, but secrets, production access and consequential writes retain their real restrictions. High/critical assignments return to frontier risk review; narrow safe fact-finding can be dispatched separately without relabeling risky actions. Medium-risk bounded changes need not be tiny or JavaScript.

For required independent review, pass `independent_review:true` and an available frontier `reviewer:{model,effort}` satisfying project independence rules; use a fresh context. Otherwise the frontier coordinator verifies, without requiring membership in a historical pack lane. Confirm tool access and configurable controls before launch; compare observations afterward when the host exposes them. Unknown served settings stay unknown. A substitution rejects the selected treatment; never relabel it eligible.

## 3. Evidence-required dispatch only

When required, use `route` with `{host, assignment, risk, coordinator:{model,effort}}` and read [pack-format.md](pack-format.md). `lookup` remains diagnostic. The task must fit route.scope as returned by lookup, read literally. Preserve expiry, host, reviewer and independence requirements. A gap ends this path: report it and perform only authorized frontier work or ask for direction. Do not switch to ordinary dispatch to bypass policy. The old pack's narrow fixture scopes and missing TypeScript/reproduction/live-web evidence remain unchanged.

## 4. Execute and verify

Use the five-field investigation brief or bounded implementation [work order](delegation-contract.md). Workers return decisive evidence, checks and the specific unresolved decision, not raw search dumps. The frontier resolves that decision and returns a bounded follow-up; preserve useful worker context and recheck controls when changing roles. See [task-classes.md](task-classes.md) for coupled work and [swarm-policy.md](swarm-policy.md) only for independent workstreams.

Keep targeted repairs with the same worker. On repeated failure without progress, exclude its model via `failed_models` in ordinary dispatch (or candidate via `failed_candidate_ids` in evidence routing), then use a suitable stronger worker or direct execution. Do not pay for repeated failed attempts merely to preserve delegation.

Wait for every launched worker to reach a terminal state. Inspect actual sources, diffs, tests and rendered UI as appropriate under [verification-policy.md](verification-policy.md). Reverify repairs and integrated changes, then stop when acceptance is met. A launch acknowledgement or worker summary is not completion.

## 5. Small feedback and delivery

After verification of an ordinary delegated assignment, including investigation, run `node <skill-folder>/scripts/local-learning.mjs observe -` with this JSON shape on stdin:

`{cwd,host,task_id,assignment,mode:"delegated",worker:{model,effort},acceptance,checks,repairs,usage:null}`

Use a unique task id, unchanged across retries; record once when they end. Include all worker repair attempts. Acceptance is `accepted`, `failed`, `blocked` or `rejected`; checks are `passed`, `failed` or `unverified`. **Frontier inspection confirming the decisive sources counts as `passed` for an investigation; no check command is required.** A worker's assertion alone is not verification. Accepted requires passed checks; missing verification stays unverified, never a manufactured success.

No start/capture/finish sequence, new evidence file or extra model call. `scope` is optional descriptive metadata, not a matching key. Feedback groups by repository, host, assignment and model/effort over 30 days, surviving guidance edits. Counts are project-level failure/repair warnings, not like-for-like performance or savings evidence. Recording failure does not block delivery. Direct samples are for explicit comparisons only.

Read [local-learning.md](local-learning.md) only for evidence receipts, optional telemetry or history controls—not routine observation. Report concise results, checks, actual models/efforts and material limitations; unknown usage stays unknown.
