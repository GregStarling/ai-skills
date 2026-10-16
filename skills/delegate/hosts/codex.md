# Codex host

Read this only when running in Codex.

Start sessions on the coordinator from the [Roles](../SKILL.md#roles) table. A skill cannot change
saved defaults; bind the coordinator the session actually runs.

The primary frontier is `gpt-6.1-sol` at high reasoning for plans, decisions, hard bugs and fresh
reviews. It can share the coordinator's model while using a separate context. `gpt-6-astra` is
only a rescue option after the stuck-build conditions in [SKILL.md](../SKILL.md#escalate-and-repair)
are met. Task risk, a required review, retries or unavailable Sol access do not authorize Astra.

## Launch controls

- Use native subagents. Where the spawn tool exposes `model`, `reasoning_effort` and `fork_turns`, set all three explicitly. Desktop and CLI rosters differ; a model named in a document is not proof of access.
- Independent review always uses `fork_turns:"none"`, `model:"gpt-6.1-sol"` and `reasoning_effort:"high"`, and a compact packet. Full or partial history forks are for decision and worker follow-ups only. A rescue does not make Astra the subsequent reviewer.
- Reuse a worker for targeted repairs instead of relaunching. Wait for every child to finish before delivering.
- Routine launches inside the authorized task need no confirmation. Honor explicit no-delegation instructions. Missing models, provider limits and tool gaps are availability blockers, not permission requests.

## Fallback

When native spawn cannot express a treatment and an authenticated Codex CLI exists,
`codex exec -m <model> -c 'model_reasoning_effort="<effort>"' --json` in the authorized workspace is
the fallback. A fresh process gives independent review a separate conversation; inherited project
instructions still apply and should be disclosed. Do not install a CLI, change configuration or add
API keys.

## Helper inputs

The mandatory ordinary `check` needs no host/model fields or saved state; see [SKILL.md](../SKILL.md). For optional evaluation commands such as `dispatch` or `complete`, pass `host:"codex"`.

Sources checked 2026-10-11: [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills),
[native subagents and model/effort configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents).
