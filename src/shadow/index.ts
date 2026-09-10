import {readFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {isAbsolute,relative,join} from 'node:path';
import {canonicalJson,digest} from '../core/canonical.js';
import {parsePolicy,policyDigest,validateBinding,type Policy} from '../governance/index.js';
import {executeDelegate,simulateDelegate,plan,parseWorkOrder,snapshotWorkspace,inspectChanges,type DelegateInput,type DelegateOutcome,type SimulationCommand,type WorkOrder} from '../delegation/index.js';
import {executeEvaluation,gradeFixture,type EvaluationInput,type EvaluationResult} from '../evaluation/index.js';
import {candidateIdentity,parseBinding} from '../schema/index.js';

export interface ShadowSafety {network:'disabled';capabilities:['bounded_file_edit'];irreversible:false;}
export interface ShadowSession {runId:string;policyDigest:string;}
const sessions=new WeakMap<ShadowSession,{used:Set<string>;maximum:number;fraction:number}>();
export function createShadowSession(policyInput:Policy,runId:string):ShadowSession {
 const policy=parsePolicy(policyInput);if(!runId.trim())throw new Error('shadow_run_id_required');
 const token={runId,policyDigest:policyDigest(policy)};
 sessions.set(token,{used:new Set(),maximum:policy.shadow?.max_tasks_per_run??0,fraction:policy.shadow?.enabled?policy.shadow.max_fraction:0});return token;
}
/** Deterministic cohort/task sampling is independent of model or observed outcome. */
export function shadowSample(taskId:string,cohortId:string):number {return parseInt(digest({task_id:taskId,cohort_id:cohortId}).slice(7,20),16)/2**52;}
function checkerPrefix():string[] {return import.meta.url.endsWith('.ts')?['--experimental-strip-types',fileURLToPath(new URL('./check-file.ts',import.meta.url))]:[fileURLToPath(new URL('./check-file.js',import.meta.url))];}
export function readOnlyFileCheck(checkId:string,path:string,expectedDigest:string):WorkOrder['checks'][number] {
 return {check_id:checkId,executable:process.execPath,args:[...checkerPrefix(),path,expectedDigest],timeout_ms:5000};
}
export interface ShadowOutcome {schema_version:'shadow_outcome.v1';mode:'production'|'simulation';status:'completed'|'blocked'|'not_selected';reason:string|null;incumbent:DelegateOutcome|null;challenger:DelegateOutcome|EvaluationResult|null;paired:boolean;challenger_discarded:boolean;incumbent_preserved:boolean;cost_complete:boolean;}
const outcome=(mode:ShadowOutcome['mode'],reason:string,status:ShadowOutcome['status']='blocked'):ShadowOutcome=>({schema_version:'shadow_outcome.v1',mode,status,reason,incumbent:null,challenger:null,paired:false,challenger_discarded:false,incumbent_preserved:true,cost_complete:false});
function contained(parent:string,child:string):boolean {const path=relative(parent,child);return path===''||(!path.startsWith('../')&&path!=='..'&&!isAbsolute(path));}
async function preflight(input:{incumbent:DelegateInput;challengerWorkspace:string;challengerOrder:WorkOrder;challengerCohort:string;challengerConstraints:string;safety:ShadowSafety;session:ShadowSession;mode:ShadowOutcome['mode']}):Promise<{order:WorkOrder;incumbentRoot:string;challengerRoot:string}|ShadowOutcome> {
 const {incumbent}=input,policy=parsePolicy(incumbent.selection.policy),order=parseWorkOrder(incumbent.order),session=sessions.get(input.session);
 if(!session||input.session.policyDigest!==policyDigest(policy))return outcome(input.mode,'shadow_session_policy_mismatch');
 if(!policy.shadow?.enabled)return outcome(input.mode,'shadow_disabled');
 if(canonicalJson(input.safety)!==canonicalJson({network:'disabled',capabilities:['bounded_file_edit'],irreversible:false}))return outcome(input.mode,'unsupported_shadow_capabilities');
 if(canonicalJson(order)!==canonicalJson(input.challengerOrder)||input.challengerCohort!==incumbent.selection.request.cohort_id||input.challengerConstraints!==incumbent.selection.request.constraints_digest)return outcome(input.mode,'shadow_task_or_cohort_mismatch');
 if(order.allowed_paths.some(path=>path.includes('*')))return outcome(input.mode,'shadow_requires_exact_file_scope');
 for(const check of order.checks){
  const expected=checkerPrefix();
  if(check.executable!==process.execPath||check.args.length!==expected.length+2||canonicalJson(check.args.slice(0,expected.length))!==canonicalJson(expected)||!order.allowed_paths.includes(check.args.at(-2)!)||!/^sha256:[a-f0-9]{64}$/.test(check.args.at(-1)!))return outcome(input.mode,'unsupported_shadow_check_command');
 }
 const before=await snapshotWorkspace(incumbent.workspace),challenger=await snapshotWorkspace(input.challengerWorkspace);
 if(contained(before.root,challenger.root)||contained(challenger.root,before.root))return outcome(input.mode,'shadow_workspaces_not_isolated');
 if(canonicalJson(before.files)!==canonicalJson(challenger.files))return outcome(input.mode,'shadow_starting_artifact_mismatch');
 if(Object.values(before.files).some(file=>file.kind==='symlink'))return outcome(input.mode,'shadow_symlinks_unsupported');
 const proposed={...before,files:{...before.files}};
 for(const path of order.allowed_paths){const file=before.files[path];if(!file||file.kind!=='file')return outcome(input.mode,'shadow_requires_existing_files');proposed.files[path]={...file,content_digest:'sha256:'+'0'.repeat(64)};}
 const scope=inspectChanges(before,proposed,order,policy);
 if(scope.violations.length||['high','critical'].includes(scope.risk.risk)||order.pre_signals.some(signal=>/destruct|irrevers|production|secret|credential|payment|migration/.test(signal)))return outcome(input.mode,'unsafe_shadow_task');
 const selection={...incumbent.selection,mode:input.mode==='production'?'production' as const:'simulation' as const,now:input.mode==='production'?new Date().toISOString():incumbent.selection.now};
 const valid=validateBinding(incumbent.binding,selection);
 if(!valid.ok||valid.status!=='VALID')return outcome(input.mode,'incumbent_not_currently_qualified');
 if(session.used.has(order.task_id))return outcome(input.mode,'shadow_task_already_selected','not_selected');
 if(session.used.size>=session.maximum||shadowSample(order.task_id,incumbent.selection.request.cohort_id)>=session.fraction)return outcome(input.mode,'shadow_budget_or_sampling_excluded','not_selected');
 return {order,incumbentRoot:before.root,challengerRoot:challenger.root};
}
async function runPair(input:{mode:ShadowOutcome['mode'];session:ShadowSession;taskId:string;incumbentRoot:string;challengerRoot:string;runIncumbent:()=>Promise<DelegateOutcome>;runChallenger:()=>Promise<DelegateOutcome|EvaluationResult>}):Promise<ShadowOutcome>{
 sessions.get(input.session)!.used.add(input.taskId);
 const result:ShadowOutcome={...outcome(input.mode,''),status:'completed',reason:null};
 let incumbentDigest:string|null=null;
 try{
  result.incumbent=await input.runIncumbent();incumbentDigest=(await snapshotWorkspace(input.incumbentRoot)).content_digest;
  if(!result.incumbent.accepted){result.status='blocked';result.reason='incumbent_delegation_not_accepted';return result;}
  try{result.challenger=await input.runChallenger();result.paired=true;}
  catch(error){result.status='blocked';result.reason=`challenger_failed: ${error instanceof Error?error.message:String(error)}`;}
  const cost=result.challenger===null?false:'observation'in result.challenger?result.challenger.observation.attempts.every(attempt=>attempt.cost_usd!==null):result.challenger.total_cost_usd!==null;
  result.cost_complete=result.incumbent.total_cost_usd!==null&&Boolean(result.challenger)&&Boolean(cost);
  return result;
 }finally{
  if(incumbentDigest!==null)result.incumbent_preserved=(await snapshotWorkspace(input.incumbentRoot)).content_digest===incumbentDigest;
  await rm(input.challengerRoot,{recursive:true,force:true});result.challenger_discarded=true;
  if(!result.incumbent_preserved){result.status='blocked';result.reason='incumbent_artifact_changed_during_shadow';result.paired=false;}
 }
}

export async function simulateShadow(input:{incumbent:DelegateInput & {workerCommand:SimulationCommand;reviewCommand?:SimulationCommand};challenger:DelegateInput & {workerCommand:SimulationCommand;reviewCommand?:SimulationCommand};safety:ShadowSafety;session:ShadowSession}):Promise<ShadowOutcome>{
 if(input.incumbent.selection.mode!=='simulation'||input.challenger.selection.mode!=='simulation')return outcome('simulation','simulation_authority_required');
 const challengerValidation=validateBinding(input.challenger.binding,{...input.challenger.selection,mode:'simulation'});
 if(!challengerValidation.ok||challengerValidation.status!=='VALID'||policyDigest(input.challenger.selection.policy)!==policyDigest(input.incumbent.selection.policy))return outcome('simulation','challenger_simulation_authority_invalid');
 const ready=await preflight({incumbent:input.incumbent,challengerWorkspace:input.challenger.workspace,challengerOrder:parseWorkOrder(input.challenger.order),challengerCohort:input.challenger.selection.request.cohort_id,challengerConstraints:input.challenger.selection.request.constraints_digest,safety:input.safety,session:input.session,mode:'simulation'});
 if('status'in ready)return ready;
 return runPair({mode:'simulation',session:input.session,taskId:ready.order.task_id,...ready,runIncumbent:()=>simulateDelegate(input.incumbent),runChallenger:()=>simulateDelegate(input.challenger)});
}

export async function executeShadow(input:{incumbent:DelegateInput;challenger:EvaluationInput;safety:ShadowSafety;session:ShadowSession}):Promise<ShadowOutcome>{
 const order=parseWorkOrder(input.incumbent.order),prepared=input.challenger.prepared;
 if(order.task_id!==prepared.manifest.task_id||order.task_class_id!==prepared.manifest.task_class_id||order.goal!==prepared.manifest.prompt||canonicalJson([...order.allowed_paths].sort())!==canonicalJson([...prepared.manifest.allowed_paths].sort())||input.challenger.roleId!==order.role_id||input.challenger.risk!==input.incumbent.selection.request.risk)return outcome('production','shadow_fixture_mismatch');
 const ready=await preflight({incumbent:input.incumbent,challengerWorkspace:prepared.workspace,challengerOrder:order,challengerCohort:input.challenger.cohortId,challengerConstraints:input.challenger.constraintsDigest,safety:input.safety,session:input.session,mode:'production'});
 if('status'in ready)return ready;
 await plan(input.incumbent);
 if(candidateIdentity(parseBinding(input.incumbent.binding).candidate)===candidateIdentity(input.challenger.candidate))return outcome('production','shadow_requires_distinct_candidate');
 // Current harvested graders execute candidate source through Vitest. Until an
 // enforced grader sandbox exists, they cannot enter automatic production shadow.
 // No user-declared safe flag or production override can waive this limitation.
 if(prepared.manifest.harness_version!=='read-only-file-digest-v1')return outcome('production','native_shadow_grader_sandbox_unavailable');
 // A future read-only harness is admitted only if its complete grader source is
 // exactly the trusted file-check template; a caller cannot approve arbitrary JS.
 for(const file of prepared.manifest.grader_files){
  const expected=readOnlyGraderSource(order.checks);
  if(await readFile(join(prepared.bundleDirectory,file.bundle_path),'utf8')!==expected)return outcome('production','unsupported_shadow_grader');
 }
 return runPair({mode:'production',session:input.session,taskId:order.task_id,...ready,
  runIncumbent:async()=>{const result=await executeDelegate(input.incumbent);if(result.accepted){const graded=await gradeFixture({prepared:{...prepared,workspace:input.incumbent.workspace},candidateIdentity:candidateIdentity(parseBinding(input.incumbent.binding).candidate),...(input.challenger.dependencyDirectory?{dependencyDirectory:input.challenger.dependencyDirectory}:{})});if(!graded.result.passed)return {...result,accepted:false,outcome:'ESCALATION_REQUIRED',diagnostics:[...result.diagnostics,'incumbent_shared_grader_failed']};}return result;},
  runChallenger:()=>executeEvaluation(input.challenger)});
}
export function readOnlyGraderSource(checks:WorkOrder['checks']):string {
 return `import {it,expect} from 'vitest';\nimport {readFileSync} from 'node:fs';\nimport {createHash} from 'node:crypto';\n`+checks.map(check=>`it(${JSON.stringify(check.check_id)},()=>expect('sha256:'+createHash('sha256').update(readFileSync(${JSON.stringify(check.args.at(-2))})).digest('hex')).toBe(${JSON.stringify(check.args.at(-1))}));\n`).join('');
}
