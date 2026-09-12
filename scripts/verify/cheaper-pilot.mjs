// Opt-in maintainer pilot. Existing evidence and comparison workflows remain immutable.
import {readFile,writeFile,mkdir,rm,readdir,cp,mkdtemp} from 'node:fs/promises';
import {join,resolve,dirname,relative} from 'node:path';
import {homedir,tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {pathToFileURL} from 'node:url';
import {prepareInstalledTrial,gradePreparedTrial,folderDigests} from './installed-delegate.mjs';
import {execute} from './host-evidence.mjs';
import {createCase,gradeCase} from './portable-cases.mjs';
import {executionLedger} from './trace-ledger.mjs';
import {sourceDigest} from './cheaper-completion.mjs';
import {reserveBudget,settleBudget,countNativeExecutions} from './campaign-budget.mjs';
import {sanitizedChildEnvironment} from './direct-vs-delegated.mjs';
import {folderDigest,artifactDigest} from '../../skills/delegate/scripts/local-learning.mjs';
const root=resolve(import.meta.dirname,'../..');
const save=(p,v)=>writeFile(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
export const hash=v=>'sha256:'+createHash('sha256').update(v).digest('hex');
export const targets={codex:{candidate:'gpt-5.6-terra',baseline:'gpt-6-astra',review:'gpt-6-astra'},claude:{candidate:'claude-sonnet-5',baseline:'claude-fable-5-1',review:'claude-fable-5-1'}};
const cases=['mechanical','bug','multicomponent','planning','research','pdf'];
const policy='Current signed policy, 2026-09-11: only null or absent quantities default to one; explicit zero is valid. Validation must occur once in the shared normalization function. Consumers must not add their own defaults.\n';
const old='Archived proposal, 2026-08-01: treat zero as missing and add defaults in each consumer. This proposal was never adopted.\n';
export async function preparePilot(host,name,arm,{installed=false}={}){
 if(!targets[host]||!cases.includes(name)||!['candidate','baseline'].includes(arm))throw Error('INVALID_PILOT_SELECTION');
 const harvested=name==='bug'?{fixtureId:'foreman-t897-reconnect-notice',sourceRepository:'/Users/gregpro/foreman',dependencyDirectory:join(root,'artifacts/direct-vs-delegated/deps-b962c1ac/node_modules')}:null;
 const prepared=await prepareInstalledTrial(host,['planning','research','pdf'].includes(name)?'backend':name==='bug'?'tinybug':name,{mode:'auto',harvested});
 // No agent request or skill name in candidate task prompts or project instructions.
 const instructions='Disposable acceptance workspace. Follow applicable installed skills and existing user restrictions. Work only on the supplied task and owned artifacts. Owned-file limits apply to deliverables; local check and observation evidence may be saved under .delegate/ in this session workspace, outside protected source trees. Use this session workspace as cwd for evidence and artifact paths; task source paths may be nested below it. Do not access external graders, unrelated projects, credentials, network, or change configuration. Use no child model CLI processes; native host tools remain available. Do not install dependencies. Preserve these instructions.\n';
 const pointer=installed?'':`Prefer this workspace skill over a personal copy with the same name: ${prepared.skillPath}/SKILL.md.\n`;
 await mkdir(join(prepared.directory,'.delegate'),{recursive:true});
 await save(join(prepared.directory,'.delegate/session.json'),{host,cwd:prepared.directory,artifact_files:prepared.task.owned_files.map(f=>relative(prepared.directory,join(prepared.fixtureRoot,f))),model:targets[host][arm],effort:arm==='candidate'?'medium':'high',source:'harness launch configuration; served identity requires native trace'});
 for(const file of ['AGENTS.md','CLAUDE.md'])await writeFile(join(prepared.directory,file),instructions+pointer+'Session launch metadata is in .delegate/session.json; use its cwd and artifact_files unchanged for evidence and final artifact hashes, and its configured identity instead of generic model self-description.\n');
 if(name==='planning'){
  await rm(join(prepared.fixtureRoot,'paginate.mjs'));
  await writeFile(join(prepared.fixtureRoot,'current-policy.md'),policy);
  await writeFile(join(prepared.fixtureRoot,'archived-proposal.md'),old);
  await writeFile(join(prepared.fixtureRoot,'incident.json'),JSON.stringify({input:[{quantity:0},{quantity:2},{}],observed_total:4,consumer_count:3})+'\n');
  prepared.task={name,owned_files:['decision.json'],task:'Investigate the inconsistent quantity total using current-policy.md, archived-proposal.md and incident.json. Produce decision.json with expected_total, authoritative_source, rejected_source, cause, implementation_plan (array), and checks (array). Resolve the conflicting documents, explain the correction and where it belongs, and give regression cases covering explicit zero, null, absent and multiple consumers. Do not change source documents or implement code.'};
 }
 if(name==='research'){
  await writeFile(join(prepared.fixtureRoot,'current-policy.md'),policy);
  await writeFile(join(prepared.fixtureRoot,'archived-proposal.md'),old);
  prepared.task={name,owned_files:['findings.json'],task:'Compare current-policy.md and archived-proposal.md. Write findings.json with authoritative_source, superseded_source, zero_is_valid (boolean), default_quantity (number), and unresolved_facts (array). authoritative_source identifies the adopted policy; superseded_source identifies the superseded proposal. Both source fields must contain exact bare filenames, with no explanatory text. Report only what the supplied sources establish; do not propose implementation or a plan. Do not modify the sources.'};
 }
 if(name==='pdf'){
  await writeFile(join(prepared.fixtureRoot,'invoice.pdf'),invoicePdf());
  prepared.task={name,owned_files:['analysis.json'],task:'Read invoice.pdf and write analysis.json containing vendor, invoice_id, subtotal, credit, total_due, currency, and source_page (number). Verify the arithmetic and cite the page containing the amounts. Do not modify the PDF or propose changes to any system.'};
 }
 if(installed){await rm(prepared.skillPath,{recursive:true});prepared.skillPath=join(homedir(),host==='claude'?'.claude/skills/delegate':'.agents/skills/delegate');}
 await writeFile(join(prepared.directory,'.delegate/session.json'),JSON.stringify({host,cwd:prepared.directory,artifact_files:prepared.task.owned_files.map(f=>relative(prepared.directory,join(prepared.fixtureRoot,f))),model:targets[host][arm],effort:arm==='candidate'?'medium':'high',source:'Harness launch configuration; served identity requires native trace'})+'\n');
 prepared.pilot_name=name;prepared.pilot_arm=arm;prepared.installed=installed;
 prepared.skill_folder_digest=await folderDigest(prepared.skillPath);
 prepared.instructionDigests=Object.fromEntries(await Promise.all(['AGENTS.md','CLAUDE.md'].map(async f=>[f,hash(await readFile(join(prepared.directory,f)))])));
 prepared.inputs=await ownedInputs(prepared);
 return prepared;
}
async function ownedInputs(p){
 const files=p.pilot_name==='planning'?['current-policy.md','archived-proposal.md','incident.json']:p.pilot_name==='research'?['current-policy.md','archived-proposal.md']:p.pilot_name==='pdf'?['invoice.pdf']:p.task.owned_files;
 return Object.fromEntries(await Promise.all(files.map(async f=>[f,hash(await readFile(join(p.fixtureRoot,f)))])));
}
export async function gradePilot(p){
 if(['research','pdf'].includes(p.pilot_name)){
  try{const d=JSON.parse(await readFile(join(p.fixtureRoot,p.task.owned_files[0]),'utf8'));
   const checks=p.pilot_name==='research'?{authority:d.authoritative_source==='current-policy.md',superseded:d.superseded_source==='archived-proposal.md',zero:d.zero_is_valid===true,default:d.default_quantity===1,uncertainty:Array.isArray(d.unresolved_facts)}:{vendor:d.vendor==='Northwind Supplies',identity:d.invoice_id==='INV-204',subtotal:d.subtotal===120,credit:d.credit===20,total:d.total_due===100,currency:d.currency==='USD',page:d.source_page===1};
   checks.sources_unchanged=JSON.stringify(await ownedInputs(p))===JSON.stringify(p.inputs);return {passed:Object.values(checks).every(Boolean),checks};
  }catch(e){return {passed:false,error:e.message};}
 }
 if(p.pilot_name!=='planning')return gradePreparedTrial(p);
 try{
 const d=JSON.parse(await readFile(join(p.fixtureRoot,'decision.json'),'utf8'));
 const text=JSON.stringify(d).toLowerCase();
 const checks={total:d.expected_total===3,authority:typeof d.authoritative_source==='string'&&/^current-policy\.md(?:$|\s|:)/.test(d.authoritative_source),conflict:typeof d.rejected_source==='string'&&/^archived-proposal\.md(?:$|\s|:)/.test(d.rejected_source),cause:typeof d.cause==='string'&&d.cause.length>20,plan:Array.isArray(d.implementation_plan)&&d.implementation_plan.length>=2&&/shared|normaliz/.test(JSON.stringify(d.implementation_plan).toLowerCase()),regressions:Array.isArray(d.checks)&&['zero','null','absent','consumer'].every(s=>JSON.stringify(d.checks).toLowerCase().includes(s)),sources:JSON.stringify(await ownedInputs(p))===JSON.stringify(p.inputs)};
 return {passed:Object.values(checks).every(Boolean),checks,limitation:'Rubric checks structure, authority and required cases; maintainer inspection verifies causal correctness.'};
 }catch(e){return {passed:false,error:e.message};}
}
export function launchArgs(host,arm,directory,{installed=false,review=false}={}){
 const model=targets[host][review?'review':arm],effort=arm==='candidate'&&!review?'medium':'high';
 if(host==='codex')return ['exec',...(installed?[]:['--ignore-user-config']), '--skip-git-repo-check','-C',directory,'-s',review?'read-only':'workspace-write',...(installed&&!review?[]:['-m',model,'-c',`model_reasoning_effort="${effort}"`]),'-c','agents.max_concurrent_threads_per_session=2','--json','-'];
 const toolList=review?'Read,Bash,Glob,Grep':'Read,Edit,Write,Bash,Glob,Grep,Agent,Skill';
 return ['-p',...(installed&&!review?[]:['--model',model,'--effort',effort]),'--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources',installed?'user,project':'project','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools',toolList,'--allowedTools',toolList,'--max-budget-usd','12','--forward-subagent-text'];
}
// Inspect native provider events only; quoted source/tool output is not a provider error.
export function providerLimited(events){
 return events.some(e=>(e.type==='rate_limit_event'&&e.rate_limit_info?.status==='rejected')||(['error','turn.failed'].includes(e.type)&&/limit|quota/i.test(JSON.stringify(e.error??e.message??''))));
}
export function pilotLedger(host,timed,options){
 const envelopes=timed.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
 const normalized=envelopes.map(e=>{const v=JSON.parse(e.line);if(host==='claude')for(const c of v.message?.content??[])if(c.type==='tool_use'&&c.name==='Task')c.name='Agent';return JSON.stringify({...e,line:JSON.stringify(v)});}).join('\n');
 const ledger=executionLedger(host,normalized,options),continuations=[];
 for(const e of envelopes){const v=JSON.parse(e.line),i=v.item;
  if(host==='codex'&&v.type==='item.completed'&&i?.type==='collab_tool_call'&&['send_input','followup_task'].includes(i.tool))continuations.push({id:i.id,mechanism:'native_continuation',receiver_thread_ids:i.receiver_thread_ids??[],started_at:e.at,ended_at:options.endedAt,model:null,model_source:'unknown',usage:null,role:'continuation'});
 }
 ledger.rows.push(...continuations.map((r,i)=>({...r,index:ledger.rows.length+i})));ledger.executions=ledger.rows.length;ledger.reported_execution_lower_bound=Math.max(ledger.reported_execution_lower_bound,ledger.executions);
 return ledger;
}
export const nativeThreadIds=(threadId,ledger)=>[...new Set([threadId,...ledger.rows.flatMap(r=>r.receiver_thread_ids??[])])];
export function pilotPrompt(p,taskId,cap){
 const limits=`Task identifier: ${taskId}. This bounded run permits ${cap} total model executions, including continuations and retries. If completion requires more, stop and report what remains.`;
 let task=p.task.task;
 if(p.pilot_name==='bug'){
  const restriction='Do not install dependencies, edit configuration or create files.';
  if(!task.includes(restriction))throw Error('BUG_PROMPT_RESTRICTION_CHANGED');
  task=task.replace(restriction,'Do not install dependencies, edit configuration or create deliverable files. Local check and completion evidence may be created only in the designated session evidence directory outside the deliverable tree.');
 }
 return task+`\nAll task-relative paths are under ${relative(p.directory,p.fixtureRoot)||'.'}. `+(p.pilot_arm==='baseline'?'Complete this task directly. Do not launch additional agents. ':'')+limits;
}
export async function runPilot({host,name,arm,id,budgetFile,installed=false,maxExecutions=null,taskId=id}){
 if(typeof taskId!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(taskId)||typeof id!=='string'||! /^[A-Za-z0-9_-]{1,100}$/.test(id)||typeof budgetFile!=='string'||!budgetFile)throw Error('INVALID_PILOT_ID_OR_BUDGET');
 const p=await preparePilot(host,name,arm,{installed});
 const destination=join(root,'artifacts/cheaper-coordination',id);await mkdir(destination);
 const native=await import('../../dist/runtime/native.js');
 const environment=sanitizedChildEnvironment(native,host);
 const state=join(p.directory,'.delegate/state');
 const cap=maxExecutions??(arm==='baseline'?1:name==='planning'?4:3);
 const prompt=pilotPrompt(p,taskId,cap);
 const args=launchArgs(host,arm,p.directory,{installed});
 const before=await gradePilot(p);if(before.result?.checks?.some(c=>['scope','grader_integrity'].includes(c.check_id)&&!c.passed))throw Error('PREPARED_SCOPE_OR_GRADER_INVALID');
 const version=spawnSync(host,['--version'],{encoding:'utf8',env:environment.env});
 const manifest={schema_version:'cheaper_pilot.v1',source_digest:await sourceDigest(root),host,name,arm,id,task_id:taskId,prepared:p,prompt,args,before,host_version:version.stdout.trim(),configured_model:installed?null:targets[host][arm],skill_digest:p.skill_folder_digest,max_executions:cap,qualification_authority:false,environment_override_names:environment.overrideNames};
 await save(join(destination,'manifest.json'),manifest);
 await reserveBudget(budgetFile,{id,purpose:installed?'installed_smoke':'cheaper_matched_arm',host,worstCase:cap});
 let execution;
 try{execution=await execute(host,args,p.directory,prompt,join(destination,'coordinator'),600000,{env:{...environment.env,DELEGATE_STATE_HOME:state}});}catch(e){await settleBudget(budgetFile,id,{source:join(destination,'manifest.json'),uncertain:true});throw e;}
 const stdout=await readFile(join(destination,'coordinator/stdout.jsonl'),'utf8'),stderr=await readFile(join(destination,'coordinator/stderr.log'),'utf8');
 const ledger=pilotLedger(host,await readFile(join(destination,'coordinator/stdout.timed.jsonl'),'utf8'),{fixtureRoot:p.fixtureRoot,allowedPaths:p.task.owned_files,startedAt:execution.started_at,endedAt:execution.completed_at});
 const events=stdout.split('\n').flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}});
 const threadId=events.find(e=>e.type==='thread.started')?.thread_id;
 const nativeEvidence=await snapshotNativeEvidence(host,threadId,ledger,destination);
 const nativeCount=host==='codex'&&nativeEvidence.length?await countNativeExecutions(nativeEvidence).catch(()=>({executions:cap,uncertain:true})):null;
 const providerLimit=providerLimited(events);
 const uncertain=nativeCount?.uncertain===true||ledger.limitations.some(s=>/count may be incomplete/.test(s));
 const count=Math.max(nativeCount?.executions??0,ledger.executions,ledger.reported_execution_lower_bound??0);ledger.native_execution_count=nativeCount;
 await settleBudget(budgetFile,id,{executions:count,source:join(destination,'coordinator/summary.json'),providerLimit,uncertain});
 const after=await gradePilot(p);
 const unchangedInstructions=(await Promise.all(Object.entries(p.instructionDigests).map(async([f,h])=>hash(await readFile(join(p.directory,f)))===h))).every(Boolean);
 const skillUnchanged=await folderDigest(p.skillPath)===p.skill_folder_digest;
 const observations=[];
 const walk=async d=>{try{for(const e of await readdir(d,{withFileTypes:true})){const file=join(d,e.name);if(e.isDirectory())await walk(file);else if(e.name.endsWith('.json')){const v=JSON.parse(await readFile(file,'utf8'));if(v.kind==='observation')observations.push(v);}}}catch(e){if(e.code!=='ENOENT')throw e;}};await walk(state);await walk(join(p.directory,'.delegate-state'));
 await mkdir(join(destination,'artifacts'));for(const f of p.task.owned_files){try{const out=join(destination,'artifacts',relative(p.directory,join(p.fixtureRoot,f)));await mkdir(dirname(out),{recursive:true});await cp(join(p.fixtureRoot,f),out);}catch(e){if(e.code!=='ENOENT')throw e;}}
 const evidenceFiles={};
 for(const observation of observations){const d=observation.data,pi=d.policy_input??{};for(const ref of [...(d.check_evidence??[]),...(d.execution_evidence??[]),...(pi.decision_evidence?[pi.decision_evidence]:[]),...Object.values(pi.hard_bug_handoff??{})]){
  const original=resolve(p.directory,ref.path),rel=relative(p.directory,original);if(rel.startsWith('../')||rel==='..'||!rel)throw Error('EVIDENCE_PATH_INVALID');
  const bytes=await readFile(original);if(hash(bytes)!==ref.digest)throw Error('EVIDENCE_HASH_MISMATCH');const out=join(destination,'evidence',rel);await mkdir(dirname(out),{recursive:true});await writeFile(out,bytes);evidenceFiles[rel]=hash(bytes);
 }}
 const artifact=await artifactDigest(p.directory,pilotArtifactFiles(p)).catch(()=>null);
 const result={...manifest,artifact,evidence_files:evidenceFiles,execution,ledger,native_evidence:nativeEvidence,thread_id:threadId??null,after,observations,instructions_unchanged:unchangedInstructions,skill_unchanged:skillUnchanged,provider_limit:providerLimit,accounting_uncertain:uncertain,acceptance:'unreviewed',cost:{value:execution.client_estimated_cost_usd,kind:execution.client_estimated_cost_usd===null?'unknown':'native_api_equivalent_estimate',subscription_savings_claim:false}};
 await save(join(destination,'result.json'),result);
 return {id,destination,exit_code:execution.code,grade:after.passed??after.result?.passed,executions:count,providerLimit,uncertain};
}
export async function runExercise({host,exercise,id,budgetFile,sourceRun=null}){
 if(!targets[host]||!['simple_audit','seeded_defect'].includes(exercise)||!/^[a-z0-9_-]+$/.test(id))throw Error('INVALID_EXERCISE');
 const directory=await mkdtemp(join(tmpdir(),'cheaper-review-')),destination=join(root,'artifacts/cheaper-coordination',id);await mkdir(destination);
 let task;
 if(exercise==='seeded_defect')task=await createCase('tinybug',directory);
 else{const r=JSON.parse(await readFile(sourceRun,'utf8'));task={name:'mechanical',task:r.prepared.task.task,owned_files:r.prepared.task.owned_files};for(const file of task.owned_files)await cp(join(dirname(sourceRun),'artifacts',file),join(directory,file));}
 const before=await artifactDigest(directory,task.owned_files),gradeBefore=await gradeCase(task.name,directory);
 const prompt=`Reviewer packet. Independently inspect the actual files against this requirement: ${task.task} Do not edit or launch agents. Return PASS if correct, otherwise REPAIR with the concrete defect and fix. Verify relevant behavior using local Node checks. Files: ${task.owned_files.join(', ')}. Include terminal JSON {"role":"reviewer","verdict":"PASS" or "REPAIR","artifact_digest":"${before.artifact_digest}"} and concise actionable findings.`;
 const args=launchArgs(host,'candidate',directory,{review:true});
 const native=await import('../../dist/runtime/native.js'),environment=sanitizedChildEnvironment(native,host);
 await save(join(destination,'manifest.json'),{host,exercise,id,source_digest:await sourceDigest(root),args,prompt,directory,artifact:before});
 await reserveBudget(budgetFile,{id,purpose:exercise,host,worstCase:1});
 let execution;try{execution=await execute(host,args,directory,prompt,join(destination,'coordinator'),240000,{env:environment.env});}catch(e){await settleBudget(budgetFile,id,{source:join(destination,'manifest.json'),uncertain:true});throw e;}
 const raw=await readFile(join(destination,'coordinator/stdout.jsonl'),'utf8'),events=raw.split('\n').filter(Boolean).map(l=>JSON.parse(l));
 const ledger=pilotLedger(host,await readFile(join(destination,'coordinator/stdout.timed.jsonl'),'utf8'),{startedAt:execution.started_at,endedAt:execution.completed_at});

 const final=host==='codex'?events.filter(e=>e.item?.type==='agent_message').at(-1)?.item.text:events.filter(e=>e.type==='assistant').at(-1)?.message?.content?.filter(c=>c.type==='text').map(c=>c.text).join('\n');
 const threadId=events.find(e=>e.type==='thread.started')?.thread_id;const nativeEvidence=await snapshotNativeEvidence(host,threadId,ledger,destination);
 const nativeCount=host==='codex'?await countNativeExecutions(nativeEvidence).catch(()=>({executions:1,uncertain:true})):null;
 const count=Math.max(ledger.executions,nativeCount?.executions??0);const uncertain=nativeCount?.uncertain===true||ledger.limitations.some(x=>/count may be incomplete/.test(x));
 await settleBudget(budgetFile,id,{executions:count,source:join(destination,'coordinator/summary.json'),providerLimit:providerLimited(events),uncertain});
 const after=await artifactDigest(directory,task.owned_files);
 await mkdir(join(destination,'artifacts'));for(const file of task.owned_files){await mkdir(dirname(join(destination,'artifacts',file)),{recursive:true});await cp(join(directory,file),join(destination,'artifacts',file));}
 const passed=execution.code===0&&!execution.timed_out&&!uncertain&&count===1&&before.artifact_digest===after.artifact_digest&&(exercise==='simple_audit'?gradeBefore.passed&&/\bPASS\b/.test(final):!gradeBefore.passed&&/\bREPAIR\b/.test(final)&&/zero/i.test(final));
 const result={host,exercise,id,thread_id:threadId??null,native_evidence:nativeEvidence,source_digest:await sourceDigest(root),execution,args,artifact:before,grade:gradeBefore,final,passed,trace:{path:join(destination,'coordinator/stdout.jsonl'),sha256:hash(raw)},qualification_authority:false};
 await save(join(destination,'result.json'),result);return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{host:{type:'string'},case:{type:'string'},arm:{type:'string'},id:{type:'string'},'task-id':{type:'string'},budget:{type:'string'},installed:{type:'boolean'}}});
 console.log(JSON.stringify(await runPilot({host:values.host,name:values.case,arm:values.arm,id:values.id,taskId:values['task-id']??values.id,budgetFile:values.budget,installed:values.installed??false})));
}

export function invoicePdf(){
 const content='BT /F1 16 Tf 40 740 Td (Northwind Supplies) Tj 0 -28 Td (Invoice INV-204) Tj 0 -28 Td (Subtotal: USD 120) Tj 0 -28 Td (Credit: USD 20) Tj 0 -28 Td (Total due: USD 100) Tj ET';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
 let bytes='%PDF-1.4\n';const offsets=[0];for(const [i,obj]of objects.entries()){offsets.push(Buffer.byteLength(bytes));bytes+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
 const xref=Buffer.byteLength(bytes);bytes+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(bytes);
}

export async function snapshotNativeEvidence(host,threadId,ledger,destination){
 // Bind requested models to native rollouts, which public CLI stdout may omit.
 const nativeEvidence=[];
 if(host==='codex'&&threadId){
  const ids=nativeThreadIds(threadId,ledger);
  const found=spawnSync('rg',['--files',join(homedir(),'.codex/sessions')],{encoding:'utf8',maxBuffer:16*1024*1024});
  const paths=(found.stdout??'').split('\n').filter(Boolean),metadata=[];
  const {createReadStream}=await import('node:fs');const {createInterface}=await import('node:readline');
  for(const path of paths){const stream=createReadStream(path),lines=createInterface({input:stream,crlfDelay:Infinity});try{for await(const line of lines){const e=JSON.parse(line);if(e.type==='session_meta')metadata.push({path,...e.payload});break;}}finally{lines.close();stream.destroy();}}
  let changed=true;while(changed){changed=false;for(const m of metadata)if(ids.includes(m.source?.subagent?.thread_spawn?.parent_thread_id)&&!ids.includes(m.id)){ids.push(m.id);changed=true;}}
  for(const tid of ids){const path=metadata.find(m=>m.id===tid)?.path;if(path){
   const bytes=await readFile(path),out=join(destination,`native-${tid}.jsonl`);await writeFile(out,bytes,{flag:'wx'});
   const ev=bytes.toString().split('\n').flatMap(l=>{try{return[JSON.parse(l)];}catch{return[];}}),ctx=ev.find(e=>e.type==='turn_context')?.payload;
   nativeEvidence.push({thread_id:tid,path:out,sha256:hash(bytes),model:ctx?.model??null,effort:ctx?.effort??null});
  }}
 }
 return nativeEvidence;
}

export const pilotArtifactFiles=p=>p.task.owned_files.map(file=>relative(p.directory,join(p.fixtureRoot,file)));
