# Claude Code host

Use `host:"claude"` in helper inputs, not `"claude-code"`.

Read this file only when running in Claude Code. For ordinary dispatch, prefer the active Agent tool (named Task in some versions): bind economy to Haiku and standard to Sonnet when available, using its explicit `model` option (`haiku` / `sonnet`). Honor explicit user choices. Do not assume Explore runs on a cheaper model; it can inherit the coordinator's model.

Check the active tool schema before launch. Agent-definition frontmatter can set effort; that does not imply an invocation-time effort option exists. Record effort as `null` when neither controlled nor observable, and omit unsupported invocation fields. Do not start a CLI child merely to tune ordinary worker effort or create custom agents/global settings just for these slots.

Check effective settings: native model precedence and substitution behavior vary by version. Available-model restrictions or environment overrides may change the requested route. Record substitutions and choose another eligible treatment. Do not alter global user configuration.

Record requested aliases and actual observed models separately; an alias is not a pinned qualified snapshot. For evidence-required routing, match the selected treatment using explicit controls or an existing matching agent definition; omit effort for `not_applicable` models. If a required native capability is unavailable, or an evidence-required treatment needs controls Agent cannot express, an already-installed authenticated `claude -p` child is a fallback. State that reason, pass `--model` and applicable `--effort`, and use the authorized workspace, compact packet and permissions. Preserve output/usage and inspect the result. Do not add `--fallback-model`. Use a fresh process for independent review; `--no-session-persistence` alone does not remove inherited project instructions. Do not use `--bare`, install another runtime, or introduce API keys. If neither path can express required controls, skip the treatment.

For a noninteractive child, provide task-scoped `--allowedTools` for already-authorized reads, edits and verification commands; `--permission-mode acceptEdits` alone does not authorize Bash checks. Preserve the host's permission boundary and report denied checks instead of retrying them repeatedly or claiming they ran.

Run a single CLI worker in the foreground. For parallel workers, wait for every child and collect each exit status and output before returning from the coordinating shell. If the host backgrounds a command, use its completion tool and wait until that task finishes; a background task ID is only a launch acknowledgement. Never deliver or end the coordinator turn while child work is still active. For a full project, keep store and view ownership disjoint, then integrate and inspect the combined artifacts after both workers complete.

Sources checked 2026-09-11: [Claude skills](https://code.claude.com/docs/en/skills), [native subagents and effective model/effort controls](https://code.claude.com/docs/en/sub-agents). Follow the active host's schema when its capabilities differ from current documentation.
