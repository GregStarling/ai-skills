import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {parseArgs} from 'node:util';
import {prepareInstalledTrial,installedTrial} from './installed-delegate.mjs';

const root=resolve(import.meta.dirname,'../..');
const artifacts=join(root,'artifacts/direct-vs-delegated');
const environmentKeys=['HOME','PATH','USER','SHELL','TMPDIR'];
const armCap=mode=>mode==='direct'?1:mode==='delegated'?4:(()=>{throw Error('INVALID_ARM_MODE');})();
const hostCheck=host=>{if(!['claude','codex'].includes(host))throw Error('INVALID_HOST');};
const idCheck=id=>{if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,110}$/.test(id))throw Error('INVALID_PAIR_ID');};
const save=(path,value)=>writeFile(path,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
async function saveTally(path,tally){const temporary=path+'.tmp';await writeFile(temporary,JSON.stringify(tally,null,2)+'\n');await rename(temporary,path);}

export function armOrder(fixtureIndex){
 if(!Number.isSafeInteger(fixtureIndex)||fixtureIndex<0)throw Error('INVALID_FIXTURE_INDEX');
 return fixtureIndex%2===0?['direct','delegated']:['delegated','direct'];
}
export function pairManifest({pairId,host,fixtureIndex,prepared}){
 idCheck(pairId);hostCheck(host);
 const direct=prepared.direct,delegated=prepared.delegated;
 if(!direct?.harvested||!delegated?.harvested)throw Error('HARVESTED_PAIR_REQUIRED');
 if(direct.directory===delegated.directory)throw Error('FRESH_PAIR_PROJECTS_REQUIRED');
 if(direct.harvested.fixtureDigest!==delegated.harvested.fixtureDigest||direct.starting_artifact_digest!==delegated.starting_artifact_digest)throw Error('PAIR_BASELINE_MISMATCH');
 if(direct.skill_folder_digest!==delegated.skill_folder_digest||direct.instruction_variant!==delegated.instruction_variant||JSON.stringify(direct.helper_commands)!==JSON.stringify(delegated.helper_commands))throw Error('PAIR_SKILL_MISMATCH');
 const fixture=direct.harvested.manifest;
 return {schema_version:'direct_vs_delegated_pair.v1',pair_id:pairId,host,fixture_id:fixture.fixture_id,fixture_digest:direct.harvested.fixtureDigest,parent_revision:fixture.parent_revision,grader_revision:fixture.grader_revision,allowed_paths:fixture.allowed_paths,order:armOrder(fixtureIndex),scope:`harvested-${fixture.fixture_id}`,starting_artifact_digest:direct.starting_artifact_digest,skill_folder_digest:direct.skill_folder_digest,instruction_variant:direct.instruction_variant,helper_commands:direct.helper_commands,thread_ids:null,host_version:null,origin:'qualification_evaluation',qualification_authority:false,arms:Object.fromEntries(['direct','delegated'].map(mode=>[mode,{run_id:`${pairId}-${mode}`,directory:prepared[mode].directory,fixture_directory:prepared[mode].fixtureRoot,starting_artifact_digest:prepared[mode].starting_artifact_digest,scope:`harvested-${fixture.fixture_id}`,timeout_ms:600000,max_model_calls:armCap(mode)}]))};
}

/** The native sanitizer removes material overrides; the allowlist also removes nested host/session state. */
export function sanitizedChildEnvironment(native,host,inherited=process.env){
 hostCheck(host);
 const {env:clean,overrideNames}=native.nativeEnvironment(host==='claude'?'anthropic':'openai',{model_id:host==='claude'?'claude-opus-5':'gpt-5.5',effort:'high'},inherited);
 const env=Object.fromEntries(environmentKeys.filter(key=>clean[key]!==undefined).map(key=>[key,clean[key]]));
 assertChildEnvironment(env);
 return {env,identity:native.captureIdentityEnvironment(env),overrideNames:[...new Set([...overrideNames,...Object.keys(inherited).filter(key=>!environmentKeys.includes(key)),...Object.keys(clean).filter(key=>!environmentKeys.includes(key))])].sort()};
}
export function assertChildEnvironment(env){
 if(Object.keys(env).some(key=>!environmentKeys.includes(key)&&key!=='DELEGATE_STATE_HOME'))throw Error('UNSANITIZED_CHILD_ENVIRONMENT');
}

export function createExecutionTally(ceiling){
 if(!Number.isSafeInteger(ceiling)||ceiling<0)throw Error('APPROVED_EXECUTION_COUNT_REQUIRED');
 return {schema_version:'execution_tally.v1',ceiling,executions:0,reserved:0,halted:false,stopped_hosts:[],entries:[],qualification_authority:false};
}
export function reserveExecutions(tally,{host,runId,mode,purpose='matched_arm'}){
 hostCheck(host);
 if(tally.halted||tally.stopped_hosts.includes(host))throw Error('EXECUTION_TALLY_HALTED');
 if(tally.entries.some(e=>e.run_id===runId))throw Error('EXECUTION_ALREADY_RESERVED');
 if(!['matched_arm','capacity_preflight'].includes(purpose))throw Error('INVALID_EXECUTION_PURPOSE');
 if(purpose==='capacity_preflight'&&tally.entries.filter(e=>e.host===host&&e.purpose===purpose).length>=2)throw Error('PREFLIGHT_RETRY_CAP');
 const worst=purpose==='capacity_preflight'?1:armCap(mode);
 if(tally.executions+tally.reserved+worst>tally.ceiling)throw Error('EXECUTION_CEILING_EXCEEDED');
 return {...tally,reserved:tally.reserved+worst,entries:[...tally.entries,{host,run_id:runId,mode,purpose,reserved:worst,status:'reserved'}]};
}
export function settleExecutions(tally,runId,result){
 const entry=tally.entries.find(e=>e.run_id===runId);
 if(!entry||entry.status!=='reserved')throw Error('EXECUTION_NOT_RESERVED');
 const ledger=result.ledger;
 const unknown=!ledger||!Number.isSafeInteger(ledger.executions)||ledger.executions<1||ledger.executions!==ledger.rows?.length||ledger.limitations?.some(s=>/count may be incomplete/.test(s));
 const executions=unknown?Math.max(entry.reserved,Number.isSafeInteger(ledger?.executions)?ledger.executions:0,ledger?.rows?.length??0,Number.isSafeInteger(ledger?.reported_execution_lower_bound)?ledger.reported_execution_lower_bound:0):ledger.executions;
 const overrun=executions>entry.reserved;
 const stopped=result.acceptance==='blocked_provider_limit';
 const next={...tally,executions:tally.executions+executions,reserved:tally.reserved-entry.reserved,halted:tally.halted||unknown||overrun,stopped_hosts:[...new Set([...tally.stopped_hosts,...(stopped?[entry.host]:[])])],entries:tally.entries.map(e=>e===entry?{...e,status:'completed',executions,unbudgeted:Math.max(0,executions-entry.reserved),count_status:unknown?'worst_case_reserved_trace_unavailable':'trace_observed',acceptance:result.acceptance,environment:result.environment??null,environment_override_names:result.environment_override_names??[]}:e)};
 return {tally:next,result:{...result,...(ledger?{ledger:{...ledger,rows:ledger.rows.map((row,i)=>({...row,unbudgeted:i>=entry.reserved}))}}:{})}};
}

const gradePass=arm=>arm?.after?.result?.passed===true&&['scope','grader_integrity','behavioral_tests'].every(id=>arm.after.result.checks?.some(c=>c.check_id===id&&c.passed===true));
export function qualityGate(arm,mode){
 if(!gradePass(arm)||!arm.ledger||arm.ledger.executions!==arm.ledger.rows?.length||arm.ledger.rows.some(r=>r.unbudgeted)||arm.ledger.limitations?.some(s=>/count may be incomplete/.test(s)))return false;
 const review=arm.maintainer_review;
 if(review?.passed!==true||typeof review.author!=='string'||!review.author.trim())return false;
 if(mode==='direct')return arm.ledger.executions===1&&arm.ledger.rows[0]?.role==='coordinator';
 return review.worker_wrote_every_changed_path===true&&review.coordinator_inspected_artifact===true&&arm.ledger.executions>1;
}
export function pairVerdict({direct,delegated}){
 const base={qualification_authority:false,claim:null};
 if([direct,delegated].some(arm=>!arm||/^(blocked_|harness_budget_cap)/.test(arm.acceptance??'')||arm.execution?.timed_out||arm.ledger_error))return {...base,verdict:'blocked',reason:'An arm is missing, blocked, capped, or lacks its trace.'};
 const a=qualityGate(direct,'direct'),b=qualityGate(delegated,'delegated');
 if(!a||!b)return {...base,verdict:a?'direct':!direct.maintainer_review||!delegated.maintainer_review?'blocked':'mixed',reason:'Both arms must pass grading and maintainer ledger review before comparing time.'};
 const dt=direct.ledger.task_wall_clock_ms,gt=delegated.ledger.task_wall_clock_ms,dr=direct.ledger.rework_heuristic,gr=delegated.ledger.rework_heuristic;
 if(![dt,gt,dr,gr].every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0))return {...base,verdict:'blocked',reason:'Comparable task time and rework are unavailable.'};
 if(dt<gt&&dr<=gr)return {...base,verdict:'direct',claim:'lower wall clock at n=1',reason:'Direct has lower task time and no higher rework heuristic.'};
 if(gt<dt&&gr<=dr)return {...base,verdict:'delegated',claim:'lower wall clock at n=1',reason:'Delegated has lower task time and no higher rework heuristic.'};
 return {...base,verdict:dt===gt&&dr<=gr?'direct':'mixed',tied:dt===gt&&dr===gr,reason:'No arm has lower task time with no higher rework heuristic.'};
}

/** Offline preflight plan only. Executing it is M4 and requires separate approval. */
export async function prepareCapacityPreflight(host,{timestamp=new Date().toISOString().replaceAll(':','-')}={}){
 hostCheck(host);if(!/^[\w.-]+$/.test(timestamp))throw Error('INVALID_PREFLIGHT_TIMESTAMP');
 const destination=join(artifacts,`preflight-${host}-${timestamp}`);
 await mkdir(artifacts,{recursive:true});await mkdir(destination);
 const native=await import('../../dist/runtime/native.js');
 const environment=sanitizedChildEnvironment(native,host);
 const summary={purpose:'capacity_preflight',qualification_authority:false,host,destination,dry_run:true,executions:0,max_model_calls:1,max_retries:1,executor:'scripts/verify/frontier-host.mjs',target:{host,provider:host==='claude'?'anthropic':'openai',model_id:host==='claude'?'claude-opus-5':'gpt-5.5',effort:'low'},prompt:'Reply OK. Do not use tools, delegate, or start child processes.',environment:environment.identity,environment_override_names:environment.overrideNames};
 await save(join(destination,'summary.json'),summary);return summary;
}

export async function runPairs({hosts=['claude','codex'],fixtures=['foreman-t920-derived-gate-id','foreman-t897-reconnect-notice'],sourceRepository='/Users/gregpro/foreman',dependencyDirectory=join(artifacts,'deps-b962c1ac/node_modules'),skillSource=join(root,'skills/delegate'),outputDirectory=join(artifacts,`dry-${randomUUID()}`),campaignId='matched',dryRun=true,approvedExecutions=null,budgetFile=null,expectedSkillDigest=null,fixtureIndexOffset=0}={}){
 idCheck(campaignId);hosts.forEach(hostCheck);
 if(!hosts.length||new Set(hosts).size!==hosts.length||!fixtures.length||new Set(fixtures).size!==fixtures.length||fixtures.some(id=>!/^[a-z0-9-]+$/.test(id)))throw Error('INVALID_CAMPAIGN_SELECTION');
 let tally=createExecutionTally(dryRun?0:approvedExecutions);
 const globalBudget=budgetFile?await import('./campaign-budget.mjs'):null;
 if(!dryRun&&globalBudget){const budget=await globalBudget.readBudget(budgetFile);if(budget.halted)throw Error('BUDGET_HALTED');if(hosts.some(host=>budget.stopped_hosts.includes(host)))throw Error('HOST_STOPPED');}

 const destination=resolve(outputDirectory);await mkdir(dirname(destination),{recursive:true});await mkdir(destination);
 const tallyPath=join(destination,'execution-tally.json');await save(tallyPath,tally);
 const native=await import('../../dist/runtime/native.js');
 const {folderDigest}=await import('../../skills/delegate/scripts/local-learning.mjs');
 const expectedFolder=expectedSkillDigest??await folderDigest(skillSource);
 const pairs=[];
 for(const host of hosts){
  for(const [fixtureIndex,fixtureId] of fixtures.entries()){
   if(tally.halted||tally.stopped_hosts.includes(host))break;
   if(await folderDigest(skillSource)!==expectedFolder)throw Error('CAMPAIGN_SKILL_FOLDER_DRIFT');
   const pairId=`${campaignId}-${host}-${fixtureIndex+fixtureIndexOffset+1}`;
   const pairDirectory=join(destination,pairId);await mkdir(pairDirectory);
   const harvested={fixtureId,sourceRepository,dependencyDirectory},prepared={};
   for(const mode of ['direct','delegated'])prepared[mode]=await prepareInstalledTrial(host,fixtureId,{mode,harvested,skillSource});
   const manifest=pairManifest({pairId,host,fixtureIndex:fixtureIndex+fixtureIndexOffset,prepared});
   await save(join(pairDirectory,'pair-request.json'),manifest);
   const arms={};
   for(const mode of manifest.order){
    const runId=manifest.arms[mode].run_id;
    const environment=sanitizedChildEnvironment(native,host);
    if(!dryRun){
     try{tally=reserveExecutions(tally,{host,runId,mode});}
     catch(error){tally={...tally,halted:true,halt_reason:error.message};await saveTally(tallyPath,tally);await save(join(pairDirectory,'blocked.json'),{run_id:runId,reason:error.message,qualification_authority:false});break;}
     if(globalBudget)await globalBudget.reserveBudget(budgetFile,{id:runId,purpose:'matched_arm',host,worstCase:armCap(mode)});
     await saveTally(tallyPath,tally);
    }
    // The actual child receives only these base keys plus the harness-owned state directory.
    assertChildEnvironment(environment.env);
    let trial;
    try{trial=await installedTrial(host,fixtureId,{mode,harvested,skillSource,preparedTrial:prepared[mode],runId,outputDirectory:join(pairDirectory,mode),timeoutMs:600000,maxModelCalls:armCap(mode),dryRun,environment});}
    catch(error){
     if(!dryRun){tally={...tally,halted:true};await saveTally(tallyPath,tally);if(globalBudget){const source=join(pairDirectory,`${mode}-unresolved.json`);await save(source,{error:String(error),uncertain:true});await globalBudget.settleBudget(budgetFile,runId,{source,uncertain:true});}}
     throw error;
    }
    if(dryRun)arms[mode]={destination:trial.destination,manifest:trial.manifest};
    else{
     const settled=settleExecutions(tally,runId,trial);tally=settled.tally;arms[mode]=settled.result;
     if(globalBudget)await globalBudget.settleBudget(budgetFile,runId,{executions:tally.entries.find(e=>e.run_id===runId).executions,source:join(trial.destination,'result.json'),providerLimit:trial.acceptance==='blocked_provider_limit',uncertain:tally.entries.find(e=>e.run_id===runId).count_status!=='trace_observed'});
     // The original arm result is immutable; tally annotations are saved separately.
     await save(join(pairDirectory,`${mode}-accounted.json`),settled.result);await saveTally(tallyPath,tally);
     if(tally.halted||tally.stopped_hosts.includes(host))break;
    }
   }
   const completed={...manifest,...(!dryRun?{thread_ids:Object.fromEntries(Object.entries(arms).map(([mode,arm])=>[mode,arm.thread_id??null])),host_version:Object.fromEntries(Object.entries(arms).map(([mode,arm])=>[mode,arm.host_version??null]))}:{}),dry_run:dryRun,arms,verdict:dryRun?null:pairVerdict(arms)};
   await save(join(pairDirectory,'pair-manifest.json'),{...manifest,thread_ids:completed.thread_ids,host_version:completed.host_version});
   await save(join(pairDirectory,'pair-result.json'),completed);pairs.push(completed);
  }
 }
 const result={destination,dry_run:dryRun,pairs,tally,qualification_authority:false};
 await save(join(destination,'campaign.json'),result);return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{'dry-run':{type:'boolean'},execute:{type:'boolean'},'approved-executions':{type:'string'},host:{type:'string',multiple:true},fixture:{type:'string',multiple:true},'source-repository':{type:'string'},'dependency-directory':{type:'string'},'skill-source':{type:'string'},output:{type:'string'},'campaign-id':{type:'string'}}});
 if(values.execute&&values['dry-run'])throw Error('CONFLICTING_EXECUTION_MODES');
 const result=await runPairs({dryRun:!values.execute,approvedExecutions:values['approved-executions']===undefined?null:Number(values['approved-executions']),...(values.host?{hosts:values.host}:{}),...(values.fixture?{fixtures:values.fixture}:{}),...(values['source-repository']?{sourceRepository:values['source-repository']}:{}),...(values['dependency-directory']?{dependencyDirectory:values['dependency-directory']}:{}),...(values['skill-source']?{skillSource:values['skill-source']}:{}),...(values.output?{outputDirectory:values.output}:{}),...(values['campaign-id']?{campaignId:values['campaign-id']}:{} )});
 console.log(JSON.stringify({destination:result.destination,dry_run:result.dry_run,executions:result.tally.executions,pairs:result.pairs.length}));
}
