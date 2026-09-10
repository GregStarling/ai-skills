import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach,describe,it,expect} from 'vitest';
import {parseSelectionInput,createBinding,type SelectionInput} from '../../src/governance/index.js';
import {contentDigest} from '../../src/core/canonical.js';
import {Ledger} from '../../src/ledger/index.js';
import {simulateDelegate,executeDelegate,parseWorkOrder,type DelegateInput} from '../../src/delegation/index.js';
const roots:string[]=[];afterEach(async()=>{await Promise.all(roots.splice(0).map(root=>rm(root,{recursive:true,force:true})));});
const output={schema_version:'worker_result.v1',outcome:'DONE',summary:'Edited file',files_changed:['src/file.txt'],tests_executed:[],uncertainties:[]};
async function fixture(risk:'low'|'critical'='low'){
 const parent=await mkdtemp(join(tmpdir(),'governor-delegate-'));roots.push(parent);const workspace=join(parent,'workspace');await mkdir(join(workspace,'src'),{recursive:true});await writeFile(join(workspace,'src/file.txt'),'before');
 const raw=JSON.parse(await readFile('fixtures/bindings/valid-initial-backend.json','utf8'));const selection=parseSelectionInput(raw.selection);
 const order=parseWorkOrder({schema_version:'work_order.v1',task_id:'delegate_case',goal:'Change file to after',role_id:'implementer',task_class_id:'bounded_backend',allowed_paths:['src/**'],forbidden_paths:['src/forbidden/**'],acceptance_criteria:['File equals after'],checks:[{check_id:'content',executable:process.execPath,args:['-e',"if(require('node:fs').readFileSync('src/file.txt','utf8')!=='after')process.exit(1)"],timeout_ms:1000}],pre_signals:risk==='critical'?['secrets']:[],protected_paths:[],risk_constraints:['No protected changes'],escalation_conditions:['Unexpected scope'],max_attempts:2,timeout_ms:1000,return_format:'worker_result.v1'});
 if(risk==='critical'){selection.request.risk=risk;for(const row of selection.observations){row.risk=risk;row.content_digest=contentDigest(row);}}
 const input:DelegateInput={order,workspace,ledgerDirectory:join(parent,'ledger'),selection,binding:createBinding(selection),rendered:{directory:join(parent,'unused-simulation-render'),artifact:{manifest:{schema_version:'adapter_manifest.v1',provider:'anthropic',adapter_version:'1',runtime_version:'simulation',mode:'adapter-test',binding_digest:'unused',policy_digest:'unused',native_config_path:'unused',output_schema_path:null,files:{},enforcement:'explicit-cli-bridge',provider_fallback_control:'unverified'},files:{}}}};
 return input;
}
const command=(body:string)=>({executable:process.execPath,args:['-e',body]});
const done=(edit="require('node:fs').writeFileSync('src/file.txt','after');")=>command(edit+`console.log(${JSON.stringify(JSON.stringify(output))})`);
function reviewer(input:DelegateInput):DelegateInput['reviewer']{
 const selection:SelectionInput={...input.selection,request:{...input.selection.request,role_id:'reviewer'},incumbentCandidateId:'candidate_beta',observations:input.selection.observations.map(o=>{const row={...o,role_id:'reviewer'};return {...row,content_digest:contentDigest(row)};})};
 return {binding:createBinding(selection),selection,rendered:input.rendered};
}
const reviewCommand=command("const fs=require('node:fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify({schema_version:'review_result.v1',outcome:'ACCEPT',artifact_digest:p.artifact_digest,package_digest:p.package_digest,findings:[]}));");
describe('governed real-process simulation',()=>{
 it('actually executes worker and objective content check, retaining synthetic immutable outcome',async()=>{
  const input=await fixture();const result=await simulateDelegate({...input,workerCommand:done()});expect(result.accepted).toBe(true);expect(result.changed_paths).toEqual(['src/file.txt']);expect(result.total_cost_usd).toBeNull();expect(await readFile(join(input.workspace,'src/file.txt'),'utf8')).toBe('after');const records=await new Ledger(input.ledgerDirectory).list();expect(records.length).toBe(result.ledger_refs.length);expect(records.every(r=>r.provenance.source==='synthetic_process_test')).toBe(true);
 });
 it('refuses simulation authority through production before any dispatch',async()=>{
  const input=await fixture();const result=await executeDelegate(input);expect(result.accepted).toBe(false);expect(result.attempts).toBe(0);expect(await readFile(join(input.workspace,'src/file.txt'),'utf8')).toBe('before');
 });
 it('ignores worker claimed scope and stops actual forbidden changes',async()=>{
  const input=await fixture();const result=await simulateDelegate({...input,workerCommand:done("require('node:fs').writeFileSync('outside.txt','bad');")});expect(result.accepted).toBe(false);expect(result.diagnostics).toContain('outside_allowed_scope: outside.txt');expect(result.attempts).toBe(1);
 });
 it('bounds retries and records every failed objective attempt',async()=>{
  const input=await fixture();const result=await simulateDelegate({...input,workerCommand:done('')});expect(result.accepted).toBe(false);expect(result.attempts).toBe(2);const records=await new Ledger(input.ledgerDirectory).list<{kind:string}>();expect(records.filter(r=>r.payload.kind==='worker'||r.payload.kind==='rework')).toHaveLength(2);
 });
 it('honors explicit escalation despite exit zero',async()=>{
  const input=await fixture();const result=await simulateDelegate({...input,workerCommand:command(`console.log(${JSON.stringify(JSON.stringify({...output,outcome:'ESCALATE'}))})`)});expect(result.accepted).toBe(false);expect(result.diagnostics).toContain('worker_escalated');expect(result.attempts).toBe(1);
 });
 it('blocks checks which mutate the artifact after checking',async()=>{
  const input=await fixture();const order=parseWorkOrder(input.order);order.checks[0]!.args=['-e',"require('node:fs').writeFileSync('src/file.txt','tampered')"];const result=await simulateDelegate({...input,order,workerCommand:done()});expect(result.accepted).toBe(false);expect(result.diagnostics).toContain('artifact_changed_during_checks');
 });
 it('requires new independent review of the final package in a separate process',async()=>{
  const input=await fixture('critical');const result=await simulateDelegate({...input,reviewer:reviewer(input)!,workerCommand:done(),reviewCommand});expect(result.accepted).toBe(true);const records=await new Ledger(input.ledgerDirectory).list<{kind:string;payload:unknown}>();expect(records.filter(r=>r.payload.kind==='review')).toHaveLength(1);
 });
 it('refuses missing reviewers and stale artifact verdicts',async()=>{
  const input=await fixture('critical');const first=await simulateDelegate({...input,workerCommand:done()});expect(first.diagnostics).toContain('independent_reviewer_unavailable');
  const wrong=command("const fs=require('node:fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify({schema_version:'review_result.v1',outcome:'ACCEPT',artifact_digest:'sha256:'+ '0'.repeat(64),package_digest:p.package_digest,findings:[]}));");const second=await simulateDelegate({...input,reviewer:reviewer(input)!,workerCommand:done(),reviewCommand:wrong});expect(second.accepted).toBe(false);expect(second.diagnostics).toContain('review_artifact_changed');
 });
 it('detects final workspace edits performed during review despite a matching verdict',async()=>{
  const input=await fixture('critical');const body=`require('node:fs').writeFileSync(${JSON.stringify(join(input.workspace,'src/file.txt'))},'after-review');`+reviewCommand.args[1]!;const result=await simulateDelegate({...input,reviewer:reviewer(input)!,workerCommand:done(),reviewCommand:command(body)});expect(result.accepted).toBe(false);expect(result.diagnostics).toContain('artifact_changed_after_review');
 });
 it('captures timeout and refuses acceptance',async()=>{
  const input=await fixture();const order=parseWorkOrder(input.order);order.timeout_ms=50;const result=await simulateDelegate({...input,order,workerCommand:command('setInterval(()=>{},1000)')});expect(result.accepted).toBe(false);expect(result.attempts).toBe(1);expect(result.diagnostics).toContain('runtime_failed');
 });
});
