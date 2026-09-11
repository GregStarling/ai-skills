import {describe,it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const comparison=await import(pathToFileURL(resolve('scripts/verify/ordinary-comparison.mjs')).href);
const driver=await import(pathToFileURL(resolve('scripts/verify/direct-vs-delegated.mjs')).href);
const {executionLedger}=await import(pathToFileURL(resolve('scripts/verify/trace-ledger.mjs')).href);
const arm=(delegated=false)=>{
 const models=delegated?['claude-opus-5','claude-haiku-4-5','claude-sonnet-5']:['claude-opus-5'];
 return {acceptance:'pending_frontier_trace_review',instructions_unchanged:true,skill_folder_digest:'frozen',copied_skill_folder_digest_after:'frozen',
  execution:{code:0,timed_out:false,client_estimated_cost_usd:delegated?0.6:1},
  after:{result:{passed:true,checks:['scope','grader_integrity','behavioral_tests'].map(check_id=>({check_id,passed:true}))}},
  ledger:{executions:models.length,rows:models.map((model,i)=>({role:i?'worker':'coordinator',mechanism:i?'Agent':'host_process',model,ended_at:'2026-09-11T12:00:00Z'})),limitations:[],
   model_counters:Object.fromEntries(models.map(model=>[model,{costUSD:delegated?0.2:1,costBasis:'list',provider:'firstParty',inputTokens:delegated?100000:100}]))},
  maintainer_review:{author:'fixture reviewer',passed:true,workflow_adherent:true,coordinator_inspected_artifact:true,investigation_sources_verified:true,ordinary_feedback_verified:true}};
};
describe('ordinary comparison (synthetic accounting, not savings evidence)',()=>{
 it('is opt-in and Claude-only, before creating any campaign artifacts',async()=>{
  expect(()=>comparison.validateWorkflow('evidence','codex')).not.toThrow();
  expect(()=>comparison.validateWorkflow('unknown','claude')).toThrow('INVALID_COMPARISON');
  await expect(driver.runPairs({workflow:comparison.ordinaryWorkflow,hosts:['codex']})).rejects.toThrow('REQUIRES_CLAUDE');
  expect(()=>comparison.ordinaryInstructions('auto')).toThrow('EXPLICIT_ARM');
  expect(comparison.ordinaryInstructions('direct')).toContain('No workers, dispatch or observe calls');
  const delegated=comparison.ordinaryInstructions('delegated');
  expect(delegated).toContain('first haiku');expect(delegated).toContain('then sonnet');
  expect(delegated).toContain('effort:null');expect(delegated).toContain('one additional Sonnet repair');
 });
 it('compares weighted whole-arm estimates, never raw tokens or time',()=>{
  const direct=arm(),delegated=arm(true);
  expect(comparison.ordinaryVerdict({direct,delegated})).toMatchObject({verdict:'delegated',subscription_savings_claim:false,delegated_change_percent:expect.closeTo(-40)});
  expect(comparison.ordinaryAccounting(delegated).value).toBeCloseTo(0.6);
 });
 it('counts repeated-model repairs once in model totals, not once per row',()=>{
  const delegated=arm(true);delegated.ledger.rows.push({...delegated.ledger.rows[2]!});delegated.ledger.executions++;
  expect(comparison.ordinaryAccounting(delegated).value).toBeCloseTo(0.6);
  expect(comparison.ordinaryAdherence(delegated,'delegated')).toBe(true);
  delegated.ledger.rows.push({...delegated.ledger.rows[2]!});delegated.ledger.executions++;
  expect(comparison.ordinaryAdherence(delegated,'delegated')).toBe(false);
 });
 it('rejects gaps, unknown child scope and unreconciled/differently priced estimates',()=>{
  for(const change of [
   (a:any)=>a.ledger.model_counters=null,
   (a:any)=>a.ledger.rows[1].model='unknown',
   (a:any)=>a.ledger.rows[1].mechanism='child_cli',
   (a:any)=>a.execution.client_estimated_cost_usd=100,
   (a:any)=>a.ledger.model_counters['claude-opus-5'].costUSD=-1,
   (a:any)=>a.ledger.model_counters['claude-opus-5'].costBasis='unknown',
   (a:any)=>a.ledger.rows[1].ended_at=null,
   (a:any)=>a.ledger.rows[1].failed_launch=true,
   (a:any)=>a.ledger.limitations.push('count may be incomplete'),
   (a:any)=>a.execution.timed_out=true,
   (a:any)=>a.acceptance='blocked_provider_limit'
  ]){const delegated=arm(true);change(delegated);expect(comparison.ordinaryAccounting(delegated).complete).toBe(false);}
 });
 it('requires quality and independent adherence review, with no legacy every-file rule',()=>{
  for(const change of [
   (a:any)=>a.after.result.checks[0].passed=false,
   (a:any)=>a.maintainer_review.passed=false,
   (a:any)=>a.maintainer_review.workflow_adherent=false,
   (a:any)=>a.maintainer_review.investigation_sources_verified=false,
   (a:any)=>a.maintainer_review.ordinary_feedback_verified=false,
   (a:any)=>a.instructions_unchanged=false,
   (a:any)=>a.copied_skill_folder_digest_after='changed',
   (a:any)=>a.ledger.rows.reverse()
  ]){const delegated=arm(true);change(delegated);expect(comparison.ordinaryVerdict({direct:arm(),delegated}).claim).toBeNull();}
  expect(comparison.ordinaryQuality(arm(true))).toBe(true);
 });
 it('prefers attributable allowance only when both arms have matching coverage and units',()=>{
  const direct:any=arm(),delegated:any=arm(true);
  direct.external_allowance={metric:'subscription_allowance',scope:'whole_arm',attributable:true,value:2,unit:'allowance units',comparison_key:'same-window-basis',source:'external meter'};
  expect(comparison.ordinaryVerdict({direct,delegated}).verdict).toBe('inconclusive');
  delegated.external_allowance={...direct.external_allowance,value:1};
  expect(comparison.ordinaryVerdict({direct,delegated}).verdict).toBe('delegated');
  delegated.external_allowance.unit='tokens';
  expect(comparison.ordinaryVerdict({direct,delegated}).verdict).toBe('inconclusive');
  direct.external_allowance.unit='tokens';
  expect(comparison.ordinaryAccounting(direct).kind).toBe('api_equivalent_cost');
 });
 it('recognizes ordinary helpers without truncating task time at observe',()=>{
  const events=['dispatch','observe'].map(command=>({type:'assistant',message:{content:[{type:'tool_use',id:command,name:'Bash',input:{command:`node /skill/scripts/local-learning.mjs ${command} -`}}]}}));
  const ledger=executionLedger('claude',events.map(e=>JSON.stringify({at:'2026-09-11T12:00:00Z',line:JSON.stringify(e)})).join('\n'),{startedAt:'2026-09-11T12:00:00Z',endedAt:'2026-09-11T12:00:05Z'});
  expect(ledger.helper_calls.map((c:any)=>c.command)).toEqual(['dispatch','observe']);expect(ledger.task_wall_clock_ms).toBe(5000);
 });
 it('keeps native host controls explicit and evidence fallback conditional',async()=>{
  const guide=await readFile(resolve('skills/delegate/hosts/claude-code.md'),'utf8');
  expect(guide).toContain('host:"claude"');
  for(const control of ['`model`','`haiku` / `sonnet`','`null`','Agent-definition frontmatter','evidence-required treatment','Do not start a CLI child merely'])expect(guide).toContain(control);
 });
});

it('recomputes published ordinary verdicts from preserved complete accounting',async()=>{
 const evidence=JSON.parse(await readFile(resolve('docs/evidence/delegate-ordinary-2026-09-11/evidence.json'),'utf8'));
 expect(evidence.qualification_authority).toBe(false);expect(evidence.observed_executions).toBeLessThanOrEqual(evidence.approved_executions);
 for(const pair of evidence.pairs){
  expect(comparison.ordinaryVerdict(pair.arms)).toEqual(pair.verdict);
  for(const arm of Object.values(pair.arms) as any[]){
   for(const key of ['result_digest','stdout_digest','timed_stdout_digest','manifest_digest'])expect(arm[key]).toMatch(/^sha256:[a-f0-9]{64}$/);
   expect(arm.ledger.rows.every((r:any)=>r.ended_at)).toBe(true);
   expect(arm.observations.every((o:any)=>o.data.usage===null)).toBe(true);
  }
 }
});
