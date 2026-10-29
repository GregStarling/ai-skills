#!/usr/bin/env node
// Structural lint for skill folders: size, reference hygiene, name and description rules.
// Usage: node scripts/lint-skills.mjs [skills-dir]   (default: ./skills). Exit 1 when any FAIL is found.
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {resolve,join,relative,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parse} from 'yaml';

// Files that are human overviews or bundled assets, not guidance Claude loads on demand.
const notReference=new Set(['SKILL.md','README.md','LICENSE.md','CHANGELOG.md']);
const whenCue=/\b(when|whenever|before|after|if|during|once|while|unless|for)\b/i;
const vagueCue=/\bwhen relevant\b|\bas needed\b|\bif needed\b|\bfurther reading\b/i;

function markdownFiles(directory){
 const out=[];
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory()){if(entry.name!=='node_modules'&&!entry.name.startsWith('.'))out.push(...markdownFiles(path));}
  else if(entry.name.endsWith('.md'))out.push(path);
 }
 return out;
}

// A TOC is a "Contents" heading, or three or more in-page anchor links, within the first 25 lines.
function hasToc(text){
 const top=text.split('\n').slice(0,25).join('\n');
 return /^#{1,6}\s*(table of )?contents\b/im.test(top)||(top.match(/\]\(#[^)]+\)/g)??[]).length>=3;
}

// Sentences and list items of `text` that mention `rel` as a link target, a backticked path, or a bare filename.
// A list item shaped "Condition: [link]" counts as stating its own condition.
function mentioningChunks(text,rel){
 const name=basename(rel),esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp(`(\\]\\((\\./)?${esc(rel)}(#[^)]*)?\\))|(\`(\\./)?${esc(rel)}\`)|\\b${esc(name)}\\b`);
 const chunks=[];
 for(const paragraph of text.split(/\n\s*\n/)){
  const items=paragraph.split(/\n(?=\s*(?:[-*]|\d+\.)\s)/).map(item=>item.replace(/\s*\n\s*/g,' ').trim());
  for(const item of items){
   if(/^(?:[-*]|\d+\.)\s+[^[\]]{3,}:\s*\[/.test(item)){chunks.push(item);continue;}
   // Each sentence carries its predecessor: "When X is done, review. Read [file]." states its condition.
   const sentences=item.split(/(?<=[.!?])\s+(?=[A-Z[*`])/);
   chunks.push(...sentences.map((sentence,i)=>i?`${sentences[i-1]} ${sentence}`:sentence));
  }
 }
 return chunks.filter(chunk=>pattern.test(chunk));
}
const statesWhen=chunk=>!vagueCue.test(chunk)&&(whenCue.test(chunk)||/^(?:[-*]|\d+\.)\s+[^[\]]{3,}:\s*\[/.test(chunk));

export function lintSkill(folder){
 const findings=[],add=(level,rule,message)=>findings.push({level,rule,message});
 const skillPath=join(folder,'SKILL.md');
 if(!existsSync(skillPath)){add('FAIL','missing-skill-md','No SKILL.md');return findings;}
 const source=readFileSync(skillPath,'utf8'),match=/^---\n([\s\S]+?)\n---\n?/.exec(source);
 if(!match){add('FAIL','frontmatter','SKILL.md has no YAML frontmatter');return findings;}
 const meta=parse(match[1])??{},body=source.slice(match[0].length);
 const bodyLines=body.replace(/\n$/,'').split('\n').length;
 if(bodyLines>500)add('FAIL','body-length',`SKILL.md body is ${bodyLines} lines (limit 500)`);

 const name=String(meta.name??'');
 if(!name)add('FAIL','name','name is missing');
 if(name.length>64)add('FAIL','name',`name is ${name.length} characters (limit 64)`);
 if(name&&!/^[a-z0-9-]+$/.test(name))add('FAIL','name',`name '${name}' must use only lowercase letters, numbers and hyphens`);
 if(/anthropic|claude/i.test(name))add('FAIL','name',`name '${name}' contains a reserved word`);

 const description=String(meta.description??'').replace(/\s+/g,' ').trim();
 if(!description)add('FAIL','description','description is missing');
 if(description.length>1024)add('FAIL','description',`description is ${description.length} characters (limit 1024)`);
 // Quoted trigger phrases ("catch me up") are the user's words, not the description's voice.
 const person=description.replace(/"[^"]*"|“[^”]*”|`[^`]*`/g,'').match(/\b(I|I'm|I'll|me|my|we|our|you|your|you're)\b/);
 if(person)add('FAIL','description-person',`description uses first or second person ('${person[0]}')`);
 const sentences=description.split(/(?<=[.!?])\s+/);
 const when=/\b(use (it |this )?(when|whenever|for|to|automatically|before|after)|trigger(s|ed)? (on|when)|when the user)\b/i.test(description);
 const what=sentences.some(s=>!/^(use|do not|don't|trigger|activate)\b/i.test(s)&&s.split(' ').length>=4);
 if(!when)add('FAIL','description-when','description does not say when to use the skill');
 if(!what)add('FAIL','description-what','description does not say what the skill does');
 // Guidance asks for third person ("Reviews code..."). Imperative openers ("Review code...") still trigger, so this only warns.
 if(description&&/^[A-Z][a-z]+\b/.test(description)&&!/^[A-Z][a-z]+s\b/.test(description))add('WARN','description-voice',`description opens imperative ('${description.split(' ')[0]}'), not third person`);

 const references=markdownFiles(folder).filter(path=>!notReference.has(basename(path))||relative(folder,path).includes('/'));
 const refRels=references.map(path=>relative(folder,path));
 for(const path of references){
  const rel=relative(folder,path),text=readFileSync(path,'utf8'),lines=text.split('\n').length;
  if(lines>100&&!hasToc(text))add('FAIL','reference-toc',`${rel} is ${lines} lines with no table of contents at the top`);
  const mentions=mentioningChunks(body,rel);
  if(!mentions.length)add('FAIL','reference-unnamed',`SKILL.md never names ${rel}`);
  else if(!mentions.some(statesWhen))add('FAIL','reference-when',`SKILL.md names ${rel} without saying when to read it`);
  for(const other of refRels)if(other!==rel&&mentioningChunks(text,relative(join(folder,rel,'..'),join(folder,other))).length)add('FAIL','reference-depth',`${rel} points to another reference, ${other}`);
 }
 return findings;
}

export function lintSkills(root){
 return readdirSync(root).filter(name=>{const path=join(root,name);return statSync(path).isDirectory()&&existsSync(join(path,'SKILL.md'));}).sort()
  .map(name=>({skill:name,findings:lintSkill(join(root,name))}));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const root=resolve(process.argv[2]??'skills'),results=lintSkills(root);
 let fails=0,warns=0;
 for(const {skill,findings} of results){
  const f=findings.filter(x=>x.level==='FAIL').length;fails+=f;warns+=findings.length-f;
  console.log(`${f?'FAIL':'PASS'}  ${skill}${findings.length?'':'  (clean)'}`);
  for(const x of findings)console.log(`  ${x.level} [${x.rule}] ${x.message}`);
 }
 console.log(`\n${results.length} skills, ${results.filter(r=>r.findings.some(x=>x.level==='FAIL')).length} failing, ${fails} failures, ${warns} warnings`);
 process.exitCode=fails?1:0;
}
