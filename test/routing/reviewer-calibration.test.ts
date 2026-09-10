import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {encodeSources} from '../../src/evidence/sources.js';
import {calibrationPrompt,parseCalibrationManifest,reviewerCalibrationGate,type CalibrationRow} from '../../src/routing/reviewer-calibration.js';
import {nativeV5} from '../helpers/v5.js';

const manifest=JSON.parse(readFileSync('fixtures/reviewer-calibration/quantity/manifest.json','utf8'));
function fixture(){
 const f=nativeV5(),candidate=f.input.candidates[0]!;
 let index=0;
 const evidence=(verdict:string)=>{
  const report=f.report(f.input.observations[index++]!,{events:[{type:'item.completed',item:{type:'agent_message',text:`${verdict}: SYNTHETIC OFFLINE TEST`}},{type:'turn.completed',usage:{input_tokens:1,output_tokens:1}}]});
  return {candidate,report,sources:encodeSources(f.sources),assurance:{overall:'UNVERIFIED'}};
 };
 const rows:CalibrationRow[]=['positive','defective','boundary'].map(case_id=>({case_id,files_before:{'quantity.mjs':'SYNTHETIC ARTIFACT','quantity.test.mjs':'SYNTHETIC CHECKS'},files_after:{'quantity.mjs':'SYNTHETIC ARTIFACT','quantity.test.mjs':'SYNTHETIC CHECKS'},objective:{exit_code:case_id==='defective'?1:0,signal:null},reviewer_evidence:evidence(case_id==='defective'?'REPAIR':'ACCEPT'),...(case_id==='positive'?{worker_evidence:evidence('DONE')}:{})}));
 const target={host:'codex' as const,provider:'openai' as const,model_id:candidate.model_id,effort:candidate.effort};
 return {rows,target,evidence,gate:()=>reviewerCalibrationGate(manifest,rows,target)};
}
describe('maintainer reviewer calibration',()=>{
 it('admits all three correct verdicts using raw identity, not supplied assurance labels',()=>{
  expect(fixture().gate()).toMatchObject({admitted:true,diagnostics:[],qualification_authority:false});
 });
 it.each(['defective','boundary'])('a good positive case cannot hide a wrong %s verdict',id=>{
  const f=fixture(),row=f.rows.find(r=>r.case_id===id)!;
  row.reviewer_evidence=f.evidence(id==='defective'?'ACCEPT':'REPAIR');
  expect(f.gate()).toMatchObject({admitted:false,diagnostics:[{case_id:id,reason:'wrong_verdict'}]});
 });
 it.each(['missing','duplicate','mutated','timeout','unresolved','missing-worker','wrong-host','bad-oracle'] as const)('blocks %s evidence',kind=>{
  const f=fixture(),row=f.rows[0]!;
  if(kind==='missing')f.rows.pop();
  if(kind==='duplicate')f.rows[2]=f.rows[1]!;
  if(kind==='mutated')row.files_after['quantity.test.mjs']='replacement';
  if(kind==='timeout')(row.reviewer_evidence as {report:{status:string}}).report.status='timed_out';
  if(kind==='unresolved')(row.reviewer_evidence as {sources:unknown}).sources={};
  if(kind==='missing-worker')delete row.worker_evidence;
  if(kind==='wrong-host')f.target.model_id='wrong-model';
  if(kind==='bad-oracle')row.objective.exit_code=1;
  expect(f.gate().admitted).toBe(false);
 });
 it('keeps oracle labels, case IDs, and manifest paths out of the reviewer prompt',()=>{
  const prompt=calibrationPrompt(parseCalibrationManifest(manifest));
  expect(prompt).toContain(manifest.requirements);
  expect(prompt).not.toMatch(/expected_verdict|zero-defect|boundary-valid|hidden|positive case/i);
 });
 it('rejects a manifest that changes the defective oracle into ACCEPT',()=>{
  const invalid=structuredClone(manifest);invalid.cases[1].expected_verdict='ACCEPT';
  expect(()=>parseCalibrationManifest(invalid)).toThrow();
 });
});
