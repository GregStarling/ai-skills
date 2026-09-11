# Redacted historical trace excerpts

These are parser fixtures, not new executions or performance evidence. Source paths are
`artifacts/installed-delegate/<run>/coordinator/stdout.jsonl` (gitignored).
Full-source SHA256 values below bind the unedited local traces. Selected host fields,
usage counters, tool shapes and error messages are preserved; prompts, outputs,
identifiers and temporary paths are redacted. Claude helper and tool-event timestamps
come from the source event. Other envelope receive times are synthetic, solely for
parser tests: historical traces did not record receive times. Do not infer wall-clock
performance from these excerpts. Real new runs stamp stdout on receipt.

| Excerpt | Source run | Full trace SHA256 |
| --- | --- | --- |
| `claude-mechanical.timed.jsonl` | `claude-mechanical-1789072141448` | `sha256:d67ae7b1f61890770752ec94178c6c83e638ec61d3c3cb812494d765af8e6189` |
| `claude-helpers.timed.jsonl` | `claude-research-local-learning-claude-research-20260910a` | `sha256:5f0f6dca75af3deeea46823a5631761b5a203ec9b3cd9cd4e857f8f8ad673198` |
| `codex-mechanical.timed.jsonl` | `codex-mechanical-1789007904533` | `sha256:c4cc94c397601eee372ea4e4d473872fa277b8b8a3ea4a3af05df99cb7885646` |
| `codex-blocked.timed.jsonl` | `codex-research-local-learning-codex-research-20260910a` | `sha256:efefc75712a3416ea1791d7dcdbc032884fc50f48accfd8696c5fa676bda7ca2` |
