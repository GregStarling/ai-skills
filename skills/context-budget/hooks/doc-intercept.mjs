#!/usr/bin/env node
// PreToolUse on Read. Swaps heavy documents for light equivalents before they enter context.
// PDF -> text (pdftotext), DOCX/DOC/RTF -> text (textutil on macOS, else pandoc), large images -> 1280px copy (sips, macOS only).
// Fail-open: any missing converter or any error results in no output and exit 0. Node built-ins only.
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync, readFileSync as readFileSyncText } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { homedir, platform } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const BASE_DIR = process.env.CONTEXT_BUDGET_DIR || join(homedir(), '.claude', 'context-budget');
const CACHE = join(BASE_DIR, 'cache');
const IMG_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
const MAX_W = 1280;

function which(cmd) {
  const finder = platform() === 'win32' ? 'where' : 'which';
  const res = spawnSync(finder, [cmd], { encoding: 'utf8' });
  return res.status === 0;
}

function cacheKey(filePath, stat) {
  const raw = `${filePath}|${stat.size}|${Math.floor(stat.mtimeMs / 1000)}`;
  return createHash('sha1').update(raw).digest('hex').slice(0, 16);
}

function convertPdf(filePath, key) {
  if (!which('pdftotext')) return null;
  const out = join(CACHE, key + '.txt');
  if (!existsSync(out)) {
    const r = spawnSync('pdftotext', ['-layout', filePath, out], { timeout: 60_000 });
    if (r.status !== 0) return null;
  }
  return { out, kind: 'text' };
}

function convertDoc(filePath, key) {
  const out = join(CACHE, key + '.txt');
  if (!existsSync(out)) {
    if (platform() === 'darwin' && which('textutil')) {
      const r = spawnSync('textutil', ['-convert', 'txt', '-output', out, filePath], { timeout: 60_000 });
      if (r.status !== 0) return null;
    } else if (which('pandoc')) {
      const r = spawnSync('pandoc', [filePath, '-t', 'plain'], { timeout: 60_000, encoding: 'utf8', maxBuffer: 1024 * 1024 * 64 });
      if (r.status !== 0) return null;
      writeFileSync(out, r.stdout || '');
    } else {
      return null;
    }
  }
  return { out, kind: 'text' };
}

function convertImage(filePath, key) {
  if (platform() !== 'darwin' || !which('sips')) return null;
  const w = spawnSync('sips', ['-g', 'pixelWidth', filePath], { encoding: 'utf8', timeout: 20_000 });
  if (w.status !== 0) return null;
  const parts = (w.stdout || '').trim().split(/\s+/);
  const width = parseInt(parts[parts.length - 1], 10);
  if (!Number.isFinite(width)) return null;
  if (width <= MAX_W) return null;
  const out = join(CACHE, key + extname(filePath));
  if (!existsSync(out)) {
    const r = spawnSync('sips', ['--resampleWidth', String(MAX_W), filePath, '--out', out], { timeout: 30_000 });
    if (r.status !== 0) return null;
  }
  return { out, kind: `image downscaled from ${width}px to ${MAX_W}px wide` };
}

function convert(filePath) {
  const low = filePath.toLowerCase();
  const stat = statSync(filePath);
  const key = cacheKey(filePath, stat);
  if (low.endsWith('.pdf')) return convertPdf(filePath, key);
  if (low.endsWith('.docx') || low.endsWith('.doc') || low.endsWith('.rtf')) return convertDoc(filePath, key);
  if (IMG_EXT.some((ext) => low.endsWith(ext))) return convertImage(filePath, key);
  return null;
}

function countLines(filePath) {
  try {
    const text = readFileSyncText(filePath, 'utf8');
    if (!text) return 0;
    return text.split('\n').length;
  } catch {
    return 0;
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
  if (payload.tool_name !== 'Read') return;
  const toolInput = { ...(payload.tool_input || {}) };
  const filePath = toolInput.file_path || '';
  if (!filePath) return;
  let stat;
  try {
    stat = statSync(filePath);
    if (!stat.isFile()) return;
  } catch {
    return;
  }
  if (filePath.startsWith(CACHE)) return;
  mkdirSync(CACHE, { recursive: true });

  let result;
  try {
    result = convert(filePath);
  } catch {
    return;
  }
  if (!result) return;
  const { out, kind } = result;

  const updatedInput = { file_path: out };
  let additionalContext;
  if (kind === 'text') {
    const lines = countLines(out);
    if (toolInput.offset) updatedInput.offset = toolInput.offset;
    if (toolInput.limit) updatedInput.limit = toolInput.limit;
    else if (lines > 400) updatedInput.limit = 200;
    additionalContext =
      `Efficiency: ${basename(filePath)} was converted to text (${lines} lines) at ${out}. ` +
      `Reading the text version instead of the binary. Grep it for the section you need, then read a range. Original: ${filePath}`;
  } else {
    additionalContext = `Efficiency: ${basename(filePath)} ${kind}; reading the smaller copy at ${out}. Original: ${filePath}. Do not re-read; note what you saw.`;
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'efficiency doc intercept',
      updatedInput,
      additionalContext,
    },
  };
  process.stdout.write(JSON.stringify(output) + '\n');
}

try {
  main();
} catch {
  // fail open: never block the Read tool call
}
process.exit(0);
