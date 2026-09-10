import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { canonicalJson, contentDigest, hashBytes } from '../core/canonical.js';
import { candidateIdentity, parseGraderResult, parseTaskObservation, type Candidate, type RiskCategory, type RuntimeReport, type TaskObservation } from '../schema/index.js';
import { validateObservation } from '../evidence/index.js';
import { runNative, type NativeExecution, type NativeInput } from '../runtime/index.js';
import { fixturePrompt, gradeFixture, type PreparedFixture, type FixtureGrade } from './index.js';

export interface EvaluationInput {
  prepared:PreparedFixture; candidate:Candidate; timeoutMs:number; outputDirectory:string;
  cohortId:string; roleId:string; risk:RiskCategory; constraintsDigest:string;
  dependencyDirectory?:string; rendered?:NativeInput['rendered'];
}
export interface EvaluationResult {
  purpose:'qualification_evaluation'; observation:TaskObservation; grade:FixtureGrade; execution:NativeExecution;
  sourceMap:Map<string,string|Uint8Array>; runtimeReports:Map<string,RuntimeReport>;
  operationalLimits:string[];
}

/** Execute a real provider in the isolated candidate workspace. This entry point
 * never claims governed production delegation or review-complete acceptance. */
export async function executeEvaluation(input:EvaluationInput):Promise<EvaluationResult> {
  if(input.candidate.provider!=='openai'&&input.candidate.provider!=='anthropic') throw new Error('REAL_EVALUATION_REQUIRES_NATIVE_PROVIDER');
  z.object({cohortId:z.string().regex(/^[a-z][a-z0-9_:-]{1,95}$/),roleId:z.string().regex(/^[a-z][a-z0-9_:-]{1,95}$/),risk:z.enum(['low','medium','high','critical']),constraintsDigest:z.string().regex(/^sha256:[a-f0-9]{64}$/)}).parse(input);
  const started=Date.now();
  const execution=await runNative({provider:input.candidate.provider,candidate:input.candidate,cwd:input.prepared.workspace,prompt:fixturePrompt(input.prepared),timeoutMs:input.timeoutMs,outputDirectory:input.outputDirectory,mode:'evaluation',sandbox:'workspace-write',...(input.rendered?{rendered:input.rendered}:{})});
  const grade=await gradeFixture({prepared:input.prepared,candidateIdentity:candidateIdentity(input.candidate),...(input.dependencyDirectory?{dependencyDirectory:input.dependencyDirectory}:{})});
  const nativePassed=execution.report.status==='completed'&&execution.report.exit_code===0&&execution.report.signal===null&&execution.cleanup==='complete';
  const nativeBytes=canonicalJson(execution), nativeDigest=hashBytes(nativeBytes);
  grade.sourceMap.set(nativeDigest,nativeBytes);
  const checks=[...grade.result.checks,{check_id:'native_execution',passed:nativePassed,evidence_digest:nativeDigest}];
  grade.result=parseGraderResult({...grade.result,checks,passed:checks.every(check=>check.passed),accepted:false});
  const graderBytes=canonicalJson(grade.result), graderDigest=hashBytes(graderBytes);
  grade.sourceMap.set(graderDigest,graderBytes);
  for (const path of execution.evidence_paths) {const bytes=await readFile(path);grade.sourceMap.set(hashBytes(bytes),bytes);}
  const {manifest}=input.prepared;
  const failures=['review_not_performed',...(nativePassed?[]:['native_execution_failed']),...(grade.result.passed?[]:['objective_checks_failed'])];
  const observation:TaskObservation={
    schema_version:'task_observation.v1',observation_id:`observation_${randomUUID().replaceAll('-','')}`,content_digest:'',
    // Shared schema calls real native observations "production". The enclosing
    // purpose remains qualification_evaluation; this is not production dispatch.
    lane:'production',candidate:{candidate_id:input.candidate.candidate_id,candidate_identity:candidateIdentity(input.candidate)},
    task_id:manifest.task_id,fixture_digest:input.prepared.fixtureDigest,cohort_id:input.cohortId,role_id:input.roleId,
    task_class_id:manifest.task_class_id,risk:input.risk,constraints_digest:input.constraintsDigest,
    suite_id:manifest.task_class_id,suite_version:1,harness_version:manifest.harness_version,grader_version:manifest.grader_version,
    measured_at:new Date().toISOString(),passed:grade.result.passed,accepted:false,failure_categories:failures,latency_ms:Date.now()-started,
    attempts:[{attempt_id:execution.report.report_id,kind:'worker',cost_usd:execution.cost_usd,cost_source:execution.cost_source,latency_ms:Date.parse(execution.report.completed_at)-Date.parse(execution.report.started_at)}],
    provenance:{source:'native_runtime',source_digest:graderDigest,artifact_digest:grade.result.artifact_digest,runtime_receipt_digest:execution.report_digest},
  };
  observation.content_digest=contentDigest(observation);
  const runtimeReports=new Map([[execution.report_digest,execution.report]]);
  const parsed=parseTaskObservation(observation);
  validateObservation(parsed,{sources:grade.sourceMap,runtimeReports});
  await writeFile(join(input.outputDirectory,'observation.json'),canonicalJson(parsed)+'\n');
  await writeFile(join(input.outputDirectory,'grader-result.json'),graderBytes+'\n');
  await writeFile(join(input.outputDirectory,'evidence-sources.json'),canonicalJson(Object.fromEntries([...grade.sourceMap].map(([key,value])=>[key,typeof value==='string'?value:Buffer.from(value).toString('utf8')])))+'\n');
  return {purpose:'qualification_evaluation',observation:parsed,grade,execution,sourceMap:grade.sourceMap,runtimeReports,operationalLimits:[...execution.qualification_blockers,'REQUIRED_INDEPENDENT_REVIEW_NOT_PERFORMED']};
}
