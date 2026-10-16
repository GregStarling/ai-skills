# Claude Code host

Read this only when running in Claude Code.

Start sessions on the coordinator from the [Roles](../SKILL.md#roles) table. A skill cannot change the
saved model; only the user does, in settings.

Use Opus 5.5 as the primary frontier, selected with `model:"opus"` through the Agent tool or
`--model claude-opus-5-5` through the CLI fallback. Verify that `opus` actually serves Opus 5.5.
Never launch `fable` or any `claude-fable-*` model for execution, review, retries or fallback,
even when an older role binding or routing pack lists it. Missing Opus 5.5 access is a blocker.

## Launch controls

- Use the Agent tool (named Task in some versions). Its `model` option takes an alias such as `haiku` / `sonnet` / `opus` and selects the child: a worker model for workers, the frontier model for planning, decisions and review. Select the frontier explicitly; never let a frontier packet inherit the coordinator model.
- Agents start with a fresh context and do not share the parent's cache. Give them paths and requirements, not the conversation.
- The Agent tool has no effort option. Agent-definition frontmatter can set effort for a named agent, but that does not create an invocation-time control. So record an Agent-tool child's effort, worker or reviewer, as `"not_applicable"`: no effort was requested, and the served host default (possibly inherited from the coordinator) is unobserved. Use `null` only when you do not know whether an effort was requested; it never matches a pack treatment. In a routed `finish`, `not_applicable` binds only a treatment that also requested none, such as the Haiku worker. A treatment routed at a set effort, such as the Sonnet worker at `low` or the Opus reviewer at `high`, returns `WORKER_NOT_IN_ROUTE` or `REVIEWER_NOT_IN_ROUTE`; never record that effort for an Agent-tool run. A routed attempt binds such a treatment only through the fallback below, so the `host_treatments` you pass to `lookup` list Agent-tool children at `not_applicable` and fallback children at the effort the fallback sets. Do not start a CLI child merely to tune effort for unrouted work.
- Do not assume `Explore` runs on a cheaper model; it can inherit the coordinator's model. Pass `model` explicitly when cost matters.
- Wait for every launched agent to reach a terminal state before delivering. A background task ID is a launch acknowledgment, not a result.
- Routine agent launches inside the user's authorized task need no extra confirmation. Honor explicit no-delegation instructions. Report missing models, quota stops and tool gaps as availability blockers, not permission requests.

## Fallback

If a required control cannot be expressed through the Agent tool, or an evidence-required treatment
needs exact model and effort, an already authenticated `claude -p` child with `--model` and
`--effort` is the fallback; frontier work uses `--model claude-opus-5-5`. Use a fresh process for independent review, task-scoped `--allowedTools`
for already authorized reads, edits and checks, and the authorized workspace. Do not add
`--fallback-model` or `--bare`, install another runtime, or introduce API keys.

## Helper inputs

The mandatory ordinary `check` needs no host/model fields or saved state; see [SKILL.md](../SKILL.md). For optional evaluation commands such as `dispatch` or `complete`, pass `host:"claude"`, not `"claude-code"`.

## Activation

The skill description drives automatic discovery. For a guaranteed second path during a test
period, add the [CLAUDE.md snippet](claude-md-snippet.md) to the user's global CLAUDE.md.
