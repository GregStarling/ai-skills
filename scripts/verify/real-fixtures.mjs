import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { digest, canonicalJson, hashBytes } from '../../dist/core/canonical.js';
import { prepareFixture, gradeFixture } from '../../dist/evaluation/index.js';
const execute=promisify(execFile);
const args=process.argv.slice(2);
const option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const source=option('--source');
if (!source) throw new Error('Usage: node scripts/verify/real-fixtures.mjs --source /path/to/foreman [--dependency-directory /path/to/isolated/node_modules] [--output /path/report.json]');
const root=await mkdtemp(join(tmpdir(),'governor-real-calibration-'));
const results=[];
for (const fixtureId of ['foreman-t897-reconnect-notice','foreman-t920-derived-gate-id']) {
  const prepared=await prepareFixture({fixtureId,sourceRepository:source,workspaceRoot:root});
  const grading={prepared,candidateIdentity:digest({purpose:'historical calibration only; no model invoked'}),...(option('--dependency-directory')?{dependencyDirectory:option('--dependency-directory')}:{})};
  const parent=await gradeFixture(grading);
  const assertions=parent.report?.testResults?.flatMap(test=>test.assertionResults??[])??[];
  const reproduces=parent.status==='behavioral_failure' && prepared.manifest.required_assertions.every(name=>assertions.some(test=>test.status==='failed'&&(test.title===name||test.fullName.endsWith(name))));
  if (!reproduces) throw new Error(`${fixtureId}: parent did not reproduce named behavioral regression (${parent.status})`);
  // Evaluator-only calibration. This directory must never become candidate input.
  for (const path of prepared.manifest.allowed_paths) {
    const {stdout}=await execute('git',['-C',resolve(source),'show',`${prepared.manifest.grader_revision}:${path}`],{encoding:'buffer',maxBuffer:8*1024*1024});
    await writeFile(join(prepared.workspace,path),stdout);
  }
  const knownFix=await gradeFixture(grading);
  if (knownFix.status!=='passed') throw new Error(`${fixtureId}: historical known fix failed independent grader (${knownFix.status})`);
  results.push({fixture_id:fixtureId,fixture_digest:prepared.fixtureDigest,parent_revision:prepared.manifest.parent_revision,known_fix_revision:prepared.manifest.grader_revision,parent_status:parent.status,known_fix_status:knownFix.status,parent_report:{path:parent.reportPath,digest:hashBytes(await readFile(parent.reportPath))},known_fix_report:{path:knownFix.reportPath,digest:hashBytes(await readFile(knownFix.reportPath))},parent_grader:parent.result,known_fix_grader:knownFix.result});
}
const report={schema_version:'real_fixture_calibration.v1',generated_at:new Date().toISOString(),model_calls:0,model_performance_evidence:false,warning:'Candidate directories in this calibration now contain historical known fixes; never reuse them for model evaluations.',results};
const output=resolve(option('--output')??join(root,'calibration.json'));
await writeFile(output,canonicalJson(report)+'\n');
console.log(JSON.stringify({status:'passed',fixtures:results.length,model_calls:0,report:output,report_digest:hashBytes(await readFile(output))}));
