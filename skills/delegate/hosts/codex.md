# Codex host

Suggested saved starting model: `gpt-5.6-terra`, reasoning `medium`. Frontier slot: `gpt-6-astra`, reasoning `high`, when exposed by this host. Bind the actual current coordinator rather than claiming a skill switched it. Select these defaults only in a separately authorized setup; normal task routing never changes user configuration.

This skill explicitly requests automatic bounded delegation, including mandatory fresh frontier review. Use native subagents without asking for routine launch confirmation. A missing permission should be surfaced immediately with its actual controlling restriction; unavailable tools/models or provider limits are different blockers.

After checks and required review, call the helper's `complete` command once with the accepted v3 observation payload from [local learning](../local-learning.md). Deliver accepted completion only after `status:"completed"`. A dispatch result or reviewer PASS alone does not persist completion; no separate final dispatch-then-observe sequence is needed.

Read this file only when running in Codex. Inspect the active native subagent schema and available model/effort combinations. Supply both selected controls explicitly when supported. Desktop and CLI rosters can differ. A model mentioned in a document is not proof of session access. Provisional evidence may establish effective configuration without proving the served model; preserve that distinction in the receipt.

Some desktop spawn tools expose `model`, `reasoning_effort` and `fork_turns`. Where full-history forks forbid overrides, use no history or a suitable partial fork plus a compact work order. Do not send unsupported fields to another host's tool. Existing custom-agent configuration may affect effective model/effort; check the resulting selection and record any mismatch. For independent frontier review always set `fork_turns:"none"`, `model:"gpt-6-astra"` and `reasoning_effort:"high"`; full and partial history are decision/worker options only. Reuse native workers for targeted follow-ups. Do not create user-visible tasks or modify global defaults to implement routing.

When native spawn cannot express a treatment but an authenticated Codex CLI is already available, use `codex exec -m <model> -c 'model_reasoning_effort="<effort>"' --json` in the authorized workspace. Preserve event output and usage. A fresh process provides a separate conversation for review, with inherited environment/project instructions still disclosed. Do not install a CLI, change user configuration or add API keys. If neither native path supports the treatment, report the actual blocker and leave mandatory frontier acceptance incomplete.

Sources checked 2026-09-10: [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills), [native subagents and model/effort configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents). The active tool schema determines which controls can actually be supplied.

For research/PDF sampled audits use a fresh independent economical reviewer: Terra/medium on Codex or Sonnet with supported effort on Claude. Bind `cheap_reviewer` separately from frontier. No frontier identity is needed for ordinary source checks. Frontier planning/decision work does not by itself require a second reviewer; implemented behavior does. Preserve exact execution/review-scoped user overrides.
