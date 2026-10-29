#!/usr/bin/env node
// Pre-release hygiene scan: lists what a release would carry and flags likely secrets, local
// settings, debug leftovers, conflict markers and large files. It reports; judging hits is yours.
// Usage: node scan-release.mjs [base-ref]   (pass the release target, e.g. origin/main; default origin/HEAD, origin/main
// or origin/master; with no remote, the working tree only)
// Exit 0 when clean, 1 when anything is flagged, 2 when Git or a base is unavailable.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const git = (...args) => {
  try { return execFileSync('git', ['--no-optional-locks', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).trimEnd(); } catch { return null; }
};
if (git('rev-parse', '--is-inside-work-tree') !== 'true') { console.log('SCAN UNAVAILABLE | reason=not a Git work tree'); process.exit(2); }

// The base is the integration target, never the branch upstream: commits already pushed to a feature branch still ship.
const base = process.argv[2] ?? ['origin/HEAD', 'origin/main', 'origin/master'].find((ref) => git('rev-parse', '--verify', '-q', ref)) ?? null;
if (!base && git('remote')) { console.log('SCAN UNAVAILABLE | reason=no origin/HEAD, origin/main or origin/master; pass the release target as the first argument'); process.exit(2); }
const lines = (text) => (text ?? '').split('\n').filter(Boolean);
const commits = base ? lines(git('log', '--format=%h %s', `${base}..HEAD`)) : [];
const files = new Set([...(base ? lines(git('diff', '--name-only', `${base}...HEAD`)) : []), ...lines(git('diff', '--name-only', '--cached')),
  ...lines(git('diff', '--name-only')), ...lines(git('ls-files', '--others', '--exclude-standard'))]);

const LOCAL = /(^|\/)(\.env(\.[\w.-]+)?|\.DS_Store|settings\.local\.json|\.npmrc|id_(rsa|ed25519|ecdsa)|[^/]+\.(pem|key|p12|pfx)|npm-debug\.log|[^/]+\.log)$/;
const SECRETS = [
  ['aws-key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/], ['private-key', /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})/],
  ['api-key', /\b(?:sk|rk)[-_](?:(?:live|test|proj)[-_])?[A-Za-z0-9_-]{20,}/], ['slack-token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
];
// A secret-named key (any case or separator: DB_PASSWORD, githubToken, "apiKey") assigned a literal. Quoted literals of
// 8+ characters count; unquoted ones must mix letters and digits, so `tokenCount = 12345678` and identifiers do not.
const ASSIGNED = /([A-Za-z0-9_.-]*(?:secret|token|passw(?:or)?d|api[_-]?key|access[_-]?key|private[_-]?key)[A-Za-z0-9_.-]*)["']?\s*[:=]\s*(?:(["'])([^"'\s]{8,})\2|([^\s"'`,;()]{8,})(?=[\s,;]|$))/i;
const INDIRECT = /^(?:process\.env|os\.environ|\$\{|\$\(|env\.|getenv|<)/i;
const DEBUG = /^\s*(?:debugger;?|breakpoint\(\)|binding\.pry|import pdb|console\.debug\()/;
const CONFLICT = /^(?:<{7}|={7}|>{7})(?:\s|$)/;
const redact = (text) => `${text.slice(0, 4)}…`;
const hits = [];

for (const file of [...files].sort()) {
  if (LOCAL.test(file)) hits.push(`local-file ${file}`);
  if (!existsSync(file) || !statSync(file).isFile()) continue;
  if (statSync(file).size > 1024 * 1024) hits.push(`large-file ${file} ${(statSync(file).size / 1048576).toFixed(1)} MB`);
}
// Added lines only: every outgoing commit (a secret added then removed still ships in history), staged and
// unstaged changes, plus whole untracked files.
const diff = [base ? git('log', '-p', '-U0', '--format=', `${base}..HEAD`) : '', git('diff', '-U0', '--cached'), git('diff', '-U0')].join('\n');
let current = null, lineNo = 0, header = false;
const inspect = (file, n, text) => {
  for (const [kind, pattern] of SECRETS) { const m = pattern.exec(text); if (m) hits.push(`${kind} ${file}:${n} ${redact(m[0])}`); }
  const assigned = ASSIGNED.exec(text), value = assigned && (assigned[3] ?? assigned[4]);
  if (value && !INDIRECT.test(value) && (assigned[3] || (/[A-Za-z]/.test(value) && /\d/.test(value)))) hits.push(`assigned-secret ${file}:${n} ${assigned[1]}=${redact(value)}`);
  if (DEBUG.test(text)) hits.push(`debug ${file}:${n} ${text.trim().slice(0, 40)}`);
  if (CONFLICT.test(text)) hits.push(`conflict-marker ${file}:${n}`);
};
for (const line of diff.split('\n')) {
  // "+++ b/path" is a file header only inside a header block; an added line reading "++ x" also starts with "+++ ".
  if (line.startsWith('diff --git ')) { header = true; current = null; continue; }
  if (header && line.startsWith('+++ ')) { current = line.slice(6); header = false; continue; }
  const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(line);
  if (hunk) { header = false; lineNo = Number(hunk[1]); continue; }
  if (!header && line.startsWith('+') && current) inspect(current, lineNo++, line.slice(1));
}
for (const file of lines(git('ls-files', '--others', '--exclude-standard'))) {
  if (!existsSync(file) || statSync(file).size > 1024 * 1024) continue;
  readFileSync(file, 'utf8').split('\n').forEach((text, i) => inspect(file, i + 1, text));
}

const unique = [...new Set(hits)];
console.log(`SCAN ${unique.length ? 'HITS' : 'CLEAN'} | base=${base ?? 'none (working tree only)'} | commits=${commits.length} | files=${files.size} | hits=${unique.length}`);
for (const commit of commits) console.log(`commit ${commit}`);
for (const file of [...files].sort()) console.log(`file ${file}`);
for (const hit of unique) console.log(`HIT ${hit}`);
process.exitCode = unique.length ? 1 : 0;
