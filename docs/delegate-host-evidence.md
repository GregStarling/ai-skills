# Host controls observed September 10, 2026

This inventory accompanies the [usability trials](delegate-usability-results.md). Captures identify host behavior; eligibility still comes from the routing pack. No client was upgraded and no global settings or installed skills were changed.

| Surface | Model / effort controls actually evidenced | Context and write behavior | Usage and evidence limits |
| --- | --- | --- | --- |
| Claude Code native Agent, CLI 2.1.267 | Accepted `model: "haiku"`, `subagent_type: "general-purpose"`, and a bounded `prompt`. No effort field was supplied for this not-applicable-effort treatment. Forwarded messages identify `claude-haiku-4-5-20251001`. | Worker inherited project guidance and received explicit two-file ownership. Forwarded Read, Edit and Bash calls prove both writes and executed checks. Coordinator performed the final inspection. | Parent stream has worker tool events and per-model token/cache/output counters. Served effort is unavailable. The full Agent input schema was not captured, so this does not establish whether other effort fields or aliases exist. |
| Claude authenticated child CLI 2.1.267 | `--model claude-fable-5-1 --effort high` completed all three calibration reviews. Native request/process/version/stdout sources derive PARTIALLY_RUNTIME_ATTESTED. `--effort` was omitted for the Haiku worker. | Fresh process; calibration disables user/project settings and MCP configuration, with only the supplied artifact/checks in its directory. Worker has Read/Edit/Write/Bash; reviewer has Read/Bash. File hashes verify unchanged review artifacts. | Stream exposes served model IDs, usage and list-price client estimates, not served effort or subscription charges. Three Fable runs also expose auxiliary Haiku usage with no invocation count. |
| Codex native subagent, CLI 0.154.0 | Preserved native call contains `model: "gpt-5.5"`, `reasoning_effort: "low"`, `fork_context: false`. Child `turn_context` independently records model `gpt-5.5`, effort `low`. | Fresh worker packet with inherited project instructions, workspace-write sandbox, and two owned files. Child trace contains the actual apply_patch and Node check. | Child and coordinator expose separate cumulative token categories; do not assume they can be added without understanding host aggregation. Configured identity/effort is visible; served identity/effort is not. |
| Codex authenticated child CLI 0.154.0 | `-m gpt-6-astra -c model_reasoning_effort="high"` completed three calibration reviews; exact request/process/version/stdout sources derive CONFIGURATION_ATTESTED. | Fresh ephemeral calibration process; `--ignore-user-config --ignore-rules`; read-only reviewer, workspace-write worker. No conversation history is forwarded. | JSONL exposes input, cache-read, output and reasoning-output counters, with no authoritative billed dollars or served identity. A CLI success does not prove native subagent selectability. |

The raw native Codex call used `fork_context`; the desktop coordinator's exposed tool uses a different `fork_turns` control. These are separate surfaces. Do not copy one host's schema into another dispatch.

**Fable native alias remains unverified.** The earlier report of a native `fable` alias and missing Agent effort control was not accompanied by a preserved full schema in this execution. Neither the CLI help nor the successful Fable CLI reviews establish native Agent availability. Existing probe records therefore remain `native_agent_status: not_probed`; they were not rewritten from CLI evidence. When a selected, otherwise eligible treatment cannot express its effort natively, the existing authenticated CLI fallback remains the supported option.

## Concrete failure and resolution

The installed Codex coordinator attempted Spark/low through the child CLI. The sandbox prevented initialization of the CLI state database and in-process app server, before a worker ran. The failed call and output are preserved in the native coordinator transcript; the summarized CLI JSONL omitted that failed tool event. Delegate then selected the next eligible treatment, native GPT-5.5/low, which completed the write. No permissions were widened and no host plumbing was added.

That is an observed sandbox-specific limitation, not evidence that Spark is globally unavailable. It remains in the original receipt and is counted as a failed launch. Native traces were retained in addition to summarized JSONL so the attempt is auditable.

## Capture references

The [public evidence index](evidence/delegate-usability-2026-09-10/evidence.json) contains exact digests and relative names for the private originals under `artifacts/delegate-usability/20260910T183203Z/`:

- `claude-help.txt`, `claude-version.txt`, `codex-exec-help.txt`, `codex-version.txt`: actual local help/version captures, not online capability claims.
- `pilot-claude/coordinator/stdout.jsonl`: native Agent input, parent/worker model messages, actual Edit calls and frontier verification. Agent invocation ID `toolu_01J1cBEynjh1UC2urXbrKfrR` binds the forwarded worker events.
- `pilot-codex/native-coordinator.jsonl`: exact failed CLI call, native spawn arguments and coordinator checks. `native-worker.jsonl`: configured treatment, actual patch and executed checks.
- `calibration/<host>/<case>/<role>/identity-evidence.json`: native request, sanitized environment controls, process, version, stdout/stderr and their source bytes. Maintainer validators recompute assurance; report-written labels have no independent authority.

The full project transcripts stay private. Public fixture bytes are safe originals with their own digests. Missing native schema, served effort, internal invocation counts and subscription billing remain explicitly unknown.
