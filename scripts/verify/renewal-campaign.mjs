import {writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {budgetFile,completionRoot,requireCapacity} from './completion-campaign.mjs';
import {reserveBudget,settleBudget} from './campaign-budget.mjs';
import {installedTrial} from './installed-delegate.mjs';

/** Fresh installed acceptance only; M4 comparisons never enter routing data. */
export async function renewalAcceptance(host,name){
 if(!['claude','codex'].includes(host)||!['tinybug','mechanical','backend','ui','hardbug','multicomponent','fullproject'].includes(name))throw Error('INVALID_RENEWAL_CASE');
 await requireCapacity(host);
 const id=`renewal-installed-${host}-${name}`,cap=name==='fullproject'?6:4;
 await reserveBudget(budgetFile,{id,host,purpose:'renewal_installed_acceptance',worstCase:cap});
 let result;
 try{result=await installedTrial(host,name,{mode:'delegated',traceBoundInspection:true,runId:id,timeoutMs:600000,maxModelCalls:cap,outputDirectory:join(completionRoot,id)});}
 catch(error){const source=join(completionRoot,`${id}-unresolved.json`);await writeFile(source,JSON.stringify({error:String(error),uncertain:true})+'\n',{flag:'wx'});await settleBudget(budgetFile,id,{source,uncertain:true});throw error;}
 const uncertain=!result.ledger||result.ledger.limitations.some(s=>/count may be incomplete/.test(s));
 const executions=uncertain?Math.max(cap,result.ledger?.executions??0,result.ledger?.reported_execution_lower_bound??0):result.ledger.executions;
 await settleBudget(budgetFile,id,{executions,source:join(result.destination,'result.json'),providerLimit:result.acceptance==='blocked_provider_limit',uncertain});
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const {values}=parseArgs({options:{host:{type:'string'},case:{type:'string'}}});
 const result=await renewalAcceptance(values.host,values.case);
 console.log(JSON.stringify({destination:result.destination,acceptance:result.acceptance,grader_passed:result.after.passed,executions:result.ledger?.executions}));
}
