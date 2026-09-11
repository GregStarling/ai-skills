import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const mocks=vi.hoisted(()=>({trial:vi.fn(),capacity:vi.fn()}));
vi.mock('../../scripts/verify/installed-delegate.mjs',()=>({installedTrial:mocks.trial}));
vi.mock('../../scripts/verify/completion-campaign.mjs',()=>({budgetFile:'/unused/default-budget.json',completionRoot:'/unused/default-root',requireCapacity:mocks.capacity}));
const {renewalAcceptance}=await import(pathToFileURL(resolve('scripts/verify/renewal-campaign.mjs')).href);
const budget=await import(pathToFileURL(resolve('scripts/verify/campaign-budget.mjs')).href);
const directories:string[]=[];
beforeEach(()=>{vi.clearAllMocks();mocks.capacity.mockResolvedValue(undefined);mocks.trial.mockImplementation(async(_host,_name,options)=>{
 await mkdir(options.outputDirectory);
 const result={destination:options.outputDirectory,acceptance:'pending_frontier_trace_review',ledger:{executions:2,limitations:[]}};
 await writeFile(join(options.outputDirectory,'result.json'),JSON.stringify(result));return result;
});});
afterEach(async()=>{await Promise.all(directories.splice(0).map(p=>rm(p,{recursive:true,force:true})));});
async function fixture(ceiling=8){const root=await mkdtemp(join(tmpdir(),'renewal-runner-'));directories.push(root);const path=join(root,'budget.json');await budget.initializeBudget(path,{ceiling,authorization:'SYNTHETIC OFFLINE TEST'});return{root,path};}
it('uses unique overrides, refuses duplicate IDs and paths, and settles the selected ledger',async()=>{
 const f=await fixture();
 for(const id of ['one','two'])await renewalAcceptance('claude','ui',{runId:id,outputDirectory:join(f.root,id),budgetFile:f.path});
 expect(mocks.trial).toHaveBeenCalledTimes(2);
 expect(mocks.trial.mock.calls[0]![2]).toMatchObject({runId:'one',timeoutMs:600000,maxModelCalls:4,traceBoundInspection:true});
 const before=await readFile(f.path,'utf8');
 await expect(renewalAcceptance('claude','ui',{runId:'one',outputDirectory:join(f.root,'unused'),budgetFile:f.path})).rejects.toThrow('BUDGET_DUPLICATE_ID');
 await expect(renewalAcceptance('claude','ui',{runId:'three',outputDirectory:join(f.root,'one'),budgetFile:f.path})).rejects.toThrow('TRIAL_OUTPUT_EXISTS');
 expect(await readFile(f.path,'utf8')).toBe(before);expect(mocks.trial).toHaveBeenCalledTimes(2);
 expect(await budget.readBudget(f.path)).toMatchObject({executions:4,reserved:0});
});
it('refuses an unaffordable case before launching',async()=>{
 const f=await fixture(3);await expect(renewalAcceptance('codex','multicomponent',{runId:'cap',outputDirectory:join(f.root,'cap'),budgetFile:f.path})).rejects.toThrow('BUDGET_CEILING');
 expect(mocks.trial).not.toHaveBeenCalled();expect(await budget.readBudget(f.path)).toMatchObject({executions:0,reserved:0});
});
it('charges uncertainty and halts the selected ledger on an execution error',async()=>{
 const f=await fixture();mocks.trial.mockRejectedValueOnce(Error('synthetic failure'));
 await expect(renewalAcceptance('claude','fullproject',{runId:'failed',outputDirectory:join(f.root,'new','failed'),budgetFile:f.path})).rejects.toThrow('synthetic failure');
 expect(await budget.readBudget(f.path)).toMatchObject({executions:6,reserved:0,halted:true});
});
