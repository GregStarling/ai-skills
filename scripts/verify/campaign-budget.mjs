import {mkdir, readFile, rm, rename, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';

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
      if(entry.providerLimit&&!hosts.has(entry.host))throw error('BUDGET_TAMPERED');
      if(entry.uncertain||entry.unbudgeted)mustHalt=true;
      executions+=entry.executions;
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
  if(approval.ceiling!==budget.ceiling||approval.authorization!==budget.authorization)throw error('BUDGET_TAMPERED');
  for(const entry of budget.entries){
    let original;
    try{original=await readJson(reservationPath(path,entry.id));}
    catch(cause){
      if(cause?.code==='ENOENT')throw error('BUDGET_TAMPERED');
      throw cause;
    }
    assertOriginalReservation(entry,original);
  }
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
