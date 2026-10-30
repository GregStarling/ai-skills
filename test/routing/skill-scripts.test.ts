import {afterEach, describe, expect, it} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync, mkdirSync, statSync, symlinkSync, cpSync} from 'node:fs';
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

describe('skill-audit inventory and trigger tests', () => {
 const skillFile = (name: string, description: string, extra = '') => `---\nname: ${name}\ndescription: ${description}\n---\n${extra}Body.\n`;
 function collection() {
  const root = mkdtempSync(join(tmpdir(), 'skill-audit-')); temporary.push(root);
  const write = (path: string, text: string) => { mkdirSync(join(root, path, '..'), {recursive: true}); writeFileSync(join(root, path), text); };
  write('repo/skills/notes/SKILL.md', skillFile('notes', 'Writes release notes from merged pull requests. Use when the user asks for "release notes".'));
  write('installed/notes/SKILL.md', skillFile('notes', 'Writes release notes from merged pull requests. Use when the user asks for "release notes".'));
  write('installed/changelog/SKILL.md', skillFile('changelog', 'Writes changelog entries from merged pull requests. Use when the user asks for "release notes".'));
  write('installed/voice/SKILL.md', skillFile('voice', 'Captures a writing voice. Use when drafting.', 'Regenerated by export — do not hand-edit.\n'));
  write('home/.claude/skills/synced/abc/shared/SKILL.md', skillFile('shared', 'Formats slides into a deck. Use when asked for slides.'));
  write('installed/proto/SKILL.md', skillFile('proto', 'Lints protobuf files. Skips files generated by protoc. Use when editing .proto files.', 'The stubs are regenerated on build.\n'));
  write('repo/plugins/p/skills/deck/SKILL.md', skillFile('deck', 'Builds slide decks. Use when asked for a deck.'));
  execFileSync('git', ['init', '-q'], {cwd: join(root, 'repo')});
  return root;
 }
 // HOME points inside the fixture, so the real installed skills never become neighbours.
 const inventory = (cwd: string, ...roots: string[]) => spawnSync(process.execPath, [script('skill-audit', 'inventory.mjs'), ...roots.map((r) => join(cwd, r))], {cwd, encoding: 'utf8', env: {...process.env, HOME: join(cwd, 'home')}});
 it('marks generated, synced and installed copies report-only and finds shared triggers', () => {
  const root = collection();
  const result = inventory(root, 'installed', 'repo/skills', 'home/.claude/skills');
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('INVENTORY | scope=named | roots=3/3 | skills=6 | editable=3 | report-only=3 | neighbours=0 | names=5');
  expect(result.stdout).toMatch(/skill notes \| report-only: installed copy of .*repo\/skills\/notes \(identical\)/);
  expect(result.stdout).toContain('skill voice | report-only: generated');
  expect(result.stdout).toContain('skill shared | report-only: synced or plugin-managed');
  expect(result.stdout).toMatch(/collision (changelog <> notes|notes <> changelog) .*same trigger: release notes/);
 });
 it('keeps prose about generated files and plugin-layout repositories editable, and dedupes symlinks', () => {
  const root = collection();
  symlinkSync(join(root, 'installed/notes'), join(root, 'repo/skills/linked'));
  // Do-not-edit markers count; prose about generated files or editing something else does not.
  const probes: [string, string, string][] = [
   ['tg', 'Builds tables. Use when asked.', '<!-- Code generated by tablegen. DO NOT EDIT. -->\n'],
   ['lg', 'Lists things. Use when asked.', 'Generated by listgen from lists.yaml. Do not edit; edit lists.yaml.\n'],
   ['ag', 'Formats code, ignoring auto-generated files. Use when asked.', ''],
   ['lock', 'Updates dependencies. Use when asked.', "Never edit this repository's lockfile by hand; run the package manager.\nDo not edit the config directly.\n"]];
  for (const [name, description, body] of probes) { mkdirSync(join(root, 'installed', name)); writeFileSync(join(root, 'installed', name, 'SKILL.md'), skillFile(name, description, body)); }
  const result = inventory(root, 'installed', 'repo');
  for (const name of ['tg', 'lg']) expect(result.stdout).toContain(`skill ${name} | report-only: generated`);
  for (const name of ['ag', 'lock']) expect(result.stdout).toContain(`skill ${name} | editable`);
  expect(result.stdout).toContain('skill proto | editable');
  expect(result.stdout).toContain('skill deck | editable');
  expect(result.stdout.match(/^skill notes /gm)?.length).toBe(2);
 });
 it('reports a skill installed in several places outside Git until its source is in scope', () => {
  const root = collection();
  cpSync(join(root, 'installed/changelog'), join(root, 'home/changelog'), {recursive: true});
  const result = inventory(root, 'installed', 'home');
  expect(result.stdout).toMatch(/skill changelog \| report-only: also installed at .*home\/changelog/);
  expect(result.stdout).toContain('skill proto | editable');
 });
 it('checks one named skill against every installed skill without editing or pairing the neighbours', () => {
  const root = collection();
  const write = (path: string, text: string) => { mkdirSync(join(root, path, '..'), {recursive: true}); writeFileSync(join(root, path), text); };
  write('home/.claude/skills/ship/SKILL.md', skillFile('ship', 'Releases completed repository work: reviews the scoped diff, commits and integrates, pushes through the required release process, chases CI and publication failures, and verifies the published result. Use when the user intends publication, e.g. "/ship".'));
  write('home/.agents/skills/notes/SKILL.md', skillFile('notes', 'Older notes helper. Use when asked for notes.', 'Summarises meeting transcripts into owners and action items.\n'));
  write('home/.claude/skills/deployer/SKILL.md', skillFile('deployer', 'Releases repository work through the required release process and verifies the published result. Use when the user intends publication.'));
  write('new/release-it/SKILL.md', skillFile('release-it', 'Releases finished work. Make sure to use this skill whenever the user says "ship it", deploy, push, publish or release.'));
  write('new/notes/SKILL.md', skillFile('notes', 'Writes release notes from merged pull requests. Use when the user asks for "release notes".', 'Group merged pull requests by label and write one line each.\n'));
  const result = inventory(root, 'new/release-it', 'new/notes');
  expect(result.status, result.stderr).toBe(0);
  // The unrelated installed "notes" does not make the new one report-only; the same-name line carries the clash.
  expect(result.stdout).toMatch(/^INVENTORY \| scope=named \| roots=2\/2 \| skills=2 \| editable=2 \| report-only=0 \| neighbours=[1-9]/m);
  expect(result.stdout).toContain('neighbours (read-only): ');
  expect(result.stdout).not.toMatch(/^skill (ship|changelog) /m);
  // A short description inside a long one is caught by coverage of the shorter description.
  expect(result.stdout).toMatch(/collision (release-it <> ship|ship <> release-it) \| overlap=[\d.]+ \| cover=0\.[5-9]/);
  expect(result.stdout).toMatch(/same-name notes \| .*new\/notes \| differs from .*home\/\.agents\/skills\/notes \| different skill with the same name; only one loads per host; propose a rename/);
  // A repository skill with an identical install and an older, drifted install of itself.
  const toolDescription = 'Formats SQL queries in the project style. Use when the user asks to "format this SQL".';
  write('repo/skills/tool/SKILL.md', skillFile('tool', toolDescription, 'Current steps.\n'));
  cpSync(join(root, 'repo/skills/tool'), join(root, 'home/.claude/skills/tool'), {recursive: true});
  write('home/.agents/skills/tool/SKILL.md', skillFile('tool', toolDescription, 'Old steps.\n'));
  const repoRun = inventory(root, 'repo/skills/tool');
  expect(repoRun.stdout).toContain('skill tool | editable');
  expect(repoRun.stdout).toMatch(/copies tool \| .*repo\/skills\/tool \| identical at .*home\/\.claude\/skills\/tool \| reinstall after edits/);
  expect(repoRun.stdout).toMatch(/same-name tool \| .*repo\/skills\/tool \| differs from .*home\/\.agents\/skills\/tool \| stale installed copy of this repository skill/);
  // Naming the drifted install itself, with the repository in view, keeps it report-only: edits belong in the source.
  const named = spawnSync(process.execPath, [script('skill-audit', 'inventory.mjs'), join(root, 'home/.agents/skills/tool')], {cwd: join(root, 'repo'), encoding: 'utf8', env: {...process.env, HOME: join(root, 'home')}});
  expect(named.stdout).toMatch(/skill tool \| report-only: installed copy of .*repo\/skills\/tool \(diverged\)/);
  expect(named.stdout).toMatch(/same-name tool \| .*\.agents\/skills\/tool \| differs from .*repo\/skills\/tool \| installed copy of a repository skill; fix it there and reinstall/);
  // After an audit rewrites the source description, the install keeps the old one but the same body: still a copy.
  const steps = '1. Parse the query.\n2. Apply the project keyword casing and indentation.\n3. Print the formatted query.\n';
  write('repo/skills/fmt/SKILL.md', skillFile('fmt', 'Cuts formatted SQL for review. Use when the user asks to "tidy this query". Do not use for schema changes.', steps));
  write('home/.claude/skills/fmt/SKILL.md', skillFile('fmt', 'Make sure to use this skill whenever SQL appears anywhere, even if not asked.', steps));
  const rewritten = spawnSync(process.execPath, [script('skill-audit', 'inventory.mjs'), join(root, 'repo/skills/fmt')], {cwd: join(root, 'repo'), encoding: 'utf8', env: {...process.env, HOME: join(root, 'home')}});
  expect(rewritten.stdout).toMatch(/same-name fmt \| .*repo\/skills\/fmt \| differs from .*\.claude\/skills\/fmt \| stale installed copy of this repository skill/);
  const full = spawnSync(process.execPath, [script('skill-audit', 'inventory.mjs')], {cwd: join(root, 'repo'), encoding: 'utf8', env: {...process.env, HOME: join(root, 'home')}});
  expect(full.stdout).toMatch(/skill fmt \| report-only: installed copy of .*repo\/skills\/fmt \(diverged\)/);
  // Nothing in common but the name, against a repository skill: the user decides.
  write('home/.agents/skills/fmt/SKILL.md', skillFile('fmt', 'Formats Markdown tables. Use when asked to align a table.', 'Align pipes and pad cells.\n'));
  expect(spawnSync(process.execPath, [script('skill-audit', 'inventory.mjs'), join(root, 'repo/skills/fmt')], {cwd: join(root, 'repo'), encoding: 'utf8', env: {...process.env, HOME: join(root, 'home')}}).stdout)
   .toMatch(/same-name fmt \| .*repo\/skills\/fmt \| differs from .*\.agents\/skills\/fmt \| shares only the name with the repository skill; ask the user/);
  // deployer and ship compete with each other, but neither is in scope.
  expect(result.stdout).not.toMatch(/collision (deployer <> ship|ship <> deployer)/);
  expect(spawnSync(process.execPath, [script('skill-audit', 'inventory.mjs'), join(root, 'home/.claude/skills/deployer')], {cwd: root, encoding: 'utf8', env: {...process.env, HOME: join(root, 'home')}}).stdout).toMatch(/collision (deployer <> ship|ship <> deployer)/);
  const all = spawnSync(process.execPath, [script('skill-audit', 'inventory.mjs')], {cwd: join(root, 'repo'), encoding: 'utf8', env: {...process.env, HOME: join(root, 'home')}});
  expect(all.stdout).toMatch(/^INVENTORY \| scope=all installed \| .*\| neighbours=0 \|/m);
 });
 it('plans sessions, stops at the first Skill call and scores hits with a stripped environment', () => {
  const root = collection(), bin = join(root, 'bin'); mkdirSync(bin);
  // A stand-in claude: echoes which skills it was given and "invokes" the skill named in the prompt.
  writeFileSync(join(bin, 'claude'), `#!/usr/bin/env node
if (process.argv.includes('--version')) process.exit(0);
const prompt = process.argv.at(-1), skills = require('fs').readdirSync('.claude/skills');
if (process.env.ANTHROPIC_API_KEY) { console.error('leaked key'); process.exit(3); }
const pick = skills.find((s) => prompt.includes(s));
const event = (content) => console.log(JSON.stringify({type: 'assistant', message: {content}}));
event([{type: 'tool_use', name: 'Read', input: {}}]);
if (pick) event([{type: 'tool_use', name: 'Skill', input: {skill: 'plugin:' + pick}}]);
console.log(JSON.stringify({type: 'result', is_error: false, result: 'done'}));
`, {mode: 0o755});
  const plan = join(root, 'plan.json');
  writeFileSync(plan, JSON.stringify({sets: {before: 'installed', after: 'repo/skills'}, runs: 2, concurrency: 2, cases: [
   {id: 'notes', prompt: 'please write notes', expect: 'notes'}, {id: 'nothing', prompt: 'hello', expect: null}]}));
  const env = {...process.env, PATH: `${bin}:${process.env["PATH"]}`, ANTHROPIC_API_KEY: 'sk-test'};
  const dry = spawnSync(process.execPath, [script('skill-audit', 'trigger-eval.mjs'), plan, '--dry-run'], {encoding: 'utf8', env});
  expect(dry.stdout).toContain('TRIGGER EVAL PLAN | sets=before,after | cases=2 | runs=2 | sessions=8 | model=opus');
  const run = spawnSync(process.execPath, [script('skill-audit', 'trigger-eval.mjs'), plan], {encoding: 'utf8', env});
  expect(run.status, run.stdout + run.stderr).toBe(0);
  expect(run.stdout).toContain('case notes expect=notes | before 2/2 (notes, notes) | after 2/2 (notes, notes)');
  expect(run.stdout).toContain('case nothing expect=none | before 2/2 (none, none)');
  expect(run.stdout).toContain('TRIGGER EVAL DONE | before 4/4 | after 4/4');
 });
 it('leaves errored sessions unscored, stops at a usage limit and rejects missing folders', () => {
  const root = collection(), bin = join(root, 'bin'); mkdirSync(bin);
  // Prompts choose the stand-in's behaviour: an API error, a short usage-limit result, or a normal answer.
  writeFileSync(join(bin, 'claude'), `#!/usr/bin/env node
if (process.argv.includes('--version')) process.exit(0);
const prompt = process.argv.at(-1);
const result = prompt === 'fail' ? {is_error: true, result: 'API Error: model not found'}
 : prompt === 'limit' ? {is_error: false, result: 'You have hit your limit · resets 3pm'}
 : prompt === 'talk' ? {is_error: false, result: 'Done. I added rate limiting so clients get a 429 when over quota.'} : {is_error: false, result: 'done'};
console.log(JSON.stringify({type: 'result', ...result}));
process.exit(prompt === 'limit' ? 1 : 0);
`, {mode: 0o755});
  const env = {...process.env, PATH: `${bin}:${process.env["PATH"]}`};
  const trigger = (plan: object) => { const path = join(root, `plan-${Math.random().toString(36).slice(2)}.json`); writeFileSync(path, JSON.stringify(plan)); return spawnSync(process.execPath, [script('skill-audit', 'trigger-eval.mjs'), path], {encoding: 'utf8', env}); };
  const errored = trigger({sets: {before: 'installed'}, runs: 2, cases: [{id: 'f', prompt: 'fail', expect: null}, {id: 'ok', prompt: 'talk', expect: null}]});
  expect(errored.status).toBe(1);
  expect(errored.stdout).toContain('case f expect=none | before 0/0 (error, error)');
  // A clean answer that mentions rate limits is the model talking, not a usage limit.
  expect(errored.stdout).toContain('case ok expect=none | before 2/2 (none, none)');
  expect(errored.stdout).toContain('TRIGGER EVAL PARTIAL | stopped=none | unscored=2 | sessions=4/4 | before 2/2');
  const limited = trigger({sets: {before: 'installed'}, runs: 3, concurrency: 1, cases: [{id: 'l', prompt: 'limit', expect: null}]});
  expect(limited.stdout).toContain('TRIGGER EVAL PARTIAL | stopped=usage limit | unscored=1 | sessions=1/3');
  for (const plan of [{sets: {before: 'nowhere'}, cases: [{id: 'x', prompt: 'x', expect: null}]}, {sets: {before: 'installed'}, fixture: 'nowhere', cases: [{id: 'x', prompt: 'x', expect: null}]}]) {
   const missing = trigger(plan);
   expect(missing.status).toBe(2); expect(missing.stdout).toContain('TRIGGER EVAL UNAVAILABLE | reason=missing folder');
  }
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
