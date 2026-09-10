import {mkdtemp,mkdir,readFile,writeFile,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,isAbsolute,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {canonicalJson,digest,hashBytes} from '../core/canonical.js';
import {Ledger} from '../ledger/index.js';
import {parseBinding,type Binding} from '../schema/index.js';
import {classifyRisk,validateBinding,evaluateReview,type SelectionInput} from '../governance/index.js';
import {runNative,type NativeExecution} from '../runtime/index.js';
import {runProcess,type ProcessResult} from '../runtime/process.js';
import {parseWorkOrder,snapshotWorkspace,inspectChanges,matchesPath,type WorkspaceSnapshot,type WorkOrder} from './scope.js';
import {workerResultSchema,reviewResultSchema,type DelegateInput,type DelegateAuthority,type DelegatePlan,type DelegateOutcome} from './contracts.js';
export * from './scope.js';
export * from './contracts.js';

type Mode='production'|'simulation';
const processPassed=(result:ProcessResult)=>result.exit_code===0&&result.signal===null&&!result.timed_out&&!result.output_limited&&result.spawn_error===null&&result.cleanup==='complete';
function currentSelection(selection:SelectionInput,mode:Mode):SelectionInput{return {...selection,mode:mode==='production'?'production':'simulation',now:mode==='production'?new Date().toISOString():selection.now};}
function authority(input:DelegateAuthority,mode:Mode):{binding:Binding;selection:SelectionInput}{
 const selection=currentSelection(input.selection,mode);const validation=validateBinding(input.binding,selection);
 if(!validation.ok||validation.status!=='VALID')throw new Error(`binding_not_current: ${validation.status} ${validation.diagnostics.map(d=>d.rule_id).join(',')}`);
 return {binding:parseBinding(input.binding),selection};
}
async function makePlan(input:DelegateInput,mode:Mode):Promise<DelegatePlan>{
 const order=parseWorkOrder(input.order);const {binding,selection}=authority(input,mode);
 if(order.role_id!==binding.role_id||order.task_class_id!==binding.task_class_id)throw new Error('work_order_binding_mismatch');
 const risk=classifyRisk({policy:selection.policy,taskClassId:order.task_class_id,preSignals:order.pre_signals,postSignals:[]});
 if(risk.risk!==binding.risk)throw new Error('work_order_risk_binding_mismatch');
 for(const rule of order.protected_paths)if(selection.policy.risk_signals[rule.signal]===undefined)throw new Error('unknown_protected_path_signal');
 for(const forbidden of selection.request.constraints.forbidden_paths)if(!order.forbidden_paths.includes(forbidden))throw new Error(`constraint_scope_missing: ${forbidden}`);
 const baseline=await snapshotWorkspace(input.workspace);
 const requestedLedger=relative(baseline.root,resolve(input.ledgerDirectory));
 if(requestedLedger===''||(!requestedLedger.startsWith('../')&&!isAbsolute(requestedLedger)))throw new Error('ledger_must_be_outside_workspace');
 await mkdir(input.ledgerDirectory,{recursive:true});const ledger=await realpath(input.ledgerDirectory);const ledgerRelative=relative(baseline.root,ledger);
 if(ledgerRelative===''||(!ledgerRelative.startsWith('../')&&!isAbsolute(ledgerRelative)))throw new Error('ledger_must_be_outside_workspace');
 // A pre-existing link must not give an allowed name authority over a forbidden target.
 for(const [path,entry]of Object.entries(baseline.files))if(entry.kind==='symlink'&&order.allowed_paths.some(pattern=>matchesPath(path,pattern))){
  const empty={...baseline,files:{...baseline.files}};delete empty.files[path];
  if(inspectChanges(empty,baseline,order,selection.policy).violations.length)throw new Error(`unsafe_baseline_symlink: ${path}`);
 }
 return {order,workspace:baseline.root,binding_digest:digest(binding),baseline,risk:risk.risk,mode};
}
/** Always current production authority; callers cannot opt into a weaker mode. */
export function plan(input:DelegateInput):Promise<DelegatePlan>{return makePlan(input,'production');}

type Invocation={kind:'worker'|'review';authority:DelegateAuthority;cwd:string;prompt:string;timeoutMs:number;outputDirectory:string;outputSchema:Record<string,unknown>;contextPackage?:{directory:string;files:Record<string,string>;artifactDigest:string}};
type InvocationResult={result_text:string|null;cost_usd:number|null;receipt:unknown;identity_verified:boolean;session_id:string|null;fresh_context:boolean;package_digest:string|null;artifact_digest:string|null;successful:boolean};
type Invoke=(input:Invocation)=>Promise<InvocationResult>;

async function buildReviewPackage(workspace:string,baselineSources:string,baseline:WorkspaceSnapshot,final:WorkspaceSnapshot,order:WorkOrder,checks:unknown){
 const directory=await mkdtemp(join(tmpdir(),'governor-review-'));const files:Record<string,string>={};const sourceMap:Record<string,{before:string|null;after:string|null}>={};
 const add=async(path:string,bytes:string|Uint8Array)=>{await mkdir(join(directory,path,'..'),{recursive:true});await writeFile(join(directory,path),bytes,{flag:'wx'});files[path]=hashBytes(bytes);};
 // Source objects have inert digest filenames, so repository instruction filenames cannot auto-activate.
 for(const [path,entry]of Object.entries(final.files))if(entry.kind==='file'){
  const object=`sources/${entry.content_digest.slice(7)}`;if(files[object]===undefined)await add(object,await readFile(join(workspace,path)));
  if(files[object]!==entry.content_digest)throw new Error('artifact_changed_while_packaging');
  sourceMap[path]={before:baseline.files[path]?.content_digest??null,after:object};
 }
 for(const [path,entry]of Object.entries(baseline.files))if(entry.kind==='file'){const object=`sources/${entry.content_digest.slice(7)}`;if(files[object]===undefined)await add(object,await readFile(join(baselineSources,entry.content_digest.slice(7))));if(files[object]!==entry.content_digest)throw new Error('baseline_source_changed');sourceMap[path]={before:object,after:sourceMap[path]?.after??null};}
 await add('task.json',canonicalJson(order));await add('changes.json',canonicalJson({baseline,final}));await add('checks.json',canonicalJson(checks));await add('source-map.json',canonicalJson(sourceMap));
 return {directory,files,artifactDigest:final.content_digest,packageDigest:digest(files)};
}

async function governed(input:DelegateInput,mode:Mode,invoke:Invoke):Promise<DelegateOutcome>{
 const runId=randomUUID();const ledger=new Ledger(input.ledgerDirectory);const refs:string[]=[];const diagnostics:string[]=[];let attempts=0;let totalCost:number|null=0;let artifact:string|null=null;let paths:string[]=[];let risk:SelectionInput['request']['risk']='low';let accepted=false;
 const source=mode==='production'?'native_runtime':'synthetic_process_test';
 const append=async(kind:string,payload:unknown)=>{const id=`${runId}:${kind}:${refs.length}`;await ledger.append({id,provenance:{source,observed_at:new Date().toISOString(),methodology:'governed bounded delegation with actual filesystem, process and objective-check evidence'},payload:{mode,kind,payload}});refs.push(id);};
 let taskId='invalid_work_order';
 try{
  const prepared=await makePlan(input,mode);const {order,baseline,workspace}=prepared;taskId=order.task_id;risk=prepared.risk;
  await append('start',{order,baseline,binding_digest:prepared.binding_digest});
  const baselineSources=join(input.ledgerDirectory,runId,'baseline-sources');await mkdir(baselineSources,{recursive:true});
  for(const [path,file]of Object.entries(baseline.files))if(file.kind==='file'){const bytes=await readFile(join(workspace,path));if(hashBytes(bytes)!==file.content_digest)throw new Error('baseline_changed_before_dispatch');await writeFile(join(baselineSources,file.content_digest.slice(7)),bytes);}
  const initial=authority(input,mode);
  for(let number=1;number<=order.max_attempts;number++){
   authority(input,mode);attempts=number;
   const prompt=canonicalJson({work_order:order,attempt:number,previous_failures:diagnostics,return_schema:z.toJSONSchema(workerResultSchema)});
   let worker:InvocationResult;
   try {worker=await invoke({kind:'worker',authority:input,cwd:workspace,prompt,timeoutMs:order.timeout_ms,outputDirectory:join(input.ledgerDirectory,runId,`worker-${number}`),outputSchema:z.toJSONSchema(workerResultSchema)});}
   catch(error){totalCost=null;await append('worker_exception',{attempt:number,error:error instanceof Error?error.message:String(error),cost_usd:null});throw error;}
   totalCost=totalCost===null||worker.cost_usd===null?null:totalCost+worker.cost_usd;
   await append(number===1?'worker':'rework',{attempt:number,cost_usd:worker.cost_usd,receipt:worker.receipt});
   let final=await snapshotWorkspace(workspace);let inspection=inspectChanges(baseline,final,order,initial.selection.policy);risk=inspection.risk.risk;paths=inspection.paths;artifact=final.content_digest;
   await append('artifact',{attempt:number,manifest:final,inspection});
   if(inspection.violations.length){diagnostics.push(...inspection.violations);break;}
   if(!worker.successful||!worker.identity_verified){diagnostics.push(!worker.identity_verified?'runtime_identity_unverified':'runtime_failed');break;}
   let result:z.infer<typeof workerResultSchema>;
   try{result=workerResultSchema.parse(JSON.parse(worker.result_text??''));}catch{diagnostics.push('invalid_worker_result');continue;}
   if(result.outcome==='ESCALATE'){diagnostics.push('worker_escalated');break;}
   const checkResults=[];let checksPassed=true;
   for(const check of order.checks){
    const checkResult=await runProcess({executable:check.executable,args:check.args,cwd:workspace,timeoutMs:check.timeout_ms,outputDirectory:join(input.ledgerDirectory,runId,`checks-${number}-${check.check_id}`)});
    checkResults.push({check,execution:checkResult});if(!processPassed(checkResult))checksPassed=false;
   }
   await append('checks',{attempt:number,results:checkResults});
   const checked=await snapshotWorkspace(workspace);
   if(checked.content_digest!==final.content_digest){diagnostics.push('artifact_changed_during_checks');break;}
   if(!checksPassed){diagnostics.push('objective_checks_failed');continue;}
   if(risk!==prepared.risk){diagnostics.push('post_change_risk_requires_new_binding');break;}
   if(initial.selection.policy.review[risk].required){
    if(!input.reviewer){diagnostics.push('independent_reviewer_unavailable');break;}
    const reviewer=authority(input.reviewer,mode);
    if(reviewer.binding.role_id!=='reviewer'||reviewer.binding.task_class_id!==order.task_class_id||reviewer.binding.risk!==risk){diagnostics.push('reviewer_binding_mismatch');break;}
    const reviewPackage=await buildReviewPackage(workspace,baselineSources,baseline,final,order,checkResults);
    let reviewerResult:InvocationResult;
    try {reviewerResult=await invoke({kind:'review',authority:input.reviewer,cwd:reviewPackage.directory,prompt:canonicalJson({instruction:'Independently review only this immutable package and its source-map. Read task.json, changes.json and checks.json. Return an explicit verdict for the final artifact. Do not modify any file.',artifact_digest:final.content_digest,package_digest:reviewPackage.packageDigest,return_schema:z.toJSONSchema(reviewResultSchema)}),timeoutMs:order.timeout_ms,outputDirectory:join(input.ledgerDirectory,runId,`review-${number}`),outputSchema:z.toJSONSchema(reviewResultSchema),contextPackage:{directory:reviewPackage.directory,files:reviewPackage.files,artifactDigest:reviewPackage.artifactDigest}});}catch(error){totalCost=null;await append('review_exception',{attempt:number,error:error instanceof Error?error.message:String(error),cost_usd:null});throw error;}
    totalCost=totalCost===null||reviewerResult.cost_usd===null?null:totalCost+reviewerResult.cost_usd;
    await append('review',{attempt:number,cost_usd:reviewerResult.cost_usd,receipt:reviewerResult.receipt,package:reviewPackage});
    let verdict:z.infer<typeof reviewResultSchema>;
    try{verdict=reviewResultSchema.parse(JSON.parse(reviewerResult.result_text??''));}catch{diagnostics.push('invalid_review_result');break;}
    if(!worker.session_id||!reviewerResult.successful||!reviewerResult.identity_verified||!reviewerResult.fresh_context||reviewerResult.package_digest!==reviewPackage.packageDigest||reviewerResult.artifact_digest!==final.content_digest){diagnostics.push('review_context_or_identity_unverified');break;}
    const review=evaluateReview({policy:initial.selection.policy,registry:initial.selection.registry,implementer:initial.binding.candidate,reviewer:reviewer.binding.candidate,risk,artifactDigest:final.content_digest,packageDigest:reviewPackage.packageDigest,implementerSessionId:worker.session_id??'',reviewerQualification:{...reviewer.selection,candidate:reviewer.binding.candidate},proof:{outcome:verdict.outcome==='ACCEPT'?'accepted':verdict.outcome==='REJECT'?'rejected':'escalated',artifact_digest:verdict.artifact_digest,package_digest:verdict.package_digest,runtime_receipt_digest:digest(reviewerResult.receipt),session_id:reviewerResult.session_id,parent_session_id:null,context_kind:'new',inherited_context_digest:null}});
    if(!review.ok){diagnostics.push(...review.diagnostics.map(d=>d.rule_id));if(verdict.outcome==='REJECT')continue;break;}
   }
   final=await snapshotWorkspace(workspace);inspection=inspectChanges(baseline,final,order,initial.selection.policy);
   if(final.content_digest!==artifact||inspection.violations.length){diagnostics.push('artifact_changed_after_review');break;}
   authority(input,mode);accepted=true;break;
  }
 }catch(error){diagnostics.push(error instanceof Error?error.message:String(error));}
 const outcome:DelegateOutcome={schema_version:'delegate_outcome.v1',task_id:taskId,run_id:runId,mode,outcome:accepted?'ACCEPTED':'ESCALATION_REQUIRED',accepted,attempts,total_cost_usd:totalCost,artifact_digest:artifact,changed_paths:paths,risk,diagnostics,ledger_refs:[...refs]};
 await append('outcome',outcome);return {...outcome,ledger_refs:refs};
}

/** Native production is the only transport admitted here. Test callbacks cannot manufacture production proof. */
export async function executeDelegate(input:DelegateInput):Promise<DelegateOutcome>{
 return governed(input,'production',async invocation=>{
  const {binding,selection}=authority(invocation.authority,'production');
  if(binding.candidate.provider!=='anthropic'&&binding.candidate.provider!=='openai')throw new Error('native_provider_required');
  const native:NativeExecution=await runNative({provider:binding.candidate.provider,candidate:binding.candidate,cwd:invocation.cwd,prompt:invocation.prompt,timeoutMs:invocation.timeoutMs,outputDirectory:invocation.outputDirectory,mode:'production',sandbox:invocation.kind==='review'?'read-only':'workspace-write',rendered:invocation.authority.rendered,selection,binding,outputSchema:invocation.outputSchema,...(invocation.contextPackage===undefined?{}:{contextPackage:invocation.contextPackage})});
  return {result_text:native.result_text,cost_usd:native.cost_usd,receipt:native,identity_verified:native.identity_status==='matched'&&native.report.observed_identity.model_id===binding.candidate.snapshot_id&&native.report.observed_identity.effort===binding.candidate.effort&&!(binding.candidate.material_serving_settings.includes('fallback')&&native.qualification_blockers.includes('PROVIDER_FALLBACK_CONTROL_UNVERIFIED')),session_id:native.session_id,fresh_context:native.context.fresh_process&&native.context.instruction_scope==='isolated-package',package_digest:native.context.package_digest,artifact_digest:native.context.artifact_digest,successful:native.report.status==='completed'&&native.report.exit_code===0};
 });
}

export type SimulationCommand={executable:string;args:string[]};
/** Explicit synthetic process fixtures exercise the same inspection/check/review state machine. */
export async function simulateDelegate(input:DelegateInput & {workerCommand:SimulationCommand;reviewCommand?:SimulationCommand}):Promise<DelegateOutcome>{
 if(input.selection.mode!=='simulation')throw new Error('simulation_authority_required');
 return governed(input,'simulation',async invocation=>{
  const command=invocation.kind==='worker'?input.workerCommand:input.reviewCommand;
  if(!command)throw new Error('simulation_review_command_missing');
  const promptPath=join(input.ledgerDirectory,'prompts',randomUUID()+'.json');await mkdir(join(input.ledgerDirectory,'prompts'),{recursive:true});await writeFile(promptPath,invocation.prompt,{flag:'wx'});
  const result=await runProcess({...command,args:[...command.args,promptPath],cwd:invocation.cwd,timeoutMs:invocation.timeoutMs,outputDirectory:invocation.outputDirectory});
  if(invocation.contextPackage){const after=await snapshotWorkspace(invocation.cwd);const actual=Object.fromEntries(Object.entries(after.files).filter(([,file])=>file.kind==='file').map(([path,file])=>[path,file.content_digest]));if(canonicalJson(actual)!==canonicalJson(invocation.contextPackage.files))throw new Error('simulation_review_package_changed');}
  return {result_text:await readFile(result.stdout_path,'utf8'),cost_usd:null,receipt:{source:'synthetic_process_test',...result},identity_verified:true,session_id:randomUUID(),fresh_context:true,package_digest:invocation.contextPackage?digest(invocation.contextPackage.files):null,artifact_digest:invocation.contextPackage?.artifactDigest??null,successful:processPassed(result)};
 });
}
