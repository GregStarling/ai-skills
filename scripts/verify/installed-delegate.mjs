import {mkdtemp,mkdir,cp,writeFile,readFile,readdir,lstat,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative,isAbsolute,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createCase,gradeCase,caseNames} from './portable-cases.mjs';

const root=resolve(import.meta.dirname,'../..');
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
export async function prepareInstalledTrial(host,name,{projectRoot=null,fixtureDirectory=null}={}){
 if(!['claude','codex'].includes(host)||!caseNames.includes(name))throw Error('Unknown host or fixture');
 const directory=projectRoot?await realpath(resolve(projectRoot)):await mkdtemp(join(tmpdir(),`installed-delegate-${host}-${name}-`));
 if(directory===root)throw Error('Library source must remain inert');
 if(fixtureDirectory&&!projectRoot)throw Error('A fixture directory requires an existing project');
 const fixtureRoot=projectRoot?resolve(directory,fixtureDirectory??`.delegate/fixtures/${name}`):directory;
 const inside=relative(directory,fixtureRoot);
 if(projectRoot&&(!inside||inside==='..'||inside.startsWith('../')||isAbsolute(inside)))throw Error('Fixture must be inside the isolated project');
 const skillPath=join(directory,host==='claude'?'.claude/skills/delegate':'.agents/skills/delegate');
 await absent(skillPath);
 const instructions='Disposable local acceptance project. The coordinator uses the installed project delegate skill. Workers and reviewers execute their bounded packets without recursively invoking delegation. Work only on supplied fixture files and local receipts. Do not install dependencies, alter global settings, access unrelated projects, or read external grader files. Native authenticated subagents or child CLI processes are permitted. Keep work orders compact. Use one worker except for an explicit swarm. The eligible frontier coordinator verifies low-risk work itself; do not duplicate frontier reviews. Preserve requested versus observed identity. Stop when the requested behavior is verified.\n';
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
 const task=await createCase(name,fixtureRoot);
 await mkdir(dirname(skillPath),{recursive:true});await cp(join(root,'skills/delegate'),skillPath,{recursive:true,force:false,errorOnExist:true});
 const fixtureDigests=await folderDigests(fixtureRoot),skillDigests=await folderDigests(skillPath);
 return {directory,fixtureRoot,skillPath,task,instructionDigests,fixtureDigests,skillDigests,skill_folder_sha256:hash(JSON.stringify(skillDigests))};
}
export async function installedTrial(host,name,{exercise=null,projectRoot=null,fixtureDirectory=null,outputDirectory=null,maxModelCalls=null}={}){
 if(maxModelCalls!==null&&(!Number.isInteger(maxModelCalls)||maxModelCalls<1))throw Error('Model execution ceiling must be a positive integer');
 const {execute}=await import('./host-evidence.mjs');
 const prepared=await prepareInstalledTrial(host,name,{projectRoot,fixtureDirectory});
 const {directory,fixtureRoot,skillPath,task,instructionDigests}=prepared;
 const before=await gradeCase(name,fixtureRoot);
 const behaviorBefore=name==='mechanical'?await gradeCase(name,fixtureRoot,{behaviorOnly:true}):null;
 const destination=outputDirectory?resolve(outputDirectory):join(root,'artifacts/installed-delegate',`${host}-${name}-${Date.now()}`);await mkdir(destination,{recursive:true});
 await writeFile(join(destination,'baseline.json'),JSON.stringify({host,name,...prepared,before,behaviorBefore},null,2)+'\n');
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
 const prompt=`${host==='claude'?'/delegate':'$delegate'} ${task.task}\nAll fixture-relative paths above resolve under ${fixtureRoot}; pass that exact directory in the worker packet. Preserve project instructions and all other project files. Use the installed project skill at ${skillPath}/SKILL.md, including its routing pack and host guide. Coordinator launch configuration: ${host==='claude'?'claude-opus-5':'gpt-5.5'}, effort high; this is harness-observed requested configuration, not proof of served effort. ${extra}\n${budget}\nSave the required local JSON receipt under ${join(directory,'.delegate/runs')}; starting_artifact_digest is sha256:${hash(JSON.stringify(prepared.fixtureDigests))}. A brief final answer is sufficient; include actual verification and any unavailable observations.`;
 const args=host==='codex'
  ? ['exec','--ignore-user-config','--ignore-rules','--skip-git-repo-check','-C',directory,'-s','workspace-write','-m','gpt-5.5','-c','model_reasoning_effort="high"','--json','-']
  : ['-p','--model','claude-opus-5','--effort','high','--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources','project','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--allowedTools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--max-budget-usd','5','--forward-subagent-text'];
 const execution=await execute(host,args,directory,prompt,join(destination,'coordinator'),name==='fullproject'?480000:name==='ui'||name==='hardbug'||exercise==='frontier_plan'?360000:240000);
 const after=await gradeCase(name,fixtureRoot);
 const behaviorAfter=name==='mechanical'?await gradeCase(name,fixtureRoot,{behaviorOnly:true}):null;
 const instructionDigestsAfter=Object.fromEntries(await Promise.all(['AGENTS.md','CLAUDE.md'].map(async file=>[file,hash(await readFile(join(directory,file)))])));
 const receipts=[];
 try{for(const file of await readdir(join(directory,'.delegate/runs'))){if(file.endsWith('.json')){const raw=await readFile(join(directory,'.delegate/runs',file),'utf8');try{receipts.push({file,value:JSON.parse(raw)});}catch{receipts.push({file,error:'invalid_json'});}}}}catch{}
 const source=await readFile(join(root,'skills/delegate/routing-pack.json'));
 const copied=await readFile(join(skillPath,'routing-pack.json'));
 const events=await readFile(join(destination,'coordinator/stdout.jsonl'),'utf8');
 const result={host,name,directory,fixture_directory:fixtureRoot,destination,exercise,pack_sha256:hash(source),copied_pack_sha256:hash(copied),skill_folder_sha256:prepared.skill_folder_sha256,copied_skill_folder_sha256_after:hash(JSON.stringify(await folderDigests(skillPath))),instruction_digests:instructionDigests,instruction_digests_after:instructionDigestsAfter,instructions_unchanged:JSON.stringify(instructionDigests)===JSON.stringify(instructionDigestsAfter),before,behaviorBefore,execution,after,behaviorAfter,receipts,
  // Traces require human review: these markers alone are not proof of dispatch or acceptance.
  trace_markers:{agent:events.includes('spawn_agent')||events.includes('"name":"Agent"'),child_cli:events.includes('codex exec')||events.includes('claude -p')},
  acceptance:'pending_frontier_trace_review'};
 await writeFile(join(destination,'result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({host,name,destination,directory,code:execution.code,timeout:execution.timed_out,grader_pass:after.passed,receipts:receipts.length,trace_markers:result.trace_markers}));
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [host,name,exercise]=process.argv.slice(2);if(!['claude','codex'].includes(host)||!caseNames.includes(name))throw new Error('Usage: installed-delegate.mjs claude|codex case [fallback|repair]');
 await installedTrial(host,name,{exercise:exercise??null});
}
