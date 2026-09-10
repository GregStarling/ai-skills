import {mkdtemp,mkdir,cp,writeFile,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {execute} from './host-evidence.mjs';
import {createCase,gradeCase,caseNames} from './portable-cases.mjs';

const root=resolve(import.meta.dirname,'../..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function installedTrial(host,name,{exercise=null}={}){
 const directory=await mkdtemp(join(tmpdir(),`installed-delegate-${host}-${name}-`));
 const task=await createCase(name,directory);
 const before=await gradeCase(name,directory);
 const skillPath=join(directory,host==='claude'?'.claude/skills/delegate':'.agents/skills/delegate');
 await mkdir(skillPath,{recursive:true});await cp(join(root,'skills/delegate'),skillPath,{recursive:true});
 spawnSync('git',['init','-q'],{cwd:directory});
 const instructions='Disposable local acceptance project. The coordinator uses the installed project delegate skill. Workers and reviewers execute their bounded packets without recursively invoking delegation. Work only on supplied fixture files and local receipts. Do not install dependencies, alter global settings, access unrelated projects, or read external grader files. Native authenticated subagents or child CLI processes are permitted. Keep work orders compact. Use one worker except for an explicit swarm. The eligible frontier coordinator verifies low-risk work itself; do not duplicate frontier reviews. Preserve requested versus observed identity. Stop when the requested behavior is verified.\n';
 await writeFile(join(directory,'AGENTS.md'),instructions);await writeFile(join(directory,'CLAUDE.md'),instructions);
 const destination=join(root,'artifacts/installed-delegate',`${host}-${name}-${Date.now()}`);await mkdir(destination,{recursive:true});
 let extra='';
 if(exercise==='fallback')extra='Test constraint: the first advertised-price Claude worker (Haiku) is excluded for this run. Select the next eligible worker and record this policy-induced fallback; do not report a provider outage.';
 if(exercise==='repair'){
  const inject=join(destination,'inject.cjs');
  const defect='export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);\n';
  await writeFile(inject,`require('node:fs').writeFileSync(${JSON.stringify(join(directory,'quantity.mjs'))},${JSON.stringify(defect)});\n`);
  extra=`Acceptance exercise: after the first worker finishes, run node ${inject} exactly once. This deliberately reintroduces the zero-quantity defect. Have the frontier review detect it and send a targeted repair to that original worker/treatment. Record this as test fault injection, not a naturally occurring worker failure. Then verify the final artifact.`;
 }
 const prompt=`${host==='claude'?'/delegate':'$delegate'} ${task.task}\nUse the installed project skill at ${skillPath}/SKILL.md, including its routing pack and host guide. Coordinator launch configuration: ${host==='claude'?'claude-opus-5':'gpt-5.5'}, effort high; this is harness-observed requested configuration, not proof of served effort. ${extra}\nSave the required local JSON receipt. A brief final answer is sufficient; include actual verification and any unavailable observations.`;
 const args=host==='codex'
  ? ['exec','--ignore-user-config','--ignore-rules','--skip-git-repo-check','-C',directory,'-s','workspace-write','-m','gpt-5.5','-c','model_reasoning_effort="high"','--json','-']
  : ['-p','--model','claude-opus-5','--effort','high','--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources','project','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--allowedTools','Read,Edit,Write,Bash,Glob,Grep,Agent,Skill','--max-budget-usd','5','--forward-subagent-text'];
 const execution=await execute(host,args,directory,prompt,join(destination,'coordinator'),name==='fullproject'?480000:name==='ui'?360000:240000);
 const after=await gradeCase(name,directory);
 const receipts=[];
 try{for(const file of await readdir(join(directory,'.delegate/runs'))){if(file.endsWith('.json')){const raw=await readFile(join(directory,'.delegate/runs',file),'utf8');try{receipts.push({file,value:JSON.parse(raw)});}catch{receipts.push({file,error:'invalid_json'});}}}}catch{}
 const source=await readFile(join(root,'skills/delegate/routing-pack.json'));
 const copied=await readFile(join(skillPath,'routing-pack.json'));
 const events=await readFile(join(destination,'coordinator/stdout.jsonl'),'utf8');
 const result={host,name,directory,destination,exercise,pack_sha256:hash(source),copied_pack_sha256:hash(copied),before,execution,after,receipts,
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
