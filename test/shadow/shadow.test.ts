import {afterEach,describe,expect,it} from 'vitest';
import {access,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createBinding,parseSelectionInput} from '../../src/governance/index.js';
import {hashBytes} from '../../src/core/canonical.js';
import {parseWorkOrder,type DelegateInput,type SimulationCommand} from '../../src/delegation/index.js';
import {createShadowSession,readOnlyFileCheck,simulateShadow,executeShadow,shadowSample,type ShadowSafety} from '../../src/shadow/index.js';
import type {EvaluationInput} from '../../src/evaluation/index.js';
const roots:string[]=[];
afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const safety:ShadowSafety={network:'disabled',capabilities:['bounded_file_edit'],irreversible:false};
const worker=(fail=false):SimulationCommand=>({executable:process.execPath,args:['-e',`require('node:fs').writeFileSync('src/file.txt',${JSON.stringify(fail?'wrong':'after')});${fail?'process.exit(3);':`console.log(${JSON.stringify(JSON.stringify({schema_version:'worker_result.v1',outcome:'DONE',summary:'changed',files_changed:['src/file.txt'],tests_executed:[],uncertainties:[]}))});`}`]});
async function fixture(){
 const root=await mkdtemp(join(tmpdir(),'governor-shadow-'));roots.push(root);
 const selection=parseSelectionInput(JSON.parse(await readFile('fixtures/bindings/valid-initial-backend.json','utf8')).selection);
 selection.policy.shadow={enabled:true,max_tasks_per_run:1,max_fraction:1};
 const order=parseWorkOrder({schema_version:'work_order.v1',task_id:'shadow_task',goal:'Change file to after',role_id:'implementer',task_class_id:'bounded_backend',allowed_paths:['src/file.txt'],forbidden_paths:['src/forbidden/**'],acceptance_criteria:['Expected file digest'],checks:[readOnlyFileCheck('content','src/file.txt',hashBytes('after'))],pre_signals:[],protected_paths:[],risk_constraints:['Only local file edit'],escalation_conditions:['Outside scope'],max_attempts:1,timeout_ms:1000,return_format:'worker_result.v1'});
 const make=async(name:string)=>{
  const workspace=join(root,name);await mkdir(join(workspace,'src'),{recursive:true});await writeFile(join(workspace,'src/file.txt'),'before');
  const input:DelegateInput & {workerCommand:SimulationCommand}={order:structuredClone(order),workspace,ledgerDirectory:join(root,name+'-ledger'),selection:structuredClone(selection),binding:createBinding(selection),rendered:{directory:join(root,'unused'),artifact:{manifest:{schema_version:'adapter_manifest.v1',provider:'anthropic',adapter_version:'1',runtime_version:'simulation',mode:'adapter-test',binding_digest:'unused',policy_digest:'unused',native_config_path:'unused',output_schema_path:null,files:{},enforcement:'explicit-cli-bridge',provider_fallback_control:'unverified'},files:{}}},workerCommand:worker()};return input;
 };
 const incumbent=await make('incumbent'),challenger=await make('challenger');
 return {root,incumbent,challenger,safety,session:createShadowSession(selection.policy,'run_one')};
}
describe('safe matched shadow replay',()=>{
 it('executes both actual processes through governed simulation and discards only challenger workspace',async()=>{
  const input=await fixture();const result=await simulateShadow(input);
  expect(result).toMatchObject({status:'completed',mode:'simulation',paired:true,challenger_discarded:true,incumbent_preserved:true,cost_complete:false});
  expect(result.incumbent?.accepted).toBe(true);expect(result.challenger&&'accepted'in result.challenger&&result.challenger.accepted).toBe(true);
  expect(await readFile(join(input.incumbent.workspace,'src/file.txt'),'utf8')).toBe('after');
  await expect(access(input.challenger.workspace)).rejects.toThrow();
 });
 it('retains incumbent when challenger executes and fails',async()=>{
  const input=await fixture();input.challenger.workerCommand=worker(true);const result=await simulateShadow(input);
  expect(result.incumbent?.accepted).toBe(true);expect(result.challenger&&'accepted'in result.challenger&&result.challenger.accepted).toBe(false);
  expect(result).toMatchObject({paired:true,challenger_discarded:true,incumbent_preserved:true,cost_complete:false});
  expect(await readFile(join(input.incumbent.workspace,'src/file.txt'),'utf8')).toBe('after');
 });
 it('rejects critical tasks and arbitrary checks before any process dispatch',async()=>{
  const input=await fixture();for(const side of [input.incumbent,input.challenger]){const order=parseWorkOrder(side.order);order.pre_signals=['destructive_operation'];side.order=order;}
  expect(await simulateShadow(input)).toMatchObject({status:'blocked',reason:'unsafe_shadow_task',incumbent:null,challenger:null});
  expect(await readFile(join(input.incumbent.workspace,'src/file.txt'),'utf8')).toBe('before');
  for(const side of [input.incumbent,input.challenger]){const order=parseWorkOrder(side.order);order.pre_signals=[];order.checks[0]!.args=['-e',"require('node:fs').rmSync('src',{recursive:true})"];side.order=order;}
  expect(await simulateShadow(input)).toMatchObject({reason:'unsupported_shadow_check_command',incumbent:null});
  expect(await readFile(join(input.challenger.workspace,'src/file.txt'),'utf8')).toBe('before');
 });
 it('requires matching task/cohort/baseline and enforced capability subset',async()=>{
  const input=await fixture();const order=parseWorkOrder(input.challenger.order);order.task_id='unrelated';input.challenger.order=order;
  expect(await simulateShadow(input)).toMatchObject({reason:'shadow_task_or_cohort_mismatch',incumbent:null});
  input.challenger.order=structuredClone(input.incumbent.order);await writeFile(join(input.challenger.workspace,'src/file.txt'),'different');
  expect(await simulateShadow(input)).toMatchObject({reason:'shadow_starting_artifact_mismatch',incumbent:null});
  expect(await simulateShadow({...input,safety:{...safety,network:'enabled'} as unknown as ShadowSafety})).toMatchObject({reason:'unsupported_shadow_capabilities',incumbent:null});
 });
 it('uses deterministic sampling and enforces session task budget',async()=>{
  expect(shadowSample('same','cohort')).toBe(shadowSample('same','cohort'));expect(shadowSample('same','cohort')).toBeGreaterThanOrEqual(0);expect(shadowSample('same','cohort')).toBeLessThan(1);
  const first=await fixture();expect((await simulateShadow(first)).paired).toBe(true);
  const next=await fixture();for(const side of [next.incumbent,next.challenger]){const order=parseWorkOrder(side.order);order.task_id='second_task';side.order=order;}
  expect(await simulateShadow({...next,session:first.session})).toMatchObject({status:'not_selected',reason:'shadow_budget_or_sampling_excluded',incumbent:null});
 });
 it('never upgrades simulation authority into production dispatch',async()=>{
  const input=await fixture();const order=parseWorkOrder(input.incumbent.order);
  const challenger={prepared:{workspace:input.challenger.workspace,manifest:{task_id:order.task_id,task_class_id:order.task_class_id,prompt:order.goal,allowed_paths:order.allowed_paths}},cohortId:input.incumbent.selection.request.cohort_id,constraintsDigest:input.incumbent.selection.request.constraints_digest,roleId:order.role_id,risk:input.incumbent.selection.request.risk} as unknown as EvaluationInput;
  expect(await executeShadow({incumbent:input.incumbent,challenger,safety,session:input.session})).toMatchObject({status:'blocked',reason:'incumbent_not_currently_qualified',incumbent:null,challenger:null});
  expect(await readFile(join(input.incumbent.workspace,'src/file.txt'),'utf8')).toBe('before');
 });
});
