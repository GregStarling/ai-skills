import {mkdtemp,mkdir,cp,writeFile,readFile,readdir,lstat,realpath,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createCase,gradeCase,caseNames} from './portable-cases.mjs';
import {folderDigest} from '../../skills/delegate/scripts/local-learning.mjs';

const root=resolve(import.meta.dirname,'../..');

export const installedCaseNames=[...caseNames,'research'];
async function createInstalledCase(name,directory){
 if(name!=='research')return createCase(name,directory);
 await mkdir(directory,{recursive:true});
 const task='Research current official Node.js documentation for fsPromises.cp recursive, dereference and preserveTimestamps defaults, and os.tmpdir environment-variable precedence on non-Windows systems. Retrieve https://nodejs.org/api/fs.html and https://nodejs.org/api/os.html live. Explain how those facts affect copying a skill into a disposable temporary project. Write research.json containing sources:[{url,retrieved_at}], claims:[{claim,source_url,evidence}], contradictions:[], unresolved_questions:[], and recommendation:string. Include exact URLs and short claim-level evidence. Do not infer unavailable facts. The frontier must inspect the decision-critical source passages itself.';
 await writeFile(join(directory,'research-task.txt'),task+'\n',{flag:'wx'});
 return {name,directory,task,owned_files:['research.json'],grading_limitations:'Structural checks only; frontier source and trace review must verify retrieval, claims, worker identity and application. This live-web evaluation does not qualify a supplied-source route.'};
}
export async function gradeInstalledCase(name,directory,options={}){
 if(name!=='research')return gradeCase(name,directory,options);
 const limitations='Structural checks only; requires independent source and execution trace review.';
 try{
  const report=JSON.parse(await readFile(join(directory,'research.json'),'utf8'));
  const sources=Array.isArray(report.sources)?report.sources:[];
  const validUrl=url=>{try{return new URL(url).hostname==='nodejs.org'&&new URL(url).protocol==='https:';}catch{return false;}};
  const passed=sources.length>=2&&sources.every(s=>validUrl(s.url)&&typeof s.retrieved_at==='string'&&Number.isFinite(Date.parse(s.retrieved_at)))&&Array.isArray(report.claims)&&report.claims.length>=4&&report.claims.every(c=>typeof c.claim==='string'&&c.claim.trim()&&typeof c.evidence==='string'&&c.evidence.trim()&&sources.some(s=>s.url===c.source_url))&&Array.isArray(report.contradictions)&&Array.isArray(report.unresolved_questions)&&typeof report.recommendation==='string'&&!!report.recommendation.trim();
  return {name,passed,grading_limitations:limitations};
 }catch(error){return {name,passed:false,error:error.code??error.message,grading_limitations:limitations};}
}

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function folderDigests(directory){
 const files={};
 async function visit(base){for(const entry of (await readdir(base,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const path=join(base,entry.name);
  if(entry.isDirectory())await visit(path);
  else if(entry.isFile())files[relative(directory,path)]=hash(await readFile(path));
  else throw Error(`Unsupported fixture/package entry: ${path}`);
 }}await visit(directory);return files;
}
const absent=async path=>{try{await lstat(path);}catch(error){if(error.code==='ENOENT')return;throw error;}throw Error(`Refusing existing trial path: ${path}`);};
export function trialModeInstructions(mode='auto'){
 if(!['auto','direct','delegated'].includes(mode))throw Error('Unknown execution mode');
 return mode==='direct'?'Explicit direct-execution evaluation: complete this task in the coordinator; do not spawn workers or child model processes. Preserve relevant verification.':mode==='delegated'?'Explicit delegated-execution evaluation: use one eligible worker (or the explicitly requested swarm) and the required frontier verification. Do not recursively subdelegate.':'Choose direct execution or bounded delegation using the installed skill. Do not spawn a worker merely because this is an evaluation.';
}
export function helperInstructions(source){
 const helper_commands=[...new Set([...source.matchAll(/command\s*===\s*['"]([a-z]+)['"]/g)].map(match=>match[1]))].sort();
 return {helper_commands,instruction_variant:helper_commands.includes('finish')?'current':'legacy'};
}
export const harvestedRouteClass=taskClass=>({bounded_backend:'bounded_implementation',hard_debugging:'hard_debugging'})[taskClass];
const jsonEvents=stdout=>stdout.split(/\r?\n/).flatMap(line=>{try{return [JSON.parse(line)];}catch{return [];}});
export function classifyTrial({host,stdout='',stderr='',telemetry={},fixtureRoot,before,after}){
 const events=jsonEvents(stdout);
 const within=path=>typeof path==='string'&&fixtureRoot&&(()=>{const p=relative(fixtureRoot,resolve(fixtureRoot,path));return p!== '..'&&!p.startsWith('../')&&!isAbsolute(p);})();
 const progress=events.some(e=>e.item?.type==='file_change'||(host==='claude'&&e.type==='assistant'&&e.message?.content?.some(c=>['Edit','Write'].includes(c.name)&&within(c.input?.file_path))))||
  JSON.stringify(gradeState(before))!==JSON.stringify(gradeState(after));
 const budget=host==='claude'&&events.some(e=>e.type==='result'&&/budget/i.test(e.subtype??''));
 if(budget)return 'harness_budget_cap';
 const errors=events.filter(e=>e.type==='error'||e.type==='turn.failed'||e.is_error||e.is_api_error_message);
 if(!progress&&(telemetry.provider_error||errors.length))return /usage limit|hit your (usage )?limit|rate limit/i.test(JSON.stringify(errors)+' '+stderr)?'blocked_provider_limit':'blocked_provider_error';
 return 'pending_frontier_trace_review';
}
function gradeState(grade){return grade==null?null:{status:grade.status,passed:grade.result?.passed??grade.passed,checks:grade.result?.checks?.map(c=>[c.check_id,c.passed]),changedPaths:grade.changedPaths,artifact_digest:grade.result?.artifact_digest};}
export async function gradePreparedTrial(prepared){
 if(!prepared.harvested)return gradeInstalledCase(prepared.task.name,prepared.fixtureRoot);
 const {gradeFixture}=await import('../../dist/evaluation/index.js');
 const {digest}=await import('../../dist/core/canonical.js');
 return gradeFixture({prepared:prepared.harvested,candidateIdentity:digest({host:prepared.host,model:prepared.host==='claude'?'claude-opus-5':'gpt-5.5',effort:'high'}),dependencyDirectory:join(prepared.directory,'node_modules'),timeoutMs:120000});
}
export async function prepareInstalledTrial(host,name,{projectRoot=null,fixtureDirectory=null,temporaryDirectory=tmpdir(),mode='auto',harvested=null,skillSource=join(root,'skills/delegate')}={}){
 if(!['claude','codex'].includes(host)||(!harvested&&!installedCaseNames.includes(name)))throw Error('Unknown host or fixture');
 if(harvested&&(projectRoot||fixtureDirectory))throw Error('Harvested fixtures require a fresh disposable project');
 const modeInstructions=trialModeInstructions(mode);
 // Canonicalize disposable roots too: macOS temporary paths may traverse /var -> /private/var.
 const directory=await realpath(projectRoot?resolve(projectRoot):await mkdtemp(join(temporaryDirectory,`installed-delegate-${host}-${name}-`)));
 if(directory===root)throw Error('Library source must remain inert');
 if(fixtureDirectory&&!projectRoot)throw Error('A fixture directory requires an existing project');
 let fixtureRoot=projectRoot?resolve(directory,fixtureDirectory??`.delegate/fixtures/${name}`):directory;
 const inside=relative(directory,fixtureRoot);
 if(projectRoot&&(!inside||inside==='..'||inside.startsWith('../')||isAbsolute(inside)))throw Error('Fixture must be inside the isolated project');
 const skillPath=join(directory,host==='claude'?'.claude/skills/delegate':'.agents/skills/delegate');
 await absent(skillPath);
 const researchInstructions=name==='research'?' Live retrieval of the named official Node.js documentation is permitted for this isolated qualification evaluation. Treat web-source discovery as an evaluation-only extension of the supplied-source research scope; do not claim it is qualified or alter the routing pack. Preserve candidate identity, frontier verification, and fallback requirements.':' ';
 const instructions='Disposable local acceptance project. The coordinator uses the installed project delegate skill. Workers and reviewers execute their bounded packets without recursively invoking delegation. Work only on supplied fixture files and local receipts. Do not install dependencies, alter global settings, access unrelated projects, or read external grader files. Native authenticated subagents or child CLI processes are permitted. Keep work orders compact. '+modeInstructions+researchInstructions+' The eligible frontier coordinator verifies low-risk work itself; do not duplicate frontier reviews. Preserve requested versus observed identity. Stop when the requested behavior is verified.\n';
 if(!projectRoot){spawnSync('git',['init','-q'],{cwd:directory});await writeFile(join(directory,'AGENTS.md'),instructions);await writeFile(join(directory,'CLAUDE.md'),instructions);}
 const instructionDigests=Object.fromEntries(await Promise.all(['AGENTS.md','CLAUDE.md'].map(async file=>[file,hash(await readFile(join(directory,file)))])));
 if(projectRoot)await absent(fixtureRoot);
 for(const target of [dirname(skillPath),...(projectRoot?[dirname(fixtureRoot)]:[])]){
  // Resolve each existing ancestor before creating children: never follow a project symlink outside its root.
  let parent=directory;
  for(const part of relative(directory,target).split('/').filter(Boolean)){
   parent=join(parent,part);await mkdir(parent,{recursive:true});
   const location=relative(directory,await realpath(parent));
   if(location==='..'||location.startsWith('../')||isAbsolute(location))throw Error('Trial parent escapes isolated project');
  }
 }
 let task,harvestedPrepared=null,startingArtifactDigest=null;
 if(harvested){
  const {prepareFixture,fixturePrompt}=await import('../../dist/evaluation/index.js');
  const {digest}=await import('../../dist/core/canonical.js');
  const source=await realpath(harvested.sourceRepository),dependencies=await realpath(harvested.dependencyDirectory);
  const location=relative(source,dependencies);
  if(!location||(!location.startsWith('../')&&location!=='..'&&!isAbsolute(location)))throw Error('FIXTURE_DEPENDENCIES_INSIDE_SOURCE');
  harvestedPrepared=await prepareFixture({...harvested,workspaceRoot:directory,bundleRoot:join(root,'fixtures/harvested')});
  const lock=await readFile(join(dirname(dependencies),'package-lock.json'));
  if('sha256:'+hash(lock)!==harvestedPrepared.manifest.package_lock_digest)throw Error('FIXTURE_DEPENDENCY_LOCK_MISMATCH');
  const target=join(directory,'node_modules');
  let cloned=spawnSync('cp',['-c','-R',dependencies,target]);
  if(cloned.status!==0){await rm(target,{recursive:true,force:true});cloned=spawnSync('cp',['-R',dependencies,target]);}
  if(cloned.status!==0)throw Error('FIXTURE_DEPENDENCY_COPY_FAILED');
  await writeFile(join(directory,'package-lock.json'),lock);
  fixtureRoot=harvestedPrepared.workspace;
  // The candidate's command resolves locally; this points only to the disposable copy.
  await symlink(target,join(fixtureRoot,'node_modules'),'dir');
  task={name,task:fixturePrompt(harvestedPrepared),owned_files:harvestedPrepared.manifest.allowed_paths};
  startingArtifactDigest=digest(harvestedPrepared.baseline);
 }else task=await createInstalledCase(name,fixtureRoot);
 await mkdir(dirname(skillPath),{recursive:true});await cp(resolve(skillSource),skillPath,{recursive:true,force:false,errorOnExist:true});
 const fixtureDigests=harvestedPrepared?harvestedPrepared.baseline:await folderDigests(fixtureRoot),skillDigests=await folderDigests(skillPath);
 return {host,directory,fixtureRoot,skillPath,task,mode,harvested:harvestedPrepared,starting_artifact_digest:startingArtifactDigest??`sha256:${hash(JSON.stringify(fixtureDigests))}`,...helperInstructions(await readFile(join(skillPath,'scripts/local-learning.mjs'),'utf8')),instructionDigests,fixtureDigests,skillDigests,skill_folder_sha256:hash(JSON.stringify(skillDigests)),skill_folder_digest:await folderDigest(skillPath)};
}
export async function harvestTrialReceipts(directory,stateDirectory,host,runId){
 const folders=[join(directory,'.delegate/runs')],receipts=[];
 try {for(const entry of await readdir(stateDirectory,{withFileTypes:true}))if(entry.isDirectory()&&/^[a-f0-9]{64}$/.test(entry.name))folders.push(join(stateDirectory,entry.name,host,'receipts'));}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const folder of folders){
  let names;try{names=await readdir(folder,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')continue;throw error;}
  for(const entry of names.filter(e=>e.isFile()&&e.name.endsWith('.json'))){
   const path=join(folder,entry.name),raw=await readFile(path,'utf8');
   try{const value=JSON.parse(raw);if(!['delegate_receipt.v1','delegate_receipt.v2','delegate_receipt.v3'].includes(value.schema_version))continue;receipts.push({file:relative(directory,path),sha256:hash(raw),run_binding:value.run_id===runId?'matched':value.run_id==null?'unbound':'mismatch',value});}
   catch{receipts.push({file:relative(directory,path),sha256:hash(raw),error:'invalid_json'});}
  }
 }
 return receipts;
}
export async function installedTrial(host,name,{exercise=null,projectRoot=null,fixtureDirectory=null,outputDirectory=null,maxModelCalls=null,mode='auto',runId=randomUUID(),timeoutMs=null,harvested=null,skillSource=join(root,'skills/delegate'),dryRun=false,preparedTrial=null,environment=null,traceBoundInspection=false}={}){
 if(mode==='direct'&&(exercise!==null||name==='fullproject'))throw Error('Direct mode conflicts with the requested delegation exercise');
 if(maxModelCalls!==null&&(!Number.isInteger(maxModelCalls)||maxModelCalls<1))throw Error('Model execution ceiling must be a positive integer');
 if(typeof runId!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(runId))throw Error('Invalid trial run ID');
 if(timeoutMs!==null&&(!Number.isInteger(timeoutMs)||timeoutMs<1))throw Error('Invalid trial timeout');
 const prepared=preparedTrial??await prepareInstalledTrial(host,name,{projectRoot,fixtureDirectory,mode,harvested,skillSource});
 if(prepared.host!==host||prepared.mode!==mode||prepared.task.name!==name)throw Error('PREPARED_TRIAL_MISMATCH');
 const {directory,fixtureRoot,skillPath,task,instructionDigests}=prepared;
 const before=await gradePreparedTrial(prepared);
 if(prepared.harvested&&(before.status!=='behavioral_failure'||!['scope','grader_integrity'].every(id=>before.result.checks.some(c=>c.check_id===id&&c.passed))))throw Error('HARVESTED_BASELINE_INVALID');
 const behaviorBefore=name==='mechanical'?await gradeCase(name,fixtureRoot,{behaviorOnly:true}):null;
 const destination=outputDirectory?resolve(outputDirectory):join(root,'artifacts/installed-delegate',`${host}-${name}-${runId}`);
 // Reusing a result directory risks mixing traces and baselines from different executions.
 await mkdir(dirname(destination),{recursive:true});await mkdir(destination);
 const stateDirectory=join(directory,'.delegate/state');
 if(!dryRun&&!environment){const native=await import('../../dist/runtime/native.js');const {sanitizedChildEnvironment}=await import('./direct-vs-delegated.mjs');environment=sanitizedChildEnvironment(native,host);}
 const copiedPack=JSON.parse(await readFile(join(skillPath,'routing-pack.json'),'utf8'));
 const earliestEntryExpiry=new Date(Math.min(...copiedPack.routes.flatMap(r=>[...r.workers,...r.reviewers].map(e=>Date.parse(e.expires_at))))).toISOString();
 if(!dryRun&&Date.now()>=Date.parse(earliestEntryExpiry))throw Error('TRIAL_PACK_ENTRIES_EXPIRED');
 const version=dryRun?null:spawnSync(host,['--version'],{encoding:'utf8',timeout:10000,...(environment?{env:environment.env}:{})});
 const identity={pack_content_digest:copiedPack.content_digest,refresh_due:Date.now()>=Date.parse(copiedPack.refresh_after),earliest_entry_expires_at:earliestEntryExpiry,host_version:version?{stdout:version.stdout??'',stderr:version.stderr??'',exit_code:version.status}:null,thread_id:null,session_id:null,instruction_variant:prepared.instruction_variant,helper_commands:prepared.helper_commands,learning_state_directory:stateDirectory,run_id:runId,mode,qualification_evaluation:true,baseline_path:join(destination,'baseline.json'),coordinator_path:join(destination,'coordinator'),skill_folder_sha256:prepared.skill_folder_sha256,skill_folder_digest:prepared.skill_folder_digest,starting_artifact_digest:prepared.starting_artifact_digest};
 const evaluationDirectory=join(directory,'.delegate/evaluation');await mkdir(evaluationDirectory,{recursive:true});
 const helperPath=join(skillPath,'scripts/local-learning.mjs');
 const startInput={cwd:directory,host,host_version:identity.host_version?.stdout.trim()||'unavailable',session_id:`evaluation-session-${runId}`,task_id:`evaluation-task-${runId}`,run_id:runId,task_class:prepared.harvested?harvestedRouteClass(prepared.harvested.manifest.task_class_id):({research:'research',tinybug:'mechanical_work',mechanical:'mechanical_work',backend:'bounded_implementation',ui:'ui_implementation',hardbug:'hard_debugging',multicomponent:'complex_implementation',fullproject:'complex_implementation'})[name],risk:'low',scope:prepared.harvested?`harvested-${prepared.harvested.manifest.fixture_id}`:`installed-${name}-${mode}`,research_kind:name==='research'?'live_web':null,origin:'qualification_evaluation',baseline_digest:identity.starting_artifact_digest};
 const reminderInput={cwd:directory,host,run_id:runId,reminder:{safe_boundary:true,remaining_work:true,active_workers:false,coupled_investigation:false,rediscovery_required:false,completed_context_dominates:true,next_phase_independent:true,handoff:{objective:'Synthetic reminder acceptance fixture; no extra implementation requested.',constraints:['Qualification evaluation only; do not create or restart a session.'],decisions:['The simulated investigation is complete.'],checkout_state:`Disposable project ${directory}; preserve its verified artifact.`,completed_checks:['Use actual completed task verification in the task receipt.'],evidence_locations:[join(destination,'baseline.json')],next_action:'In the synthetic scenario, implementation can begin from these decisions.',unresolved_risks:['Fixture flags are synthetic, not measured host context or savings.']}}};
 for(const [file,value] of [['start-input.json',startInput],['reminder-input.json',reminderInput],['followup-input.json',{cwd:directory,host,run_id:runId}]])await writeFile(join(evaluationDirectory,file),JSON.stringify(value,null,2)+'\n');

 const legacyInstructions=`Before task execution, run node ${helperPath} start ${join(evaluationDirectory,'start-input.json')} and save exact stdout to ${join(evaluationDirectory,'start-result.json')}. Use exactly the supplied run_id, task_id and session_id. The returned project and skill identities are helper-computed; do not replace them with harness digest formats. At task completion, record the truthful outcome via the helper. Then, without another model call, run helper advise with reminder-input.json and save reminder-result.json, repeat that command once into reminder-repeat-result.json, run helper advise with followup-input.json into advice-result.json, and run helper status with followup-input.json into status-result.json, all under ${evaluationDirectory}. The reminder input is a controlled qualitative scenario, not real telemetry; do not inflate context or infer real savings. Check that the first reminder suggests a handoff, the repeat is suppressed, advice reads local state and stays at baseline, and status sees the outcome. Report unavailable or failed checks honestly. Do not create a new session or extra model invocation for these checks.`;
 const checkCommand=['node','node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.json'];
 if(prepared.harvested)await writeFile(join(evaluationDirectory,'check-input.json'),JSON.stringify({cwd:directory,host,run_id:runId,command:['node','-e',`const {spawnSync}=require('node:child_process');const r=spawnSync('node',${JSON.stringify(checkCommand.slice(1))},{cwd:${JSON.stringify(fixtureRoot)},stdio:'inherit'});process.exit(r.status??1);`],timeout_ms:120000},null,2)+'\n');
 const learningInstructions=prepared.instruction_variant==='legacy'?legacyInstructions+(prepared.harvested?` Run the single check node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json in ${fixtureRoot} exactly once through node ${helperPath} capture ${join(evaluationDirectory,'check-input.json')} and use its reference in record. Do not run npm install or modify node_modules.`:''):`Before task execution, run node ${helperPath} start ${join(evaluationDirectory,'start-input.json')} and save exact stdout to ${join(evaluationDirectory,'start-result.json')}. Use exactly the supplied run_id, task_id and session_id. ${prepared.harvested?`Run the single check node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json in ${fixtureRoot} exactly once through node ${helperPath} capture ${join(evaluationDirectory,'check-input.json')}, saving check-result.json under ${evaluationDirectory}.`: 'Capture relevant verification once with the helper.'} At delivery write ${join(evaluationDirectory,'finish-input.json')} with cwd, host, run_id, mode, artifact_cwd set to ${fixtureRoot}, truthful coordinator and attempts, inspected verdicts, relevant_checks_complete, acceptance, and checks using the capture reference (never rerun the check at finish). Run node ${helperPath} finish ${join(evaluationDirectory,'finish-input.json')} exactly once, saving exact stdout to ${join(evaluationDirectory,'finish-result.json')}. Report unavailable or failed checks honestly. Do not run npm install or modify node_modules.`;
 const scopeException=prepared.harvested?{route_class:startInput.task_class,host,reason:'Evaluation-only applicability to a harvested TypeScript fixture; no route qualification.'}:null;
 const scopeText=scopeException?`Evaluation-only scope exception: treat the ${scopeException.route_class} low-risk route for this host as applicable to this TypeScript fixture; select its first eligible worker and frontier verifier exactly as compiled; record the exception in the receipt and final answer; do not alter the pack. This selection applies when executing the delegated arm; preserve the explicit direct-execution constraint. Receipt scope is ${startInput.scope}.`:'';
 await writeFile(join(destination,'baseline.json'),JSON.stringify({host,name,...prepared,...identity,before,behaviorBefore},null,2)+'\n');
 if(behaviorBefore&&!behaviorBefore.passed)throw Error('Mechanical behavior baseline failed before dispatch');
 let extra='';
 if(exercise==='fallback')extra='Test constraint: the first advertised-price Claude worker (Haiku) is excluded for this run. Select the next eligible worker and record this policy-induced fallback; do not report a provider outage.';
 if(exercise==='frontier_plan')extra='Workflow acceptance constraint: use complex_implementation and exercise frontier_plan_then_delegate. Before dispatch, inspect the existing modules and settle shared validation/import architecture, module responsibilities and integration checks. The functional requirements are acceptance criteria; you own the implementation plan. Record this as a forced-class workflow exercise, not evidence that every multi-file task needs complex routing.';
 if(exercise==='repair'){
  const inject=join(destination,'inject.cjs');
  const defect='export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);\n';
  await writeFile(inject,`require('node:fs').writeFileSync(${JSON.stringify(join(fixtureRoot,'quantity.mjs'))},${JSON.stringify(defect)});\n`);
  extra=`Acceptance exercise: after the first worker finishes, run node ${inject} exactly once. This deliberately reintroduces the zero-quantity defect. Have the frontier review detect it and send a targeted repair to that original worker/treatment. Record this as test fault injection, not a naturally occurring worker failure. Then verify the final artifact.`;
 }
 const budget=maxModelCalls===null?'':`This evaluation permits at most ${maxModelCalls-1} further model executions including workers, reviewers, retries and repairs. Do not subdelegate within worker packets. Stop with a truthful receipt if that ceiling cannot support completion.`;
 const prompt=`${host==='claude'?'/delegate':'$delegate'} ${task.task}\n${trialModeInstructions(mode)}\n${scopeText}\n${name==='research'?'This is a live-source qualification evaluation only: the published research route covers supplied sources. For this evaluation, one otherwise eligible worker may retrieve only the named official Node.js docs with terminal curl or host web tools, after source access is checked. Preserve all identity, effort, frontier verification and fallback requirements. Record this explicit scope exception; do not alter the pack or treat it as existing qualification.':''}\nAll fixture-relative paths above resolve under ${fixtureRoot}; pass that exact directory in the worker packet. Preserve project instructions and all other project files. Use the installed project skill at ${skillPath}/SKILL.md, including its routing pack and host guide. Coordinator launch configuration: ${host==='claude'?'claude-opus-5':'gpt-5.5'}, effort high; this is harness-observed requested configuration, not proof of served effort. ${extra}\n${budget}\n${learningInstructions}\nEvaluation run ID: ${runId}; exact installed skill-folder SHA256: ${prepared.skill_folder_sha256}. Preserve this run ID in local learning records and receipts and set origin:"qualification_evaluation" on helper start so this trial cannot train personal routing. Use the inherited DELEGATE_STATE_HOME=${stateDirectory}; do not write personal learning state elsewhere. Host version evidence: ${JSON.stringify(identity.host_version)}. Record direct outcomes too. Save any receipt JSON under ${join(directory,'.delegate/runs')}; starting_artifact_digest is ${identity.starting_artifact_digest}. A brief final answer is sufficient; include actual verification and any unavailable observations.`+(traceBoundInspection?`\nFor trace-bound renewal acceptance, after the final edit inspect each owned artifact individually: ${task.owned_files.map(file=>join(fixtureRoot,file)).join(', ')}. Use a separate Read with its absolute file_path or a separate Bash command cat followed by that exact absolute path. Do not combine the inspection with directory changes, wildcards, echo, printf, or edits. Inspect all final bytes before finish and preserve the tool results; this binds the maintainer review to each saved artifact.`:'');
 const duration=timeoutMs??(name==='fullproject'?480000:name==='ui'||name==='hardbug'||exercise==='frontier_plan'?360000:240000);
 const maxBudgetUsd=host==='claude'?Math.max(5,Math.round((5+(duration-240000)*7/360000)*100)/100):null;
 const args=host==='codex'
  ? ['exec','--ignore-user-config','--ignore-rules','--skip-git-repo-check','-C',directory,'-s','workspace-write','-m','gpt-5.5','-c','model_reasoning_effort="high"','--json',...(name==='research'?['-c','sandbox_workspace_write.network_access=true']:[]),'-']
  : ['-p','--model','claude-opus-5','--effort','high','--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources','project','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--allowedTools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--max-budget-usd',String(maxBudgetUsd),'--forward-subagent-text'];
 const manifest={...identity,host,name,directory,destination,evaluation_directory:evaluationDirectory,scope_exception:scopeException,max_budget_usd:maxBudgetUsd,max_model_calls:maxModelCalls,timeout_ms:duration,qualification_authority:false,args,prompt,environment:environment?.identity??null,environment_override_names:environment?.overrideNames??[]};
 await writeFile(join(destination,'run-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 if(dryRun)return {prompt,args,manifest,prepared,destination};
 const {execute}=await import('./host-evidence.mjs');
 const execution=await execute('env',[`DELEGATE_STATE_HOME=${stateDirectory}`,host,...args],directory,prompt,join(destination,'coordinator'),duration,environment?{env:environment.env}:{});
 const after=await gradePreparedTrial(prepared);
 const behaviorAfter=name==='mechanical'?await gradeCase(name,fixtureRoot,{behaviorOnly:true}):null;
 const artifactDigests={};
 for(const file of prepared.task.owned_files){
  try{const bytes=await readFile(join(fixtureRoot,file));artifactDigests[file]='sha256:'+hash(bytes);const target=join(destination,'artifacts',file);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes,{flag:'wx'});}
  catch(error){if(error.code!=='ENOENT')throw error;}
 }

 const instructionDigestsAfter=Object.fromEntries(await Promise.all(['AGENTS.md','CLAUDE.md'].map(async file=>[file,hash(await readFile(join(directory,file)))])));
 const receipts=await harvestTrialReceipts(directory,stateDirectory,host,runId);
 const preservedReceipts=new Set();
 for(const receipt of receipts.filter(entry=>entry.value&&!entry.error)){
  const bytes=await readFile(join(directory,receipt.file));
  if(hash(bytes)!==receipt.sha256)throw Error('RECEIPT_CHANGED_DURING_CAPTURE');
  receipt.artifact=`receipts/${receipt.sha256}.json`;
  if(!preservedReceipts.has(receipt.sha256)){await mkdir(join(destination,'receipts'),{recursive:true});await writeFile(join(destination,receipt.artifact),bytes,{flag:'wx'});preservedReceipts.add(receipt.sha256);}
 }

 const learningChecks={};
 for(const file of (prepared.instruction_variant==='current'?['start-result.json','check-result.json','finish-result.json']:['start-result.json','reminder-result.json','reminder-repeat-result.json','advice-result.json','status-result.json'])){try{const raw=await readFile(join(evaluationDirectory,file),'utf8');learningChecks[file]={sha256:hash(raw),value:JSON.parse(raw)};}catch(error){learningChecks[file]={error:error.code??error.message};}}
 const source=await readFile(join(skillSource,'routing-pack.json'));
 const copied=await readFile(join(skillPath,'routing-pack.json'));
 const events=await readFile(join(destination,'coordinator/stdout.jsonl'),'utf8');
 const {parseNativeTelemetry}=await import('../../dist/runtime/telemetry.js');
 const telemetry=parseNativeTelemetry(host==='claude'?'anthropic':'openai',events,host==='claude'?'claude-opus-5':'gpt-5.5');
 const stderr=await readFile(join(destination,'coordinator/stderr.log'),'utf8');
 const result={...manifest,artifact_digests:artifactDigests,thread_id:host==='codex'?telemetry.session_id:null,session_id:telemetry.session_id,telemetry,identity_status:telemetry.identity_status,observed_model_ids:telemetry.observed_model_ids,receipt_observed_fields:'agent_asserted',host,name,directory,fixture_directory:fixtureRoot,destination,exercise,pack_sha256:prepared.skillDigests['routing-pack.json'],source_pack_sha256_after:hash(source),copied_pack_sha256:hash(copied),skill_folder_sha256:prepared.skill_folder_sha256,skill_folder_digest:prepared.skill_folder_digest,copied_skill_folder_sha256_after:hash(JSON.stringify(await folderDigests(skillPath))),copied_skill_folder_digest_after:await folderDigest(skillPath),instruction_digests:instructionDigests,instruction_digests_after:instructionDigestsAfter,instructions_unchanged:JSON.stringify(instructionDigests)===JSON.stringify(instructionDigestsAfter),before,behaviorBefore,execution,after,behaviorAfter,receipts,learning_checks:learningChecks,
  // Traces require human review: these markers alone are not proof of dispatch or acceptance.
  trace_markers:{agent:events.includes('spawn_agent')||events.includes('"name":"Agent"'),child_cli:events.includes('codex exec')||events.includes('claude -p')},
  acceptance:classifyTrial({host,stdout:events,stderr,telemetry,fixtureRoot,before,after})};
 try{const {executionLedger}=await import('./trace-ledger.mjs');result.ledger=executionLedger(host,await readFile(join(destination,'coordinator/stdout.timed.jsonl'),'utf8'),{fixtureRoot,allowedPaths:task.owned_files,receipts,startedAt:execution.started_at,endedAt:execution.completed_at});}catch(error){result.ledger_error=error.message;}
 await writeFile(join(destination,'result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({run_id:runId,host,name,mode,destination,directory,code:execution.code,timeout:execution.timed_out,grader_pass:after.passed,receipts:receipts.length,trace_markers:result.trace_markers}));
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [host,name,exercise]=process.argv.slice(2);if(!['claude','codex'].includes(host)||!installedCaseNames.includes(name))throw new Error('Usage: installed-delegate.mjs claude|codex case [fallback|repair]');
 await installedTrial(host,name,{exercise:exercise??null});
}
