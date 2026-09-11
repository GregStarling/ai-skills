import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

const root=resolve(import.meta.dirname,'..');
const readJson=async path=>JSON.parse(await readFile(path,'utf8'));
const lazy=async()=>({
 ...(await import('../dist/core/canonical.js')),
 ...(await import('../dist/routing/provisional.js')),
 ...(await import('../dist/routing/reviewer-calibration.js')),
});
const identity=(digest,t)=>digest({provider:t.provider,snapshot_id:t.snapshot_id??t.model_id,effort:t.effort,serving:Object.fromEntries([...t.material_serving_settings].sort().map(key=>[key,t.serving[key]]))});

export async function stageCalibration({reportsPath,outputDirectory,observationsPath=join(root,'data/routing/host-observations.json'),helpers=null}){
 const {hashBytes,digest,provisionalTreatmentSchema,reviewerCalibrationGate}=helpers??await lazy();
 const reportsInput=await readJson(resolve(reportsPath)),reports=reportsInput.reports??[reportsInput];
 const observations=await readJson(resolve(observationsPath));
 await mkdir(outputDirectory,{recursive:false});
 const manifest={schema_version:'staged_reviewer_calibration.v1',created_at:new Date().toISOString(),reports:[],admissions:[],qualification_authority:false};
 for(const report of reports){
  const gate=reviewerCalibrationGate(report.manifest,report.rows,report.target);
  if(!gate.admitted)throw Error('CALIBRATION_NOT_ADMISSIBLE');
  const row=report.rows.find(row=>row.case_id==='positive');
  if(!row?.worker_evidence?.candidate||!row?.reviewer_evidence?.report)throw Error('POSITIVE_WORKER_BINDING_MISSING');
  const host=report.target.host,target=report.target,artifact=hashBytes(row.files_before['quantity.mjs']);
  const workerRaw=row.worker_evidence,reviewRaw=row.reviewer_evidence;
  const worker=observations.treatments.find(t=>t.evidence.host===host&&t.model_id===workerRaw.candidate.model_id&&t.effort===workerRaw.candidate.effort&&!t.frontier&&t.evidence.smoke.execution_digest===workerRaw.report.stdout_digest);
  if(!worker)throw Error('WORKER_OBSERVATION_MISMATCH');
  const reviewer=provisionalTreatmentSchema.parse({candidate_id:`${host}-${target.model_id}-${target.effort}`,provider:target.provider,model_id:target.model_id,snapshot_id:null,effort:target.effort,serving:{fallback:'disabled',tool_use:'host_tools',json_schema:false},material_serving_settings:['fallback','tool_use'],family:target.model_id,frontier:true,capabilities:['terminal'],context_window_tokens:null,
   evidence:{observed_at:reviewRaw.report.started_at,host,host_version:row.reviewer_host_version??'unknown',observed_model_id:reviewRaw.report.observed_identity?.model_id??target.model_id,observed_effort:null,configured_effort:target.effort,effort_source:'requested_configuration',identity_source:reviewRaw.report.observed_identity?.model_id?'runtime':'host_configuration',control_limitations:['Calibration evidence only: zero/nullish quantity-default local JavaScript review; three cases are not governor qualification.','Served effort and provider fallback are not attested; raw native sources determine assurance.','Admission is restricted to mechanical_work at low risk; this calibration grants no authority for other classes or the medium stratum.'],availability:{url:target.source.url,checked_at:target.source.checked_at},pricing:{url:target.source.url,checked_at:target.source.checked_at,input_usd_per_million:null,output_usd_per_million:null,unknown_reason:'No applicable verified pricing rates captured in this calibration; the official model source establishes availability only.'},smoke:{task:report.manifest.scope,artifact_digest:artifact,execution_digest:reviewRaw.report.stdout_digest,review_digest:reviewRaw.report.stdout_digest,accepted:true,frontier_reviewed:true},qualification_failure:null}});
  provisionalTreatmentSchema.parse(worker);
  const staged={sources:[{calibration_report_digest:digest(report),scope:report.manifest.scope,publication:'NOT_ADMITTED'}],treatments:[reviewer],runs:[{id:`calibration-${host}-quantity-positive`,host,scope:'tinybug: zero/nullish quantity default only',started_at:workerRaw.report.started_at,artifact_digest:artifact,worker_stdout_digest:workerRaw.report.stdout_digest,reviewer_stdout_digest:reviewRaw.report.stdout_digest,worker:{model:worker.model_id,configured_effort:worker.effort},reviewer:{model:target.model_id,configured_effort:target.effort,verdict:'ACCEPT'},objective_passed:true,qualification_authority:false}]};
  const hostRoot=join(outputDirectory,host);await mkdir(hostRoot);
  await writeFile(join(hostRoot,'host-observations-staged.json'),JSON.stringify(staged,null,2)+'\n',{flag:'wx'});
  await writeFile(join(hostRoot,'admissible-positive.json'),JSON.stringify({target,scope:report.manifest.scope,positive:row,calibration_report_digest:digest(report),worker_identity:identity(digest,worker),reviewer_identity:identity(digest,reviewer),qualification_authority:false},null,2)+'\n',{flag:'wx'});
  const admission={role:'reviewer',public_task_classes:['mechanical_work'],risk:'low',treatment:reviewer,report,runs:[staged.runs[0]],report_digest:digest(report)};
  await writeFile(join(hostRoot,'admission.json'),JSON.stringify(admission,null,2)+'\n',{flag:'wx'});
  manifest.admissions.push(admission);
  manifest.reports.push({host,report_digest:digest(report),staged_digest:digest(staged),worker_stdout_digest:workerRaw.report.stdout_digest,publication:'NOT_ADMITTED'});
 }
 await writeFile(join(outputDirectory,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 return manifest;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{reports:{type:'string'},output:{type:'string'},observations:{type:'string'},acceptance:{type:'string'}}});
 if(!values.reports||!values.output)throw Error('--reports and --output are required');
 const result=await stageCalibration({reportsPath:values.reports,outputDirectory:resolve(values.output),observationsPath:values.observations,acceptancePath:values.acceptance});
 console.log(JSON.stringify(result));
}
