#!/usr/bin/env node
// Context watcher: suggests cheaper habits. Suggestions only, never blocks.
// Wired as PostToolUse (Read|Grep|Glob|Bash|mcp__claude-in-chrome__.*) and UserPromptSubmit.
// Fail-open, Node built-ins only.
import { readFileSync, existsSync, statSync, openSync, readSync, closeSync, writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { homedir } from 'node:os';

const BASE_DIR = process.env.CONTEXT_BUDGET_DIR || join(homedir(), '.claude', 'context-budget');
const STATE_DIR = join(BASE_DIR, 'state');
const LOG = join(BASE_DIR, 'suggestions.jsonl');
const DOC_EXT = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.docx', '.xlsx', '.pptx'];
const SEARCH_TOOLS = new Set(['Grep', 'Glob']);
const CTX_WARN = parseInt(process.env.CONTEXT_BUDGET_WARN || '150000', 10);
const CTX_STOP = parseInt(process.env.CONTEXT_BUDGET_STOP || '250000', 10);

function currentContext(transcriptPath) {
  if (!transcriptPath || !existsSync(transcriptPath)) return 0;
  let fd;
  try {
    const size = statSync(transcriptPath).size;
    const readSize = Math.min(size, 400_000);
    if (readSize <= 0) return 0;
    fd = openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(readSize);
    readSync(fd, buf, 0, readSize, size - readSize);
    const tail = buf.toString('utf8');
    const lines = tail.split('\n').reverse();
    for (const line of lines) {
      if (!line.includes('"usage"')) continue;
      let obj;
      try {
        obj = JSON.parse(line);
      } catch {
        continue;
      }
      const usage = (obj.message && obj.message.usage) || {};
      if (Object.keys(usage).length && !obj.isSidechain) {
        return (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
      }
    }
    return 0;
  } catch {
    return 0;
  } finally {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        // ignore
      }
    }
  }
}

function loadState(statePath) {
  try {
    const parsed = JSON.parse(readFileSync(statePath, 'utf8'));
    return {
      reads: parsed.reads || {},
      search_streak: parsed.search_streak || 0,
      shots: parsed.shots || 0,
      warned: parsed.warned || [],
      ctx: parsed.ctx,
    };
  } catch {
    return { reads: {}, search_streak: 0, shots: 0, warned: [] };
  }
}

function main() {
  let raw;
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    return;
  }
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return;
  }

  const sessionId = payload.session_id || 'unknown';
  const event = payload.hook_event_name || '';
  const tool = payload.tool_name || '';

  mkdirSync(STATE_DIR, { recursive: true });
  const statePath = join(STATE_DIR, sessionId + '.json');
  const state = loadState(statePath);
  const tips = [];
  const once = (key, msg) => {
    if (!state.warned.includes(key)) {
      state.warned.push(key);
      tips.push(msg);
    }
  };

  if (event === 'PostToolUse') {
    const toolInput = payload.tool_input || {};
    const toolResponse = payload.tool_response;
    const responseSize = toolResponse !== undefined && toolResponse !== null ? JSON.stringify(toolResponse).length : 0;

    if (tool === 'Read') {
      state.search_streak = 0;
      const filePath = String(toolInput.file_path || '');
      const low = filePath.toLowerCase();
      if (DOC_EXT.some((ext) => low.endsWith(ext))) {
        state.shots += 1;
        once(
          'doc:' + filePath,
          `Efficiency: ${basename(filePath)} is a binary document. It now rides along in context on every turn. Prefer converting to text on disk, or have a haiku subagent read it and return only the relevant passages.`
        );
        if (state.shots >= 3) {
          once('shots3', `Efficiency: ${state.shots} images/documents read into the main session. Move visual checks into a subagent that returns a one-line verdict.`);
        }
      } else if (responseSize > 40_000 && !toolInput.limit) {
        once('big:' + filePath, `Efficiency: that Read returned ~${Math.floor(responseSize / 1000)}K chars with no offset/limit. Grep for the section first, or read a range.`);
      }
      const n = (state.reads[filePath] || 0) + 1;
      state.reads[filePath] = n;
      if (n === 3) {
        once('rr:' + filePath, `Efficiency: ${basename(filePath)} has been read ${n} times this session. Each copy stays in context. Note the facts you need instead of re-reading.`);
      }
    } else if (SEARCH_TOOLS.has(tool) || (tool === 'Bash' && ['grep ', 'rg ', 'find ', 'ag '].some((k) => String(toolInput.command || '').includes(k)))) {
      state.search_streak += 1;
      if (state.search_streak === 4) {
        once('search' + state.warned.length, 'Efficiency: 4 searches in a row in the main session. Hand the search to an Explore or haiku subagent and take back only the answer.');
      }
    } else if (tool === 'Bash') {
      state.search_streak = 0;
      if (responseSize > 25_000) {
        once(
          'bashbig' + Math.floor(responseSize / 25_000),
          `Efficiency: command output was ~${Math.floor(responseSize / 1000)}K chars. Pipe through tail, grep, or a summary next time; the full output now lives in context.`
        );
      }
    } else if (tool.startsWith('mcp__claude-in-chrome__')) {
      state.shots += 1;
      if (responseSize > 60_000 && [1, 5, 10].includes(state.shots)) {
        once(
          'browser' + state.shots,
          `Efficiency: browser tool returned ~${Math.floor(responseSize / 1000)}K chars (screenshot). Screenshots were the largest items in the measured baseline. Run browser checks in a subagent that returns a verdict, or use get_page_text/find instead of full screenshots.`
        );
      }
    } else {
      state.search_streak = 0;
    }
  } else if (event === 'UserPromptSubmit') {
    const ctx = currentContext(payload.transcript_path);
    if (ctx) {
      state.ctx = ctx;
      if (ctx > CTX_STOP) {
        once(
          'ctx250',
          `Efficiency: context is ~${Math.floor(ctx / 1000)}K tokens and is re-sent on every turn. Finish this step, then /compact (or delegate the next chunk to a subagent) so the run keeps going with a smaller context.`
        );
      } else if (ctx > CTX_WARN) {
        once('ctx150', `Efficiency: context is ~${Math.floor(ctx / 1000)}K tokens. Push the remaining reads and edits to subagents so the main context stops growing; /compact when the current step lands.`);
      }
    }
  }

  writeFileSync(statePath, JSON.stringify(state));

  if (tips.length) {
    mkdirSync(dirname(LOG), { recursive: true });
    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, '');
    for (const tip of tips) {
      appendFileSync(LOG, JSON.stringify({ ts, session: sessionId, event, tool, tip }) + '\n');
    }
    const msg = tips.join(' ');
    const out = { systemMessage: msg, hookSpecificOutput: { hookEventName: event, additionalContext: msg } };
    process.stdout.write(JSON.stringify(out) + '\n');
  }
}

try {
  main();
} catch {
  // fail open: never block the tool call or prompt
}
process.exit(0);
