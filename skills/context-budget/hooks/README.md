# Optional hooks

These two hooks make the `context-budget` habits observable and cheap. Both are optional. Neither is installed automatically by copying the skill folder; installing hooks means editing your own Claude Code settings, and that is a deliberate step you take, not something this folder does on its own.

Both hooks are suggestions only. Neither one blocks a tool call or a prompt. Both are written to fail open: if a required converter is missing, if the input JSON is malformed, or if anything unexpected happens, the hook prints nothing and exits 0, and the original tool call proceeds normally.

## What each hook does

`hooks/doc-intercept.mjs` is a `PreToolUse` hook on `Read`. When the file being read is a PDF, a Word document (`.docx`, `.doc`, `.rtf`), or an image (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`) wider than 1280px, it converts the file once into a small cache directory and rewrites the tool call to read the converted copy instead of the original. Converted text files get a default `limit` of 200 lines when the text is over 400 lines and no limit was already requested, so a long document does not flood the session in one read.

`hooks/context-watch.mjs` runs on `PostToolUse` for `Read`, `Grep`, `Glob`, `Bash`, and any `mcp__claude-in-chrome__*` tool, and also on `UserPromptSubmit`. It keeps small per-session state and suggests things like: a binary document just entered context, four searches ran back to back, a command or browser tool returned a very large result, the same file was read three times this session, or the session's context size crossed a threshold. Every suggestion is also appended to a local log so the thresholds can be reviewed and retuned later.

## Installing in Claude Code

Add this to `hooks` in either your user settings (`~/.claude/settings.json`) for every project, or a project's own `.claude/settings.json` for just that project. Replace `/absolute/path/to/skills/context-budget` with the actual path to wherever you copied this skill.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/skills/context-budget/hooks/doc-intercept.mjs",
            "timeout": 90
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Read|Grep|Glob|Bash|mcp__claude-in-chrome__.*",
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/skills/context-budget/hooks/context-watch.mjs",
            "timeout": 10
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node /absolute/path/to/skills/context-budget/hooks/context-watch.mjs",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Hook paths must be absolute; Claude Code does not expand `~` or relative paths inside `settings.json`. `node` must be on the `PATH` that Claude Code runs with.

## Converters needed per platform

`doc-intercept.mjs` only converts a file when the matching tool is available, and otherwise leaves the Read alone:

- PDF: `pdftotext` (from `poppler`) on the `PATH`, any platform.
- Word documents (`.docx`, `.doc`, `.rtf`): `textutil` on macOS, or `pandoc` on the `PATH` on any platform as a fallback.
- Oversized images: `sips` on macOS only, both for reading the pixel width and for downscaling. There is no fallback on other platforms; images are simply left as they are.

If none of these are present, both hooks still run, they just never rewrite anything.

## Where things live

By default everything lives under `~/.claude/context-budget/`:

- `cache/` holds converted documents and downscaled images, named by a short hash of the original path, size, and modified time, so a file is only converted once.
- `state/<session_id>.json` holds one small JSON file per session for the watcher's counters.
- `suggestions.jsonl` is the append-only log of every suggestion the watcher has made, one JSON object per line, with a timestamp, session id, event, tool, and the tip text.

Set the environment variable `CONTEXT_BUDGET_DIR` to move all three somewhere else. Both hooks read it the same way, so set it once for both entries in `settings.json` if you want a non-default location (for example, via the `env` block Claude Code passes to hook commands, or in the shell that launches Claude Code).

## Tuning thresholds

The watcher's two context-size thresholds are read from the environment at hook start:

- `CONTEXT_BUDGET_WARN`, default `150000`. Above this, the watcher suggests pushing remaining reads and edits to subagents.
- `CONTEXT_BUDGET_STOP`, default `250000`. Above this, the watcher suggests finishing the current step and then compacting or handing off.

These match the thresholds documented in the main [SKILL.md](../SKILL.md). Change them for a project that has more headroom or less, and re-measure with [measure/burn.mjs](../measure/burn.mjs) afterward to see whether the new thresholds changed behavior.

## Uninstalling

Remove the `doc-intercept.mjs` and `context-watch.mjs` entries from `hooks` in whichever `settings.json` you added them to, then delete the `~/.claude/context-budget` directory (or whatever directory `CONTEXT_BUDGET_DIR` pointed at) if you want the cache, state, and log gone too. Nothing else on the system depends on either file.

## A note on compaction

Claude Code does not run a `PreCompact` hook whose output can inject instructions into the compaction itself; whatever a `PreCompact` hook prints is discarded, so a hook cannot hand the model handoff rules at the moment it compacts. That is why the handoff guidance in this skill lives in prose, in [SKILL.md](../SKILL.md), instead of in a hook. If you want that guidance to survive compaction reliably, copy the relevant rules from `SKILL.md` into your own `CLAUDE.md`, which is re-sent on every turn regardless of what a hook does.
