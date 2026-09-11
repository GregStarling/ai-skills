import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {buildProvisionalPilotRoutes,compileRoutingPack,validateRoutingPackPublication,assertEntriesOutlivePack} from '../dist/routing/index.js';
import {loadPolicy} from '../dist/governance/index.js';
import {requireFrontierRefresh} from '../dist/routing/frontier-refresh.js';

// Maintainer compilation of the explicitly scoped pilot; this does not run in the consumer.
const observations=JSON.parse(readFileSync('data/routing/host-observations.json','utf8'));
const acceptance=JSON.parse(readFileSync('data/routing/installed-acceptance.json','utf8'));
const mediumAudit=JSON.parse(readFileSync('data/routing/medium-smoke-audit.json','utf8'));
const policy=loadPolicy('policy/constitution.json');
const admissionsPath='data/routing/reviewer-calibration/admissions.json';
const admissions=existsSync(admissionsPath)?JSON.parse(readFileSync(admissionsPath,'utf8')).admissions.map(row=>{
 if(!['claude','codex'].includes(row.host))throw Error('INVALID_ADMISSION_HOST');
 const entry=JSON.parse(readFileSync(`data/routing/reviewer-calibration/${row.host}.json`,'utf8'));
 if(entry.report_digest!==row.report_digest||entry.report.target.host!==row.host)throw Error('ADMISSION_INDEX_MISMATCH');
 return entry;
}):[];
const provisional=buildProvisionalPilotRoutes(observations,acceptance,mediumAudit,{routingPack:policy.routing_pack,admissions});
requireFrontierRefresh(
  JSON.parse(readFileSync('data/routing/frontier-targets.json','utf8')),
  JSON.parse(readFileSync('data/routing/frontier-probes.json','utf8')),
  new Date().toISOString(),policy.routing_pack.refresh_after_days,
  JSON.parse(readFileSync('data/routing/frontier-identity-evidence.json','utf8')),
);
const pack=validateRoutingPackPublication(compileRoutingPack({mode:'production',policy,strata:[],provisional}));
if(!process.argv.includes('--allow-short-entries'))assertEntriesOutlivePack(pack,24);
// One treatment and route per line supports selective native file search.
const {treatments,routes,...metadata}=pack;
writeFileSync('skills/delegate/routing-pack.json',JSON.stringify(metadata,null,2).replace(/\n}$/ ,',\n')+'  "treatments": {\n'+Object.entries(treatments).map(([identity,treatment])=>'    '+JSON.stringify(identity)+': '+JSON.stringify(treatment)).join(',\n')+'\n  },\n  "routes": [\n'+routes.map(route=>'    '+JSON.stringify(route)).join(',\n')+'\n  ]\n}\n');
console.log(JSON.stringify({status:'COMPILED',routes:routes.length,qualified:routes.flatMap(r=>r.workers).filter(t=>t.evidence_tier==='qualified').length,content_digest:pack.content_digest}));
