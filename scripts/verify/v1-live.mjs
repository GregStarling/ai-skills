import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import assert from 'node:assert/strict';
import { canonicalJson, digest, hashBytes } from '../../dist/core/canonical.js';
import { candidateIdentity, parseCandidate, parseConstraintSet, parseGraderResult, parseRuntimeReport } from '../../dist/schema/index.js';
import { validateObservation } from '../../dist/evidence/index.js';
import { parseNativeTelemetry } from '../../dist/runtime/telemetry.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultReport = join(repository, 'artifacts/live-smoke/run-fWuF7K/report.json');
const originalReport = join(repository, 'artifacts/live-smoke/run-FoBWWG/report.json');
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const same = (left, right, message) => assert.equal(canonicalJson(left), canonicalJson(right), message);
const argument = (args, flag) => { assert.equal(args.filter(value => value === flag).length, 1, `Expected one ${flag}`); return args[args.indexOf(flag) + 1]; };

async function verifyAttempt(directory, provider, expectedModel, passed, manifest) {
  const [receipt, candidateInput, gradeInput, observation, sourcesInput, diagnostics, summary, tests] = await Promise.all(['receipt.json', 'candidate.json', 'grader-result.json', 'observation.json', 'evidence-sources.json', 'diagnostics.json', 'summary.json', 'objective-test-report.json'].map(file => read(join(directory, file))));
  const requiredFiles = ['receipt.json', 'candidate.json', 'grader-result.json', 'observation.json', 'objective-test-report.json', 'metadata.json', 'prepared.json', 'execution/stdout.jsonl', 'execution/stderr.log'];
  for (const file of requiredFiles) assert.equal(hashBytes(await readFile(join(directory, file))), diagnostics.artifact_digests[file], `Artifact integrity: ${provider}/${file}`);
  const candidate = parseCandidate(candidateInput), report = parseRuntimeReport(receipt.report), grade = parseGraderResult(gradeInput);
  assert.equal(digest(report), receipt.report_digest, 'Runtime report digest');
  assert.equal(candidate.provider, provider); assert.equal(candidate.model_id, expectedModel); assert.equal(candidate.snapshot_id, expectedModel);
  assert.equal(candidate.effort, provider === 'anthropic' ? 'high' : 'low');
  same(candidate.serving, { fallback: 'disabled', tool_use: 'host_tools', json_schema: false }, 'Serving configuration');
  assert.equal(report.provider, provider); assert.equal(report.candidate_id, candidate.candidate_id);
  assert.equal(receipt.mode, 'evaluation'); assert.equal(receipt.cleanup, 'complete');
  assert.equal(report.status, passed ? 'completed' : 'failed');
  if (passed) { assert.equal(report.exit_code, 0); assert.equal(report.signal, null); }
  assert.equal(report.timeout_ms, 180000);
  same(receipt.invocation.argv, report.command.args, 'Actual invocation bridge');
  assert.equal(report.command.executable, provider === 'anthropic' ? 'claude' : 'codex');
  const args = report.command.args;
  assert.equal(argument(args, provider === 'anthropic' ? '--model' : '-m'), expectedModel);
  if (provider === 'anthropic') { assert.equal(argument(args, '--effort'), 'high'); assert.equal(argument(args, '--output-format'), 'stream-json'); assert(args.includes('--safe-mode') && args.includes('--no-session-persistence')); }
  else { assert.equal(args[0], 'exec'); assert(args.includes('--json') && args.includes('--ephemeral')); assert.equal(argument(args, '--sandbox'), 'workspace-write'); assert(args.includes('model_reasoning_effort="low"')); }
  assert(!args.includes('resume') && !args.includes('--resume') && !args.includes('--bare'));
  const stdout = await readFile(join(directory, 'execution/stdout.jsonl'), 'utf8'), stderr = await readFile(join(directory, 'execution/stderr.log'));
  assert(stdout.trim().length > 0, 'Native telemetry absent');
  assert.equal(hashBytes(stdout), report.stdout_digest); assert.equal(hashBytes(stderr), report.stderr_digest);
  const telemetry = parseNativeTelemetry(provider, stdout, expectedModel);
  for (const [key, value] of Object.entries(telemetry)) same(value, receipt[key], `Recomputed telemetry: ${key}`);
  assert.equal(telemetry.provider_error, !passed); assert.equal(telemetry.malformed_events, 0);
  const sources = new Map(Object.entries(sourcesInput));
  for (const [key, bytes] of sources) assert.equal(hashBytes(bytes), key, 'Evidence source integrity');
  validateObservation(observation, { sources, runtimeReports: new Map([[receipt.report_digest, report]]) });
  assert.equal(observation.candidate.candidate_identity, candidateIdentity(candidate));
  assert.equal(observation.fixture_digest, digest(manifest)); assert.equal(observation.task_id, manifest.task_id);
  assert.equal(observation.passed, passed); assert.equal(observation.accepted, false);
  assert.equal(grade.passed, passed); assert.equal(grade.accepted, false);
  same(JSON.parse(sources.get(observation.provenance.source_digest)), grade, 'Persisted grader result');
  assert.equal(observation.attempts.length, 1);
  assert.equal(observation.attempts[0].cost_usd, telemetry.cost_usd); assert.equal(observation.attempts[0].cost_source, telemetry.cost_source);
  const check = name => { const found = grade.checks.find(value => value.check_id === name); assert(found, `Missing ${name}`); return JSON.parse(sources.get(found.evidence_digest)); };
  same(check('native_execution'), receipt, 'Native receipt source');
  const behavior = check('behavioral_tests'); same(behavior.report, tests, 'Actual test report source');
  const invocationBytes = sources.get(behavior.invocation_digest); assert.equal(hashBytes(invocationBytes), behavior.invocation_digest);
  const invocation = JSON.parse(invocationBytes);
  assert.equal(invocation.cleanup, 'complete'); assert.equal(invocation.timed_out, false); assert.equal(invocation.spawn_error, null);
  assert.equal(invocation.exit_code, passed ? 0 : 1); assert(invocation.args.includes('run'));
  for (const file of manifest.grader_files) assert(invocation.args.includes(file.path), 'Wrong grader invocation');
  assert.notEqual(invocation.cwd, report.command.cwd, 'Grader must run outside candidate');
  assert.equal(hashBytes(invocation.stdout), invocation.stdout_digest); assert.equal(hashBytes(invocation.stderr), invocation.stderr_digest);
  const assertions = tests.testResults.flatMap(suite => suite.assertionResults);
  assert.equal(tests.numTotalTests, 21); assert.equal(assertions.length, 21);
  assert.equal(tests.numPassedTests, passed ? 21 : 20); assert.equal(tests.numFailedTests, passed ? 0 : 1);
  assert.equal(tests.numPendingTests, 0); assert.equal(tests.numTodoTests, 0); assert.equal(tests.success, passed);
  assert.equal(assertions.filter(test => test.status === 'passed').length, passed ? 21 : 20);
  for (const name of manifest.required_assertions) { const test = assertions.find(test => test.title === name); assert(test, 'Required regression absent'); assert.equal(test.status, passed ? 'passed' : 'failed'); }
  const scope = check('scope'); same(scope.allowed_paths, manifest.allowed_paths, 'Graded scope');
  same(scope.changed_paths, passed ? manifest.allowed_paths : [], 'Actual changed paths');
  assert.equal(check('grader_integrity').intact, true);
  same(summary.command, report.command, 'Summary invocation'); assert.equal(summary.passed, passed); assert.equal(summary.accepted, false);
  assert(receipt.qualification_blockers.includes('PROVIDER_FALLBACK_CONTROL_UNVERIFIED'));
  return { provider, model: expectedModel, report_digest: receipt.report_digest, runtime_version: receipt.runtime_version, command: report.command, session_id: receipt.session_id, tests: 21, passed_tests: tests.numPassedTests, passed, accepted: false, cost_usd: telemetry.cost_usd, cost_source: telemetry.cost_source, observed_models: telemetry.observed_model_ids, observed_effort: report.observed_identity.effort ?? null, limitations: [...receipt.qualification_blockers, 'REQUIRED_INDEPENDENT_REVIEW_NOT_PERFORMED'], provider_errors: diagnostics.provider_errors, observation };
}

export async function verifyRetainedLive(reportPath = defaultReport) {
  const manifest = await read(join(repository, 'fixtures/harvested/foreman-t897-reconnect-notice/manifest.json'));
  const report = await read(reportPath), plan = await read(join(dirname(reportPath), 'plan.json'));
  assert.equal(plan.runtime_source_digest, hashBytes(await readFile(join(repository, 'dist/runtime/native.js'))), 'Live runtime implementation drift');
  for (const source of plan.source_files) assert.equal(hashBytes(await readFile(source.path)), source.digest, 'Captured discovery source drift');
  assert.equal(report.schema_version, 'live_smoke.v1'); assert.equal(report.passed, true); assert.equal(report.accepted, false); assert.equal(report.qualification_authority, false);
  assert.equal(report.results.length, 2); same(report.results.map(result => result.provider).sort(), ['anthropic', 'openai'], 'Two distinct providers');
  const constraints = parseConstraintSet(plan.constraints); assert.equal(digest(constraints), plan.constraints_digest);
  const results = await Promise.all([['anthropic', 'claude-opus-5'], ['openai', 'gpt-5.5']].map(async ([provider, model]) => {
    const directory = join(dirname(reportPath), provider);
    same(await read(join(directory, 'summary.json')), report.results.find(result => result.provider === provider), 'Aggregate report drift');
    const result = await verifyAttempt(directory, provider, model, true, manifest);
    assert.equal(result.observation.cohort_id, report.cohort_id); assert.equal(result.observation.constraints_digest, plan.constraints_digest);
    assert.equal(result.observation.role_id, 'implementer'); assert.equal(result.observation.risk, 'high');
    return result;
  }));
  assert.notEqual(results[0].command.cwd, results[1].command.cwd); assert(results.every(result => result.session_id)); assert.notEqual(results[0].session_id, results[1].session_id);
  const pairingFields = ['cohort_id', 'task_id', 'fixture_digest', 'suite_id', 'suite_version', 'harness_version', 'grader_version', 'task_class_id', 'role_id', 'risk', 'constraints_digest'];
  const pairing = result => Object.fromEntries(pairingFields.map(key => [key, result.observation[key]]));
  same(pairing(results[0]), pairing(results[1]), 'Cross-candidate replay pairing mismatch');
  assert.notEqual(results[0].observation.candidate.candidate_identity, results[1].observation.candidate.candidate_identity, 'Replay must use distinct candidates');
  const failures = await Promise.all([['anthropic', 'claude-fable-5-1'], ['openai', 'gpt-6-astra']].map(([provider, model]) => verifyAttempt(join(dirname(originalReport), provider), provider, model, false, manifest)));
  const prior = await read(originalReport); assert.equal(prior.passed, false);
  return { schema_version: 'retained_live_proof.v1', criterion: 'AC-044', live_supplement: ['AC-025'], pairing: pairing(results[0]), pairing_digest: digest(pairing(results[0])), passed: true, verification: 'retained_actual_evidence', new_provider_calls: 0, report: resolve(reportPath), original_failed_report: originalReport, accepted: false, qualification: 'HOLD', results: results.map(({ observation, ...result }) => result), prior_failures: failures.map(({ observation, ...result }) => result) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({ options: { report: { type: 'string' } } });
    console.log(canonicalJson(await verifyRetainedLive(values.report ? resolve(values.report) : undefined)));
  } catch (error) {
    console.error(JSON.stringify({ schema_version: 'retained_live_proof.v1', criterion: 'AC-044', passed: false, error: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 1;
  }
}
