import {afterEach,describe,expect,it} from 'vitest';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const budget=await import(pathToFileURL(resolve('scripts/verify/campaign-budget.mjs')).href);
const temporary:string[]=[];
const temporaryRoot=async()=>{const p=await mkdtemp(join(tmpdir(),'campaign-budget-'));temporary.push(p);return p;};
const path=async()=>join(await temporaryRoot(),'budget.json');
afterEach(async()=>{await Promise.all(temporary.splice(0).map(p=>rm(p,{recursive:true,force:true})));});

describe('campaign completion budget',()=>{
  it('refuses to initialize over an existing file',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:2,authorization:'approved'});
    await expect(budget.initializeBudget(file,{ceiling:2,authorization:'approved'})).rejects.toMatchObject({code:'BUDGET_EXISTS'});
  });

  it('initializes a budget under a nested nonexistent parent directory',async()=>{
    const file=join(await temporaryRoot(),'nested','parent','budget.json');
    await expect(budget.initializeBudget(file,{ceiling:2,authorization:'approved'})).resolves.toMatchObject({ceiling:2});
  });

  it('rejects ceiling over-reservation and duplicate ids',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:2,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await expect(budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1})).rejects.toMatchObject({code:'BUDGET_DUPLICATE_ID'});
    await expect(budget.reserveBudget(file,{id:'b',purpose:'worker',host:'codex',worstCase:2})).rejects.toMatchObject({code:'BUDGET_CEILING'});
  });

  it('refuses a ledger whose ceiling was edited above the approved snapshot',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:1,authorization:'approved'});
    const parsed=JSON.parse(await readFile(file,'utf8'));
    parsed.ceiling=2;
    await writeFile(file,JSON.stringify(parsed));
    await expect(budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:2})).rejects.toMatchObject({code:'BUDGET_TAMPERED'});
  });

  it('does not let concurrent reservations oversubscribe the ceiling',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:1,authorization:'approved'});
    const results=await Promise.allSettled([
      budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1}),
      budget.reserveBudget(file,{id:'b',purpose:'worker',host:'codex',worstCase:1}),
    ]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    expect(await budget.readBudget(file)).toMatchObject({executions:0,reserved:1});
  });

  it('charges unknown uncertain counts conservatively and halts',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:3,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:2});
    const settled=await budget.settleBudget(file,'a',{source:'missing trace',uncertain:true});
    expect(settled).toMatchObject({executions:2,reserved:0,halted:true});
    expect(settled.entries[0]).toMatchObject({status:'completed',executions:2,uncertain:true,unbudgeted:false});
  });

  it('preserves overruns as unbudgeted and rejects later reservations while halted',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:3,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    const settled=await budget.settleBudget(file,'a',{executions:2,source:'ledger'});
    expect(settled).toMatchObject({executions:2,halted:true});
    expect(settled.entries[0]).toMatchObject({executions:2,unbudgeted:true});
    await expect(budget.reserveBudget(file,{id:'b',purpose:'worker',host:'claude',worstCase:1})).rejects.toMatchObject({code:'BUDGET_HALTED'});
  });

  it('preserves an observed overrun beyond the total ceiling',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:1,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    const settled=await budget.settleBudget(file,'a',{executions:2,source:'ledger'});
    expect(settled).toMatchObject({ceiling:1,executions:2,reserved:0,halted:true});
    expect((await budget.readBudget(file)).entries[0]).toMatchObject({executions:2,unbudgeted:true});
  });

  it('refuses relabeling an overrun by editing the completed entry worst case',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:1,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await budget.settleBudget(file,'a',{executions:2,source:'ledger'});
    const parsed=JSON.parse(await readFile(file,'utf8'));
    parsed.ceiling=2;
    parsed.halted=false;
    parsed.entries[0].worst_case=2;
    parsed.entries[0].unbudgeted=false;
    await writeFile(file,JSON.stringify(parsed));
    await expect(budget.readBudget(file)).rejects.toMatchObject({code:'BUDGET_TAMPERED'});
  });

  it('requires known executions unless the settlement is uncertain',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:2,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await expect(budget.settleBudget(file,'a',{source:'missing trace'})).rejects.toMatchObject({code:'INVALID_BUDGET'});
  });

  it('keeps provider limits per host when the campaign itself is not halted',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:3,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await budget.settleBudget(file,'a',{executions:1,source:'provider',providerLimit:true});
    await expect(budget.reserveBudget(file,{id:'b',purpose:'worker',host:'codex',worstCase:1})).rejects.toMatchObject({code:'HOST_STOPPED'});
    expect((await budget.reserveBudget(file,{id:'c',purpose:'worker',host:'claude',worstCase:1})).reserved).toBe(1);
  });

  it('rejects double settlement',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:2,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await budget.settleBudget(file,'a',{executions:1,source:'ledger'});
    await expect(budget.settleBudget(file,'a',{executions:1,source:'ledger'})).rejects.toMatchObject({code:'BUDGET_ALREADY_SETTLED'});
  });

  it('refuses malformed or tampered persisted state',async()=>{
    const file=await path();
    await writeFile(file,JSON.stringify({schema_version:'completion_budget.v1',ceiling:2,executions:0,reserved:2,halted:false,stopped_hosts:[],authorization:'approved',entries:[],qualification_authority:false}));
    await expect(budget.readBudget(file)).rejects.toMatchObject({code:'BUDGET_TAMPERED'});
  });

  it('fails closed when immutable sidecars are missing or inconsistent',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:2,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await rm(`${file}.approval.json`);
    await expect(budget.readBudget(file)).rejects.toMatchObject({code:'BUDGET_TAMPERED'});

    const other=await path();
    await budget.initializeBudget(other,{ceiling:2,authorization:'approved'});
    await budget.reserveBudget(other,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await rm(`${other}.reservations`,{recursive:true,force:true});
    await expect(budget.readBudget(other)).rejects.toMatchObject({code:'BUDGET_TAMPERED'});
  });

  it('refuses tampered halt, overrun, and provider-limit metadata',async()=>{
    const file=await path();
    await budget.initializeBudget(file,{ceiling:1,authorization:'approved'});
    await budget.reserveBudget(file,{id:'a',purpose:'worker',host:'codex',worstCase:1});
    await budget.settleBudget(file,'a',{executions:2,source:'ledger'});
    const parsed=JSON.parse(await readFile(file,'utf8'));
    parsed.halted=false;
    await writeFile(file,JSON.stringify(parsed));
    await expect(budget.readBudget(file)).rejects.toMatchObject({code:'BUDGET_TAMPERED'});
    parsed.halted=true;parsed.entries[0].unbudgeted=false;
    await writeFile(file,JSON.stringify(parsed));
    await expect(budget.readBudget(file)).rejects.toMatchObject({code:'BUDGET_TAMPERED'});
    parsed.entries[0].unbudgeted=true;parsed.entries[0].providerLimit=true;
    await writeFile(file,JSON.stringify(parsed));
    await expect(budget.readBudget(file)).rejects.toMatchObject({code:'BUDGET_TAMPERED'});
  });
});
