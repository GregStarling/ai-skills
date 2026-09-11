import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,cpSync,readdirSync,lstatSync,rmSync} from 'node:fs';
import {resolve,join,dirname,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {parse} from 'yaml';
import {folderDigest} from '../../skills/delegate/scripts/local-learning.mjs';
const root=resolve(process.env.SKILLS_ROOT||resolve(import.meta.dirname,'../..'));
for(const name of ['delegate','refresh-models']){
 const source=readFileSync(resolve(root,'skills',name,'SKILL.md'),'utf8'),match=/^---\n([\s\S]+?)\n---\n/.exec(source);assert.ok(match);
 const metadata=parse(match[1]);assert.deepEqual(Object.keys(metadata).sort(),['description','name']);assert.equal(metadata.name,name);assert.ok(metadata.description.length>30);assert.ok(!/TODO|\[INSERT|\[TODO/.test(source));
}
for(const path of ['.claude/skills','.codex/skills','.agents/skills'])assert.equal(existsSync(resolve(root,path)),false,'Library source must stay inert in this checkout.');
// Copy only the consumer directory, so a link cannot accidentally depend on the maintainer checkout.
const temporary=mkdtempSync(join(tmpdir(),'delegate-package-')),copy=join(temporary,'delegate');
const files=[];
try{
 cpSync(resolve(root,'skills/delegate'),copy,{recursive:true});
 const inside=path=>{const rel=relative(copy,path);return rel!=='..'&&!rel.startsWith('../')&&!isAbsolute(rel);};
 function inspect(directory){for(const name of readdirSync(directory)){
  const path=join(directory,name),stat=lstatSync(path);assert.equal(stat.isSymbolicLink(),false,'Consumer pack cannot depend on external symlinks');
  if(stat.isDirectory()){inspect(path);continue;}assert.ok(stat.isFile());files.push(relative(copy,path));
  const source=readFileSync(path,'utf8'),file=relative(copy,path);
  // The consumer folder ships without package.json: only node: builtins and relative files may be imported.
  if(/\.(mjs|d\.mts)$/.test(path))for(const [,specifier] of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g))assert.ok(/^(node:|\.)/.test(specifier),`Consumer helper must import only node: or relative modules: ${file} imports '${specifier}'`);
  if(!path.endsWith('.md'))continue;
  for(const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
   const target=match[1];if(/^(https?:|#)/.test(target))continue;
   const linked=resolve(dirname(path),target.split('#')[0]);
   assert.ok(inside(linked),`External consumer dependency: ${target}`);assert.ok(existsSync(linked),`Missing copied reference: ${target}`);
  }
  // Backtick-quoted .md/.mjs paths are references too: try the containing directory, then the folder root.
  for(const [,quoted] of source.matchAll(/`([^`\n]+)`/g)){
   if(!/^[A-Za-z0-9_./-]+\.(md|mjs)$/.test(quoted)||quoted.includes('http'))continue;
   assert.ok([resolve(dirname(path),quoted),resolve(copy,quoted)].some(candidate=>inside(candidate)&&existsSync(candidate)),`Backtick path must resolve inside the consumer folder: \`${quoted}\` in ${file}`);
  }
 }}inspect(copy);
 const skill=readFileSync(join(copy,'SKILL.md'),'utf8'),problems=[];
 for(const word of new Set([...skill.matchAll(/stratum|cohort|identity assurance|smoke extrapolation|retained incumbent|API-equivalent|Foreman|governor/gi)].map(match=>match[0])))problems.push(`banned vocabulary '${word}'`);
 // The route.scope sentence is quoted verbatim in the plan with backticks around route.scope; accept both spellings.
 for(const [sentence,pattern] of [['fit route.scope',/fit `?route\.scope`?/],['never relabel it eligible',/never relabel it eligible/]])if(!pattern.test(skill))problems.push(`missing safety sentence '${sentence}'`);
 assert.equal(problems.length,0,`SKILL.md guard failed: ${problems.join('; ')}`);
 const pack=JSON.parse(readFileSync(join(copy,'routing-pack.json'),'utf8'));assert.equal(pack.schema_version,'routing_pack.v3');assert.equal(pack.mode,'production');
 for(const route of pack.routes)for(const ref of [...route.workers,...route.reviewers])assert.ok(Object.hasOwn(pack.treatments,ref.candidate_identity),'Copied treatment reference must resolve');
 // The status index must describe the pack and folder that actually ship; a recompile or any consumer edit without updating it fails here.
 const status=readFileSync(resolve(root,'docs/validation-status.md'),'utf8'),shipped=await folderDigest(copy);
 for(const [what,value] of [['pack content_digest',pack.content_digest],['consumer folder digest',shipped]])assert.ok(status.includes(value),`docs/validation-status.md must cite the current ${what} ${value}`);
 console.log(JSON.stringify({schema_version:'portable_skills_check.v1',status:'passed',skills:['delegate','refresh-models'],inert:true,copied_consumer_files:files.sort(),scope:'source_structure_and_reference_closure_only',behavioral_validation_required:true}));
}finally{rmSync(temporary,{recursive:true,force:true});}
