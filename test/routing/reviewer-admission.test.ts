import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {digest,hashBytes} from '../../src/core/canonical.js';
import {encodeSources} from '../../src/evidence/sources.js';
import {buildProvisionalPilotRoutes} from '../../src/routing/acceptance.js';
import {reviewerCalibrationGate} from '../../src/routing/reviewer-calibration.js';
import {nativeV5} from '../helpers/v5.js';

function fixture(){
 const observations=JSON.parse(readFileSync('data/routing/archive/2026-09-10/host-observations.json','utf8'));
 const acceptance=JSON.parse(readFileSync('data/routing/archive/2026-09-10/installed-acceptance.json','utf8'));
 const manifest=JSON.parse(readFileSync('fixtures/reviewer-calibration/quantity/manifest.json','utf8'));
 const f=nativeV5('claude_code'),reviewer=f.input.candidates[0]!,worker=f.input.candidates[1]!;
 worker.effort='low';
 const evidence=(role:'reviewer'|'worker',verdict:string,caseId:string)=>{
  const candidate=role==='worker'?worker:reviewer;
  const observation=f.input.observations.find(o=>o.candidate.candidate_id===candidate.candidate_id)!;
  const report=f.report(observation,{events:[{type:'assistant',message:{model:candidate.model_id,id:caseId,content:[{type:'text',text:verdict}]}},{type:'result',subtype:'success',result:verdict,is_error:false}]});
  return {candidate,report,sources:encodeSources(f.sources)};
 };
 const rows=['positive','defective','boundary'].map(case_id=>({case_id,files_before:{'quantity.mjs':'SYNTHETIC TEST ARTIFACT','quantity.test.mjs':'SYNTHETIC TEST CHECK'},files_after:{'quantity.mjs':'SYNTHETIC TEST ARTIFACT','quantity.test.mjs':'SYNTHETIC TEST CHECK'},objective:{exit_code:case_id==='defective'?1:0,signal:null},reviewer_evidence:evidence('reviewer',case_id==='defective'?'REPAIR':'ACCEPT',case_id),...(case_id==='positive'?{worker_evidence:evidence('worker','DONE','worker')}:{})}));
 const positive=rows[0]!,workerTreatment=observations.treatments.find((t:any)=>t.model_id===worker.model_id&&t.effort===worker.effort);
 workerTreatment.evidence.smoke.execution_digest=positive.worker_evidence!.report.stdout_digest;
 const originalRun=observations.runs.find((r:any)=>r.worker.model===worker.model_id);originalRun.worker_stdout_digest=positive.worker_evidence!.report.stdout_digest;
 const treatment=structuredClone(observations.treatments.find((t:any)=>t.model_id==='claude-opus-5'));
 Object.assign(treatment,{candidate_id:'claude-fable-test',model_id:reviewer.model_id,snapshot_id:reviewer.model_id,family:reviewer.model_id});
 Object.assign(treatment.evidence,{observed_at:positive.reviewer_evidence.report.started_at,observed_model_id:reviewer.model_id});
 Object.assign(treatment.evidence.smoke,{execution_digest:positive.reviewer_evidence.report.stdout_digest,review_digest:positive.reviewer_evidence.report.stdout_digest,artifact_digest:hashBytes(positive.files_before['quantity.mjs'])});
 const report={target:{host:'claude',provider:'anthropic',model_id:reviewer.model_id,effort:reviewer.effort},manifest,rows,gate:{admitted:true}};
 expect(reviewerCalibrationGate(manifest,rows,report.target as any)).toMatchObject({admitted:true,diagnostics:[]});
 const entry={role:'reviewer',public_task_classes:['mechanical_work'],risk:'low',treatment,report,runs:[{host:'claude',scope:'tinybug: zero/nullish quantity default only',objective_passed:true,worker_stdout_digest:positive.worker_evidence!.report.stdout_digest,reviewer_stdout_digest:positive.reviewer_evidence.report.stdout_digest,worker:{model:worker.model_id,configured_effort:worker.effort},reviewer:{model:reviewer.model_id,configured_effort:reviewer.effort,verdict:'ACCEPT'}}],report_digest:digest(report)};
 const build=(admissions:any[]=[])=>buildProvisionalPilotRoutes(observations,acceptance,undefined,{now:'2026-09-10T04:00:00Z',admissions});
 return {entry,build};
}
describe('scoped reviewer admissions',()=>{
 it('appends a calibrated reviewer after the incumbent only in mechanical low',()=>{
  const f=fixture(),before=f.build(),after=f.build([f.entry]);
  for(const [index,r] of after.entries()){
   if(r.publicTaskClass==='mechanical_work'&&r.workers[0]!.evidence.host==='claude'){
    expect(r.reviewers.map(t=>t.candidate_id)).toEqual([...before[index]!.reviewers.map(t=>t.candidate_id),'claude-fable-test']);
    expect(r.reviewers.at(-1)!.evidence.task_evidence).toMatchObject({basis:'smoke_extrapolation',records:[]});
   }else expect(r).toEqual(before[index]);
  }
 });
 it.each(['wrong-verdict','missing-case','scope','class','worker-role','no-run','worker-digest','collision','report-digest'])('rejects %s instead of trusting admission labels',kind=>{
  const f=fixture(),a:any=f.entry;
  if(kind==='wrong-verdict')a.report.rows[1].reviewer_evidence=a.report.rows[0].reviewer_evidence;
  if(kind==='missing-case')a.report.rows.pop();
  if(kind==='scope')a.report.manifest.scope='Broad implementation';
  if(kind==='class')a.public_task_classes=['hard_debugging'];
  if(kind==='worker-role')a.role='worker';
  if(kind==='no-run')a.runs=[];
  if(kind==='worker-digest')a.runs[0].worker_stdout_digest=hashBytes('wrong');
  if(kind==='report-digest')a.report_digest=hashBytes('wrong');else a.report_digest=digest(a.report);
  expect(()=>f.build(kind==='collision'?[a,a]:[a])).toThrow();
 });
});
