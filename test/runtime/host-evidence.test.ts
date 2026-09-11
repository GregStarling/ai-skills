import {afterEach,describe,expect,it,vi} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const {execute}=await import(pathToFileURL(resolve('scripts/verify/host-evidence.mjs')).href);
const directories:string[]=[];
const directory=async()=>{const path=await mkdtemp(join(tmpdir(),'host-cleanup-'));directories.push(path);return path;};
afterEach(async()=>{vi.restoreAllMocks();await Promise.all(directories.splice(0).map(path=>rm(path,{recursive:true,force:true})));});

describe.skipIf(process.platform==='win32')('benchmark process-group cleanup',()=>{
 it.each(['normal','timeout'])('reaps a SIGTERM-ignoring descendant after %s leader exit',async(mode)=>{
  const destination=await directory();
  const worker="process.on('SIGTERM',()=>{});process.send('ready');setTimeout(()=>process.exit(),10000)";
  const script=`const {spawn}=require('node:child_process');const child=spawn(process.execPath,['-e',${JSON.stringify(worker)}],{stdio:['ignore','ignore','ignore','ipc']});child.once('message',()=>{console.log(JSON.stringify({leader:process.pid,child:child.pid}));${mode==='normal'?'process.exit(0);':''}});setInterval(()=>{},1000);`;
  try{
   const result=await execute(process.execPath,['-e',script],process.cwd(),'',destination,1500);
   const ids=JSON.parse((await readFile(join(destination,'stdout.jsonl'),'utf8')).trim());
   expect(result).toMatchObject({timed_out:mode==='timeout',cleanup:'complete'});
   if(mode==='normal')expect(result.code).toBe(0);
   expect(()=>process.kill(ids.child,0)).toThrow();
   expect(()=>process.kill(-ids.leader,0)).toThrow();
  }finally{
   // Also reap our own fixture if the regression returns before cleaning up.
   const text=await readFile(join(destination,'stdout.live.jsonl'),'utf8').catch(()=>'');
   if(text.trim()){const ids=JSON.parse(text.trim());try{process.kill(-ids.leader,'SIGKILL');}catch{}}
  }
 });
 it('retries transient EPERM instead of reporting successful cleanup early',async()=>{
  const destination=await directory();let signals=0;
  vi.spyOn(process,'kill').mockImplementation(()=>{throw Object.assign(new Error('group'),{code:++signals<3?'EPERM':'ESRCH'});});
  const result=await execute(process.execPath,['-e','console.log("done")'],process.cwd(),'',destination);
  expect(signals).toBe(3);expect(result.cleanup).toBe('complete');
 });
 it.each(['EPERM','EINVAL'])('preserves evidence and rejects unresolved %s cleanup so callers cannot advance',async(code)=>{
  const destination=await directory();
  vi.spyOn(process,'kill').mockImplementation(()=>{throw Object.assign(new Error('group'),{code});});
  await expect(execute(process.execPath,['-e','console.log("done")'],process.cwd(),'',destination)).rejects.toThrow('PROCESS_GROUP_CLEANUP_FAILED');
  expect(JSON.parse(await readFile(join(destination,'summary.json'),'utf8'))).toMatchObject({code:0,cleanup:'failed'});
  expect(await readFile(join(destination,'stdout.jsonl'),'utf8')).toBe('done\n');
 });
});

it('does not signal an undefined process group when spawning fails',async()=>{
 const destination=await directory(),kill=vi.spyOn(process,'kill');
 const result=await execute('delegate-nonexistent-cleanup-test',[],process.cwd(),'',destination);
 expect(result.cleanup).toBe('complete');expect(kill).not.toHaveBeenCalled();expect(result.code).not.toBe(0);
 expect(await readFile(join(destination,'stderr.log'),'utf8')).toContain('ENOENT');
});
