---
name: context-budget
description: Keep the coordinating session small so a subscription usage window lasts. Use when starting a substantial task, when the session context is growing, before reading a PDF, spreadsheet, image, screenshot or long log, and when deciding whether a read or search belongs in a worker instead. Companion to delegate, which decides who does the work; this skill decides what the coordinator carries.
---

Everything in a session is re-sent to the model on every turn. On a subscription the binding constraint is the usage window, and the window is consumed mostly by that re-sending, not by the answers. The lever is the size and life of the coordinator's context: what enters it, how long it stays, and when it is cut.

This skill is a companion to the `delegate` skill in this repository. Delegate decides whether work is done directly or handed to a worker and how to verify it. This skill governs the coordinator's own context between those decisions. Where the two touch, delegate's direct-versus-delegated judgment wins; this skill adds the cost of carrying the result.

## What the measurement showed

One user's 14 days of Claude Code transcripts (Sep 2026, API list price as a proxy for usage) gave the order of leverage. Treat these as one sample, not a law, and remeasure with [measure/burn.mjs](measure/burn.mjs) before changing the defaults below.

- About 71 percent of proxy cost was cache reads, meaning context re-sent on later turns. Output tokens were about 8 percent.
- Nearly all work ran in the frontier main session. Subagents did about 0.2 percent. Cheaper models were essentially unused.
- Peak context per session: median 179K tokens, 90th percentile 577K, maximum 992K. The longest session ran 692 turns and re-sent roughly 500M context tokens.
- The largest single items carried in context were browser screenshots and full-size PNG reads.

So the order of leverage is: keep the coordinator small, keep images and documents out of it, delegate reads and searches, and only then tune the worker model.

## Rules for the coordinating session

- Read only the lines you need. Grep first, then read a range. A full-file read with no range on a file over a few hundred lines is a mistake unless the whole file is the subject.
- Never read a PDF, Word file, spreadsheet or image into the coordinator more than once. Convert it to text or a small copy on disk and read that. Details in [documents.md](documents.md).
- Browser screenshots belong in a worker that returns a one-line verdict with the evidence path. In the coordinator prefer page text, DOM inspection or element lookup over a full screenshot. When the frontier must see the image for acceptance, look once and write down what was seen.
- Filter command output. Pipe tests, builds and logs through tail, grep or a count. Save the full output to a file and cite the path.
- Do not re-read a file after editing it. Edit tools fail loudly when the match is wrong.
- Batch independent tool calls in one response.
- One long orchestrating session is fine. The coordinator keeps decisions, verified facts and summaries; workers do reads and edits and vanish. Hand work to workers with the delegate packet, not a copy of the chat.

## Context thresholds

These defaults came from the measurement above. They are nudges, not gates, and a project may set its own.

| Coordinator context | Action |
| --- | --- |
| Above 150K tokens | Push remaining reads, searches and edits to workers so the coordinator stops growing. |
| Above 250K tokens | Finish the current step, then compact or start a fresh task from a short handoff. |

A handoff is objective, constraints, decisions made and why, checkout and change state, checks completed, evidence locations, remaining work, unresolved risks. Mark what was verified separately from what was assumed. Files on disk are the truth after a cut; re-read them rather than reconstructing their contents from the summary.

## Optional watcher hooks

The rules above are guidance the model follows by habit. [hooks/](hooks/README.md) ships two optional Claude Code hooks that make the habit observable and cheap:

- A PreToolUse hook on Read that swaps a PDF, Word file or oversized image for a converted text or downscaled copy before it enters context.
- A PostToolUse and UserPromptSubmit watcher that suggests, never blocks: a binary document was read, four searches ran in a row, command output was very large, the same file was read three times, context passed a threshold.

Suggestions are logged locally so they can be reviewed for noise and the thresholds retuned. Installing hooks changes the user's own settings; this folder never does that on its own.

## Measuring

`node measure/burn.mjs` reads local Claude Code transcripts and reports the last 14 days by model, session and tool, with peak context per session and the largest tool results. Run it before adopting this skill and again after a week. Compare peak context, cache-read share and subagent share. If those did not move, the habit did not change, whatever the model said it was doing.
