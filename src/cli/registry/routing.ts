import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {z} from 'zod';
import {jsonCommand} from '../json-command.js';
import {loadPolicy} from '../../governance/index.js';
import {safeOutputDirectory} from '../../adapters/index.js';
import {compileRoutingPack,parseRoutingPack,resolveRouting} from '../../routing/index.js';

const publicClass=z.enum(['repo_exploration','mechanical_work','bounded_implementation','ui_implementation','hard_debugging','complex_implementation','research','full_project']);
export const commands=[
 jsonCommand('compile-routing-pack','Compile current governed worker and frontier evidence into a portable production pack.',async(input,cwd)=>{
  const request=z.object({policyFile:z.string().optional(),output:z.string().optional(),strata:z.array(z.object({publicTaskClass:publicClass,workerSelection:z.unknown(),reviewerSelection:z.unknown()}).strict())}).strict().parse(input);
  const pack=compileRoutingPack({mode:'production',policy:loadPolicy(resolve(cwd,request.policyFile??'policy/constitution.json')),strata:request.strata});
  let output:string|null=null;
  if(request.output){output=resolve(cwd,request.output);const parent=safeOutputDirectory(dirname(output));await mkdir(parent,{recursive:true});await writeFile(output,JSON.stringify(pack,null,2)+'\n',{flag:'wx'});}
  return {status:'COMPILED',output,pack};
 }),
 jsonCommand('validate-routing-pack','Validate a routing pack schema and content integrity.',input=>{const pack=parseRoutingPack(input);return {status:'VALID',mode:pack.mode,pack};}),
 jsonCommand('resolve-routing','Inspect a portable pack intersection with an explicit host inventory.',input=>{
  const request=z.object({pack:z.unknown(),request:z.unknown()}).strict().parse(input);
  return resolveRouting(parseRoutingPack(request.pack),request.request as Parameters<typeof resolveRouting>[1]);
 }),
];
