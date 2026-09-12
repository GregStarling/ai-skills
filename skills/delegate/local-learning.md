# Tracked evidence and history controls

Read Ordinary completion below for every eligible task; later receipt and history sections apply only when relevant. The helper uses existing Node built-ins, launches no models and uploads nothing. A successful required v3 observation is part of completion. Repair recording errors locally; if recording remains blocked, report the limitation and do not claim accepted completion.

Run `node <skill-folder>/scripts/local-learning.mjs <command> <input.json | ->` (`-` reads stdin). Use absolute paths. Each command prints one JSON line. Keep input files in local task artifacts, never in the installed folder. State lives in `$DELEGATE_STATE_HOME`, else `$XDG_STATE_HOME/delegate`, else `~/.local/state/delegate`. Git worktrees share project identity; hosts and non-git projects stay isolated; replacing the skill folder preserves state.

## Ordinary completion (v3)

Use one final `complete` call for every eligible accepted direct or delegated task with
`observation_version:3` and `acceptance:"accepted"`. It reuses v3 observation validation and atomic
persistence, returning `status:"completed"`, `task_id` and `artifact_digest` only after success.
Missing evidence, persistence errors and disabled recording fail; they never report completion.
Retries preserve task-ID idempotency. `observe` remains available for non-accepted outcomes and
existing callers; v1/v2 inputs and interpretation remain historical compatibility only.
Include `cwd`, `host`, stable `task_id`, `assignment`, `work_type`, `risk`, `bounded:true`,
`mode`, `worker` (null for direct), `acceptance`, `checks`, `repairs`, `coordinator`,
`artifact_files`, `artifact_digest`, `check_evidence`, `attempts`, `elapsed_ms`, and `usage`.
Include selected `frontier` or `cheap_reviewer` only where needed. Use `implemented_behavior:true`
for mixed decision-and-implementation segments; preserve actual classification through repairs.

Dispatch accepts only `phase:"execute"` or `phase:"complete"`. Use the latter to determine review
requirements; `review` and `escalate` are outcomes, not phases. Supply the exact selected `frontier`
whenever a frontier decision, execution or review is required. Resolve any blocked dispatch before
claiming that stage is complete. Dispatch only selects a route; a reviewer PASS does not replace
the final `complete` command. Do not run a separate final dispatch-then-observe sequence.

Save actual check results to a task-relative evidence file. `check_evidence` is a nonempty array
of `{path,digest}` with each digest the SHA256 of that file's bytes. All evidence paths are relative
to `cwd` and may not escape it. The aggregate `artifact_digest` comes from the helper `artifacts`
command over `artifact_files`; it is not a raw single-file digest. Accepted observations verify
these bytes. Preserve every owned final deliverable and do not modify it after review.

`checks` is exactly `passed`, `failed` or `unverified`; there is no `partially_verified` value.
For fixes, include `diagnosis_accepted:true` after establishing the cause, in dispatch and the
`complete` payload. For implementation of an accepted plan, carry `plan_settled:true`
and `decision_evidence`. Copy the selected `frontier` identity into observations even when the
coordinator executed the fix. The review's model field does not replace `frontier`.

Choose one evidence workspace `cwd` at intake and use it for artifact hashing, reviewers and `complete`.
When host session metadata supplies `cwd` and `artifact_files`, use them verbatim. Nested source
repositories do not change this base. Save checks under the evidence workspace's `.delegate/`.
Hash final artifacts before requesting review and never recompute a different-base digest afterward.

Fix completion payload for `node <skill-folder>/scripts/local-learning.mjs complete -`
(replace paths/hashes and attempts with executed evidence):

```json
{"observation_version":3,"cwd":"/absolute/session-workspace","host":"codex","task_id":"stable-task-id","assignment":"implement_fix","work_type":"routine_fix","risk":"medium","bounded":true,"diagnosis_accepted":true,"implemented_behavior":true,"mode":"direct","worker":null,"coordinator":{"model":"gpt-5.6-terra","effort":"medium"},"frontier":{"model":"gpt-6-astra","effort":"high"},"acceptance":"accepted","checks":"passed","repairs":0,"artifact_files":["nested-repo/src/fix.ts"],"artifact_digest":"sha256:<aggregate>","check_evidence":[{"path":".delegate/checks.txt","digest":"sha256:<file-bytes>"}],"review":{"verdict":"PASS","fresh_context":true,"model":"gpt-6-astra","effort":"high","artifact_digest":"sha256:<same-aggregate>"},"attempts":[{"role":"reviewer","model":"gpt-6-astra","effort":"high","status":"accepted","observed_model":null}],"elapsed_ms":null,"usage":null}
```

For required frontier decision/execution, include an accepted `frontier` attempt and
`execution_evidence:[{path,digest}]` referencing the saved agent response/decision. Planning uses
`assignment:"frontier_decision",work_type:"planning"`; record the frontier execution even though
no second reviewer is needed. Accepted implementation uses `decision_evidence:{path,digest}`;
a hard-bug handoff uses `hard_bug_handoff:{reproduction,root_cause,correction,regression_check}`,
each a verified `{path,digest}`. Keep the concrete reason in `routing_reason`/`escalation`.

`review` is null or `{verdict:"PASS"|"REPAIR"|"BLOCKED",fresh_context:true,model,effort,artifact_digest}`.
A required review must match the selected role: frontier for implemented behavior, cheaper for
sampled research/PDF/source audits. No frontier is required for ordinary source checks. A review
PASS needs an accepted reviewer attempt. Each attempt is `{role,model,effort,status,observed_model}`
with role coordinator/worker/frontier/reviewer/repair and status accepted/failed/blocked/rejected.
Unknown observed model is null, not an invented identity. Include children and continuations.

Example unsampled research payload for the same `complete` command (replace task ID and all placeholder hashes with real values;
run dispatch first to determine whether a cheap audit is required):

```json
{"observation_version":3,"cwd":"/absolute/project","host":"codex","task_id":"stable-task-id","assignment":"summarize_sources","work_type":"research","risk":"low","bounded":true,"mode":"direct","worker":null,"coordinator":{"model":"gpt-5.6-terra","effort":"medium"},"acceptance":"accepted","checks":"passed","repairs":0,"artifact_files":["findings.json"],"artifact_digest":"sha256:<aggregate>","check_evidence":[{"path":"checks.txt","digest":"sha256:<file-bytes>"}],"attempts":[],"elapsed_ms":null,"usage":null}
```

Scoped explicit model requests use `user_model_override:{scope:"execution"|"review"|"both",model,effort,instruction}`
with the actual user instruction. They never weaken host permissions. Observations distinguish
exceptions from standard policy acceptance. Do not invent an override to pass a gate.

Clear resolved signals only with evidence, retaining the escalation and attempts in the observation.
Research failures remain cheap tool/worker recovery or explicit limitations. V3 stores normalized
`policy_input`, `rule_id` and `review_requirement`; validators recompute, not trust those labels.
Observations are feedback, not proof of native agent launches, qualification or savings.

## Evidence-routed / explicitly tracked path

For evidence-routed work, run `route`, then `start` with its `task_class`, `capture` for real verification when due, and `finish` once. If start returns a worker preference, rerun `route` with `cwd` and `run_id` to apply it within eligible evidence. Direct recording remains available for explicit comparisons. An ordinary host assignment cannot become a routed receipt just because its class name matches. Explicit out-of-route evaluations preserve their separate harness artifacts and disclosed scope; they do not widen pack authority.

### route

Required: `host`, `risk`. Pass `assignment` from the entrypoint table for a single decision, or omit it for coverage with literal scopes and gaps. Optional `coordinator`, `failed_candidate_ids`, `host_treatments`, `supports_fresh_context`, `pack_path`, `cwd` and `run_id` work as in `lookup`. Live discovery must set `research_kind: "live_web"`. Output includes the mapped `task_class`, pack and route metadata, one `worker`, `verification` (`coordinator` or `separate` with reviewer), scope-check requirement, host checks, limitations and gap. These aliases reuse existing routes without widening their scope. No state is created by ordinary routing.

### start

Required: `cwd`, `host` (`codex` or `claude`), `session_id`, `task_class`, `risk`. Optional: `run_id`; `task_id` (reuse across repairs); `parent_run_id` for a fresh-session handoff; `host_version`; `scope`; `research_kind` (null, `supplied_sources` or `live_web`); `origin` (`production_usage`, or `qualification_evaluation` for trials); `baseline_digest`. Returns the run and task ids plus compact advice. Apply advice only when it fits the present task and explicit instructions; it never invents a route or proves savings.

### lookup

Required: `host`, `task_class`, `risk`. Optional: `coordinator` `{model, effort}` (needed for `coordinator_may_verify`), `failed_candidate_ids` (reviewers are independent of the first listed worker only, so re-run after a fallback), `host_treatments` (what the host actually offers; `host_verified` stays false until supplied), `supports_fresh_context`, `pack_path`, or `cwd` + `run_id` to fold in this project's local preferences read-only. Pure: reads the pack, writes nothing, works with learning disabled. Omit `task_class` for per-host coverage. `gap` is one of `DECOMPOSITION_REQUIRED`, `ROUTE_NOT_FOUND`, `HOST_CAPABILITIES_INSUFFICIENT`, `NO_ELIGIBLE_WORKER`, `NO_ELIGIBLE_FRONTIER_REVIEWER`; a null `coordinator_may_verify` comes with `coordinator_verify_reason` (`coordinator_not_supplied`, `coordinator_not_in_reviewer_lane`, `fresh_process_required`). Local preferences only reorder workers within the same evidence basis; they never change the reviewer or invent a route.

### capture

Required: `cwd`, `host`, `run_id`, `command` (argv array, no shell). Optional `timeout_ms` (default 30000, max 600000). Runs the check once, stores request, exit and output under the state directory, and returns `reference` `{path, digest}`, `exit_code`, `signal`, `error` and 4,096-character output tails. It is not an extra model call; do not repeat completed checks. No secrets in arguments or output. A passing exit still needs your judgment that the check establishes the requested behavior.

### finish

Input shape (replace the illustrative values):

```json
{"cwd":"/abs/project","host":"claude","run_id":"<from start>","mode":"delegated","acceptance":"accepted","relevant_checks_complete":true,
 "coordinator":{"model":"claude-opus-5","effort":null,"observed":null},
 "checks":[{"name":"unit tests","kind":"test","reference":{"path":"/abs/state/evidence/<capture>","digest":"sha256:<hash>"}},
           {"name":"build","kind":"artifact","command":["npm","run","build"]}],
 "inspected":[{"name":"diff review","kind":"review","outcome":"passed"}],
 "attempts":[{"role":"worker","model":"claude-haiku-4-5-20251001","effort":"not_applicable","outcome":"accepted",
              "evidence":[{"path":"/abs/state/evidence/<capture>","digest":"sha256:<hash>"}]}],
 "pack_path":"<skill-folder>/routing-pack.json","stratum_digest":"<route.stratum_digest from lookup>","usage":null}
```

- `finish` needs a prior `start` (`RUN_NOT_STARTED`) and is idempotent per `run_id`: a second call returns the stored receipt and runs nothing.
- `checks` kinds are `test`, `artifact` and `calculation`. Each entry carries exactly one of `command` (run once by the helper) or `reference` (a capture of this run; `CHECK_REFERENCE_UNKNOWN` otherwise). Exit 0 is passed, non-zero failed, error or signal unverified. The real verification never runs twice.
- `inspected` kinds are `review`, `visual` and `source`. Their verdicts are caller-asserted at the same trust as `acceptance` and never go in `checks` (`CHECK_KIND_INVALID`). Delegated work needs a review verdict (and a `reviewer` attempt unless you verified with `coordinator_may_verify` true); live research needs source verdicts.
- Inside a git repository the helper snapshots `git status --porcelain` and `git diff` (in `artifact_cwd`, default `cwd`) and attaches it to the coordinator attempt and every inspected verdict. Outside a repository nothing is attached, so a direct receipt there is unsupported unless `coordinator.evidence` references are supplied.
- `coordinator.effort` may be null and the receipt can still be evidence-supported (declared default). Routed `worker`, `reviewer` and `repair` attempts need `model` and `effort` and resolve to the route's `candidate_id` (`WORKER_NOT_IN_ROUTE`, `REVIEWER_NOT_IN_ROUTE`). Include every failed launch, fallback and repair; `outcome` defaults to `acceptance`. Keep `observed` separate from configured, null when unknown; a contradiction leaves the receipt unsupported.
- Attempt outcomes are `accepted`, `failed`, `blocked`, or `rejected`. In compact `finish` inputs only, `unavailable` means `blocked`: inability to execute, never successful completion. For an attempted launch that exits unsuccessfully, use `{"role":"worker","model":"<selected model>","effort":"<selected effort>","outcome":"failed"}` with its evidence. Other invalid outcomes return `ATTEMPT_OUTCOME_INVALID` before artifact snapshots, checks, or receipt writes. Full receipt objects and `record` remain strict and reject `unavailable`.
- Every `worker`, `reviewer` and `repair` attempt needs at least one `evidence` reference `{path, digest}` to a file that still verifies (a `capture` reference of this run, or the returned artifact with its `sha256:` digest); the git snapshot is attached only to the coordinator attempt and inspected verdicts, so an attempt without evidence leaves the receipt unsupported.
- `mode` `delegated` requires `pack_path` and `stratum_digest`. A direct finish omits `attempts`, `pack_path` and `stratum_digest`: the helper binds attempts to a route only, and a `worker` or `repair` attempt on a direct receipt is `RECEIPT_MODE_CONFLICT`.
- `usage` is null unless observed: `{metric, unit, value, source:{path,digest}, complete}` with metric `attributable_cost`, `allowance`, `api_equivalent` or `tokens`; `complete` true only when all coordinator, worker, review, failure and repair work is included. No observation means null, never zero.
- The same optional usage shape is accepted by `observe`; mark partial counters incomplete. Tokens remain diagnostic; model-specific, cache-aware estimates are provisional judgments, not learned subscription savings. Never launch a model to obtain telemetry.
- CLI output is compact: `status`, `evidence_supported`, `receipt_path` and `reason`. The full `delegate_receipt.v3` is stored at `receipt_path`. Report that path. If recording fails, preserve the artifacts and state the gap. Older v2 receipts still load.

`record` and `advise` remain for compatibility; `start` already returns advice.

## What counts (explicit measurements only; not qualification)

A positive preference needs at least five evidence-supported tasks per option in 30 days on the same project, host/version and comparable scope. Direct rows require explicit comparison; delegated rows stay bound to the pack digest. Incomplete or unverified work prevents advice. Quality and repair burden take precedence; economic comparison requires complete, valid observations with the same metric and unit across all rows (`allowance` or `attributable_cost`). Missing, mixed, partial or estimated usage and raw token counts cannot break a tie. Elapsed time never changes preferences. Quality/repair preferences make no savings claim. Lookup's baseline price proxies remain separate from learned usage. Ordinary observations never enter this qualified-receipt comparison.

## Corrections, settings, reset

`correct`: `cwd`, `host`, stable `event_id`, `run_id`, short `reason`, optional evidence references; corrections append without rewriting originals. `status` reports counts and settings. `disable` takes `target` (`learning` or `reminders`) and `enabled` (default false; true re-enables); the reminders target also accepts a positive `max_per_session` (default 1). `reset` clears this project's host-specific learning, captures and exported receipts only when the user asks; never reset to improve apparent performance.

Ordinary observations are caller-reported feedback, not qualified receipts. `status` counts them, disabled learning suppresses them and their history, and `reset` removes them too. Their stored guidance digest is provenance only: editing the skill does not hide prior outcomes. Old free-text scope labels remain stored but do not filter ordinary history. Strict receipt comparability above is unchanged.

## Session reminders

At a meaningful milestone call `advise` with `cwd`, `host`, `run_id` and `reminder`. Required booleans: `safe_boundary`, `remaining_work`, `active_workers`, `coupled_investigation`, `rediscovery_required`, `completed_context_dominates`, `next_phase_independent`. Describe observed conditions honestly. Include a `handoff` with `objective`, `constraints`, `decisions`, `checkout_state`, `completed_checks`, `evidence_locations`, `next_action` and `unresolved_risks`.

If the host exposes a reliable signal, include `signal: {kind: "host_pressure" | "compaction", observed_at, source}`; optional `context_used_tokens` and `context_window_tokens` carry host measurements and trigger nothing by themselves. No universal token, message or session-age thresholds apply. Without telemetry, a safe milestone plus completed-context dominance and an independent next phase permits advice labeled qualitative judgment. A host signal alone never establishes savings or a need to restart.

If `suggest` is true, explain briefly why the boundary helps and include the returned compact handoff. Do not stop work, fork, compact or restart automatically. Default to once per session. Record an explicit reply with `reminder: {response: "accepted" | "dismissed" | "continued"}`; never infer acceptance from silence. A full-history fork is not a compact handoff.
