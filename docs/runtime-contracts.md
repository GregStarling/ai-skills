# Model Governor runtime adapter contracts

Verified 2026-09-09. Read-only inspection; no live model tasks, authentication changes, installations, or project writes.

## Installed runtime observations

- `codex --version`: **codex-cli 0.142.5**. Executable `/Users/gregpro/.local/bin/codex` links to `/Users/gregpro/.codex/packages/standalone/current/bin/codex`.
- `claude --version`: **2.1.222 (Claude Code)**. Executable `/Users/gregpro/.local/bin/claude` links to `/Users/gregpro/.local/share/claude/versions/2.1.222`.
- CLI help and emitted schema are stronger evidence of this installed version's syntax than stale examples online. Official pages themselves contain some conflicting/stale examples: do not turn illustrative model names or a static effort enum into constitution.

## Recommended adapter boundary

Render provider-native files from the validated binding, but separately preflight effective runtime overrides and collect execution receipts. A correct file alone cannot prove which model answered, whether fallback occurred, or which context reached review. Unsupported or unobservable requirements must produce an explicit blocked/unknown result, never an invented success receipt.

Generated files should include binding hash, policy version/hash, adapter version, supported runtime version, generated header, exact candidate/model/effort, and only material serving settings. Keep both native files and a small machine-readable manifest so drift is detected over the complete output file set, including missing/extra generated files.

## Claude native agent and skill shape

Current project locations: `.claude/agents/<name>.md`, `.claude/skills/<skill>/SKILL.md`; corresponding personal locations under `~/.claude/`. Agent Markdown uses YAML frontmatter and body instructions. Required agent fields: `name`, `description`. `model` accepts full model ID; `effort` is supported in agent frontmatter. Minimal compiler output (placeholders deliberately not real bindings):

```text
---
name: governor-reviewer
description: Independently review the bounded assignment.
model: <bound canonical model ID>
effort: <bound supported effort>
tools: Read, Glob, Grep
---
Review only the admissible review package. Return the required evidence contract.
```

Do not emit persistent `memory` for an independent reviewer. A worktree provides filesystem isolation; it is not by itself conversation isolation. Agent definitions load at session start. Current native tool is Agent (Task was renamed; old references remain aliases). Source: [Claude subagents](https://code.claude.com/docs/en/sub-agents).

Common portable skill frontmatter should contain `name` and `description`; Claude-specific `context`, `agent`, `effort`, dynamic shell injection, etc. belong in its adapter wrapper. Claude skill locations and extensions are documented in [Claude skills](https://code.claude.com/docs/en/skills).

### Claude effective configuration hazards

Model selection precedence for subagents: `CLAUDE_CODE_SUBAGENT_MODEL` > per-invocation model > definition model > parent model. Effort: `CLAUDE_CODE_EFFORT_LEVEL` overrides agent/skill frontmatter, which overrides session effort. A conflicting environment override must block or be explicitly set to the binding in the child process, without changing the user's global settings. [Subagents](https://code.claude.com/docs/en/sub-agents), [model configuration](https://code.claude.com/docs/en/model-config).

Installed help confirms `--model`, `--effort` with low/medium/high/xhigh/max, `--agents <json>`, `--agent`, `--settings`, `--setting-sources`, `--output-format json|stream-json`, `--json-schema`, `--no-session-persistence`, `--session-id`, `--fallback-model`, `--continue`, `--resume`, `--fork-session`, `--strict-mcp-config`. Supported efforts remain model-dependent; CLI enum membership is not model qualification. `--fallback-model` explicitly enables fallback in print mode and accepts a comma-separated sequence. Do not add it to a no-fallback candidate. Absence alone does not prove the provider never rerouted requests. [CLI reference](https://code.claude.com/docs/en/cli-usage).

### Claude fresh context and receipts

A non-fork subagent starts without the parent's full conversation, but loads environmental instructions and relevant CLAUDE.md/memory and preloaded skills. A fork inherits conversation and is inappropriate for critical fresh review. A separate `claude -p` process without resume/continue/fork starts a new conversation; `--no-session-persistence` controls storage, not context isolation. Installed `--bare` also suppresses auto-memory and CLAUDE.md discovery but requires API-key-style Anthropic authentication and does not use OAuth/keychain; do not use it silently with a subscription workflow. Avoid claiming fresh-package-only isolation unless inherited instruction/memory sources are recorded or constrained.

Stream/result evidence can identify session, assistant message model, per-model usage, cost, duration, and completion subtype. `total_cost_usd` and `modelUsage[model].costUSD` are **client estimates**, not bills; source and pricing version matter. Result `usage` excludes subagents; `modelUsage` and total cost include them. Deduplicate assistant messages by message ID. In streaming-input mode result cost/modelUsage totals are cumulative across the call (and reset with clear/reset/new), so summing every result double-counts. Preserve errors and absent usage as unknown. [Cost tracking](https://code.claude.com/docs/en/agent-sdk/cost-tracking).

## Codex native shape

Current official guidance prefers **standalone** `.codex/agents/<name>.toml` (or `~/.codex/agents/`) containing required `name`, `description`, `developer_instructions`; files are session config layers. Example:

```toml
# GENERATED FILE — source metadata here
name = "governor_reviewer"
description = "Independently review the bounded assignment."
model = "<bound canonical model ID>"
model_reasoning_effort = "<bound supported effort>"
sandbox_mode = "read-only"
developer_instructions = """
Review the admissible review package and return the evidence contract.
"""
```

Standalone agent file model and effort take precedence over explicit spawn values; before the file applies, resolution is explicit spawn > `[agents]` defaults > parent. Explicitly set **both** model and effort: model-only custom files preserve the effort resolved earlier. Runtime sandbox overrides may be reapplied from parent, so do not claim a reviewer file alone enforces read-only. [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents).

Legacy role registrations `[agents.<name>] description=... config_file=...` remain in [config reference](https://learn.chatgpt.com/docs/config-file/config-reference); prefer one shape with explicit version compatibility, not duplicated registrations. Project config cannot override machine-local provider/auth routing; project configs load only in trusted projects. General precedence: CLI overrides > closest project layer > selected profile > user > system > defaults. [Config basics](https://learn.chatgpt.com/docs/config-file/config-basic).

Skills: portable repo path `.agents/skills/<name>/SKILL.md`; user path `~/.agents/skills/`; discovery scans cwd to repo root. Required frontmatter `name`, `description`. Do not assume `.codex/skills` is the current project convention because installed user skills also exist there. [Skills](https://developers.openai.com/codex/skills).

### Codex CLI and fresh context

Installed help confirms `codex exec -m <model> -c model_reasoning_effort=\"<effort>\" --json --output-schema <path> -o <path> -C <cwd>`, `--ephemeral`, `--ignore-user-config`, `--ignore-rules`, `--strict-config`, and sandbox choices read-only/workspace-write/danger-full-access. Model effort is a config override, not a standalone `--effort` CLI flag. A fresh `codex exec` invocation is distinct from `exec resume`; ephemeral only prevents transcript persistence. `--ignore-user-config` is not a promise that all instruction sources are absent. [Non-interactive mode](https://developers.openai.com/codex/noninteractive).

For native subagents inspect the active host's spawn schema: this Codex desktop exposes `fork_turns="none"` for no parent conversation and full-history forks inherit model/effort, making explicit model overrides incompatible with full-history fork. These desktop tool semantics are host capabilities, not guaranteed CLI stable API. For a programmatic fresh-context boundary, app-server `thread/start` is distinct from `thread/fork`/resume; supply only the review input and audit instruction sources. No live fresh-context task was executed in this investigation.

### Codex observed machine-readable capabilities

Read-only `codex app-server generate-json-schema --out /tmp/model-governor-codex-schema` succeeded. Files establish:

- `v2/ThreadStartParams.json`: explicit model, modelProvider, config, cwd, developerInstructions, baseInstructions, ephemeral, serviceTier.
- `v2/ThreadStartResponse.json`: model, modelProvider, reasoningEffort, serviceTier, instructionSources, thread identity and effective sandbox.
- `v2/TurnStartParams.json`: explicit per-turn model/effort/serviceTier overrides.
- `v2/ModelReroutedNotification.json`: fromModel/toModel/reason/threadId/turnId; installed reason enum `highRiskCyberActivity`. Preserve as contamination evidence; this does not provide a documented no-rerouting switch.
- `v2/ModelVerificationNotification.json` is **not** snapshot proof: its verification enum is only `trustedAccessForCyber`.
- `v2/ThreadTokenUsageUpdatedNotification.json`: token usage scoped to thread/turn.
- Installed `ReasoningEffort` schema is a nonempty string advertised by the model, not a fixed global enum.

CLI JSONL documented `turn.completed.usage` includes input_tokens, cached_input_tokens, output_tokens, reasoning_output_tokens. It does not document an authoritative billed-dollar value or model-served receipt in that event. Never convert unavailable costs to zero. App-server effective model response proves configuration; it does not independently attest weights served. Integration tests should use real captured versioned stream fixtures before claiming broader receipt support.

## Canonical identity versus aliases

Do **not** require a date suffix as proof of pinning. Anthropic explicitly documents dateless IDs from 4.6 onward as immutable snapshots; older dateless convenience IDs can be aliases. `claude-opus-5` and `claude-fable-5-1` are release IDs; `opus`/`fable` are runtime aliases. Pinning qualification must use versioned official identity evidence rather than regex alone. Serving infrastructure can change while weights remain fixed. [Anthropic versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions).

OpenAI's fetched current Astra page explicitly lists `gpt-6-astra` as both model ID and current snapshot, without a date suffix. Thus OpenAI pinning also must accept provenance-backed dateless canonical snapshots. The page lists API effort low/medium/high/xhigh/max, while host interfaces may advertise additional modes; preserve runtime/auth-surface capability records separately. [GPT-6 Astra](https://developers.openai.com/api/docs/models/gpt-6-astra).

Read-only `codex debug models --bundled` saved `/tmp/model-governor-codex-models.json`. Its bundled roster contains older GPT-5.5/5.4-era entries and is not a current availability source; do not qualify from it. `codex debug models` without bundled refreshes catalog (not invoked). Version/capability capture and discovery must distinguish bundled metadata, account-accessible catalog, provider canonical ID evidence, and runtime observations.

## v1 acceptance implications

1. Render and verify valid native outputs without installing into personal skill directories.
2. Keep date/model examples in evidence and adapter fixtures, never policy.
3. Test alias rejection and provenance-backed dateless snapshot acceptance.
4. Test effective-override mismatch, unsupported effort, unavailable model, missing usage, reroute and mixed-model receipts.
5. Review receipts must bind artifact hash plus context-package hash and real session/context identity; a caller-supplied boolean is insufficient proof by itself.
6. No executed model calls were used here; label generated native files as compiler-verified until an authorized runtime smoke verifies loading and emitted receipts.
