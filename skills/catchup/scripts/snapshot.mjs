#!/usr/bin/env node
// Read-only Git snapshot for a Catchup brief. Runs only local Git reads with optional locks
// disabled; it never fetches, refreshes the index, or writes anything.
// Usage: node snapshot.mjs [project-directory]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const dir = resolve(process.argv[2] ?? '.');
const git = (...args) => {
  try {
    return execFileSync('git', ['--no-optional-locks', ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).trimEnd();
  } catch { return null; }
};
const out = [];
const records = [join('.cto', 'ledger.md'), ...(existsSync(join(dir, '.checklists')) ? readdirSync(join(dir, '.checklists')).filter((f) => f.endsWith('.md') && !f.endsWith('.baseline.md')).map((f) => join('.checklists', f)) : [])]
  .filter((path) => existsSync(join(dir, path)));

if (git('rev-parse', '--is-inside-work-tree') !== 'true') {
  out.push('Git: unavailable (not a Git work tree); use project records only.');
} else {
  const branch = git('symbolic-ref', '--short', '-q', 'HEAD');
  const head = git('log', '-1', '--format=%h %s');
  out.push(`Branch: ${branch ?? `detached HEAD at ${git('rev-parse', '--short', 'HEAD') ?? 'unknown'}`}`);
  out.push(`HEAD: ${head ?? 'no commits yet'}`);
  const status = (git('status', '--porcelain=v1') ?? '').split('\n').filter(Boolean);
  const staged = status.filter((l) => !l.startsWith('??') && l[0] !== ' ').length;
  const unstaged = status.filter((l) => !l.startsWith('??') && l[1] !== ' ').length;
  const untracked = status.filter((l) => l.startsWith('??')).map((l) => l.slice(3));
  out.push(`Working tree: ${staged} staged, ${unstaged} unstaged, ${untracked.length} untracked${untracked.length ? ` (${untracked.slice(0, 10).join(', ')}${untracked.length > 10 ? ', …' : ''})` : ''}`);
  const stashes = (git('stash', 'list', '--format=%gd %s') ?? '').split('\n').filter(Boolean);
  out.push(`Stashes: ${stashes.length ? stashes.slice(0, 5).join('; ') : 'none'}`);
  const remotes = (git('remote') ?? '').split('\n').filter(Boolean);
  const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  if (!remotes.length) out.push('Remote: none configured');
  else if (!upstream) out.push(`Remote: ${remotes.join(', ')}; no upstream for this branch (not proof that nothing is unpushed)`);
  else {
    const [behind, ahead] = (git('rev-list', '--left-right', '--count', '@{u}...HEAD') ?? '? ?').split(/\s+/);
    out.push(`Upstream: ${upstream}, ${ahead} ahead / ${behind} behind (locally recorded remote state; not fetched)`);
  }
  out.push('Recent commits:');
  for (const line of (git('log', '-n', '8', '--format=%h %ad %s', '--date=short') ?? '').split('\n').filter(Boolean)) out.push(`  ${line}`);
}
out.push(`Task records: ${records.length ? records.join(', ') : 'none found'}`);
console.log(out.join('\n'));
