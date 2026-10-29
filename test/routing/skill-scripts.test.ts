import {afterEach, describe, expect, it} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';

const script = (skill: string, name: string) => resolve('skills', skill, 'scripts', name);
const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true}); });
function repo() {
 const cwd = mkdtempSync(join(tmpdir(), 'skill-scripts-')); temporary.push(cwd);
 const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=T', '-c', 'user.email=t@example.com', ...args], {cwd, encoding: 'utf8'});
 git('init', '-q', '-b', 'main'); writeFileSync(join(cwd, 'a.js'), 'export const a = 1;\n'); git('add', '-A'); git('commit', '-qm', 'first');
 return {cwd, git};
}
const node = (path: string, args: string[], cwd: string) => spawnSync(process.execPath, [path, ...args], {cwd, encoding: 'utf8'});

describe('catchup snapshot', () => {
 it('reports branch, counts, missing upstream and records without touching the index', () => {
  const {cwd} = repo();
  writeFileSync(join(cwd, 'a.js'), 'export const a = 2;\n'); writeFileSync(join(cwd, 'new.txt'), 'x');
  mkdirSync(join(cwd, '.cto')); writeFileSync(join(cwd, '.cto/ledger.md'), '# ledger\n');
  const index = statSync(join(cwd, '.git/index')).mtimeMs;
  const result = node(script('catchup', 'snapshot.mjs'), [cwd], tmpdir());
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('Branch: main');
  expect(result.stdout).toContain('Working tree: 0 staged, 1 unstaged, 2 untracked (.cto/, new.txt)');
  expect(result.stdout).toContain('Remote: none configured');
  expect(result.stdout).toContain('Task records: .cto/ledger.md');
  expect(statSync(join(cwd, '.git/index')).mtimeMs).toBe(index);
 });
 it('says Git is unavailable outside a repository', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'skill-scripts-')); temporary.push(cwd);
  expect(node(script('catchup', 'snapshot.mjs'), [cwd], cwd).stdout).toContain('Git: unavailable');
 });
});

describe('ship release scan', () => {
 it('is clean for an ordinary change and flags secrets, local files and conflict markers', () => {
  const {cwd, git} = repo();
  writeFileSync(join(cwd, 'b.js'), 'export const b = 2;\n'); git('add', 'b.js'); git('commit', '-qm', 'second');
  const clean = node(script('ship', 'scan-release.mjs'), ['HEAD~1'], cwd);
  expect(clean.status, clean.stdout).toBe(0); expect(clean.stdout).toContain('SCAN CLEAN | base=HEAD~1 | commits=1 | files=1 | hits=0');
  writeFileSync(join(cwd, 'b.js'), `export const token = "ghp_${'a'.repeat(36)}";\n<<<<<<< HEAD\n`);
  writeFileSync(join(cwd, '.env'), 'X=1\n');
  const dirty = node(script('ship', 'scan-release.mjs'), ['HEAD~1'], cwd);
  expect(dirty.status).toBe(1);
  expect(dirty.stdout).toContain('HIT github-token b.js:1 ghp_…');
  expect(dirty.stdout).toContain('HIT conflict-marker b.js:2');
  expect(dirty.stdout).toContain('HIT local-file .env');
  expect(dirty.stdout).not.toContain('a'.repeat(36));
 });
 it('catches common secret shapes, including one already removed from history, and ignores non-literals', () => {
  const {cwd, git} = repo();
  writeFileSync(join(cwd, 'gone.js'), 'const key = "AKIAABCDEFGHIJKLMNOP";\n'); git('add', '-A'); git('commit', '-qm', 'add key');
  writeFileSync(join(cwd, 'gone.js'), 'const key = process.env.KEY;\n'); git('commit', '-qam', 'remove key');
  writeFileSync(join(cwd, 'config.js'), [
   'DB_PASSWORD = "correct-horse-battery"', 'const githubToken = "abcdefghijklmnop";', '{"apiKey": "q1w2e3r4t5y6u7"}',
   `stripe = "sk_live_${'4'.repeat(24)}"`, `pat = "github_pat_${'B'.repeat(30)}"`, 'AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI7K7MDENGbPx',
   '++ note AKIAQRSTUVWXYZ234567',
   'tokenCount = 12345678', 'const token = getToken();', 'password = process.env.DB_PASSWORD',
  ].join('\n') + '\n');
  git('add', '-A'); git('commit', '-qm', 'config');
  const result = node(script('ship', 'scan-release.mjs'), ['HEAD~3'], cwd);
  expect(result.status).toBe(1);
  for (const hit of ['aws-key gone.js:1', 'assigned-secret config.js:1 DB_PASSWORD=', 'assigned-secret config.js:2 githubToken=', 'assigned-secret config.js:3 apiKey=',
   'api-key config.js:4 sk_l', 'github-token config.js:5 gith', 'assigned-secret config.js:6 AWS_SECRET_ACCESS_KEY=', 'aws-key config.js:7'])
   expect(result.stdout).toContain(`HIT ${hit}`);
  for (const line of [':8 ', ':9 ', ':10 ']) expect(result.stdout).not.toContain(`config.js${line}`);
 });
 it('defaults to the integration target, so commits already pushed to a feature branch are scanned', () => {
  const {cwd, git} = repo();
  const remote = mkdtempSync(join(tmpdir(), 'skill-scripts-remote-')); temporary.push(remote);
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote]);
  git('remote', 'add', 'origin', remote); git('push', '-q', '-u', 'origin', 'main'); git('remote', 'set-head', 'origin', 'main');
  git('switch', '-q', '-c', 'feature'); writeFileSync(join(cwd, 'k.js'), 'const k = "AKIAABCDEFGHIJKLMNOP";\n'); git('add', '-A'); git('commit', '-qm', 'k');
  git('push', '-q', '-u', 'origin', 'feature');
  const result = node(script('ship', 'scan-release.mjs'), [], cwd);
  expect(result.stdout).toContain('base=origin/HEAD | commits=1'); expect(result.stdout).toContain('HIT aws-key k.js:1');
  git('remote', 'set-head', 'origin', '--delete');
  expect(node(script('ship', 'scan-release.mjs'), [], cwd).stdout).toContain('base=origin/main | commits=1');
  git('update-ref', '-d', 'refs/remotes/origin/main');
  const none = node(script('ship', 'scan-release.mjs'), [], cwd);
  expect(none.status).toBe(2); expect(none.stdout).toContain('pass the release target');
 });
});

describe('ship proof validator', () => {
 const proof = 'SHIP PROOF | commit=abc1234 | target=origin/main | checks=npm test 12 passed | ci=GREEN run 991 | publish=VERIFIED merged in PR 7 | deploy=N/A repository-only release | live=VERIFIED raw file on main shows change | at=2026-10-29T14:05:00Z';
 it('accepts a complete proof and a complete blocked line', () => {
  expect(node(script('ship', 'validate-proof.mjs'), [proof], tmpdir()).stdout).toBe('PROOF VALID | SHIP PROOF\n');
  expect(node(script('ship', 'validate-proof.mjs'), [proof.replace('npm test 12 passed', 'npm test 12 passed; git diff origin/main...HEAD reviewed')], tmpdir()).status).toBe(0);
  const blocked = 'SHIP BLOCKED | stage=push | revision=abc1234 | reason=no remote configured | evidence=git remote printed nothing | next=add a remote';
  expect(node(script('ship', 'validate-proof.mjs'), [blocked], tmpdir()).status).toBe(0);
 });
 it.each([
  [proof.replace('deploy=N/A repository-only release', 'deploy=N/A'), 'deploy='],
  [proof.replace('commit=abc1234', 'commit=latest'), 'released SHA'],
  [proof.replace('live=VERIFIED raw file on main shows change', 'live=<VERIFIED + destination>'), 'placeholder'],
  [proof.replace('2026-10-29T14:05:00Z', '2026-10-29 14:05'), 'UTC timestamp'],
  [proof.replace('checks=npm test 12 passed', 'checks=passed'), 'name the checks'],
  ['SHIP DONE | commit=abc1234', 'must start with'],
  [proof.replace('checks=npm test 12 passed', 'checks=...'), 'placeholder'],
 ])('rejects %s', (line, message) => {
  const result = node(script('ship', 'validate-proof.mjs'), [line], tmpdir());
  expect(result.status).toBe(1); expect(result.stderr).toContain(message);
 });
});

describe('cto ledger validator', () => {
 const ledger = (rows: string, criteria = '- [x] npm test passes — run npm test') => `# CTO Ledger\n\nDelivery destination and authorization: branch feature/json\n\n## Definition of Shipped\n${criteria}\n\n## Work Items\n| # | Item | Status | Evidence |\n|---|---|---|---|\n${rows}\n\n## Decisions\n- none\n`;
 const run = (text: string) => { const cwd = mkdtempSync(join(tmpdir(), 'skill-scripts-')); temporary.push(cwd); writeFileSync(join(cwd, 'ledger.md'), text); return node(script('cto', 'validate-ledger.mjs'), ['ledger.md'], cwd); };
 it('allows SHIPPED only when every item is done with evidence and every criterion is met', () => {
  const shipped = run(ledger('| 1 | flag | done | npm test 6 passed @ abc |\n| 2 | docs | done | README diff |'));
  expect(shipped.status, shipped.stderr).toBe(0);
  expect(shipped.stdout).toMatch(/CTO SHIPPED \| items=2\/2 \| destination=branch feature\/json \| review=<fill: role; result> \| ledger=ledger\.md \| at=\d{4}-/);
  expect(run(ledger('| 1 | flag | done | npm test |', '- [ ] docs updated')).stdout).toContain('CTO INTERRUPTED');
 });
 it('reports external blocks and interruptions, and rejects bad states and evidence-free done items', () => {
  expect(run(ledger('| 1 | flag | done | test |\n| 2 | publish | blocked-external | needs token |')).stdout).toContain('CTO BLOCKED EXTERNALLY | items=1/2 | blocked=2');
  expect(run(ledger('| 1 | flag | done | test |\n| 2 | docs | blocked-technical | |')).stdout).toContain('CTO INTERRUPTED | items=1/2 | last=1 | resume=2');
  const bad = run(ledger('| 1 | flag | parked | |\n| 2 | docs | done | - |'));
  expect(bad.status).toBe(1); expect(bad.stderr).toContain('"parked" is not one of'); expect(bad.stderr).toContain('2: done without evidence');
 });
 it('reads other column orders, backticked states and escaped pipes, and requires checkbox criteria', () => {
  const reordered = ledger('').replace('| # | Item | Status | Evidence |\n|---|---|---|---|\n', '| Status | # | Item | Evidence |\n|---|---|---|---|\n| `done` | A1 | parse a \\| b | test 3 passed |\n| todo | A2 | docs | |');
  expect(run(reordered).stdout).toContain('CTO INTERRUPTED | items=1/2 | last=A1 | resume=A2');
  const plain = run(ledger('| 1 | flag | done | test |', '- npm test passes'));
  expect(plain.status).toBe(1); expect(plain.stderr).toContain('has no "- [ ]" or "- [x]" criteria');
 });
});
