# Claude Code host

Read this file only when running in Claude Code. Prefer the active Agent tool (named Task in some versions). Match the selected treatment using explicit controls or an existing matching agent definition. A native model alias may be used for a provisional treatment when it resolves to that treatment; record the requested alias and actual observed model separately. Do not treat an unverified alias as a pinned qualified snapshot. Omit effort for `not_applicable` models.

Check effective settings: native model precedence and substitution behavior vary by version. Available-model restrictions or environment overrides may change the requested route. Record substitutions and choose another eligible treatment. Do not alter global user configuration.

If Agent cannot express the selected effort, an already-installed authenticated `claude -p` child is a native fallback. Pass `--model` and, when applicable, `--effort`; use the authorized workspace, compact work order and permissions. Preserve its output/usage and inspect the result. Do not add `--fallback-model`. Use a fresh process for independent review; `--no-session-persistence` alone does not remove inherited project instructions. Do not use `--bare`, which changes authentication requirements. Never install another runtime or introduce API keys during delegation. If neither native path can express the treatment, skip it.

For a noninteractive child, provide task-scoped `--allowedTools` for already-authorized reads, edits and verification commands; `--permission-mode acceptEdits` alone does not authorize Bash checks. Preserve the host's permission boundary and report denied checks instead of retrying them repeatedly or claiming they ran. Keep project settings enabled when testing installed `/delegate` discovery; an empty `--setting-sources` disables that discovery.

Skills can be discovered under `.claude/skills/delegate/` for a project or `~/.claude/skills/delegate/` for personal use and invoked as `/delegate`. Installation must copy the complete folder, including the routing pack and references. This repository's source location is intentionally inert.

Sources checked 2026-09-10: [Claude skills](https://code.claude.com/docs/en/skills), [native subagents and effective model/effort controls](https://code.claude.com/docs/en/sub-agents). Follow the active host's schema when its capabilities differ from current documentation.
