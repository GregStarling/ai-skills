import {readFileSync,writeFileSync} from 'node:fs';
import {compileRoutingPack,validateRoutingPackPublication} from '../dist/routing/index.js';
import {loadPolicy} from '../dist/governance/index.js';

// Maintainer compilation of the explicitly scoped pilot; this does not run in the consumer.
const observations=JSON.parse(readFileSync('data/routing/host-observations.json','utf8'));
const scopes={
 repo_exploration:'Read and explain a small local JavaScript/HTML codebase with file evidence.',
 mechanical_work:'Specified local JavaScript API renames and equivalent mechanical changes.',
 bounded_implementation:'Contained local JavaScript functions with settled interfaces and executable checks.',
 ui_implementation:'Small plain HTML/CSS interfaces with a frontier-provided specification and rendered acceptance.',
 hard_debugging:'Local JavaScript logic and asynchronous ordering bugs with a deterministic reproduction.',
 complex_implementation:'Small multi-file JavaScript features with settled contracts and integration checks.',
 research:'Analysis of supplied local source files or supplied facts with frontier verification; no claim of web-research evaluation.',
};
const provisional=[];
for(const host of ['codex','claude']){
 const treatments=observations.treatments.filter(t=>t.evidence.host===host);
 const workers=treatments.filter(t=>t.evidence.smoke.task.startsWith('tinybug:')),reviewers=treatments.filter(t=>t.frontier&&t.evidence.smoke.task.startsWith('independently'));
 for(const [publicTaskClass,scope] of Object.entries(scopes)){
  provisional.push({publicTaskClass,scope:`${host} pilot: ${scope} Initially admitted from a successful tiny-bug host smoke plus official metadata; task fit beyond that smoke is provisional extrapolation, not general qualification.`,risk:'low',requirements:{tools:['terminal'],capabilities:['terminal'],context_window_tokens:0,fresh_context:false},workers,reviewers});
 }
}
const policy=loadPolicy('policy/constitution.json');
const pack=validateRoutingPackPublication(compileRoutingPack({mode:'production',policy,strata:[],provisional}));
// One route per line lets native file-search tools retrieve only the relevant host/class.
const {routes,...metadata}=pack;
writeFileSync('skills/delegate/routing-pack.json',JSON.stringify(metadata,null,2).replace(/\n}$/ ,',\n')+'  "routes": [\n'+routes.map(route=>'    '+JSON.stringify(route)).join(',\n')+'\n  ]\n}\n');
console.log(JSON.stringify({status:'COMPILED',routes:routes.length,qualified:routes.flatMap(r=>r.workers).filter(t=>t.evidence_tier==='qualified').length,content_digest:pack.content_digest}));
