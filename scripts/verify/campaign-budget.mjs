import {mkdir, readFile, rm, rename, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,join} from 'node:path';

const schema_version='completion_budget.v1';
const approval_schema_version='completion_budget_approval.v1';
const reservation_schema_version='completion_budget_reservation.v1';

function error(code,message=code){
  const err=new Error(message);
  err.code=code;
  return err;
}

function positiveInteger(value,name){
  if(!Number.isSafeInteger(value)||value<=0)throw error('INVALID_BUDGET',`${name} must be a positive integer`);
}

function assertCleanString(value,name){
  if(typeof value!=='string'||value.length===0)throw error('INVALID_BUDGET',`${name} must be a non-empty string`);
}

function reservationPath(path,id){
  return `${path}.reservations/${createHash('sha256').update(id).digest('hex')}.json`;
}

async function readJson(path,malformed='BUDGET_MALFORMED'){
  try{return JSON.parse(await readFile(path,'utf8'));}
  catch(cause){
    if(cause?.code==='ENOENT')throw cause;
    if(cause?.code)throw cause;
    throw error(malformed);
  }
}

function validateBudgetShape(budget){
  if(!budget||typeof budget!=='object'||Array.isArray(budget))throw error('BUDGET_MALFORMED');
  if(budget.schema_version!==schema_version||budget.qualification_authority!==false)throw error('BUDGET_MALFORMED');
  positiveInteger(budget.ceiling,'ceiling');
  if(!Number.isSafeInteger(budget.executions)||budget.executions<0)throw error('BUDGET_MALFORMED');
  if(!Number.isSafeInteger(budget.reserved)||budget.reserved<0)throw error('BUDGET_MALFORMED');
  if(typeof budget.halted!=='boolean'||!Array.isArray(budget.stopped_hosts)||!Array.isArray(budget.entries))throw error('BUDGET_MALFORMED');
  if(typeof budget.authorization!=='string'||budget.authorization.length===0)throw error('BUDGET_MALFORMED');

  const corrections=budget.provider_limit_corrections??[];
  if(!Array.isArray(corrections)||new Set(corrections.map(c=>c.id)).size!==corrections.length||corrections.some(c=>!c||typeof c.id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(c.trace_digest)||c.reason!=='quoted_tool_output_false_positive'))throw error('BUDGET_MALFORMED');
  const corrected=new Set(corrections.map(c=>c.id));
  const executionCorrections=budget.execution_corrections??[];
  if(!Array.isArray(executionCorrections)||new Set(executionCorrections.map(c=>c.id)).size!==executionCorrections.length)throw error('BUDGET_MALFORMED');
  for(const c of executionCorrections){const entry=budget.entries.find(e=>e.id===c.id);if(!entry||entry.status!=='completed'||!Number.isSafeInteger(c.executions)||c.executions<=entry.executions||c.executions>entry.worst_case||!/^sha256:[a-f0-9]{64}$/.test(c.sha256)||typeof c.path!=='string')throw error('BUDGET_TAMPERED');}
  let executions=0,reserved=0,mustHalt=false;
  const ids=new Set(),hosts=new Set(budget.stopped_hosts);
  if(hosts.size!==budget.stopped_hosts.length||[...hosts].some(host=>typeof host!=='string'||host.length===0))throw error('BUDGET_MALFORMED');
  for(const entry of budget.entries){
    if(!entry||typeof entry!=='object'||Array.isArray(entry))throw error('BUDGET_MALFORMED');
    assertCleanString(entry.id,'id');assertCleanString(entry.purpose,'purpose');assertCleanString(entry.host,'host');
    if(ids.has(entry.id))throw error('BUDGET_MALFORMED');
    ids.add(entry.id);
    positiveInteger(entry.worst_case,'worst_case');
    if(entry.status==='reserved')reserved+=entry.worst_case;
    else if(entry.status==='completed'){
      if(!Number.isSafeInteger(entry.executions)||entry.executions<0)throw error('BUDGET_MALFORMED');
      assertCleanString(entry.source,'source');
      if(typeof entry.providerLimit!=='boolean'||typeof entry.uncertain!=='boolean'||typeof entry.unbudgeted!=='boolean')throw error('BUDGET_MALFORMED');
      if(entry.unbudgeted!==(entry.executions>entry.worst_case))throw error('BUDGET_TAMPERED');
      if(entry.providerLimit&&!corrected.has(entry.id)&&!hosts.has(entry.host))throw error('BUDGET_TAMPERED');
      if(entry.uncertain||entry.unbudgeted)mustHalt=true;
      executions+=executionCorrections.find(c=>c.id===entry.id)?.executions??entry.executions;
    }else throw error('BUDGET_MALFORMED');
  }
  if(executions!==budget.executions||reserved!==budget.reserved)throw error('BUDGET_TAMPERED');
  if(budget.executions+budget.reserved>budget.ceiling&&!budget.halted)throw error('BUDGET_TAMPERED');
  if(mustHalt&&!budget.halted)throw error('BUDGET_TAMPERED');
  return budget;
}

function assertOriginalReservation(entry,original){
  if(!original||typeof original!=='object'||Array.isArray(original))throw error('BUDGET_MALFORMED');
  if(original.schema_version!==reservation_schema_version)throw error('BUDGET_MALFORMED');
  if(original.id!==entry.id||original.purpose!==entry.purpose||original.host!==entry.host||original.worst_case!==entry.worst_case)throw error('BUDGET_TAMPERED');
}

async function validateBudget(path,budget){
  validateBudgetShape(budget);
  let approval;
  try{approval=await readJson(`${path}.approval.json`);}
  catch(cause){
    if(cause?.code==='ENOENT')throw error('BUDGET_TAMPERED');
    throw cause;
  }
  if(!approval||typeof approval!=='object'||Array.isArray(approval)||approval.schema_version!==approval_schema_version)throw error('BUDGET_MALFORMED');
  let approvedCeiling=approval.ceiling;
  for(const amendment of budget.amendments??[]){const original=await readJson(amendment.path);if(JSON.stringify(original)!==JSON.stringify(amendment)||amendment.from!==approvedCeiling||!Number.isSafeInteger(amendment.to)||amendment.to<=amendment.from||!amendment.authorization)throw error('BUDGET_TAMPERED');approvedCeiling=amendment.to;}
  if(approvedCeiling!==budget.ceiling||approval.authorization!==budget.authorization)throw error('BUDGET_TAMPERED');
  for(const entry of budget.entries){
    let original;
    try{original=await readJson(reservationPath(path,entry.id));}
    catch(cause){
      if(cause?.code==='ENOENT')throw error('BUDGET_TAMPERED');
      throw cause;
    }
    assertOriginalReservation(entry,original);
  }
  for(const correction of budget.provider_limit_corrections??[]){
    const entry=budget.entries.find(e=>e.id===correction.id);
    if(!entry?.providerLimit||entry.status!=='completed')throw error('BUDGET_TAMPERED');
    await verifyFalseLimit(entry,correction.trace_digest);
  }
  for(const correction of budget.execution_corrections??[]){const bytes=await readFile(correction.path);if('sha256:'+createHash('sha256').update(bytes).digest('hex')!==correction.sha256)throw error('BUDGET_TAMPERED');const proof=JSON.parse(bytes);const count=await countNativeExecutions(proof.traces);const entry=budget.entries.find(e=>e.id===correction.id);const stdout=(await readFile(join(dirname(entry.source),'stdout.jsonl'),'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l));if(count.uncertain||count.executions!==correction.executions||count.root_id!==stdout.find(e=>e.type==='thread.started')?.thread_id)throw error('BUDGET_TAMPERED');}
  return budget;
}

async function withLock(path,operation){
  await mkdir(dirname(path),{recursive:true});
  const lock=`${path}.lock`;
  try{await mkdir(lock);}
  catch(cause){
    if(cause?.code==='EEXIST')throw error('BUDGET_BUSY');
    throw cause;
  }
  try{return await operation();}
  finally{await rm(lock,{recursive:true,force:true});}
}

async function load(path){
  try{return validateBudget(path,await readJson(path));}
  catch(cause){
    if(cause?.code==='ENOENT')throw cause;
    if(cause?.code)throw cause;
    throw error('BUDGET_MALFORMED');
  }
}

async function save(path,budget){
  validateBudgetShape(budget);
  const tmp=`${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp,`${JSON.stringify(budget,null,2)}\n`);
  await rename(tmp,path);
}

async function writeImmutableJson(path,value){
  await writeFile(path,`${JSON.stringify(value,null,2)}\n`,{flag:'wx'});
}

export async function initializeBudget(path,{ceiling,authorization}){
  positiveInteger(ceiling,'ceiling');
  assertCleanString(authorization,'authorization');
  return withLock(path,async()=>{
    try{await readFile(path,'utf8');throw error('BUDGET_EXISTS');}
    catch(cause){if(cause?.code!=='ENOENT')throw cause;}
    const budget=validateBudgetShape({schema_version,ceiling,executions:0,reserved:0,halted:false,stopped_hosts:[],authorization,entries:[],qualification_authority:false});
    await writeImmutableJson(`${path}.approval.json`,{schema_version:approval_schema_version,ceiling,authorization});
    await save(path,budget);
    return budget;
  });
}

export async function readBudget(path){
  return load(path);
}

export async function reserveBudget(path,{id,purpose,host,worstCase}){
  assertCleanString(id,'id');assertCleanString(purpose,'purpose');assertCleanString(host,'host');positiveInteger(worstCase,'worstCase');
  return withLock(path,async()=>{
    const budget=await load(path);
    if(budget.halted)throw error('BUDGET_HALTED');
    if(budget.stopped_hosts.includes(host))throw error('HOST_STOPPED');
    if(budget.entries.some(entry=>entry.id===id))throw error('BUDGET_DUPLICATE_ID');
    if(budget.executions+budget.reserved+worstCase>budget.ceiling)throw error('BUDGET_CEILING');
    await mkdir(`${path}.reservations`,{recursive:true});
    try{await writeImmutableJson(reservationPath(path,id),{schema_version:reservation_schema_version,id,purpose,host,worst_case:worstCase});}
    catch(cause){
      if(cause?.code==='EEXIST')throw error('BUDGET_DUPLICATE_ID');
      throw cause;
    }
    budget.entries.push({id,purpose,host,worst_case:worstCase,status:'reserved'});
    budget.reserved+=worstCase;
    await save(path,budget);
    return budget;
  });
}

export async function settleBudget(path,id,{executions,source,providerLimit=false,uncertain=false}){
  assertCleanString(id,'id');assertCleanString(source,'source');
  if(typeof providerLimit!=='boolean'||typeof uncertain!=='boolean')throw error('INVALID_BUDGET');
  if(executions===undefined&&uncertain!==true)throw error('INVALID_BUDGET','executions are required unless uncertain is true');
  if(executions!==undefined&&(!Number.isSafeInteger(executions)||executions<0))throw error('INVALID_BUDGET','executions must be a non-negative integer');
  return withLock(path,async()=>{
    const budget=await load(path);
    const entry=budget.entries.find(row=>row.id===id);
    if(!entry)throw error('BUDGET_UNKNOWN_ID');
    if(entry.status!=='reserved')throw error('BUDGET_ALREADY_SETTLED');
    const known=executions??0;
    const charged=uncertain?Math.max(entry.worst_case,known):known;
    const unbudgeted=charged>entry.worst_case;
    entry.status='completed';
    entry.executions=charged;
    entry.source=source;
    entry.providerLimit=providerLimit===true;
    entry.uncertain=uncertain===true;
    entry.unbudgeted=unbudgeted;
    budget.reserved-=entry.worst_case;
    budget.executions+=charged;
    if(entry.providerLimit&&!budget.stopped_hosts.includes(entry.host))budget.stopped_hosts.push(entry.host);
    if(entry.uncertain||unbudgeted)budget.halted=true;
    await save(path,budget);
    return budget;
  });
}

// Append-only repair of a demonstrated parser false positive; never clears a real limit.
async function verifyFalseLimit(entry,expectedDigest){
 const summary=await readJson(entry.source),bytes=await readFile(join(dirname(entry.source),'stdout.jsonl'));
 const digest='sha256:'+createHash('sha256').update(bytes).digest('hex');
 if(expectedDigest&&digest!==expectedDigest)throw error('BUDGET_TAMPERED');
 const events=bytes.toString().split('\n').filter(Boolean).map(l=>JSON.parse(l));
 if(summary.code!==0||summary.timed_out||events.some(e=>['error','turn.failed'].includes(e.type)||(e.type==='rate_limit_event'&&e.rate_limit_info?.status==='rejected'))||!events.some(e=>e.type==='turn.completed'||(e.type==='result'&&!e.is_error&&e.subtype==='success')))throw error('ACTUAL_PROVIDER_FAILURE');
 return digest;
}
export async function correctFalseProviderLimit(path,id){
 return withLock(path,async()=>{
  const budget=await load(path),entry=budget.entries.find(e=>e.id===id);
  if(!entry?.providerLimit||entry.status!=='completed'||budget.provider_limit_corrections?.some(c=>c.id===id))throw error('INVALID_LIMIT_CORRECTION');
  const trace_digest=await verifyFalseLimit(entry);
  budget.provider_limit_corrections=[...(budget.provider_limit_corrections??[]),{id,trace_digest,reason:'quoted_tool_output_false_positive'}];
  const corrected=new Set(budget.provider_limit_corrections.map(c=>c.id));
  budget.stopped_hosts=budget.stopped_hosts.filter(host=>budget.entries.some(e=>e.host===host&&e.providerLimit&&!corrected.has(e.id)));
  await save(path,budget);return budget;
 });
}

// Native rollouts contain launches omitted by some CLI stdout protocols.
export async function countNativeExecutions(traces){
 if(!Array.isArray(traces)||!traces.length)throw error('NATIVE_TRACES_REQUIRED');
 let root_id=null;const turns=new Set(),launches=new Set(),ids=new Set(),parents=[];
 for(const ref of traces){const bytes=await readFile(ref.path);if('sha256:'+createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw error('NATIVE_TRACE_TAMPERED');
  const ev=bytes.toString().split('\n').filter(Boolean).map(l=>JSON.parse(l)),meta=ev.find(e=>e.type==='session_meta')?.payload;
  if(!meta?.id||ids.has(meta.id))throw error('NATIVE_TRACE_ID_INVALID');ids.add(meta.id);parents.push(meta.source?.subagent?.thread_spawn?.parent_thread_id??null);if(!meta.source?.subagent?.thread_spawn?.parent_thread_id)root_id=meta.id;
  const starts=ev.filter(e=>e.type==='event_msg'&&e.payload?.type==='task_started');if(!starts.length||starts.some(e=>!e.payload.turn_id))throw error('NATIVE_START_REQUIRED');for(const e of starts)turns.add(e.payload.turn_id);
  for(const e of ev.filter(e=>e.type==='response_item'&&e.payload?.type==='function_call'&&e.payload?.name?.endsWith('spawn_agent'))){if(!e.payload.call_id)throw error('NATIVE_LAUNCH_ID_REQUIRED');launches.add(e.payload.call_id);}
 }
 if(parents.filter(p=>p===null).length!==1||parents.some(p=>p!==null&&!ids.has(p)))throw error('NATIVE_TREE_INCOMPLETE');
 return {executions:turns.size,root_id,uncertain:launches.size!==traces.length-1};
}
export async function reconcileNativeCount(path,id,evidencePath){
 return withLock(path,async()=>{const budget=await load(path),entry=budget.entries.find(e=>e.id===id);if(!entry||entry.status!=='completed'||budget.execution_corrections?.some(c=>c.id===id))throw error('INVALID_COUNT_CORRECTION');
  const bytes=await readFile(evidencePath),proof=JSON.parse(bytes),count=await countNativeExecutions(proof.traces);
  const stdout=(await readFile(join(dirname(entry.source),'stdout.jsonl'),'utf8')).split('\n').filter(Boolean).map(l=>JSON.parse(l));
  if(count.root_id!==stdout.find(e=>e.type==='thread.started')?.thread_id||count.uncertain||count.executions<=entry.executions||count.executions>entry.worst_case)throw error('COUNT_NOT_WITHIN_ORIGINAL_RESERVATION');
  budget.execution_corrections=[...(budget.execution_corrections??[]),{id,executions:count.executions,path:evidencePath,sha256:'sha256:'+createHash('sha256').update(bytes).digest('hex')}];budget.executions+=count.executions-entry.executions;await save(path,budget);return budget;
 });
}

// A new explicit authorization appends to the original approval; history is never reset.
export async function amendBudget(path,{ceiling,authorization}){
 positiveInteger(ceiling,'ceiling');assertCleanString(authorization,'authorization');
 return withLock(path,async()=>{const budget=await load(path);if(ceiling<=budget.ceiling)throw error('INVALID_BUDGET_AMENDMENT');
 const amendment={path:`${path}.amendment-${ceiling}.json`,from:budget.ceiling,to:ceiling,authorization};
 await writeImmutableJson(amendment.path,amendment);budget.amendments=[...(budget.amendments??[]),amendment];budget.ceiling=ceiling;await save(path,budget);return budget;});
}
