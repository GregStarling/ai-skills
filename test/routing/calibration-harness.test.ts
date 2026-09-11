import {afterEach,describe,expect,it,vi} from 'vitest';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const evaluator=await import(pathToFileURL(resolve('scripts/evaluate-frontier-reviewers.mjs')).href);
const stager=await import(pathToFileURL(resolve('scripts/stage-calibration.mjs')).href);
const temporary:string[]=[];
const sha=(value:string|Buffer)=>`sha256:${createHash('sha256').update(value).digest('hex')}`;
const digest=(value:unknown)=>sha(JSON.stringify(value));
const root=async()=>{const p=await mkdtemp(join(tmpdir(),'calibration-harness-'));temporary.push(p);return p;};
afterEach(async()=>{await Promise.all(temporary.splice(0).map(p=>rm(p,{recursive:true,force:true})));});

const manifest={scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.',requirements:'preserve explicit zero and default only null/undefined quantities to one',checks_file:'quantity.test.mjs',cases:[
 {id:'positive',artifact_file:'positive.mjs',expected_verdict:'ACCEPT'},
 {id:'defective',artifact_file:'defective.mjs',expected_verdict:'REPAIR'},
 {id:'boundary',artifact_file:'boundary.mjs',expected_verdict:'ACCEPT'},
]};
const helpers={
 parseCalibrationManifest:(value:unknown)=>value,
 calibrationPrompt:(m:any)=>`review ${m.requirements}`,
 reviewerCalibrationGate:vi.fn(()=>({admitted:true,diagnostics:[],results:[],qualification_authority:false})),
 hashBytes:sha,
 digest,
 provisionalTreatmentSchema:{parse:(value:any)=>value},
 buildProvisionalPilotRoutes:()=>[{publicTaskClass:'mechanical_work'}],
};

async function fixture(){
 const dir=await root();
 await writeFile(join(dir,'manifest.json'),JSON.stringify(manifest));
 await writeFile(join(dir,'quantity.test.mjs'),`import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {totalQuantity} from './quantity.mjs';\ntest('quantity',()=>assert.equal(totalQuantity([{quantity:0},{quantity:2},{}]),3));\n`);
 await writeFile(join(dir,'positive.mjs'),'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);\n');
 await writeFile(join(dir,'defective.mjs'),'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);\n');
 await writeFile(join(dir,'boundary.mjs'),'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);\n');
 await writeFile(join(dir,'targets.json'),JSON.stringify({targets:[{host:'codex',provider:'openai',model_id:'gpt-5.5',effort:'high',source:{url:'https://openai.com/models',checked_at:'2026-09-11T00:00:00.000Z'}}]}));
 return dir;
}

describe('budgeted reviewer calibration harness',()=>{
 it('requires an approved global budget file before any live launch',async()=>{
  const dir=await fixture();
  await expect(evaluator.evaluateCalibration(join(dir,'manifest.json'),join(dir,'out'),join(dir,'ledger.json'),{targetsPath:join(dir,'targets.json'),helpers})).rejects.toThrow('APPROVED_BUDGET_REQUIRED');
 });

 it('uses the local calibration ledger and global budgeted executor for all launches',async()=>{
  const dir=await fixture(),calls:any[]=[];
  const executeBudgeted=vi.fn(async(input:any)=>{
   calls.push(input);
   if(input.write)await writeFile(join(input.directory,'quantity.mjs'),'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);\n');
   return {evidence:{candidate:input.target,report:{started_at:'2026-09-11T00:00:00.000Z',stdout_digest:sha(input.id)},sources:{}},host_version:'test-host'};
  });
  const reports=await evaluator.evaluateCalibration(join(dir,'manifest.json'),join(dir,'out'),join(dir,'ledger.json'),{budgetFile:join(dir,'budget.json'),targetsPath:join(dir,'targets.json'),executeBudgeted,helpers});
  expect(reports).toHaveLength(1);
  expect(executeBudgeted).toHaveBeenCalledTimes(4);
  expect(calls.every(call=>call.budgetFile===join(dir,'budget.json'))).toBe(true);
  expect(calls.map(call=>call.purpose)).toEqual(['reviewer_calibration_worker','reviewer_calibration_review','reviewer_calibration_review','reviewer_calibration_review']);
  const ledger=JSON.parse(await readFile(join(dir,'ledger.json'),'utf8'));
  expect(ledger).toMatchObject({schema_version:'reviewer_calibration_ledger.v1',calibration_limit:8});
  expect(ledger.executions).toHaveLength(4);
  await expect(evaluator.evaluateCalibration(join(dir,'manifest.json'),join(dir,'out2'),join(dir,'ledger.json'),{budgetFile:join(dir,'budget.json'),targetsPath:join(dir,'targets.json'),executeBudgeted,helpers})).rejects.toThrow('EXECUTION_ALREADY_RESERVED');
 });
});

describe('stage calibration artifacts',()=>{
 it('writes staged artifacts and manifest once without admitting canonical data',async()=>{
  const dir=await root(),out=join(dir,'stage');
  const worker={candidate_id:'worker',provider:'openai',model_id:'gpt-5.5',snapshot_id:null,effort:'low',frontier:false,serving:{fallback:'disabled',tool_use:'host_tools',json_schema:false},material_serving_settings:['fallback','tool_use'],evidence:{host:'codex',smoke:{execution_digest:sha('worker')},qualification_failure:null}};
  const observations={treatments:[worker],runs:[]};
  const report={host:'codex',host_version:'test',target:{host:'codex',provider:'openai',model_id:'gpt-5.6-astra',effort:'high',source:{url:'https://openai.com/models',checked_at:'2026-09-11T00:00:00.000Z'}},manifest,rows:[{case_id:'positive',files_before:{'quantity.mjs':'code'},worker_evidence:{candidate:{model_id:'gpt-5.5',effort:'low'},report:{started_at:'2026-09-11T00:00:00.000Z',stdout_digest:sha('worker')}},reviewer_evidence:{report:{started_at:'2026-09-11T00:00:01.000Z',stdout_digest:sha('reviewer')}}}],qualification_authority:false};
  await writeFile(join(dir,'observations.json'),JSON.stringify(observations));
  await writeFile(join(dir,'acceptance.json'),JSON.stringify({schema_version:'installed_delegate_acceptance.v1',cases:[]}));
  await writeFile(join(dir,'reports.json'),JSON.stringify({reports:[report]}));
  const result=await stager.stageCalibration({reportsPath:join(dir,'reports.json'),outputDirectory:out,observationsPath:join(dir,'observations.json'),acceptancePath:join(dir,'acceptance.json'),helpers});
  expect(result).toMatchObject({schema_version:'staged_reviewer_calibration.v1',qualification_authority:false,reports:[{publication:'NOT_ADMITTED'}],admissions:[{role:'reviewer',public_task_classes:['mechanical_work'],risk:'low',report_digest:digest(report)}]});
  const staged=JSON.parse(await readFile(join(out,'codex','host-observations-staged.json'),'utf8'));
  expect(staged.treatments).toHaveLength(1);
  expect(staged.treatments[0].candidate_id).toBe('codex-gpt-5.6-astra-high');
  expect(staged.runs[0].worker_stdout_digest).toBe(sha('worker'));
  const admission=JSON.parse(await readFile(join(out,'codex','admission.json'),'utf8'));
  expect(admission).toMatchObject({role:'reviewer',public_task_classes:['mechanical_work'],risk:'low',treatment:{candidate_id:'codex-gpt-5.6-astra-high'},runs:[{worker_stdout_digest:sha('worker')}]});
  await expect(stager.stageCalibration({reportsPath:join(dir,'reports.json'),outputDirectory:out,observationsPath:join(dir,'observations.json'),acceptancePath:join(dir,'acceptance.json'),helpers})).rejects.toThrow();
 });

 it('fails closed when the positive worker does not match an existing observation digest',async()=>{
  const dir=await root(),out=join(dir,'stage');
  const worker={candidate_id:'worker',provider:'openai',model_id:'gpt-5.5',snapshot_id:null,effort:'low',frontier:false,serving:{fallback:'disabled',tool_use:'host_tools',json_schema:false},material_serving_settings:['fallback','tool_use'],evidence:{host:'codex',smoke:{execution_digest:sha('different')},qualification_failure:null}};
  const report={host:'codex',target:{host:'codex',provider:'openai',model_id:'gpt-5.6-astra',effort:'high',source:{url:'https://openai.com/models',checked_at:'2026-09-11T00:00:00.000Z'}},manifest,rows:[{case_id:'positive',files_before:{'quantity.mjs':'code'},worker_evidence:{candidate:{model_id:'gpt-5.5',effort:'low'},report:{started_at:'2026-09-11T00:00:00.000Z',stdout_digest:sha('worker')}},reviewer_evidence:{report:{started_at:'2026-09-11T00:00:01.000Z',stdout_digest:sha('reviewer')}}}],qualification_authority:false};
  await writeFile(join(dir,'observations.json'),JSON.stringify({treatments:[worker],runs:[]}));
  await writeFile(join(dir,'reports.json'),JSON.stringify({reports:[report]}));
  await expect(stager.stageCalibration({reportsPath:join(dir,'reports.json'),outputDirectory:out,observationsPath:join(dir,'observations.json'),helpers})).rejects.toThrow('WORKER_OBSERVATION_MISMATCH');
 });
});
