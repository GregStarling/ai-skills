# Claude Code host

Read this only when running in Claude Code.

Saved starting model for the test period: `sonnet`. Frontier: `fable`. A skill cannot change the
saved model; only the user does, in settings.

## Launch controls

- Use the Agent tool (named Task in some versions). Its `model` option selects the child: `haiku` / `sonnet` for workers, `fable` for frontier planning, decisions and review. Select `fable` explicitly; never let a frontier packet inherit the coordinator model.
- Agents start with a fresh context and do not share the parent's cache. Give them paths and requirements, not the conversation.
- The Agent tool has no effort option. Agent-definition frontmatter can set effort for a named agent, but that does not create an invocation-time control. Record effort as `null` when it is neither controlled nor observable. Do not start a CLI child merely to tune effort.
- Do not assume `Explore` runs on a cheaper model; it can inherit the coordinator's model. Pass `model` explicitly when cost matters.
- Wait for every launched agent to reach a terminal state before delivering. A background task ID is a launch acknowledgment, not a result.
- Routine agent launches inside the user's authorized task need no extra confirmation. Honor explicit no-delegation instructions. Report missing models, quota stops and tool gaps as availability blockers, not permission requests.

## Fallback

If a required control cannot be expressed through the Agent tool, or an evidence-required treatment
needs exact model and effort, an already authenticated `claude -p` child with `--model` and
`--effort` is the fallback. Use a fresh process for independent review, task-scoped `--allowedTools`
for already authorized reads, edits and checks, and the authorized workspace. Do not add
`--fallback-model` or `--bare`, install another runtime, or introduce API keys.

## Helper inputs

The mandatory ordinary `check` needs no host/model fields or saved state; see [SKILL.md](../SKILL.md). For optional evaluation commands such as `dispatch` or `complete`, pass `host:"claude"`, not `"claude-code"`.

## Activation

The skill description drives automatic discovery. For a guaranteed second path during a test
period, add the [CLAUDE.md snippet](claude-md-snippet.md) to the user's global CLAUDE.md.
