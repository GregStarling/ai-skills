#!/usr/bin/env node
// Node port of the local burn measurement: reads recent Claude Code transcripts under
// ~/.claude/projects and reports proxy cost by model, main-vs-subagent share, per-session
// peak context, and the largest tool results. Streams each transcript file line by line so
// large transcripts are never held fully in memory. Node built-ins only.
import { createReadStream, existsSync, statSync, readdirSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join, basename, dirname } from 'node:path';
import { homedir } from 'node:os';

const ROOT = join(homedir(), '.claude', 'projects');

function parseArgs(argv) {
  let days = 14;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--days' && argv[i + 1]) {
      const n = parseInt(argv[i + 1], 10);
      if (Number.isFinite(n) && n > 0) days = n;
      i++;
    } else if (argv[i].startsWith('--days=')) {
      const n = parseInt(argv[i].slice('--days='.length), 10);
      if (Number.isFinite(n) && n > 0) days = n;
    }
  }
  return { days };
}

// API list price proxy $/M tokens: (input, cache_write_1h, cache_read, output).
// Kept identical to the Python original. Unknown models fall back to DEFAULT_PRICE
// and are listed separately in the report rather than silently folded into "other".
const PRICE = {
  opus: [5, 10, 0.5, 25],
  sonnet: [2, 4, 0.2, 10],
  haiku: [1, 2, 0.1, 5],
  fable: [5, 10, 0.5, 25],
};
const DEFAULT_PRICE = [5, 10, 0.5, 25];

function family(modelName) {
  const m = modelName || '';
  for (const k of Object.keys(PRICE)) {
    if (m.includes(k)) return k;
  }
  return 'other';
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      out.push(full);
    }
  }
  return out;
}

function newCounter() {
  return { msgs: 0, input: 0, cache_write: 0, cache_read: 0, output: 0, ctx: 0, cost: 0 };
}

function pct(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

function fmtK(n) {
  return (n / 1000).toFixed(0);
}

function median(sorted) {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

async function main() {
  const { days } = parseArgs(process.argv.slice(2));
  const since = Date.now() - days * 86_400_000;

  const allFiles = existsSync(ROOT) ? walk(ROOT, []) : [];
  const files = allFiles.filter((f) => {
    try {
      return statSync(f).mtimeMs > since;
    } catch {
      return false;
    }
  });

  const byModel = {};
  const byDay = {};
  const sessions = {};
  const toolNames = new Map(); // tool_use_id -> [name, arg]
  const bigResults = []; // [size, name, arg, sid8]
  const reads = new Map(); // sid -> Map(path -> count)
  const side = { main: 0, sidechain: 0 };
  const seen = new Set(); // "sid|mid"
  const unknownModels = new Set();

  for (const file of files) {
    const sid = basename(file).slice(0, -6);
    const proj = basename(dirname(file));
    if (!sessions[sid]) {
      sessions[sid] = { proj, turns: 0, peak: 0, first: null, last: null, models: {}, ctx_sum: 0, out: 0 };
    }
    const s = sessions[sid];

    const rl = createInterface({ input: createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line) continue;
      let d;
      try {
        d = JSON.parse(line);
      } catch {
        continue;
      }
      const ts = d.timestamp;
      const m = d.message || {};

      if (d.type === 'assistant') {
        const mid = m.id;
        for (const c of m.content || []) {
          if (c && typeof c === 'object' && c.type === 'tool_use') {
            const input = c.input || {};
            const arg = input.file_path || (typeof input.command === 'string' ? input.command.slice(0, 60) : '');
            toolNames.set(c.id, [c.name, arg]);
          }
        }
        if (!mid || seen.has(sid + '|' + mid)) continue;
        seen.add(sid + '|' + mid);
        const u = m.usage || {};
        if (!u || Object.keys(u).length === 0) continue;
        const inp = u.input_tokens || 0;
        const cw = u.cache_creation_input_tokens || 0;
        const cr = u.cache_read_input_tokens || 0;
        const out = u.output_tokens || 0;
        const fm = family(m.model);
        if (fm === 'other' && m.model) unknownModels.add(m.model);
        const day = (ts || '').slice(0, 10);
        const p = PRICE[fm] || DEFAULT_PRICE;
        const cost = (inp * p[0] + cw * p[1] + cr * p[2] + out * p[3]) / 1e6;

        if (!byModel[fm]) byModel[fm] = newCounter();
        if (!byDay[day]) byDay[day] = newCounter();
        for (const agg of [byModel[fm], byDay[day]]) {
          agg.msgs += 1;
          agg.input += inp;
          agg.cache_write += cw;
          agg.cache_read += cr;
          agg.output += out;
          agg.ctx += inp + cw + cr;
          agg.cost += cost;
        }
        byDay[day][fm + '_cost'] = (byDay[day][fm + '_cost'] || 0) + cost;
        side[d.isSidechain ? 'sidechain' : 'main'] += cost;

        s.turns += 1;
        s.peak = Math.max(s.peak, inp + cw + cr);
        s.models[fm] = (s.models[fm] || 0) + 1;
        s.ctx_sum += inp + cw + cr;
        s.out += out;
        s.first = s.first || ts;
        s.last = ts;
      } else if (d.type === 'user') {
        for (const c of m.content || []) {
          if (c && typeof c === 'object' && c.type === 'tool_result') {
            const content = c.content;
            const size = content ? JSON.stringify(content).length : 0;
            const [name, arg] = toolNames.get(c.tool_use_id) || ['?', ''];
            bigResults.push([size, name, arg, sid.slice(0, 8)]);
            if (name === 'Read') {
              if (!reads.has(sid)) reads.set(sid, new Map());
              const rc = reads.get(sid);
              rc.set(arg, (rc.get(arg) || 0) + 1);
            }
          }
        }
      }
    }
  }

  const tot = Object.values(byModel).reduce((a, v) => a + v.cost, 0);
  const lines = [];
  lines.push(`files=${files.length} sessions=${Object.keys(sessions).length} window=${days}d  API-price proxy total=$${tot.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
  lines.push('');

  lines.push('BY MODEL (tokens in millions; cost = API list-price proxy)');
  lines.push(`${'model'.padEnd(8)}${'msgs'.padStart(7)}${'fresh_in'.padStart(10)}${'cache_wr'.padStart(10)}${'cache_rd'.padStart(10)}${'output'.padStart(9)}${'$proxy'.padStart(9)}${'share'.padStart(7)}`);
  for (const [k, v] of Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost)) {
    lines.push(
      `${k.padEnd(8)}${String(v.msgs).padStart(7)}${(v.input / 1e6).toFixed(1).padStart(10)}${(v.cache_write / 1e6).toFixed(1).padStart(10)}${(v.cache_read / 1e6).toFixed(1).padStart(10)}${(v.output / 1e6).toFixed(2).padStart(9)}${v.cost.toFixed(0).padStart(9)}${(pct(v.cost, tot).toFixed(0) + '%').padStart(7)}`
    );
  }
  if (unknownModels.size) {
    lines.push('');
    lines.push(`UNKNOWN MODELS (no price table entry, priced with the default row): ${[...unknownModels].join(', ')}`);
  }

  lines.push('');
  lines.push('COST PROXY BY COMPONENT (all models)');
  const comp = { fresh_input: 0, cache_write: 0, cache_read: 0, output: 0 };
  for (const [fm, v] of Object.entries(byModel)) {
    const p = PRICE[fm] || DEFAULT_PRICE;
    comp.fresh_input += (v.input * p[0]) / 1e6;
    comp.cache_write += (v.cache_write * p[1]) / 1e6;
    comp.cache_read += (v.cache_read * p[2]) / 1e6;
    comp.output += (v.output * p[3]) / 1e6;
  }
  for (const [k, v] of Object.entries(comp).sort((a, b) => b[1] - a[1])) {
    lines.push(`  ${k.padEnd(12)} $${v.toFixed(0).padStart(7)} ${pct(v, tot).toFixed(0).padStart(4)}%`);
  }

  lines.push('');
  lines.push(`main vs subagent: main $${side.main.toFixed(0)}  sidechain $${side.sidechain.toFixed(0)}`);

  lines.push('');
  lines.push('BY DAY');
  for (const day of Object.keys(byDay).sort()) {
    const v = byDay[day];
    lines.push(
      `  ${day} msgs=${String(v.msgs).padStart(5)} ctx_tokens=${(v.ctx / 1e6).toFixed(1).padStart(6)}M out=${(v.output / 1e6).toFixed(2).padStart(5)}M $proxy=${v.cost.toFixed(0).padStart(5)}  opus=${(v.opus_cost || 0).toFixed(0)} fable=${(v.fable_cost || 0).toFixed(0)} sonnet=${(v.sonnet_cost || 0).toFixed(0)} haiku=${(v.haiku_cost || 0).toFixed(0)}`
    );
  }

  lines.push('');
  lines.push('TOP 12 SESSIONS BY CONTEXT TOKENS PROCESSED');
  const topSessions = Object.entries(sessions)
    .sort((a, b) => b[1].ctx_sum - a[1].ctx_sum)
    .slice(0, 12);
  for (const [sid, s] of topSessions) {
    let dur = '';
    try {
      const a = new Date(s.first);
      const b = new Date(s.last);
      dur = `${((b - a) / 3_600_000).toFixed(1)}h`;
    } catch {
      // leave dur blank
    }
    lines.push(
      `  ${sid.slice(0, 8)} ${s.proj.slice(-28).padEnd(28)} turns=${String(s.turns).padStart(4)} peak_ctx=${fmtK(s.peak).padStart(5)}K ctx_total=${(s.ctx_sum / 1e6).toFixed(1).padStart(6)}M out=${fmtK(s.out).padStart(5)}K dur=${dur.padStart(6)} models=${JSON.stringify(s.models)}`
    );
  }

  lines.push('');
  lines.push('PEAK CONTEXT DISTRIBUTION (sessions with >=5 turns, per-session peak context and turn counts)');
  const peaks = Object.values(sessions)
    .filter((s) => s.turns >= 5)
    .map((s) => s.peak)
    .sort((a, b) => a - b);
  if (peaks.length) {
    const p90 = peaks[Math.min(peaks.length - 1, Math.floor(peaks.length * 0.9))];
    const p75 = peaks[Math.min(peaks.length - 1, Math.floor(peaks.length * 0.75))];
    lines.push(`  n=${peaks.length} median=${fmtK(median(peaks))}K  p75=${fmtK(p75)}K  p90=${fmtK(p90)}K  max=${fmtK(peaks[peaks.length - 1])}K`);
  } else {
    lines.push('  n=0 (no sessions with >=5 turns in this window)');
  }

  lines.push('');
  lines.push('TOP 15 LARGEST TOOL RESULTS (chars)');
  for (const [size, name, arg, sid] of [...bigResults].sort((a, b) => b[0] - a[0]).slice(0, 15)) {
    lines.push(`  ${fmtK(size).padStart(6)}K  ${String(name).padEnd(12)} ${String(arg).slice(0, 70)}  s=${sid}`);
  }

  lines.push('');
  lines.push('TOOL RESULT VOLUME BY TOOL (total chars)');
  const toolVolume = {};
  for (const [size, name] of bigResults) toolVolume[name] = (toolVolume[name] || 0) + size;
  for (const [k, v] of Object.entries(toolVolume)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)) {
    lines.push(`  ${k.padEnd(14)} ${(v / 1e6).toFixed(1).padStart(6)}M chars`);
  }

  lines.push('');
  lines.push('REPEATED READS OF SAME FILE IN ONE SESSION (top)');
  const repeated = [];
  for (const [sid, counter] of reads.entries()) {
    for (const [path, n] of counter.entries()) {
      if (n >= 3) repeated.push([n, path, sid.slice(0, 8)]);
    }
  }
  for (const [n, path, sid] of repeated.sort((a, b) => b[0] - a[0]).slice(0, 10)) {
    lines.push(`  x${n}  ${String(path).slice(-70)}  s=${sid}`);
  }

  lines.push('');
  const pdfs = bigResults.filter(([, name, arg]) => name === 'Read' && /\.(pdf|png|jpe?g|docx|xlsx)$/.test(String(arg).toLowerCase()));
  const pdfTotal = pdfs.reduce((a, [size]) => a + size, 0);
  lines.push(`Binary/document Reads: ${pdfs.length}, total ${(pdfTotal / 1e6).toFixed(1)}M chars`);
  for (const [size, , arg] of [...pdfs].sort((a, b) => b[0] - a[0]).slice(0, 8)) {
    lines.push(`  ${fmtK(size).padStart(6)}K ${String(arg).slice(-70)}`);
  }

  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error(`burn.mjs failed: ${err && err.message ? err.message : err}`);
  process.exitCode = 1;
});
