import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { canonicalJson, digest, hashBytes } from '../../dist/core/canonical.js';
import { candidateIdentity, parseCandidate, parseConstraintSet } from '../../dist/schema/index.js';
import { prepareFixture, gradeFixture } from '../../dist/evaluation/index.js';
import { Ledger } from '../../dist/ledger/index.js';
import { executeEvaluation } from '../../dist/evaluation/runner.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const defaultTreatments = [
  { provider: 'anthropic', model: 'claude-fable-5-1', effort: 'high' },
  { provider: 'openai', model: 'gpt-6-astra', effort: 'low' },
];
const save = (path, value) => writeFile(path, canonicalJson(value) + '\n', { flag: 'wx' });

export async function captureAttemptArtifacts(attempt, execution, graderReport) {
  const messages = [];
  if (execution) {
    const stdout = await readFile(execution.stdout_path, 'utf8');
    for (const line of stdout.split('\n').filter(Boolean)) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'error' && typeof event.message === 'string') messages.push(event.message);
        if (event.type === 'turn.failed' && typeof event.error?.message === 'string') messages.push(event.error.message);
        if (event.type === 'result' && event.is_error === true && typeof event.result === 'string') messages.push(event.result);
      } catch { /* Malformed events remain in raw stdout and fail native validation. */ }
    }
  }
  let reportPath = null;
  if (graderReport) {
    reportPath = join(attempt, 'objective-test-report.json');
    await writeFile(reportPath, await readFile(graderReport), { flag: 'wx' });
  }
  const artifacts = {};
  for (const file of ['receipt.json', 'observation.json', 'grader-result.json', 'objective-test-report.json', 'candidate.json', 'metadata.json', 'prepared.json', 'execution/stdout.jsonl', 'execution/stderr.log']) {
    try { artifacts[file] = hashBytes(await readFile(join(attempt, file))); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const diagnostics = { provider_errors: [...new Set(messages)], objective_report: reportPath, artifact_digests: artifacts, observed_effort: execution?.report.observed_identity.effort ?? null, qualification_authority: false };
  await save(join(attempt, 'diagnostics.json'), diagnostics);
  return diagnostics;
}

/** One paid attempt per selected provider; no implicit retries or qualification. */
export async function runLiveSmoke({ sourceRepository, dependencyDirectory, outputRoot = join(repository, 'artifacts/live-smoke'), providers = ['anthropic', 'openai'], treatments = defaultTreatments, cohortId } = {}) {
  if (!sourceRepository || !dependencyDirectory) throw new Error('SOURCE_REPOSITORY_AND_VERIFIED_GRADER_DEPENDENCIES_REQUIRED');
  if (!Array.isArray(treatments) || treatments.some(t => !['anthropic', 'openai'].includes(t.provider) || typeof t.model !== 'string' || typeof t.effort !== 'string') || new Set(treatments.map(t => t.provider)).size !== treatments.length) throw new Error('INVALID_EXPLICIT_TREATMENTS');
  if (!providers.length || providers.some(p => !treatments.some(t => t.provider === p)) || new Set(providers).size !== providers.length) throw new Error('INVALID_LIVE_PROVIDERS');
  await mkdir(outputRoot, { recursive: true });
  const output = await mkdtemp(join(resolve(outputRoot), 'run-'));
  const workspaceRoot = await mkdtemp('/tmp/model-governor-live-');
  const cohort = cohortId ?? `live_t897_${Date.now()}`;
  const constraints = parseConstraintSet({ schema_version: 'constraint_set.v1', constraint_id: 'live_t897_constraints', version: 1, allowed_tools: ['host_tools'], required_tools: ['host_tools'], forbidden_paths: [], max_cost_usd: null, max_latency_ms: 180000, requires_fresh_context: true, requires_local_execution: false, requires_vision: false, requires_browser: false, language: 'typescript' });
  const records = await new Ledger(join(repository, 'artifacts/discovery-ledger')).list();
  const sources = await Promise.all(records.filter(record => typeof record.payload?.body === 'string' && Array.isArray(record.payload.models)).map(async record => {
    const path = join(repository, 'artifacts/discovery-ledger', digest(record.id).slice(7) + '.json');
    const bytes = await readFile(path, 'utf8');
    if (hashBytes(record.payload.body) !== record.payload.source_digest) throw new Error('DISCOVERY_SOURCE_DIGEST_MISMATCH');
    return { path, digest: hashBytes(bytes), record };
  }));
  await save(join(output, 'plan.json'), { purpose: 'qualification_evaluation', qualification_authority: false, cohort_id: cohort, timeout_ms: 180000, constraints, constraints_digest: digest(constraints), workspace_root: workspaceRoot, source_repository: resolve(sourceRepository), dependency_directory: resolve(dependencyDirectory), treatments: treatments.filter(t => providers.includes(t.provider)), source_files: sources.map(({path,digest}) => ({path,digest})), runtime_source_digest: hashBytes(await readFile(join(repository, 'dist/runtime/native.js'))) });
  console.log(JSON.stringify({ event: 'live_smoke_started', output, cohort_id: cohort }));
  const results = await Promise.all(treatments.filter(t => providers.includes(t.provider)).map(async treatment => {
    const attempt = join(output, treatment.provider);
    await mkdir(attempt);
    let prepared, candidate;
    try {
      const discovered = sources.flatMap(source => source.record.payload.models.map(model => ({ source, model }))).find(({model}) => model.model_id === treatment.model && model.provider === treatment.provider);
      if (!discovered) throw new Error('OFFICIAL_MODEL_METADATA_MISSING');
      const metadata = { purpose: 'evaluation_metadata_only', qualification_authority: false, model: discovered.model, source_path: discovered.source.path, source_file_digest: discovered.source.digest, identity_basis: { requested_snapshot_id: treatment.model, source_files: sources.map(({path,digest}) => ({path,digest})), account_availability: 'unknown' } };
      await save(join(attempt, 'metadata.json'), metadata);
      candidate = parseCandidate({ schema_version: 'candidate.v1', candidate_id: `evaluation_${treatment.provider}_${treatment.model.replaceAll(/[^a-z0-9]/g, '_')}_${treatment.effort}`, provider: treatment.provider, model_id: treatment.model, snapshot_id: treatment.model, effort: treatment.effort, serving: { fallback: 'disabled', tool_use: 'host_tools', json_schema: false }, material_serving_settings: ['fallback', 'tool_use'], provenance: { registry_id: 'evaluation_metadata_only', model_record_id: `evaluation_${treatment.provider}`, registry_content_digest: digest(metadata) } });
      await save(join(attempt, 'candidate.json'), candidate);
      prepared = await prepareFixture({ fixtureId: 'foreman-t897-reconnect-notice', sourceRepository, workspaceRoot, bundleRoot: join(repository, 'fixtures/harvested') });
      await save(join(attempt, 'prepared.json'), prepared);
      console.log(JSON.stringify({ event: 'provider_launch', provider: treatment.provider, model: treatment.model, effort: treatment.effort, workspace: prepared.workspace, output: attempt }));
      const result = await executeEvaluation({ prepared, candidate, timeoutMs: 180000, outputDirectory: attempt, cohortId: cohort, roleId: 'implementer', risk: 'high', constraintsDigest: digest(constraints), dependencyDirectory });
      const diagnostics = await captureAttemptArtifacts(attempt, result.execution, result.grade.reportPath);
      const summary = { provider: treatment.provider, candidate_identity: candidateIdentity(candidate), runtime_status: result.execution.report.status, objective_status: result.grade.status, passed: result.observation.passed, accepted: false, runtime_receipt: join(attempt, 'receipt.json'), observation: join(attempt, 'observation.json'), grader_result: join(attempt, 'grader-result.json'), grader_report: result.grade.reportPath, changed_paths: result.grade.changedPaths, command: result.execution.report.command, requested_effort: treatment.effort, observed_effort: result.execution.report.observed_identity.effort ?? null, observed_models: result.execution.observed_model_ids, identity_status: result.execution.identity_status, cost_usd: result.execution.cost_usd, cost_source: result.execution.cost_source, attempts: result.observation.attempts, operational_limits: result.operationalLimits };
      summary.diagnostics = diagnostics;
      await save(join(attempt, 'summary.json'), summary);
      console.log(JSON.stringify({ event: 'provider_finished', ...summary }));
      return summary;
    } catch (error) {
      let grade = null, gradingError = null, receipt = null;
      try { receipt = JSON.parse(await readFile(join(attempt, 'receipt.json'), 'utf8')); } catch {}
      if (prepared && candidate) {
        try { const result = await gradeFixture({ prepared, candidateIdentity: candidateIdentity(candidate), dependencyDirectory }); grade = { status: result.status, result: result.result, report_path: result.reportPath }; } catch (failure) { gradingError = String(failure); }
      }
      const summary = { provider: treatment.provider, runtime_status: receipt?.report.status ?? 'operationally_blocked', passed: false, accepted: false, error: error instanceof Error ? error.message : String(error), grade, grading_error: gradingError, runtime_receipt: receipt ? join(attempt, 'receipt.json') : null, cost_usd: receipt?.cost_usd ?? null, cost_source: receipt?.cost_source ?? 'unknown', command: receipt?.report.command ?? null };
      summary.diagnostics = await captureAttemptArtifacts(attempt, receipt, grade?.report_path);
      await save(join(attempt, 'summary.json'), summary);
      console.log(JSON.stringify({ event: 'provider_blocked', ...summary }));
      return summary;
    }
  }));
  const report = { schema_version: 'live_smoke.v1', purpose: 'qualification_evaluation', qualification_authority: false, cohort_id: cohort, output_directory: output, passed: results.length === 2 && results.every(r => r.passed), accepted: false, results };
  await save(join(output, 'report.json'), report);
  console.log(JSON.stringify({ event: 'live_smoke_finished', report: join(output, 'report.json'), passed: report.passed }));
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { 'source-repository': { type: 'string' }, 'dependency-directory': { type: 'string' }, 'output-root': { type: 'string' }, provider: { type: 'string', multiple: true }, cohort: { type: 'string' }, 'treatments-json': { type: 'string' } } });
  const result = await runLiveSmoke({ sourceRepository: values['source-repository'], dependencyDirectory: values['dependency-directory'], ...(values['output-root'] ? { outputRoot: values['output-root'] } : {}), ...(values.provider ? { providers: values.provider } : {}), ...(values.cohort ? { cohortId: values.cohort } : {}), ...(values['treatments-json'] ? { treatments: JSON.parse(values['treatments-json']) } : {}) });
  process.exitCode = result.passed ? 0 : 1;
}
