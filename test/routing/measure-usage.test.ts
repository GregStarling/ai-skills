import {afterEach,describe,expect,it} from 'vitest';
import {mkdir,mkdtemp,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const temporary:string[]=[];
afterEach(async()=>{await Promise.all(temporary.splice(0).map(p=>rm(p,{recursive:true,force:true})));});

async function measure(messages:Record<string,{model:string,input:number,cache_read?:number}>){
 const root=await mkdtemp(join(tmpdir(),'measure-usage-'));temporary.push(root);
 await mkdir(join(root,'project'));
 for(const [session,m] of Object.entries(messages)){
  const usage={input_tokens:m.input,output_tokens:1000,cache_read_input_tokens:m.cache_read??0,cache_creation_input_tokens:0};
  await writeFile(join(root,'project',`${session}.jsonl`),JSON.stringify({type:'assistant',sessionId:session,timestamp:'2026-10-11T00:00:00Z',message:{id:session,model:m.model,usage}})+'\n');
 }
 const out=JSON.parse(execFileSync(process.execPath,[resolve('scripts/measure-usage.mjs'),'--root',root,'--json'],{encoding:'utf8'}));
 return {unpriced:out.unpriced_models,total:Object.fromEntries(out.sessions.map((s:any)=>[s.id,s.total]))};
}

describe('measure-usage prices the current Claude 5.5 models',()=>{
 it('prices Sonnet 5.5 and switches Haiku 5.5 to its long-prompt tier above 100k prompt tokens',async()=>{
  const r=await measure({
   sonnet:{model:'claude-sonnet-5-5',input:1000},
   haiku_at_threshold:{model:'claude-haiku-5-5',input:100000},
   haiku_over_with_cache:{model:'claude-haiku-5-5',input:60000,cache_read:50000},
  });
  expect(r.unpriced).toEqual({});
  expect(r.total['sonnet']).toBeCloseTo(1000*2/1e6+1000*10/1e6,9);
  expect(r.total['haiku_at_threshold']).toBeCloseTo(100000*0.1/1e6+1000*0.5/1e6,9);
  // Cache reads count toward prompt length, so 60k input plus 50k cached is a long prompt.
  expect(r.total['haiku_over_with_cache']).toBeCloseTo(60000*0.5/1e6+50000*0.05/1e6+1000*2.5/1e6,9);
 });
});
