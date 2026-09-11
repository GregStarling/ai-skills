# Local learning and session advice

The coordinator runs the packaged helper; workers do not. It uses the existing Node runtime and built-ins only; never install a runtime for it. The helper never launches a model: a separate reviewer is launched by the host and only recorded through `finish`. No daemon, uploads, unrelated-chat monitoring or edits to shared routing. If the helper is unavailable, continue with baseline routing and mention the limitation once; `unavailable` is a learning failure, not a task failure.

Run `node <skill-folder>/scripts/local-learning.mjs <command> <input.json | ->` (`-` reads stdin). Use absolute paths. Each command prints one JSON line. Keep input files in local task artifacts, never in the installed folder. State lives in `$DELEGATE_STATE_HOME`, else `$XDG_STATE_HOME/delegate`, else `~/.local/state/delegate`. Git worktrees share project identity; hosts and non-git projects stay isolated; replacing the skill folder preserves state.

## Normal path

A direct task is `start` then `finish`. A delegated task is `start`, `lookup`, then `finish`. Run the real verification once through `capture` mid-task and reference it at `finish`.

### start

Required: `cwd`, `host` (`codex` or `claude`), `session_id`, `task_class`, `risk`. Optional: `run_id`; `task_id` (reuse across repairs); `parent_run_id` for a fresh-session handoff; `host_version` (observed from the host binary's `--version` when omitted; the source is recorded as `caller`, `path_binary` or `unknown`); `scope` (optional; without it comparable work is keyed by task_class + risk + research_kind, a declared default); `research_kind` (null, `supplied_sources` or `live_web`); `origin` (`production_usage`, or `qualification_evaluation` for trials); `baseline_digest`. Returns the ids, `skill_folder_digest`, `guidance_digest` and inline `advice` (`modePreference`, `workerPreference`, `localPreferences`; `status` `disabled` when learning is off). Apply advice only when it fits the present task and explicit instructions; it never invents a route and is not qualification. Works with learning disabled.

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
- Output: `receipt` (`delegate_receipt.v3`), `evidence_supported`, `receipt_path`, `reason` (`skill_changed_during_run` when the folder changed mid-run; that row is excluded from later advice). Report `receipt_path`. If recording fails, preserve the artifacts and state the gap. Older v2 receipts still load.

`record` and `advise` remain for compatibility; `start` already returns advice.

## What counts (declared defaults, not qualification)

A positive preference needs at least five evidence-supported tasks per compared option in 30 days on the same project, host, host version and version source, with comparable scope. Direct rows compare by `guidance_digest` (the folder without `routing-pack.json`), so a pack refresh does not reset direct learning; delegated rows stay bound to the exact pack digest. Rows from different host-version sources are never compared. One unsupported comparable receipt still yields baseline advice. Quality failures and repair burden precede cost; elapsed time is a labeled proxy. Estimates, tokens and rounded allowance deltas are not subscription spending.

## Corrections, settings, reset

`correct`: `cwd`, `host`, stable `event_id`, `run_id`, short `reason`, optional evidence references; corrections append without rewriting originals. `status` reports counts and settings. `disable` takes `target` (`learning` or `reminders`) and `enabled` (default false; true re-enables); the reminders target also accepts a positive `max_per_session` (default 1). `reset` clears this project's host-specific learning, captures and exported receipts only when the user asks; never reset to improve apparent performance.

## Session reminders

At a meaningful milestone call `advise` with `cwd`, `host`, `run_id` and `reminder`. Required booleans: `safe_boundary`, `remaining_work`, `active_workers`, `coupled_investigation`, `rediscovery_required`, `completed_context_dominates`, `next_phase_independent`. Describe observed conditions honestly. Include a `handoff` with `objective`, `constraints`, `decisions`, `checkout_state`, `completed_checks`, `evidence_locations`, `next_action` and `unresolved_risks`.

If the host exposes a reliable signal, include `signal: {kind: "host_pressure" | "compaction", observed_at, source}`; optional `context_used_tokens` and `context_window_tokens` carry host measurements and trigger nothing by themselves. No universal token, message or session-age thresholds apply. Without telemetry, a safe milestone plus completed-context dominance and an independent next phase permits advice labeled qualitative judgment. A host signal alone never establishes savings or a need to restart.

If `suggest` is true, explain briefly why the boundary helps and include the returned compact handoff. Do not stop work, fork, compact or restart automatically. Default to once per session. Record an explicit reply with `reminder: {response: "accepted" | "dismissed" | "continued"}`; never infer acceptance from silence. A full-history fork is not a compact handoff.
