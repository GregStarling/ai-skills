import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { hashBytes } from '../../src/core/canonical.js';
import { parseCandidate } from '../../src/schema/index.js';
import { runNative } from '../../src/runtime/native.js';
import { captureIdentityEnvironment, deriveIdentityAssurance } from '../../src/runtime/identity-assurance.js';
import { runProcess, type ProcessInput, type ProcessResult } from '../../src/runtime/process.js';

// SYNTHETIC BOUNDARY TESTS: process fixtures verify capture/derivation plumbing.
// No fixture below is live model evidence or belongs in a qualification ledger.
vi.mock('../../src/runtime/process.js',()=>({runProcess:vi.fn()}));
const directories:string[]=[];
const fake=vi.mocked(runProcess);
const at='2026-09-10T00:00:00.000Z';
let observedModel='claude-fable-5-1';
let outputRoot='';
beforeEach(()=>{
 observedModel='claude-fable-5-1';
 outputRoot=mkdtempSync(join(tmpdir(),'native-capture-test-'));directories.push(outputRoot);
 fake.mockImplementation(async(input:ProcessInput):Promise<ProcessResult>=>{
  const version=input.args[0]==='--version';
  if(!version){
   // This file must already exist when the process is invoked.
   const request=JSON.parse(readFileSync(join(outputRoot,'native-request.json'),'utf8'));
   expect(request.command.args).toEqual(input.args);expect(request.command.executable).toBe(input.executable);
   expect(request.environment).toEqual(captureIdentityEnvironment(input.env!));
  }
  mkdirSync(input.outputDirectory,{recursive:true});
  const stdout=version?'2.1.267 (Claude Code)\n':[
   {type:'assistant',message:{id:'synthetic_message',model:observedModel,content:[{type:'text',text:'SYNTHETIC TEST ONLY'}]}},
   {type:'result',subtype:'success',is_error:false,result:'SYNTHETIC TEST ONLY'},
  ].map(value=>JSON.stringify(value)).join('\n')+'\n';
  const stdout_path=join(input.outputDirectory,'stdout.jsonl'),stderr_path=join(input.outputDirectory,'stderr.log');
  writeFileSync(stdout_path,stdout);writeFileSync(stderr_path,'');
  return {started_at:at,completed_at:at,exit_code:0,signal:null,timed_out:false,output_limited:false,spawn_error:null,stdout_path,stderr_path,stdout_digest:hashBytes(stdout),stderr_digest:hashBytes(''),cleanup:'complete'};
 });
});
afterEach(()=>{for(const path of directories.splice(0))rmSync(path,{recursive:true,force:true});fake.mockReset();});
function candidate(){
 const source=JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8')).binding.candidate;
 return parseCandidate({...source,provider:'anthropic',model_id:'claude-fable-5-1',snapshot_id:'claude-fable-5-1',effort:'high',serving:{...source.serving,json_schema:false}});
}
it('captures independent pre-execution request and raw configuration/version/process bytes usable after receipt export',async()=>{
 const treatment=candidate(),result=await runNative({provider:'anthropic',candidate:treatment,cwd:outputRoot,prompt:'SYNTHETIC TEST task',timeoutMs:1000,outputDirectory:outputRoot,mode:'evaluation',sandbox:'read-only'});
 expect(result.report.native_evidence).toBeDefined();expect(result.identity_assurance.overall).toBe('PARTIALLY_RUNTIME_ATTESTED');
 const sources=new Map(result.evidence_paths.map(path=>{expect(existsSync(path)).toBe(true);const bytes=readFileSync(path);return [hashBytes(bytes),bytes] as const;}));
 expect(deriveIdentityAssurance({candidate:treatment,report:result.report,sources})).toEqual(result.identity_assurance);
 const request=JSON.parse(sources.get(result.report.native_evidence!.request_digest)!.toString());
 expect(request.configuration_files).toHaveLength(1);
 sources.delete(request.configuration_files[0].content_digest);
 expect(deriveIdentityAssurance({candidate:treatment,report:result.report,sources}).overall).toBe('UNVERIFIED');
});
it('omits absent effort knobs without inventing an unknown configured level, and preserves contradictions',async()=>{
 const treatment={...candidate(),effort:'not_applicable'};
 const result=await runNative({provider:'anthropic',candidate:treatment,cwd:outputRoot,prompt:'SYNTHETIC TEST task',timeoutMs:1000,outputDirectory:outputRoot,mode:'evaluation',sandbox:'read-only'});
 expect(result.invocation.argv).not.toContain('--effort');expect(result.identity_assurance.effort).toEqual({value:'not_applicable',assurance:'not_applicable'});
 expect(result.identity_assurance.overall).toBe('RUNTIME_ATTESTED');
 const sources=new Map(result.evidence_paths.map(path=>{const bytes=readFileSync(path);return [hashBytes(bytes),bytes] as const;}));
 expect(deriveIdentityAssurance({candidate:treatment,report:{...result.report,observed_identity:{source:'provider_receipt',model_id:'claude-other-5'}},sources}).diagnostics.some(d=>d.hard&&d.rule_id==='runtime_identity_mismatch')).toBe(true);
});

it('requires complete captured environment controls, masks sensitive values, and keeps stronger contradictions despite missing native capture',async()=>{
 const treatment=candidate(),result=await runNative({provider:'anthropic',candidate:treatment,cwd:outputRoot,prompt:'SYNTHETIC TEST task',timeoutMs:1000,outputDirectory:outputRoot,mode:'evaluation',sandbox:'read-only'});
 const sources=new Map<string,string|Uint8Array>(result.evidence_paths.map(path=>{const bytes=readFileSync(path);return [hashBytes(bytes),bytes] as const;}));
 const originalRequest=JSON.parse(Buffer.from(sources.get(result.report.native_evidence!.request_digest)!).toString()),originalProcess=JSON.parse(Buffer.from(sources.get(result.report.native_evidence!.process_digest)!).toString());
 const capture=captureIdentityEnvironment({OPENAI_BASE_URL:'https://SYNTHETIC-SECRET.invalid',ANTHROPIC_API_KEY:'SYNTHETIC-SECRET',CLAUDE_CODE_EFFORT_LEVEL:'high'});
 expect(capture['OPENAI_BASE_URL']).toBe('[present]');expect(capture['ANTHROPIC_API_KEY']).toBe('[present]');expect(capture['CLAUDE_CODE_EFFORT_LEVEL']).toBe('high');
 expect(JSON.stringify(capture)).not.toContain('SYNTHETIC-SECRET');
 for(const kind of ['missing','redirect','isolation'] as const){
  const request=structuredClone(originalRequest);
  if(kind==='missing')delete request.environment;
  else if(kind==='redirect')request.environment.OPENAI_BASE_URL='[present]';
  else request.command.args.splice(request.command.args.indexOf('--setting-sources'),2);
  const requestText=JSON.stringify(request),requestDigest=hashBytes(requestText);sources.set(requestDigest,requestText);
  const processText=JSON.stringify({...originalProcess,request_digest:requestDigest}),processDigest=hashBytes(processText);sources.set(processDigest,processText);
  const report={...result.report,command:request.command,native_evidence:{...result.report.native_evidence!,request_digest:requestDigest,process_digest:processDigest}};
  const derived=deriveIdentityAssurance({candidate:treatment,report,sources});
  expect(derived.overall).toBe('UNVERIFIED');
  if(kind==='redirect')expect(derived.diagnostics.some(d=>d.hard&&d.rule_id==='configuration_identity_mismatch')).toBe(true);
  if(kind==='isolation')expect(derived.diagnostics.some(d=>d.rule_id==='identity_assurance_insufficient'&&d.message.includes('Uncaptured host settings'))).toBe(true);
 }
 const {native_evidence:_,...missingCapture}=result.report;
 const contrary=Buffer.from(sources.get(result.report.stdout_digest!)!).toString().replaceAll('claude-fable-5-1','claude-other-5'),contraryDigest=hashBytes(contrary);sources.set(contraryDigest,contrary);
 const derived=deriveIdentityAssurance({candidate:treatment,report:{...missingCapture,stdout_digest:contraryDigest,observed_identity:{source:'unknown'}},sources});
 expect(derived.overall).toBe('UNVERIFIED');expect(derived.diagnostics.some(d=>d.hard&&d.rule_id==='runtime_identity_mismatch')).toBe(true);
});
