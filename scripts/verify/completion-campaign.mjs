import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {reserveBudget,settleBudget,readBudget} from './campaign-budget.mjs';
import {sanitizedChildEnvironment,runPairs} from './direct-vs-delegated.mjs';
import {installedTrial,classifyTrial} from './installed-delegate.mjs';

const root=resolve(import.meta.dirname,'../..');
export const completionRoot=join(root,'artifacts/delegate-completion-2026-09-11');
export const budgetFile=join(completionRoot,'budget.json');
const hash=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex');
const save=(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});

export async function capacityPreflight(host){
 if(!['claude','codex'].includes(host))throw Error('INVALID_HOST');
 const prior=(await readBudget(budgetFile)).entries.filter(e=>e.purpose==='capacity_preflight'&&e.host===host);
 if(prior.length>=2)throw Error('PREFLIGHT_RETRY_CAP');
 const id=`m4-preflight-${host}-${prior.length+1}`,timestamp=new Date().toISOString().replaceAll(':','-');
 const destination=join(root,'artifacts/direct-vs-delegated',`preflight-${host}-${timestamp}`);
 await mkdir(destination);const directory=await mkdtemp(join(tmpdir(),`delegate-preflight-${host}-`));
 const native=await import('../../dist/runtime/native.js');
 const environment=sanitizedChildEnvironment(native,host);
 const {executeFrontier}=await import('./frontier-host.mjs');
 const target={host,provider:host==='claude'?'anthropic':'openai',model_id:host==='claude'?'claude-opus-5':'gpt-5.5',effort:'low'};
 await save(join(destination,'preflight-plan.json'),{id,target,purpose:'capacity_preflight',qualification_authority:false,environment:environment.identity,environment_override_names:environment.overrideNames});
 await reserveBudget(budgetFile,{id,host,purpose:'capacity_preflight',worstCase:1});
 let actual;
 try{actual=await executeFrontier({target,directory,destination,environment,timeoutMs:90000,prompt:'Reply OK. Do not use tools, delegate, start child processes, or modify files.'});}
 catch(error){const source=join(destination,'unresolved.json');await save(source,{error:String(error),uncertain:true});await settleBudget(budgetFile,id,{source,uncertain:true});throw error;}
 const acceptance=classifyTrial({host,stdout:actual.stdout,stderr:actual.stderr,telemetry:actual.telemetry});
 const passed=actual.summary.code===0&&!actual.summary.timed_out&&!actual.telemetry.provider_error&&/^OK[.!]?\s*$/i.test((actual.telemetry.result_text??'').trim());
 const result={id,host,purpose:'capacity_preflight',qualification_authority:false,passed,acceptance,executions:1,destination,summary:actual.summary,telemetry:actual.telemetry,host_version:actual.host_version,stdout_digest:hash(actual.stdout),environment:environment.identity,environment_override_names:environment.overrideNames};
 // The frontier helper's summary is raw execution output; preserve it and add the required purpose separately.
 const rawSummary=await readFile(join(destination,'summary.json'),'utf8');
 await save(join(destination,'execution-summary.json'),JSON.parse(rawSummary));
 await writeFile(join(destination,'summary.json'),JSON.stringify({...JSON.parse(rawSummary),purpose:'capacity_preflight',qualification_authority:false},null,2)+'\n');
 await save(join(destination,'result.json'),result);
 await settleBudget(budgetFile,id,{executions:1,source:join(destination,'result.json'),providerLimit:acceptance==='blocked_provider_limit'});
 await save(join(completionRoot,`${id}.json`),result);return result;
}

export async function requireCapacity(host){
 const budget=await readBudget(budgetFile);
 if(budget.halted)throw Error('BUDGET_HALTED');
 if(budget.stopped_hosts.includes(host))throw Error('HOST_STOPPED');
 const checks=budget.entries.filter(e=>e.purpose==='capacity_preflight'&&e.host===host);
 const latest=checks.at(-1);
 if(!latest||latest.status!=='completed'||!(JSON.parse(await readFile(latest.source,'utf8'))).passed)throw Error('CAPACITY_PREFLIGHT_REQUIRED');
}

export async function pendingTrial(host,name){
 await requireCapacity(host);
 if(!['research','tinybug'].includes(name)||(name==='tinybug'&&host!=='codex'))throw Error('INVALID_PENDING_ROW');
 const mode=name==='tinybug'?'direct':'delegated',cap=mode==='direct'?1:3,id=`m4-pending-${host}-${name}`;
 await reserveBudget(budgetFile,{id,host,purpose:'pending_row',worstCase:cap});
 let result;
 try{result=await installedTrial(host,name,{mode,runId:id,timeoutMs:600000,maxModelCalls:cap,outputDirectory:join(completionRoot,id)});}
 catch(error){const source=join(completionRoot,`${id}-unresolved.json`);await save(source,{error:String(error),uncertain:true});await settleBudget(budgetFile,id,{source,uncertain:true});throw error;}
 const ledger=result.ledger,uncertain=!ledger||ledger.limitations?.some(s=>/count may be incomplete/.test(s));
 const executions=uncertain?Math.max(cap,ledger?.reported_execution_lower_bound??0,ledger?.executions??0):ledger.executions;
 await settleBudget(budgetFile,id,{executions,source:join(result.destination,'result.json'),providerLimit:result.acceptance==='blocked_provider_limit',uncertain});
 if(name==='research'&&result.receipts.some(r=>r.run_binding==='matched'&&(r.value.research_kind!=='live_web'||r.value.origin!=='qualification_evaluation')))throw Error('RESEARCH_RECEIPT_SCOPE_MISMATCH');
 return result;
}

export async function matchedPair(host,index,{legacy=false}={}){
 await requireCapacity(host);
 const fixtures=['foreman-t920-derived-gate-id','foreman-t897-reconnect-notice'];
 if(!fixtures[index])throw Error('INVALID_PAIR_INDEX');
 const source=legacy?join(completionRoot,'before/skills/delegate'):join(root,'skills/delegate');
 const freezePath=join(completionRoot,'folder-freeze.json');let freeze;
 try{freeze=JSON.parse(await readFile(freezePath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;const {folderDigest}=await import('../../skills/delegate/scripts/local-learning.mjs');freeze={skill_folder_digest:await folderDigest(join(root,'skills/delegate')),recorded_at:new Date().toISOString()};await save(freezePath,freeze);}
 const tag=legacy?'before':'current';
 return runPairs({hosts:[host],fixtures:[fixtures[index]],fixtureIndexOffset:index,skillSource:source,expectedSkillDigest:legacy?null:freeze.skill_folder_digest,outputDirectory:join(completionRoot,`${tag}-${host}-${index+1}`),campaignId:`m4-${tag}`,dryRun:false,approvedExecutions:5,budgetFile});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{action:{type:'string'},host:{type:'string'},name:{type:'string'},index:{type:'string'},legacy:{type:'boolean'}}});
 const result=values.action==='preflight'?await capacityPreflight(values.host):values.action==='pending'?await pendingTrial(values.host,values.name):values.action==='pair'?await matchedPair(values.host,Number(values.index),{legacy:values.legacy??false}):(()=>{throw Error('ACTION_REQUIRED');})();
 console.log(JSON.stringify({action:values.action,host:values.host,destination:result.destination,acceptance:result.acceptance,passed:result.passed,budget:await readBudget(budgetFile)}));
}
