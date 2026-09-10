import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createWriteStream } from 'node:fs';
import { observedAssistantModel } from '../../dist/runtime/telemetry.js';

// Maintainer-only native CLI experiment; deliberately grants no qualification.
const output = resolve('artifacts/portable-host-evidence');
const modelRuns = {
  codex: { worker: ['gpt-5.3-codex-spark', 'low'], reviewer: ['gpt-5.5', 'high'] },
  'codex-standard': { worker: ['gpt-5.5', 'low'], reviewer: ['gpt-5.5', 'high'] },
  claude: { worker: ['claude-sonnet-5', 'low'], reviewer: ['claude-opus-5', 'high'] },
  'claude-haiku': { worker: ['claude-haiku-4-5-20251001', null], reviewer: ['claude-opus-5', 'high'] },
};
const hash = value => createHash('sha256').update(value).digest('hex');
export async function execute(binary, args, cwd, prompt, destination, timeoutMs = 120000) {
  await mkdir(destination, { recursive: true });
  await writeFile(join(destination, 'request.json'), JSON.stringify({ binary, args, cwd, prompt, started_at: new Date().toISOString() }, null, 2));
  return new Promise(resolveRun => {
    const start = Date.now();
    const child = spawn(binary, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    const liveOut=createWriteStream(join(destination,'stdout.live.jsonl'));
    const liveErr=createWriteStream(join(destination,'stderr.live.log'));
    let stdout = '', stderr = '', timedOut = false;
    child.stdout.on('data', chunk => {stdout += chunk;liveOut.write(chunk);});
    child.stderr.on('data', chunk => {stderr += chunk;liveErr.write(chunk);});
    child.stdin.end(prompt);
    let force;
    const stop = signal => { try { process.platform !== 'win32' ? process.kill(-child.pid, signal) : child.kill(signal); } catch {} };
    const timeout = setTimeout(() => { timedOut = true; stop('SIGTERM'); force = setTimeout(() => stop('SIGKILL'), 1000); }, timeoutMs);
    child.once('error', error => { stderr += String(error); });
    child.once('close', async (code, signal) => {
      clearTimeout(timeout);
      clearTimeout(force);
      liveOut.end();liveErr.end();
      await writeFile(join(destination, 'stdout.jsonl'), stdout);
      await writeFile(join(destination, 'stderr.log'), stderr);
      const events = stdout.split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
      const result = events.findLast(event => event.type === 'result');
      const completed = events.findLast(event => event.type === 'turn.completed');
      const summary = { code, signal, timed_out: timedOut, duration_ms: Date.now() - start, stdout_sha256: hash(stdout), stderr_sha256: hash(stderr),
        observed_models: [...new Set(events.map(observedAssistantModel).filter(model => model !== null))],
        observed_effort: null, usage: result?.usage ?? completed?.usage ?? null, client_estimated_cost_usd: result?.total_cost_usd ?? null,
        model_usage: result?.modelUsage ?? null, qualification_authority: false };
      await writeFile(join(destination, 'summary.json'), JSON.stringify(summary, null, 2));
      resolveRun(summary);
    });
  });
}
async function run(host) {
  const directory = await mkdtemp(join(tmpdir(), `delegate-${host}-native-`));
  const artifacts = join(output, `${host}-${Date.now()}`);
  await mkdir(artifacts, { recursive: true });
  await writeFile(join(directory, 'quantity.mjs'), 'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);\n');
  await writeFile(join(directory, 'quantity.test.mjs'), `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {totalQuantity} from './quantity.mjs';\ntest('preserves zero and defaults only absent quantities', () => {\n assert.equal(totalQuantity([{quantity:0},{quantity:2},{}]),3);\n assert.equal(totalQuantity([{quantity:null},{quantity:undefined}]),2);\n assert.equal(totalQuantity([]),0);\n});\n`);
  await writeFile(join(directory, 'AGENTS.md'), 'This is a disposable bounded fixture. Modify only quantity.mjs. Do not install, access the network, change configuration, or edit tests. Run node --test quantity.test.mjs.\n');
  const prompt = 'Fix totalQuantity in quantity.mjs so explicit zero is preserved and only null/undefined quantities default to one. Do not edit tests or other files. Read the existing files, implement the smallest fix, run node --test quantity.test.mjs, and report the change and result.';
  const args = (model, effort, review = false) => host.startsWith('codex')
    ? ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check', '-C', directory, '-s', review ? 'read-only' : 'workspace-write', '-m', model, '-c', `model_reasoning_effort="${effort}"`, '--json', '-']
    : ['-p', '--model', model, ...(effort ? ['--effort', effort] : []), '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--permission-mode', 'dontAsk', '--tools', review ? 'Read,Bash' : 'Read,Edit,Write,Bash', '--allowedTools', review ? 'Read,Bash(node --test *)' : 'Read,Edit,Write,Bash(node --test *)', '--max-budget-usd', '2'];
  const [workerModel, workerEffort] = modelRuns[host].worker;
  const binary = host.startsWith('claude') ? 'claude' : 'codex';
  const worker = await execute(binary, args(workerModel, workerEffort), directory, prompt, join(artifacts, 'worker'));
  const code = await readFile(join(directory, 'quantity.mjs'), 'utf8');
  const objective = await execute(process.execPath, ['--test', 'quantity.test.mjs'], directory, '', join(artifacts, 'objective'));
  let reviewer = null;
  if (objective.code === 0) {
    const [model, effort] = modelRuns[host].reviewer;
    reviewer = await execute(binary, args(model, effort, true), directory,
      'Independently review quantity.mjs against this requirement: sum supplied quantities, preserve explicit zero, default only null/undefined quantities to one, empty input gives zero. Read actual code and tests, run node --test quantity.test.mjs. Do not edit. Return ACCEPT if correct or REPAIR with a concrete defect. This is a fresh review process; do not rely on a worker report.', join(artifacts, 'reviewer'));
  }
  const result = { host, directory, artifacts, treatments: modelRuns[host], artifact_sha256: hash(code), artifact: code, worker, objective, reviewer, qualification_authority: false };
  await writeFile(join(artifacts, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await mkdir(output, { recursive: true });
  await Promise.all((process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(modelRuns)).map(run));
}
