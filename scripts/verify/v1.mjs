#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash,randomUUID} from 'node:crypto';
import {access,mkdir,mkdtemp,readFile,readdir,symlink,writeFile} from 'node:fs/promises';
import {join,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const execute=promisify(execFile),root=resolve(import.meta.dirname,'../..');
const argv=process.argv.slice(2),arg=name=>{const i=argv.indexOf(name);return i<0?undefined:argv[i+1];};
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const byteHash=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');

async function checkCoverage(inputPath){
 const input=await readJson(inputPath),map=await readJson(join(root,'docs/v1-coverage.json')),spec=await readJson(join(root,'docs/spec.json')),tests=await readJson(input.testReport);
 assert.equal(map.schema_version,'v1_coverage_map.v1');assert.equal(map.spec_id,spec.specId);
 assert.deepEqual(map.scenarios.map(row=>row.id).sort(),spec.acceptanceScenarios.map(row=>row.id).sort(),'Coverage must map all44 acceptance scenarios exactly once');
 assert.ok(tests.numTotalTests>0&&tests.numPassedTests===tests.numTotalTests&&tests.numFailedTests===0&&tests.numPendingTests===0&&(tests.numTodoTests??0)===0&&tests.success===true,'Full tests must actually execute without failed/empty/skipped assertions');
 const executed=new Map(tests.testResults.map(result=>[relative(root,result.name).replaceAll('\\','/'),result]));
 const observedChecks=new Map(input.checks.map(check=>[check.check_id,check.status]));
 const rows=[];
 for(const scenario of map.scenarios){
  const original=spec.acceptanceScenarios.find(item=>item.id===scenario.id);
  assert.equal(scenario.title,original.title);assert.deepEqual(scenario.requirement_ids,original.requirementIds);
  assert.ok(['offline','composite','live'].includes(scenario.mode),'Unknown coverage mode');
  if(scenario.mode==='composite')assert.equal(scenario.id,'AC-025');
  if(scenario.mode==='live'){assert.equal(scenario.id,'AC-044');rows.push({id:scenario.id,status:'requires_separate_live_evidence',test_assertions:0});continue;}
  assert.ok(scenario.test_files.length>0,`${scenario.id} needs relevant executed tests`);
  const failures=[];let assertions=0;
  if(scenario.known_gap)failures.push(scenario.known_gap);
  for(const file of scenario.test_files){
   const result=executed.get(file);
   if(!result||!result.assertionResults?.length||result.assertionResults.some(test=>test.status!=='passed'))failures.push(`Relevant test file did not fully pass: ${file}`);
   else assertions+=result.assertionResults.length;
  }
  for(const check of scenario.required_checks)if(observedChecks.get(check)!=='passed')failures.push(`Required executed check did not pass: ${check}`);
  for(const path of scenario.source_artifacts)await access(join(root,path));
  rows.push({id:scenario.id,status:failures.length?'gap':scenario.mode==='composite'?'offline_component_passed_requires_live_supplement':'passed',test_assertions:assertions,failures,...(scenario.required_live_supplement?{required_live_supplement:scenario.required_live_supplement}:{})});
 }
 for(const source of input.sources){assert.equal(byteHash(await readFile(source.path)),source.digest,`Source changed during proof: ${source.path}`);}
 const result={schema_version:'v1_coverage_result.v1',mode:'offline',scenarios:rows,passed:rows.every(row=>row.status==='passed'||row.status==='requires_separate_live_evidence'||row.status==='offline_component_passed_requires_live_supplement')};
 await writeFile(input.coverageResult,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result));if(!result.passed)process.exitCode=1;
}

async function main(){
 if(argv[0]==='--check-coverage'){await checkCoverage(argv[1]);return;}
 process.chdir(root);
 const base=resolve(arg('--output-directory')??'artifacts/proof');await mkdir(base,{recursive:true});
 const output=await mkdtemp(join(base,'offline-')),bootstrap=join(output,'bootstrap');await mkdir(bootstrap);
 // Bootstrap only the proof recorder; the required full build is separately
 // executed and recorded below. This works in a clean checkout without dist/.
 const setup=await execute(process.execPath,[join(root,'node_modules/typescript/bin/tsc'),'--ignoreConfig',join(root,'src/proof/index.ts'),'--rootDir',join(root,'src'),'--outDir',bootstrap,'--target','ES2022','--module','NodeNext','--types','node','--skipLibCheck'],{cwd:root,timeout:30000,maxBuffer:4*1024*1024});
 await writeFile(join(output,'bootstrap.stdout'),setup.stdout);await writeFile(join(output,'bootstrap.stderr'),setup.stderr);
 await writeFile(join(bootstrap,'package.json'),'{"type":"module"}');await symlink(join(root,'node_modules'),join(bootstrap,'node_modules'),'dir');
 const {executeProofCheck,createProofReport,verifyProofReport}=await import(pathToFileURL(join(bootstrap,'proof/index.js')).href);
 const map=await readJson(join(root,'docs/v1-coverage.json'));
 const sourcePaths=[];
 async function walk(path){for(const entry of await readdir(path,{withFileTypes:true})){const target=join(path,entry.name);if(entry.isDirectory())await walk(target);else if(entry.isFile())sourcePaths.push(target);else throw new Error(`Unsupported source artifact: ${target}`);}}
 for(const directory of ['src','test','scripts/verify','fixtures','policy','schemas','skills']){try{await access(join(root,directory));await walk(join(root,directory));}catch(error){if(error.code!=='ENOENT')throw error;}}
 for(const path of map.scenarios.flatMap(scenario=>scenario.source_artifacts))sourcePaths.push(join(root,path));
 for(const path of ['package.json','package-lock.json','tsconfig.json','tsconfig.build.json','docs/spec.json','docs/v1-coverage.json'])sourcePaths.push(join(root,path));
 const sources=await Promise.all([...new Set(sourcePaths)].sort().map(async path=>({path,digest:byteHash(await readFile(path))})));
 const sourceManifest=join(output,'source-manifest.json');await writeFile(sourceManifest,JSON.stringify(sources,null,2)+'\n');
 const checks=[],errors=[];
 const run=async(checkId,command,args,{artifacts=[],testReport,evidenceKind='synthetic',timeoutMs=120000,coverage=[]}={})=>{
  process.stdout.write(`Verifying ${checkId}...\n`);
  try{const check=await executeProofCheck({checkId,mode:'offline',command,args,cwd:root,artifactDirectory:join(output,'checks'),timeoutMs,coverage,evidenceKind,artifacts,...(testReport?{testReport}:{})});checks.push(check);return check;}
  catch(error){errors.push({check_id:checkId,error:error.message});process.stderr.write(`${checkId}: ${error.message}\n`);return null;}
 };
 await run('build','npm',['run','build']);
 await run('typecheck','npm',['run','typecheck']);
 const testReport=join(output,'vitest.json');
 await run('full_tests',process.execPath,[join(root,'node_modules/vitest/vitest.mjs'),'run','--reporter=json',`--outputFile=${testReport}`],{testReport,timeoutMs:180000});
 await run('foundation_cli',process.execPath,['scripts/verify/foundation.mjs'],{artifacts:['fixtures/bindings/manifest.json']});
 for(const [id,criterion]of [['shared_schema_strict','strict-rejections'],['shared_schema_identity','candidate-identity']])await run(id,process.execPath,['scripts/verify/shared-schemas.mjs','--criterion',criterion]);
 const candidates=await readJson('docs/evaluation-source-candidates.json'),calibration=await readJson('docs/evaluation-source-calibration.json');
 const source=arg('--source')??process.env.MODEL_GOVERNOR_SOURCE_REPOSITORY??candidates.source_repository;
 let dependencies=arg('--grader-dependencies')??process.env.MODEL_GOVERNOR_GRADER_DEPENDENCIES;
 if(!dependencies){const previous=calibration.results?.[0]?.workspace??calibration.candidates?.[0]?.workspace;if(previous){const cached=join(previous,'node_modules');try{await access(cached);dependencies=cached;}catch{}}}
 const calibrationReport=join(output,'real-fixtures.json');
 await run('real_fixture_calibration',process.execPath,['scripts/verify/real-fixtures.mjs','--source',source,'--output',calibrationReport,...(dependencies?['--dependency-directory',dependencies]:[])],{evidenceKind:'harvested',timeoutMs:240000,artifacts:[calibrationReport]});
 await run('portable_skills',process.execPath,['scripts/verify/skills.mjs']);
 await run('workflow_cli',process.execPath,['scripts/verify/workflow.mjs']);
 const coverageResult=join(output,'coverage.json'),coverageInput=join(output,'coverage-input.json');
 await writeFile(coverageInput,JSON.stringify({testReport,coverageResult,checks:checks.map(check=>({check_id:check.check_id,status:check.status})),sources},null,2)+'\n');
 const offlineIds=map.scenarios.filter(row=>row.mode!=='live').map(row=>row.mode==='composite'?`${row.id}:offline_component`:row.id);
 await run('coverage_integrity',process.execPath,['scripts/verify/v1.mjs','--check-coverage',coverageInput],{artifacts:[coverageResult,sourceManifest,...sources.map(source=>source.path)],coverage:offlineIds});
 const report=await createProofReport({id:`offline_${randomUUID().replaceAll('-','')}`,mode:'offline',checks});
 const reportPath=join(output,'proof.json');await writeFile(reportPath,JSON.stringify(report,null,2)+'\n');
 let verified;try{verified=await verifyProofReport(report,{requiredCoverage:offlineIds});}catch(error){errors.push({check_id:'required_coverage',error:error.message});}
 const passed=verified?.passed===true&&errors.length===0;
 await writeFile(join(output,'errors.json'),JSON.stringify(errors,null,2)+'\n');
 console.log(JSON.stringify({status:passed?'passed':'failed',mode:'offline',offline_covered:verified?.coverage.filter(id=>!id.includes(':')).length??0,offline_components:verified?.coverage.filter(id=>id.includes(':'))??[],live_only:['AC-044'],live_supplement_required:['AC-025'],report:reportPath,coverage_report:coverageResult,errors},null,2));
 if(!passed)process.exitCode=1;
}
main().catch(error=>{console.error(JSON.stringify({status:'failed',mode:'offline',error:error.message}));process.exitCode=1;});
