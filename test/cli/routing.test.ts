import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {commands} from '../../src/cli/registry/routing.js';
let directory:string;
beforeAll(async()=>{directory=await mkdtemp(join(tmpdir(),'routing-cli-'));});
afterAll(async()=>{await rm(directory,{recursive:true,force:true});});
async function invoke(name:string,input:unknown){
 const path=join(directory,`${randomUUID()}.json`);await writeFile(path,JSON.stringify(input));
 const result=await commands.find(command=>command.name===name)!.run(['--input',path],{cwd:process.cwd(),env:process.env});
 return {exitCode:result.exitCode,body:JSON.parse(result.stdout??'{}')};
}
describe('routing pack CLI boundaries',()=>{
 it('compiles an honest production gap pack and refuses to overwrite a staged artifact',async()=>{
  const output=join(directory,'staged.json');const result=await invoke('compile-routing-pack',{strata:[],output});
  expect(result.exitCode).toBe(0);expect(result.body.status).toBe('COMPILED');expect(result.body.pack.mode).toBe('production');expect(result.body.pack.routes).toEqual([]);expect(result.body.pack.missing_routes).toHaveLength(7);expect(result.body.pack.routing_modes.full_project).toBe('decompose');
  const bytes=await readFile(output,'utf8');expect(JSON.parse(bytes)).toEqual(result.body.pack);
  expect((await invoke('compile-routing-pack',{strata:[],output})).exitCode).toBe(2);expect(await readFile(output,'utf8')).toBe(bytes);
 });
 it('excludes simulation/time overrides from the production compiler command',async()=>{
  expect((await invoke('compile-routing-pack',{strata:[],mode:'simulation_test'})).exitCode).toBe(2);
  expect((await invoke('compile-routing-pack',{strata:[],generatedAt:'2000-01-01T00:00:00.000Z'})).exitCode).toBe(2);
 });
 it('validates the actual generated pack and detects changed bytes',async()=>{
  const {body}=await invoke('compile-routing-pack',{strata:[]});
  expect((await invoke('validate-routing-pack',body.pack)).exitCode).toBe(0);
  body.pack.policy_version+=1;
  expect((await invoke('validate-routing-pack',body.pack)).exitCode).toBe(2);
 });
});
