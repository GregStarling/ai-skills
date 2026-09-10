import {z} from 'zod';
import {hashBytes} from '../core/canonical.js';
import {parseCandidate,parseRuntimeReport} from '../schema/index.js';
import {decodeSources} from '../evidence/sources.js';
import {deriveIdentityAssurance,identityAssuranceMeetsMinimum} from '../runtime/identity-assurance.js';
import {parseNativeTelemetry} from '../runtime/telemetry.js';

// Maintainer calibration only. This is not a governor qualification or wire schema.
const id=z.string().min(1);
const caseSchema=z.object({id:z.enum(['positive','defective','boundary']),artifact_file:id,expected_verdict:z.enum(['ACCEPT','REPAIR'])}).strict();
const manifestSchema=z.object({scope:id,requirements:id,checks_file:id,cases:z.array(caseSchema).length(3)}).strict().superRefine((value,ctx)=>{
 const expected={positive:'ACCEPT',defective:'REPAIR',boundary:'ACCEPT'};
 if(new Set(value.cases.map(c=>c.id)).size!==3||value.cases.some(c=>c.expected_verdict!==expected[c.id]))ctx.addIssue({code:'custom',message:'Require positive/ACCEPT, defective/REPAIR and boundary/ACCEPT exactly once'});
});
export const parseCalibrationManifest=(value:unknown)=>manifestSchema.parse(value);
type Manifest=z.infer<typeof manifestSchema>;
export type CalibrationTarget={host:'codex'|'claude';provider:'openai'|'anthropic';model_id:string;effort:string};
export type CalibrationRow={case_id:string;files_before:Record<string,string>;files_after:Record<string,string>;objective:{exit_code:number|null;signal:string|null};reviewer_evidence:unknown;worker_evidence?:unknown};

export function calibrationPrompt(manifest:Manifest){
 return `Independently review quantity.mjs against this requirement: ${manifest.requirements} Read the actual artifact and quantity.test.mjs, then run node quantity.test.mjs. Do not edit files, install anything, or use subagents. Return ACCEPT if correct or REPAIR with a concrete defect as the first word. This is a fresh artifact-only review; no worker report or prior verdict is supplied.`;
}

function inspectEvidence(value:unknown,target?:CalibrationTarget){
 const evidence=z.object({candidate:z.unknown(),report:z.unknown(),sources:z.unknown()}).parse(value);
 const candidate=parseCandidate(evidence.candidate),report=parseRuntimeReport(evidence.report),sources=decodeSources(evidence.sources);
 if(candidate.provider!=='openai'&&candidate.provider!=='anthropic')throw Error('subscription_provider_required');
 if(report.status!=='completed'||report.exit_code!==0||report.signal!==null)throw Error('execution_not_completed');
 if(target&&(candidate.provider!==target.provider||candidate.model_id!==target.model_id||candidate.effort!==target.effort))throw Error('treatment_mismatch');
 const environment=target?.host==='claude'?'claude_code':target?.host==='codex'?'codex':report.execution_environment;
 if(environment!=='codex'&&environment!=='claude_code')throw Error('subscription_host_required');
 const assurance=deriveIdentityAssurance({candidate,report,sources,executionEnvironment:environment});
 if(assurance.diagnostics.some(d=>d.hard)||!identityAssuranceMeetsMinimum(assurance.overall,'CONFIGURATION_ATTESTED'))throw Error('identity_evidence_insufficient');
 const stdout=sources.get(report.stdout_digest??'');
 if(stdout===undefined||hashBytes(stdout)!==report.stdout_digest)throw Error('stdout_unresolved');
 const text=typeof stdout==='string'?stdout:new TextDecoder().decode(stdout);
 const telemetry=parseNativeTelemetry(candidate.provider,text,candidate.model_id);
 if(telemetry.provider_error)throw Error('provider_error');
 return {candidate,report,assurance,verdict:/^(?:\*\*)?(ACCEPT|REPAIR)(?:\*\*)?(?:\s|[.:—-]|$)/i.exec((telemetry.result_text??'').trim())?.[1]?.toUpperCase()??null};
}

/** Re-derive identity from captured bytes; never trust a report's assurance/admitted labels. */
export function reviewerCalibrationGate(manifestValue:unknown,rows:CalibrationRow[],target:CalibrationTarget){
 const manifest=parseCalibrationManifest(manifestValue),diagnostics:{case_id:string;reason:string}[]=[],results=[];
 if(rows.length!==3||new Set(rows.map(r=>r.case_id)).size!==3)diagnostics.push({case_id:'batch',reason:'missing_or_duplicate_case'});
 for(const fixture of manifest.cases){
  const row=rows.find(r=>r.case_id===fixture.id);
  if(!row){diagnostics.push({case_id:fixture.id,reason:'missing_case'});continue;}
  try{
   for(const name of ['quantity.mjs','quantity.test.mjs'])if(!row.files_before[name]||row.files_after[name]!==row.files_before[name])throw Error('artifact_missing_or_mutated');
   if(row.objective.signal!==null||row.objective.exit_code!==(fixture.id==='defective'?1:0))throw Error('objective_disagrees_with_oracle');
   if(fixture.id==='positive'){
    const worker=inspectEvidence(row.worker_evidence);
    if(worker.report.execution_environment!==(target.host==='claude'?'claude_code':'codex'))throw Error('worker_host_mismatch');
   }
   const reviewer=inspectEvidence(row.reviewer_evidence,target);
   if(reviewer.verdict!==fixture.expected_verdict)throw Error('wrong_verdict');
   results.push({case_id:fixture.id,verdict:reviewer.verdict,identity_assurance:reviewer.assurance.overall,stdout_digest:reviewer.report.stdout_digest});
  }catch(error){diagnostics.push({case_id:fixture.id,reason:error instanceof Error?error.message:String(error)});}
 }
 return {admitted:diagnostics.length===0,diagnostics,results,qualification_authority:false as const};
}
