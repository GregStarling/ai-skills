import {it,describe,expect,afterEach} from 'vitest';
import {readdir,readFile,writeFile,mkdtemp,mkdir,rm} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFile,spawnSync} from 'node:child_process';
import {promisify} from 'node:util';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as native from '../../src/runtime/native.js';
const driver=await import(pathToFileURL(resolve('scripts/verify/direct-vs-delegated.mjs')).href);
const harness=await import(pathToFileURL(resolve('scripts/verify/installed-delegate.mjs')).href);
const {folderDigest}=await import(pathToFileURL(resolve('skills/delegate/scripts/local-learning.mjs')).href);
const temporary:string[]=[];
const temporaryRoot=async()=>{const p=await mkdtemp(join(tmpdir(),'matched-driver-'));temporary.push(p);return p;};
afterEach(async()=>{await Promise.all(temporary.splice(0).map(p=>rm(p,{recursive:true,force:true})));});
const fixture={manifest:{fixture_id:'test-fixture',parent_revision:'a'.repeat(40),grader_revision:'b'.repeat(40),allowed_paths:['src/shared.ts']},fixtureDigest:'sha256:'+'c'.repeat(64)};
const prepared=(directory:string)=>({directory,fixtureRoot:directory+'/candidate',harvested:fixture,starting_artifact_digest:'sha256:'+'d'.repeat(64),skill_folder_digest:'sha256:'+'e'.repeat(64),instruction_variant:'current',helper_commands:['capture','finish','start']});
const ledger=(count:number)=>({executions:count,rows:Array.from({length:count},(_,index)=>({index,role:index?'worker':'coordinator'})),task_wall_clock_ms:1000,rework_heuristic:0,limitations:[]});
const arm=(count:number)=>({acceptance:'pending_frontier_trace_review',after:{result:{passed:true,checks:['scope','grader_integrity','behavioral_tests'].map(check_id=>({check_id,passed:true}))}},ledger:ledger(count),maintainer_review:{passed:true,author:'maintainer',worker_wrote_every_changed_path:true,coordinator_inspected_artifact:true}});
describe('matched pair offline contracts',()=>{
 it('pins pairing, arm order, mode-free scopes, caps, and null unobserved identities',()=>{
  const manifest=driver.pairManifest({pairId:'pair',host:'codex',fixtureIndex:0,prepared:{direct:prepared('/a'),delegated:prepared('/b')}});
  expect(manifest.order).toEqual(['direct','delegated']);expect(driver.armOrder(1)).toEqual(['delegated','direct']);
  expect(manifest.thread_ids).toBeNull();expect(manifest.host_version).toBeNull();
  expect(manifest.arms.direct.scope).toBe(manifest.arms.delegated.scope);
  expect(manifest.arms.direct.run_id).toBe('pair-direct');expect(manifest.arms.delegated.run_id).toBe('pair-delegated');
  expect(manifest.arms.direct.max_model_calls).toBe(1);expect(manifest.arms.delegated.max_model_calls).toBe(4);
  expect(manifest.arms.direct.timeout_ms).toBe(600000);
  expect(()=>driver.pairManifest({pairId:'pair',host:'codex',fixtureIndex:0,prepared:{direct:prepared('/a'),delegated:{...prepared('/b'),starting_artifact_digest:'different'}}})).toThrow('BASELINE_MISMATCH');
  expect(()=>driver.pairManifest({pairId:'pair',host:'codex',fixtureIndex:0,prepared:{direct:prepared('/a'),delegated:prepared('/a')}})).toThrow('FRESH_PAIR');
 });
 it.each(['claude','codex'])('sanitizes %s inherited credentials and nested state and refuses a leaked key',host=>{
  const inherited={HOME:'/home/test',PATH:'/bin',USER:'test',SHELL:'/bin/sh',TMPDIR:'/tmp',CLAUDECODE:'nested',CLAUDE_CODE_SESSION_ID:'nested',CODEX_THREAD_ID:'nested',CLAUDE_CODE_SUBAGENT_MODEL:'override',ANTHROPIC_API_KEY:'secret',OPENAI_BASE_URL:'secret',NODE_OPTIONS:'--require evil',UNRELATED:'no'};
  const environment=driver.sanitizedChildEnvironment(native,host,inherited);
  expect(environment.env).toEqual({HOME:'/home/test',PATH:'/bin',USER:'test',SHELL:'/bin/sh',TMPDIR:'/tmp'});
  expect(environment.identity.CLAUDE_CODE_SUBAGENT_MODEL).toBeNull();expect(environment.identity.ANTHROPIC_API_KEY).toBeNull();
  expect(environment.overrideNames).toContain('CLAUDECODE');expect(JSON.stringify(environment)).not.toContain('secret');
  expect(()=>driver.assertChildEnvironment({...environment.env,CLAUDECODE:'nested'})).toThrow('UNSANITIZED');
 });
 it('requires both full grades and a maintainer review before any time claim, regardless of counters',()=>{
  const direct=arm(1),delegated=arm(2);delegated.ledger.task_wall_clock_ms=500;
  expect(driver.pairVerdict({direct,delegated})).toMatchObject({verdict:'delegated',claim:'lower wall clock at n=1'});
  const missingReview={...delegated,maintainer_review:null};
  expect(driver.pairVerdict({direct,delegated:missingReview}).claim).toBeNull();
  expect(driver.pairVerdict({direct,delegated:{...delegated,acceptance:'blocked_provider_limit'}}).verdict).toBe('blocked');
  delegated.after.result.checks[0]!.passed=false;
  expect(driver.pairVerdict({direct,delegated})).toMatchObject({verdict:'direct',claim:null});
  delegated.after.result.checks[0]!.passed=true;delegated.ledger.rework_heuristic=1;
  expect(driver.pairVerdict({direct,delegated})).toMatchObject({verdict:'mixed',claim:null});
  expect(driver.qualityGate({...direct,ledger:ledger(2)},'direct')).toBe(false);
  expect(driver.qualityGate({...delegated,maintainer_review:{...delegated.maintainer_review,worker_wrote_every_changed_path:false}},'delegated')).toBe(false);
 });
 it('reserves worst cases, refuses ceiling overruns and duplicate execution IDs, and counts failed launches',()=>{
  let tally=driver.createExecutionTally(5);
  tally=driver.reserveExecutions(tally,{host:'claude',runId:'d',mode:'direct'});
  expect(()=>driver.reserveExecutions(tally,{host:'claude',runId:'d',mode:'direct'})).toThrow('ALREADY_RESERVED');
  tally=driver.reserveExecutions(tally,{host:'claude',runId:'g',mode:'delegated'});
  expect(()=>driver.reserveExecutions(tally,{host:'codex',runId:'extra',mode:'direct'})).toThrow('CEILING_EXCEEDED');
  tally=driver.settleExecutions(tally,'d',{ledger:ledger(1)}).tally;
  const failed={...ledger(3),failed_launches:1};
  tally=driver.settleExecutions(tally,'g',{ledger:failed}).tally;
  expect(tally.executions).toBe(4);expect(tally.reserved).toBe(0);
  expect(()=>driver.reserveExecutions(tally,{host:'codex',runId:'extra',mode:'delegated'})).toThrow('CEILING_EXCEEDED');
 });
 it('marks excess children unbudgeted, fails closed on missing traces, and stops the limited host',()=>{
  const reserve=()=>driver.reserveExecutions(driver.createExecutionTally(10),{host:'codex',runId:'d',mode:'direct'});
  const over=driver.settleExecutions(reserve(),'d',{ledger:ledger(2)});
  expect(over.tally.halted).toBe(true);expect(over.tally.executions).toBe(2);expect(over.result.ledger.rows[1].unbudgeted).toBe(true);
  expect(driver.settleExecutions(reserve(),'d',{}).tally.halted).toBe(true);
  const incomplete={...ledger(1),reported_execution_lower_bound:7,limitations:['count may be incomplete']};
  expect(driver.settleExecutions(reserve(),'d',{ledger:incomplete}).tally).toMatchObject({executions:7,halted:true});
  const limited=driver.settleExecutions(reserve(),'d',{ledger:ledger(1),acceptance:'blocked_provider_limit'}).tally;
  expect(()=>driver.reserveExecutions(limited,{host:'codex',runId:'again',mode:'direct'})).toThrow('HALTED');
  expect(driver.reserveExecutions(limited,{host:'claude',runId:'other',mode:'direct'}).reserved).toBe(1);
 });
 it('counts preflights and permits no more than one retry per host',()=>{
  let tally=driver.createExecutionTally(10);
  for(const runId of ['p1','p2']){tally=driver.reserveExecutions(tally,{host:'claude',runId,purpose:'capacity_preflight'});tally=driver.settleExecutions(tally,runId,{ledger:ledger(1)}).tally;}
  expect(tally.executions).toBe(2);
  expect(()=>driver.reserveExecutions(tally,{host:'claude',runId:'p3',purpose:'capacity_preflight'})).toThrow('PREFLIGHT_RETRY_CAP');
 });
 it('refuses reused campaign directories and execution without an approved count before any host call',async()=>{
  const parent=await temporaryRoot();await writeFile(join(parent,'original'),'preserved');
  await expect(driver.runPairs({outputDirectory:parent})).rejects.toMatchObject({code:'EEXIST'});
  await expect(driver.runPairs({outputDirectory:join(parent,'live'),dryRun:false})).rejects.toThrow('APPROVED_EXECUTION_COUNT_REQUIRED');
  expect(existsSync(join(parent,'live'))).toBe(false);expect(await readFile(join(parent,'original'),'utf8')).toBe('preserved');
 });
 it.skipIf(spawnSync('git',['cat-file','-e','a7966cc:skills/delegate']).status!==0)('detects the legacy variant and original digest from an exact Git export',async()=>{
  const directory=await temporaryRoot(),tar=join(directory,'skill.tar');
  const execute=promisify(execFile);
  await execute('git',['archive',`--output=${tar}`,'a7966cc','skills/delegate']);
  await execute('tar',['-xf',tar,'-C',directory]);
  const skillSource=join(directory,'skills/delegate');
  expect(await folderDigest(skillSource)).toMatch(/^sha256:b78790de/);
  const trial=await harness.prepareInstalledTrial('claude','tinybug',{skillSource,temporaryDirectory:directory});
  expect(trial.instruction_variant).toBe('legacy');expect(trial.skill_folder_digest).toBe(await folderDigest(skillSource));
  expect(harness.helperInstructions(await readFile(resolve('skills/delegate/scripts/local-learning.mjs'),'utf8')).instruction_variant).toBe('current');
 });
});

it('passes only the sanitized environment to the actual child process',async()=>{
 const {execute}=await import(pathToFileURL(resolve('scripts/verify/host-evidence.mjs')).href);
 const directory=await temporaryRoot(),environment=driver.sanitizedChildEnvironment(native,'claude',{PATH:process.env['PATH'],CLAUDECODE:'nested',OPENAI_API_KEY:'secret',NODE_OPTIONS:'--require missing'});
 const result=await execute(process.execPath,['-e','process.stdout.write(JSON.stringify(process.env))'],directory,'',join(directory,'child'),10000,{env:environment.env});
 expect(result.code).toBe(0);
 const observed=JSON.parse(await readFile(join(directory,'child/stdout.jsonl'),'utf8'));
 expect(observed.CLAUDECODE).toBeUndefined();expect(observed.OPENAI_API_KEY).toBeUndefined();expect(observed.NODE_OPTIONS).toBeUndefined();
});

const hasHarvest=existsSync(resolve('dist/runtime/native.js'))&&existsSync('/Users/gregpro/foreman/.git')&&existsSync(resolve('artifacts/direct-vs-delegated/deps-b962c1ac/node_modules'));
it.skipIf(!hasHarvest)('writes fresh dry-run pairs with matching scopes, alternating order and zero executions',async()=>{
 const directory=await temporaryRoot();
 const result=await driver.runPairs({hosts:['codex'],outputDirectory:join(directory,'campaign'),campaignId:'test-m3'});
 for(const [index,pair] of result.pairs.entries()){
  const manifest=JSON.parse(await readFile(join(pair.arms.direct.destination,'../pair-manifest.json'),'utf8'));
  expect(manifest.order).toEqual(driver.armOrder(index));expect(manifest.host_version).toBeNull();expect(manifest.thread_ids).toBeNull();
  const scopes=[];
  for(const mode of ['direct','delegated']){
   const arm=pair.arms[mode];temporary.push(arm.manifest.directory);
   const start=JSON.parse(await readFile(join(arm.manifest.evaluation_directory,'start-input.json'),'utf8'));scopes.push(start.scope);
   expect(arm.manifest.starting_artifact_digest).toBe(manifest.starting_artifact_digest);
   expect(existsSync(join(arm.destination,'coordinator'))).toBe(false);
   expect(arm.manifest.environment.CLAUDE_CODE_SUBAGENT_MODEL).toBeNull();
  }
  expect(scopes).toEqual([manifest.scope,manifest.scope]);
 }
 expect(result.tally.executions).toBe(0);expect(result.tally.entries).toEqual([]);
 await expect(driver.runPairs({outputDirectory:result.destination})).rejects.toMatchObject({code:'EEXIST'});
},120000);


it('rejects a globally stopped host before creating any pair directory',async()=>{
 const budget=await import(pathToFileURL(resolve('scripts/verify/campaign-budget.mjs')).href);
 const directory=await temporaryRoot(),path=join(directory,'budget.json'),destination=join(directory,'pairs');
 await budget.initializeBudget(path,{ceiling:130,authorization:'offline test'});
 await budget.reserveBudget(path,{id:'preflight',host:'codex',purpose:'capacity_preflight',worstCase:1});
 await budget.settleBudget(path,'preflight',{executions:1,source:'synthetic test',providerLimit:true});
 await expect(driver.runPairs({hosts:['codex'],outputDirectory:destination,dryRun:false,approvedExecutions:5,budgetFile:path})).rejects.toThrow('HOST_STOPPED');
 expect(existsSync(destination)).toBe(false);
});

it('keeps published matched comparisons outside routing authority',async()=>{
 const root=resolve('docs/evidence');
 const folders=(await readdir(root)).filter(name=>name.startsWith('delegate-direct-vs-delegated-'));
 expect(folders.length).toBeGreaterThan(0);
 for(const folder of folders){
  const report=JSON.parse(await readFile(join(root,folder,'evidence.json'),'utf8'));
  expect(report).toMatchObject({record_type:'direct_vs_delegated_evaluation',origin:'qualification_evaluation',qualification_authority:false});
  for(const pair of report.pairs)for(const arm of pair.arms){
   expect(arm.result_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
   expect(arm.stdout_digest).toMatch(/^sha256:[a-f0-9]{64}$/);
   expect(arm.qualification_authority).toBe(false);
  }
 }
 for(const path of await readdir(resolve('src/routing'),{recursive:true}))if(path.endsWith('.ts'))expect(await readFile(resolve('src/routing',path),'utf8')).not.toContain('direct-vs-delegated');
});
