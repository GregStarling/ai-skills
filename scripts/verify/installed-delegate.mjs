import {mkdtemp,mkdir,cp,writeFile,readFile,readdir,lstat,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createCase,gradeCase,caseNames} from './portable-cases.mjs';

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
export async function prepareInstalledTrial(host,name,{projectRoot=null,fixtureDirectory=null,temporaryDirectory=tmpdir(),mode='auto'}={}){
 if(!['claude','codex'].includes(host)||!installedCaseNames.includes(name))throw Error('Unknown host or fixture');
 const modeInstructions=trialModeInstructions(mode);
 // Canonicalize disposable roots too: macOS temporary paths may traverse /var -> /private/var.
 const directory=await realpath(projectRoot?resolve(projectRoot):await mkdtemp(join(temporaryDirectory,`installed-delegate-${host}-${name}-`)));
 if(directory===root)throw Error('Library source must remain inert');
 if(fixtureDirectory&&!projectRoot)throw Error('A fixture directory requires an existing project');
 const fixtureRoot=projectRoot?resolve(directory,fixtureDirectory??`.delegate/fixtures/${name}`):directory;
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
 const task=await createInstalledCase(name,fixtureRoot);
 await mkdir(dirname(skillPath),{recursive:true});await cp(join(root,'skills/delegate'),skillPath,{recursive:true,force:false,errorOnExist:true});
 const fixtureDigests=await folderDigests(fixtureRoot),skillDigests=await folderDigests(skillPath);
 return {directory,fixtureRoot,skillPath,task,mode,instructionDigests,fixtureDigests,skillDigests,skill_folder_sha256:hash(JSON.stringify(skillDigests))};
}
export async function harvestTrialReceipts(directory,stateDirectory,host,runId){
 const folders=[join(directory,'.delegate/runs')],receipts=[];
 try {for(const entry of await readdir(stateDirectory,{withFileTypes:true}))if(entry.isDirectory()&&/^[a-f0-9]{64}$/.test(entry.name))folders.push(join(stateDirectory,entry.name,host,'receipts'));}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const folder of folders){
  let names;try{names=await readdir(folder,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')continue;throw error;}
  for(const entry of names.filter(e=>e.isFile()&&e.name.endsWith('.json'))){
   const path=join(folder,entry.name),raw=await readFile(path,'utf8');
   try{const value=JSON.parse(raw);if(!['delegate_receipt.v1','delegate_receipt.v2'].includes(value.schema_version))continue;receipts.push({file:relative(directory,path),sha256:hash(raw),run_binding:value.run_id===runId?'matched':value.run_id==null?'unbound':'mismatch',value});}
   catch{receipts.push({file:relative(directory,path),sha256:hash(raw),error:'invalid_json'});}
  }
 }
 return receipts;
}
export async function installedTrial(host,name,{exercise=null,projectRoot=null,fixtureDirectory=null,outputDirectory=null,maxModelCalls=null,mode='auto',runId=randomUUID(),timeoutMs=null}={}){
 if(mode==='direct'&&(exercise!==null||name==='fullproject'))throw Error('Direct mode conflicts with the requested delegation exercise');
 if(maxModelCalls!==null&&(!Number.isInteger(maxModelCalls)||maxModelCalls<1))throw Error('Model execution ceiling must be a positive integer');
 if(typeof runId!=='string'||! /^[A-Za-z0-9_-]{1,128}$/.test(runId))throw Error('Invalid trial run ID');
 if(timeoutMs!==null&&(!Number.isInteger(timeoutMs)||timeoutMs<1))throw Error('Invalid trial timeout');
 const prepared=await prepareInstalledTrial(host,name,{projectRoot,fixtureDirectory,mode});
 const {directory,fixtureRoot,skillPath,task,instructionDigests}=prepared;
 const before=await gradeInstalledCase(name,fixtureRoot);
 const behaviorBefore=name==='mechanical'?await gradeCase(name,fixtureRoot,{behaviorOnly:true}):null;
 const destination=outputDirectory?resolve(outputDirectory):join(root,'artifacts/installed-delegate',`${host}-${name}-${runId}`);
 // Reusing a result directory risks mixing traces and baselines from different executions.
 await mkdir(dirname(destination),{recursive:true});await mkdir(destination);
 const stateDirectory=join(directory,'.delegate/state');
 const version=spawnSync(host,['--version'],{encoding:'utf8',timeout:10000});
 const identity={host_version:{stdout:version.stdout??'',stderr:version.stderr??'',exit_code:version.status},learning_state_directory:stateDirectory,run_id:runId,mode,qualification_evaluation:true,baseline_path:join(destination,'baseline.json'),coordinator_path:join(destination,'coordinator'),skill_folder_sha256:prepared.skill_folder_sha256,starting_artifact_digest:`sha256:${hash(JSON.stringify(prepared.fixtureDigests))}`};
 const evaluationDirectory=join(directory,'.delegate/evaluation');await mkdir(evaluationDirectory,{recursive:true});
 const helperPath=join(skillPath,'scripts/local-learning.mjs');
 const startInput={cwd:directory,host,host_version:identity.host_version.stdout.trim()||'unavailable',session_id:`evaluation-session-${runId}`,task_id:`evaluation-task-${runId}`,run_id:runId,task_class:({research:'research',tinybug:'mechanical_work',mechanical:'mechanical_work',backend:'bounded_implementation',ui:'ui_implementation',hardbug:'hard_debugging',multicomponent:'complex_implementation',fullproject:'complex_implementation'})[name],risk:'low',scope:`installed-${name}-${mode}`,research_kind:name==='research'?'live_web':null,origin:'qualification_evaluation',baseline_digest:identity.starting_artifact_digest};
 const reminderInput={cwd:directory,host,run_id:runId,reminder:{safe_boundary:true,remaining_work:true,active_workers:false,coupled_investigation:false,rediscovery_required:false,completed_context_dominates:true,next_phase_independent:true,handoff:{objective:'Synthetic reminder acceptance fixture; no extra implementation requested.',constraints:['Qualification evaluation only; do not create or restart a session.'],decisions:['The simulated investigation is complete.'],checkout_state:`Disposable project ${directory}; preserve its verified artifact.`,completed_checks:['Use actual completed task verification in the task receipt.'],evidence_locations:[join(destination,'baseline.json')],next_action:'In the synthetic scenario, implementation can begin from these decisions.',unresolved_risks:['Fixture flags are synthetic, not measured host context or savings.']}}};
 for(const [file,value] of [['start-input.json',startInput],['reminder-input.json',reminderInput],['followup-input.json',{cwd:directory,host,run_id:runId}]])await writeFile(join(evaluationDirectory,file),JSON.stringify(value,null,2)+'\n');
 await writeFile(join(destination,'run-manifest.json'),JSON.stringify({...identity,host,name,directory,destination,evaluation_directory:evaluationDirectory},null,2)+'\n');
 const learningInstructions=`Before task execution, run node ${helperPath} start ${join(evaluationDirectory,'start-input.json')} and save exact stdout to ${join(evaluationDirectory,'start-result.json')}. Use exactly the supplied run_id, task_id and session_id. The returned project and skill identities are helper-computed; do not replace them with harness digest formats. At task completion, record the truthful outcome via the helper. Then, without another model call, run helper advise with reminder-input.json and save reminder-result.json, repeat that command once into reminder-repeat-result.json, run helper advise with followup-input.json into advice-result.json, and run helper status with followup-input.json into status-result.json, all under ${evaluationDirectory}. The reminder input is a controlled qualitative scenario, not real telemetry; do not inflate context or infer real savings. Check that the first reminder suggests a handoff, the repeat is suppressed, advice reads local state and stays at baseline, and status sees the outcome. Report unavailable or failed checks honestly. Do not create a new session or extra model invocation for these checks.`;
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
 const prompt=`${host==='claude'?'/delegate':'$delegate'} ${task.task}\n${trialModeInstructions(mode)}\n${name==='research'?'This is a live-source qualification evaluation only: the published research route covers supplied sources. For this evaluation, one otherwise eligible worker may retrieve only the named official Node.js docs with terminal curl or host web tools, after source access is checked. Preserve all identity, effort, frontier verification and fallback requirements. Record this explicit scope exception; do not alter the pack or treat it as existing qualification.':''}\nAll fixture-relative paths above resolve under ${fixtureRoot}; pass that exact directory in the worker packet. Preserve project instructions and all other project files. Use the installed project skill at ${skillPath}/SKILL.md, including its routing pack and host guide. Coordinator launch configuration: ${host==='claude'?'claude-opus-5':'gpt-5.5'}, effort high; this is harness-observed requested configuration, not proof of served effort. ${extra}\n${budget}\n${learningInstructions}\nEvaluation run ID: ${runId}; exact installed skill-folder SHA256: ${prepared.skill_folder_sha256}. Preserve this run ID in local learning records and receipts and set origin:"qualification_evaluation" on helper start so this trial cannot train personal routing. Use the inherited DELEGATE_STATE_HOME=${stateDirectory}; do not write personal learning state elsewhere. Host version evidence: ${JSON.stringify(identity.host_version)}. Record direct outcomes too. Save any receipt JSON under ${join(directory,'.delegate/runs')}; starting_artifact_digest is sha256:${hash(JSON.stringify(prepared.fixtureDigests))}. A brief final answer is sufficient; include actual verification and any unavailable observations.`;
 const args=host==='codex'
  ? ['exec','--ignore-user-config','--ignore-rules','--skip-git-repo-check','-C',directory,'-s','workspace-write','-m','gpt-5.5','-c','model_reasoning_effort="high"','--json',...(name==='research'?['-c','sandbox_workspace_write.network_access=true']:[]),'-']
  : ['-p','--model','claude-opus-5','--effort','high','--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources','project','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--allowedTools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--max-budget-usd','5','--forward-subagent-text'];
 const {execute}=await import('./host-evidence.mjs');
 const execution=await execute('env',[`DELEGATE_STATE_HOME=${stateDirectory}`,host,...args],directory,prompt,join(destination,'coordinator'),timeoutMs??(name==='fullproject'?480000:name==='ui'||name==='hardbug'||exercise==='frontier_plan'?360000:240000));
 const after=await gradeInstalledCase(name,fixtureRoot);
 const behaviorAfter=name==='mechanical'?await gradeCase(name,fixtureRoot,{behaviorOnly:true}):null;
 const instructionDigestsAfter=Object.fromEntries(await Promise.all(['AGENTS.md','CLAUDE.md'].map(async file=>[file,hash(await readFile(join(directory,file)))])));
 const receipts=await harvestTrialReceipts(directory,stateDirectory,host,runId);
 const learningChecks={};
 for(const file of ['start-result.json','reminder-result.json','reminder-repeat-result.json','advice-result.json','status-result.json']){try{const raw=await readFile(join(evaluationDirectory,file),'utf8');learningChecks[file]={sha256:hash(raw),value:JSON.parse(raw)};}catch(error){learningChecks[file]={error:error.code??error.message};}}
 const source=await readFile(join(root,'skills/delegate/routing-pack.json'));
 const copied=await readFile(join(skillPath,'routing-pack.json'));
 const events=await readFile(join(destination,'coordinator/stdout.jsonl'),'utf8');
 const result={...identity,host,name,directory,fixture_directory:fixtureRoot,destination,exercise,pack_sha256:prepared.skillDigests['routing-pack.json'],source_pack_sha256_after:hash(source),copied_pack_sha256:hash(copied),skill_folder_sha256:prepared.skill_folder_sha256,copied_skill_folder_sha256_after:hash(JSON.stringify(await folderDigests(skillPath))),instruction_digests:instructionDigests,instruction_digests_after:instructionDigestsAfter,instructions_unchanged:JSON.stringify(instructionDigests)===JSON.stringify(instructionDigestsAfter),before,behaviorBefore,execution,after,behaviorAfter,receipts,learning_checks:learningChecks,
  // Traces require human review: these markers alone are not proof of dispatch or acceptance.
  trace_markers:{agent:events.includes('spawn_agent')||events.includes('"name":"Agent"'),child_cli:events.includes('codex exec')||events.includes('claude -p')},
  acceptance:'pending_frontier_trace_review'};
 await writeFile(join(destination,'result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({run_id:runId,host,name,mode,destination,directory,code:execution.code,timeout:execution.timed_out,grader_pass:after.passed,receipts:receipts.length,trace_markers:result.trace_markers}));
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [host,name,exercise]=process.argv.slice(2);if(!['claude','codex'].includes(host)||!installedCaseNames.includes(name))throw new Error('Usage: installed-delegate.mjs claude|codex case [fallback|repair]');
 await installedTrial(host,name,{exercise:exercise??null});
}
