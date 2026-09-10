# Codex host

Read this file only when running in Codex. Inspect the active native subagent tool schema and available model/effort combinations. Supply both selected controls explicitly when supported. A model mentioned in a document is not proof that the session can use it. If required controls are unavailable, exclude that route; do not claim the parent model is the selected cheaper worker.

Some desktop spawn tools expose `model`, `reasoning_effort` and `fork_turns`. Where full-history forks forbid overrides, use no history or a suitable partial fork plus a compact work order. Do not send unsupported fields to another host's tool. Existing custom-agent configuration may affect effective model/effort; check the resulting selection and record any mismatch. Reuse native workers for targeted follow-ups. Do not create user-visible tasks or modify global defaults to implement routing.

Codex discovers project skills under `.agents/skills/delegate/` and personal skills under `~/.agents/skills/delegate/`. Copy the entire folder and invoke it through the host's skill selector or supported named-skill syntax. Do not promise identical slash-menu syntax across app and CLI versions. This repository's source directory is intentionally not an installed skill.

Sources checked 2026-09-10: [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills), [native subagents and model/effort configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents). The active tool schema determines which controls can actually be supplied.
