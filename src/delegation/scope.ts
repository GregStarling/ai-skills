import { readdir, lstat, readFile, readlink, realpath, open } from 'node:fs/promises';
import {constants} from 'node:fs';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { digest, hashBytes } from '../core/canonical.js';
import { classifyRisk, type Policy } from '../governance/index.js';

const executeFile = promisify(execFile);
export {parseWorkOrder,workOrderSchema,type WorkOrder} from '../schema/index.js';
export {safePath} from '../schema/work-order.js';
import {parseWorkOrder,type WorkOrder} from '../schema/index.js';
import {safePath} from '../schema/work-order.js';
export function matchesPath(path:string, pattern:string):boolean {return pattern.endsWith('/**') ? path.startsWith(pattern.slice(0,-2)) : path===pattern;}
export interface FileEntry { kind:'file'|'symlink'|'directory'; mode:number; bytes:number; content_digest:string; link_target?:string; }
export interface WorkspaceSnapshot { root:string; files:Record<string,FileEntry>; index:Record<string,string>; git_head:string|null; git_controls:string|null; content_digest:string; }
async function git(root:string,args:string[]):Promise<string> {return (await executeFile('git',['-C',root,...args],{encoding:'utf8',timeout:10000,maxBuffer:16*1024*1024,env:{...process.env,GIT_OPTIONAL_LOCKS:'0'}})).stdout;}
function confined(root:string,target:string):boolean {const path=relative(root,target);return path===''||(!path.startsWith('..'+ '/')&&path!=='..'&&!isAbsolute(path));}
export async function snapshotWorkspace(directory:string):Promise<WorkspaceSnapshot> {
  const root=await realpath(directory);const files:Record<string,FileEntry>={};
  let totalBytes=0;let totalFiles=0;
  // ponytail: a complete bounded scan avoids trusting Git's ignored/untracked or rename heuristics; large workspaces escalate.
  async function walk(base:string,prefix=''):Promise<void>{
    for(const name of (await readdir(base)).sort()){
      const path=prefix?`${prefix}/${name}`:name;if(path==='.git')continue;
      if(++totalFiles>20000)throw new Error('workspace_manifest_limit');
      safePath(path);const absolute=join(base,name);const info=await lstat(absolute);
      if(info.isSymbolicLink()){
        const link=await readlink(absolute);const target=resolve(base,link);
        if(!confined(root,target))throw new Error(`symlink_escape: ${path}`);
        try {if(!confined(root,await realpath(absolute)))throw new Error(`symlink_escape: ${path}`);}catch(error){if(!(error instanceof Error&&'code' in error&&error.code==='ENOENT'))throw error;}
        files[path]={kind:'symlink',mode:info.mode&0o7777,bytes:Buffer.byteLength(link),content_digest:hashBytes(link),link_target:link};
      }else if(info.isDirectory()){files[path]={kind:'directory',mode:info.mode&0o7777,bytes:0,content_digest:hashBytes('')};await walk(absolute,path);}
      else if(info.isFile()){
        totalBytes+=info.size;if(totalBytes>256*1024*1024)throw new Error('workspace_manifest_limit');
        const file=await open(absolute,constants.O_RDONLY|constants.O_NOFOLLOW);let bytes:Buffer;
        try {const opened=await file.stat();if(opened.ino!==info.ino||opened.dev!==info.dev||!opened.isFile())throw new Error(`workspace_changed_during_snapshot: ${path}`);bytes=await file.readFile();}finally{await file.close();}const after=await lstat(absolute);
        if(after.size!==info.size||after.mtimeMs!==info.mtimeMs||after.ino!==info.ino||after.isSymbolicLink())throw new Error(`workspace_changed_during_snapshot: ${path}`);
        files[path]={kind:'file',mode:info.mode&0o7777,bytes:bytes.length,content_digest:hashBytes(bytes)};
      }else throw new Error(`unsupported_file_kind: ${path}`);
    }
  }
  await walk(root);
  const index:Record<string,string>={};let head:string|null=null;let controls:string|null=null;
  let isGit=false;try {isGit=(await git(root,['rev-parse','--show-toplevel'])).trim()===root;}catch{/* An exported evaluation workspace need not be a Git checkout. */}
  if(isGit){
    for(const entry of (await git(root,['ls-files','--stage','-z'])).split('\0').filter(Boolean)){
      const split=entry.indexOf('\t');const path=safePath(entry.slice(split+1));index[path]=(index[path]??'')+entry.slice(0,split)+'\n';
    }
    try {head=(await git(root,['rev-parse','HEAD'])).trim();}catch{head='unborn';}
    const gitDir=(await git(root,['rev-parse','--absolute-git-dir'])).trim();
    const controlFiles:Record<string,string>={};
    for(const name of ['config','HEAD']){try{controlFiles[name]=hashBytes(await readFile(join(gitDir,name)));}catch{/* Unborn/worktree repositories can omit local config. */}}
    try{for(const name of (await readdir(join(gitDir,'hooks'))).sort())controlFiles[`hooks/${name}`]=hashBytes(await readFile(join(gitDir,'hooks',name)));}catch{/* No hooks directory in a linked worktree. */}
    controls=digest(controlFiles);
  }
  const body={root,files,index,git_head:head,git_controls:controls};return {...body,content_digest:digest(body)};
}
export function changedPaths(before:WorkspaceSnapshot,after:WorkspaceSnapshot):string[]{
  if(before.root!==after.root)throw new Error('workspace_root_changed');
  return [...new Set([...Object.keys(before.files),...Object.keys(after.files),...Object.keys(before.index),...Object.keys(after.index)])].filter(path=>digest(before.files[path]??null)!==digest(after.files[path]??null)||before.index[path]!==after.index[path]).sort();
}
const observableProtectedPaths:readonly [RegExp,string][]=[
  [/(^|\/)(auth|authentication|authorization|permissions)(\/|[._-]|$)/i,'authentication'],
  [/(^|\/)(secrets?|crypto|cryptography)(\/|[._-]|$)/i,'secrets'],
  [/(^|\/)(migration[s]?|schema)(\/|[._-]|$)/i,'database_schema'],
  [/(^|\/)(billing|payments?)(\/|[._-]|$)/i,'payments'],
  [/(^|\/)(package(-lock)?\.json|.*\.lock)$/i,'dependency_boundary'],
  [/(^|\/)(terraform|production|infra)(\/|[._-]|$)/i,'production_infrastructure'],
];
export function inspectChanges(before:WorkspaceSnapshot,after:WorkspaceSnapshot,order:WorkOrder,policy:Policy){
  const paths=changedPaths(before,after);const violations:string[]=[];const postSignals=new Set<string>();
  if(before.git_head!==after.git_head||before.git_controls!==after.git_controls)violations.push('git_control_changed');
  for(const path of paths){
    if(!order.allowed_paths.some(pattern=>matchesPath(path,pattern)))violations.push(`outside_allowed_scope: ${path}`);
    if(order.forbidden_paths.some(pattern=>matchesPath(path,pattern)))violations.push(`forbidden_change: ${path}`);
    if(path==='.foreman'||path.startsWith('.foreman/'))violations.push(`protected_control_path: ${path}`);
    for(const [pattern,signal] of observableProtectedPaths)if(pattern.test(path)&&policy.risk_signals[signal]!==undefined)postSignals.add(signal);
    for(const rule of order.protected_paths)if(matchesPath(path,rule.path))postSignals.add(rule.signal);
    const link=after.files[path]?.link_target;
    if(link!==undefined){const target=relative(after.root,resolve(after.root,path,'..',link));if(!order.allowed_paths.some(pattern=>matchesPath(target,pattern))||order.forbidden_paths.some(pattern=>matchesPath(target,pattern)))violations.push(`symlink_target_outside_scope: ${path}`);}
  }
  const risk=classifyRisk({policy,taskClassId:order.task_class_id,preSignals:order.pre_signals,postSignals:[...postSignals]});
  return {paths,violations,risk,artifact_digest:after.content_digest};
}
