import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach,describe,expect,it} from 'vitest';
import {captureReceipt,validateReceiptEvidence} from '../../src/ledger/receipts.js';
import {Ledger} from '../../src/ledger/index.js';
import {hashBytes} from '../../src/core/canonical.js';

// Boundary fixtures only: never performance or qualification evidence.
const directories:string[]=[];
afterEach(async()=>{await Promise.all(directories.splice(0).map(path=>rm(path,{recursive:true,force:true})));});
async function capture(raw:unknown){
 const directory=await mkdtemp(join(tmpdir(),'delegate-local-receipts-'));directories.push(directory);
 const receiptFile=join(directory,'receipt.json'),text=JSON.stringify(raw,null,2)+'\n';await writeFile(receiptFile,text);
 const result=await captureReceipt({directory:join(directory,'ledger'),receiptFile,context:{source:'synthetic boundary test',observed_at:new Date(Date.now()-1000).toISOString(),origin:'qualification_evaluation',public_task_class:'mechanical_work',task_id:'test-task',execution_environment:'codex'}});
 return {result,text,record:await new Ledger(result.directory).get(result.recordId),receiptFile};
}
const legacy=()=>({schema_version:'delegate_receipt.v1',task_class:'mechanical_work',task_id:'test-task',attempts:[]});
describe('local receipt import boundaries',()=>{
 it.each(['flat','nested','both','missing'] as const)('archives original v1 %s digest representation byte-for-byte',async(shape)=>{
  const hash=hashBytes('pack'),raw={...legacy(),...(shape==='flat'||shape==='both'?{pack_content_digest:hash}:{}),...(shape==='nested'||shape==='both'?{routing_pack:{content_digest:hash}}:{})};
  const saved=await capture(raw);
  expect(saved.record?.payload).toMatchObject({receipt_text:saved.text,receipt_digest:hashBytes(saved.text)});
  expect(await readFile(saved.receiptFile,'utf8')).toBe(saved.text);
  expect(saved.result.qualification_authority).toBe(false);
 });
 it('rejects conflicting v1 digest aliases rather than choosing one',async()=>{
  await expect(capture({...legacy(),pack_content_digest:hashBytes('one'),routing_pack:{content_digest:hashBytes('two')}})).rejects.toThrow();
 });
 it('cannot use a direct legacy record for qualification',async()=>{
  const saved=await capture({...legacy(),mode:'direct'});
  expect(()=>validateReceiptEvidence({schema_version:'delegate_receipt_evidence.v1',capture:saved.record!.payload,evidence:{selection:{},observationId:'x',attemptReceipts:{}}})).toThrow('RECEIPT_DIRECT_NOT_QUALIFIABLE');
 });
});

function localReceipt(mode:'direct'|'delegated'){
 const date=new Date(Date.now()-2000).toISOString(),sha=hashBytes('synthetic receipt fixture');
 const attempt=(role:'coordinator'|'worker')=>({attempt_id:role,role,candidate_id:null,candidate_identity:null,evidence_tier:null,configured:{model:null,effort:null},observed:{model:null,effort:null},outcome:'accepted',started_at:null,completed_at:null,evidence:[]});
 return {schema_version:'delegate_receipt.v2',task_id:'test-task',run_id:'test-run',session_id:'test-session',parent_run_id:null,project_id:sha,host:'codex',host_version:'synthetic',execution_environment:'codex',task_class:'mechanical_work',risk:'low',scope:'synthetic boundary test',research_kind:null,origin:'qualification_evaluation',mode,started_at:date,completed_at:date,elapsed_ms:0,baseline_digest:null,pack_content_digest:mode==='delegated'?sha:null,stratum_digest:mode==='delegated'?sha:null,skill_folder_digest:sha,attempts:[attempt('coordinator'),...(mode==='delegated'?[attempt('worker')]:[])],checks:[],relevant_checks_complete:false,acceptance:'accepted',usage:null};
}
describe('v2 local records never imply qualification',()=>{
 it.each(['direct','delegated'] as const)('archives %s v2 unchanged and keeps qualification authority separate',async(mode)=>{
  const saved=await capture(localReceipt(mode));
  expect(saved.record?.payload).toMatchObject({receipt_text:saved.text,receipt_digest:hashBytes(saved.text)});
  expect(saved.result).toMatchObject({status:'PENDING_EVIDENCE',qualification_authority:false});
  expect(()=>validateReceiptEvidence({schema_version:'delegate_receipt_evidence.v1',capture:saved.record!.payload,evidence:{selection:{},observationId:'x',attemptReceipts:{}}})).toThrow(mode==='direct'?'RECEIPT_DIRECT_NOT_QUALIFIABLE':'RECEIPT_V2_LOCAL_ONLY');
 });
 it.each(['unexpected','pack','coordinator','mode','host'] as const)('rejects malformed v2 %s data before archiving',async(kind)=>{
  const raw=localReceipt('delegated');
  if(kind==='unexpected')Object.assign(raw,{unchecked_claim:'accepted'});
  if(kind==='pack')raw.pack_content_digest=null;
  if(kind==='coordinator')raw.attempts=raw.attempts.filter(a=>a.role!=='coordinator');
  if(kind==='mode')raw.mode='direct';
  if(kind==='host')raw.execution_environment='claude_code';
  await expect(capture(raw)).rejects.toThrow();
 });
});
