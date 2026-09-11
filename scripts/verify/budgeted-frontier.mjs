import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {reserveBudget,settleBudget} from './campaign-budget.mjs';
import {sanitizedChildEnvironment} from './direct-vs-delegated.mjs';
import {classifyTrial} from './installed-delegate.mjs';
import {executionLedger} from './trace-ledger.mjs';

/** One explicit reservation per fresh native execution, including failed launches. */
export async function executeBudgetedFrontier({budgetFile,id,purpose,...options}){
 if(!budgetFile)throw Error('APPROVED_BUDGET_REQUIRED');
 const native=await import('../../dist/runtime/native.js');
 const {executeFrontier}=await import('./frontier-host.mjs');
 const environment=sanitizedChildEnvironment(native,options.target.host);
 await mkdir(options.destination,{recursive:true});
 await writeFile(join(options.destination,'execution-reservation.json'),JSON.stringify({id,purpose,budgetFile},null,2)+'\n',{flag:'wx'});
 await reserveBudget(budgetFile,{id,purpose,host:options.target.host,worstCase:1});
 let result;
 try{result=await executeFrontier({...options,environment});}
 catch(error){const source=join(options.destination,'unresolved.json');await writeFile(source,JSON.stringify({error:String(error),uncertain:true})+'\n',{flag:'wx'});await settleBudget(budgetFile,id,{source,uncertain:true});throw error;}
 // This adapter's raw trace has no receive timestamps; only its execution count is used here.
 const envelope=result.stdout.split('\n').filter(Boolean).map(line=>JSON.stringify({at:result.request.started_at,line})).join('\n');
 const ledger=executionLedger(options.target.host,envelope);
 const acceptance=classifyTrial({host:options.target.host,stdout:result.stdout,stderr:result.stderr,telemetry:result.telemetry});
 const source=join(options.destination,'accounting.json');
 await writeFile(source,JSON.stringify({id,purpose,executions:ledger.executions,limitations:ledger.limitations,acceptance,environment:environment.identity,environment_override_names:environment.overrideNames,qualification_authority:false},null,2)+'\n',{flag:'wx'});
 const budget=await settleBudget(budgetFile,id,{source,executions:ledger.executions,providerLimit:acceptance==='blocked_provider_limit',uncertain:ledger.limitations.some(s=>/count may be incomplete/.test(s))});
 if(budget.halted)throw Error('BUDGET_HALTED');
 if(budget.stopped_hosts.includes(options.target.host))throw Error('HOST_STOPPED');
 return result;
}
