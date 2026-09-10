import { z } from 'zod';
import { Ledger } from '../ledger/index.js';
import { digest, hashBytes } from '../core/canonical.js';
import { validateRegistry } from '../registry/index.js';
import { parseCandidate, type Candidate, type ModelRegistry } from '../schema/index.js';

const sourceSchema=z.object({url:z.url(),kind:z.enum(['openai_model','claude_models','official_document','independent_benchmark']),version:z.string().min(1)}).strict();
export const discoveryRequestSchema=z.object({sources:z.array(sourceSchema).nonempty(),ledgerDirectory:z.string().min(1)}).strict();
export type DiscoverySource=z.infer<typeof sourceSchema>;
export type DiscoveredModel={model_id:string;provider:'openai'|'anthropic';snapshot_id:string|null;supported_efforts:string[]|null;context_window_tokens:number|null;input_modalities:string[]|null;output_modalities:string[]|null;features:string[]|null;pricing:{input_per_million:number|null;cached_input_per_million:number|null;cache_write_per_million:number|null;output_per_million:number|null;basis:'published_api_standard_not_subscription';qualifiers:string[]};lifecycle:'unknown';account_availability:'unknown';source_digest:string;parser_version:'official_metadata_parser.v1'};
const text=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
const number=(s:string|undefined):number|null=>s===undefined?null:Number(s.replace(/,/g,''));
const prices=(input:number|null,output:number|null,cached:number|null=null,write:number|null=null,qualifiers:string[]=[]):DiscoveredModel['pricing']=>({input_per_million:input,cached_input_per_million:cached,cache_write_per_million:write,output_per_million:output,basis:'published_api_standard_not_subscription',qualifiers});

/** Provider-specific documented page formats. Format drift leaves facts unknown;
 * these descriptions never grant account access or performance qualification. */
export function parseOfficialModels(source:DiscoverySource,body:string):DiscoveredModel[]{
 sourceSchema.parse(source);allowedUrl(source.url,source.kind);
 const source_digest=hashBytes(body);
 if(source.kind==='openai_model'){
  const id=/^Model ID:\s*`([^`]+)`/m.exec(body)?.[1]; if(!id)return [];
  const snapshot=/^- Default snapshot:\s*`([^`]+)`/m.exec(body)?.[1]??null;
  const effort=/`reasoning\.effort` supports ([^\n]+)/.exec(body)?.[1];
  const price=(label:string)=>number(new RegExp(`\\| ${label} \\| \\$([\\d.]+) \\| 1M tokens \\|`).exec(body)?.[1]);
  const modalities=(kind:string)=>new RegExp(`^- ${kind} modalities: (.+)$`,'m').exec(body)?.[1]?.split(',').map(v=>v.trim())??null;
  const features=/## Supported features\s+([\s\S]*?)(?:\n##|$)/.exec(body)?.[1];
  return [{model_id:id,provider:'openai',snapshot_id:snapshot,supported_efforts:effort?[...effort.matchAll(/`([^`]+)`/g)].map(m=>m[1]!):null,context_window_tokens:number(/^- ([\d,]+) context window/m.exec(body)?.[1]),input_modalities:modalities('Input'),output_modalities:modalities('Output'),features:features?[...features.matchAll(/^- ([\w_]+)$/gm)].map(m=>m[1]!):null,pricing:prices(price('Input'),price('Output'),price('Cached input'),price('Cache writes'),body.split('\n').filter(l=>/priced at|billed at|fee per tool/.test(l))),lifecycle:'unknown',account_availability:'unknown',source_digest,parser_version:'official_metadata_parser.v1'}];
 }
 if(source.kind==='claude_models'){
  const table=[...body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)].map(m=>m[1]!).find(s=>s.includes('Claude API ID'));if(!table)return [];
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(m=>[...m[1]!.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)].map(c=>text(c[1]!)));
  const row=(label:string)=>rows.find(r=>r[0]?.startsWith(label));
  const ids=row('Claude API ID');if(!ids)return [];
  return ids.slice(1).flatMap((id,index)=>{
   if(!/^claude-[a-z0-9-]+$/.test(id))return [];
   const i=index+1,context=row('Context window')?.[i];const count=context?/([\d.]+)([MK]) tokens/.exec(context):null;
   const price=row('Pricing')?.[i]??'',effort=row('Default effort')?.[i];
   return {model_id:id,provider:'anthropic',snapshot_id:null,supported_efforts:effort&&/^(low|medium|high|xhigh|max)$/.test(effort)?[effort]:null,context_window_tokens:count?Number(count[1])*(count[2]==='M'?1e6:1e3):null,input_modalities:null,output_modalities:null,features:null,pricing:prices(number(/\$([\d.]+) \/ input MTok/.exec(price)?.[1]),number(/\$([\d.]+) \/ output MTok/.exec(price)?.[1]),null,null,['Overview headline rates only; caching, context and service-tier modifiers require pricing source.']),lifecycle:'unknown',account_availability:'unknown',source_digest,parser_version:'official_metadata_parser.v1'};
  });
 }
 return [];
}
function allowedUrl(value:string,kind:DiscoverySource['kind']):URL{
 const url=new URL(value);if(url.protocol!=='https:'||url.username||url.password||url.port)throw new Error('DISCOVERY_REQUIRES_PUBLIC_HTTPS');
 const official=['developers.openai.com','platform.openai.com','learn.chatgpt.com','platform.claude.com','code.claude.com','docs.anthropic.com','www.anthropic.com','anthropic.com'];
 const permitted=kind==='independent_benchmark'?[...official,'artificialanalysis.ai']:official;
 if(!permitted.includes(url.hostname))throw new Error('DISCOVERY_SOURCE_NOT_APPROVED');
 if(kind==='openai_model'&&!['developers.openai.com','platform.openai.com'].includes(url.hostname)||kind==='claude_models'&&!['platform.claude.com','docs.anthropic.com'].includes(url.hostname))throw new Error('DISCOVERY_PROVIDER_SOURCE_MISMATCH');
 return url;
}
async function retrieve(source:DiscoverySource):Promise<{body:string;final_url:string}>{
 let url=allowedUrl(source.url,source.kind);
 for(let hop=0;hop<4;hop++){
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20_000),headers:{'user-agent':'Model-Governor/1.0 (documentation discovery)'}});
  if(response.status>=300&&response.status<400){const next=response.headers.get('location');if(!next)throw new Error('DISCOVERY_REDIRECT_WITHOUT_LOCATION');url=allowedUrl(new URL(next,url).href,source.kind);continue;}
  if(!response.ok)throw new Error(`DISCOVERY_HTTP_${response.status}`);
  if(!response.body)throw new Error('DISCOVERY_EMPTY_RESPONSE');
  const chunks:Uint8Array[]=[];let size=0;for await(const chunk of response.body){size+=chunk.byteLength;if(size>4*1024*1024){throw new Error('DISCOVERY_SOURCE_TOO_LARGE');}chunks.push(chunk);}
  const body=Buffer.concat(chunks).toString('utf8');if(!body.trim())throw new Error('DISCOVERY_EMPTY_RESPONSE');return {body,final_url:url.href};
 }
 throw new Error('DISCOVERY_TOO_MANY_REDIRECTS');
}
export async function discover(input:unknown){
 const request=discoveryRequestSchema.parse(input),ledger=new Ledger(request.ledgerDirectory);
 const results=[];
 for(const source of request.sources){
  // Reject invalid authority before any traffic; inaccessible valid sources are retained as observations.
  allowedUrl(source.url,source.kind);
  const retrieved_at=new Date().toISOString();
  try{
   const raw=await retrieve(source),models=parseOfficialModels(source,raw.body);
   const payload={schema_version:'discovery_observation.v1',source,retrieved_at,final_url:raw.final_url,source_digest:hashBytes(raw.body),body:raw.body,models,qualification_authority:false};
   const record=await ledger.append({id:`discovery_${digest(payload).slice(7)}`,provenance:{source:source.url,observed_at:retrieved_at,methodology:source.version},payload});
   results.push({url:source.url,status:'retrieved' as const,record_id:record.record.id,source_digest:payload.source_digest,models});
  }catch(error){
   const message=error instanceof Error?error.message:String(error);const payload={source,retrieved_at,status:'blocked',reason:message};
   const record=await ledger.append({id:`discovery_${digest(payload).slice(7)}`,provenance:{source:source.url,observed_at:retrieved_at,methodology:source.version},payload});
   results.push({url:source.url,status:'blocked' as const,record_id:record.record.id,reason:message,models:[]});
  }
 }
 return {schema_version:'discovery_result.v1',results,qualification_authority:false};
}

/** Enumerate meaningful treatment differences only from an independently admitted
 * registry. Discovery descriptions alone never become dispatchable bindings. */
export function enumerateCandidates(input:unknown):Candidate[]{
 const registry:ModelRegistry=validateRegistry(input);const candidates:Candidate[]=[];
 for(const record of registry.records){
  if(record.lifecycle!=='available'||record.pinning?.verified!==true||record.pinning.immutable_snapshot!==true)continue;
  for(const effort of record.supported_efforts)for(const fallback of record.supported_serving_settings.fallback)for(const tool_use of record.supported_serving_settings.tool_use)for(const json_schema of record.supported_serving_settings.json_schema){
   const serving={fallback,tool_use,json_schema};const material=Object.fromEntries(record.material_serving_settings.map(k=>[k,serving[k]]));
   const identity=digest({provider:record.provider,snapshot:record.snapshot_id,effort,material});
   if(candidates.some(c=>c.candidate_id===`candidate_${identity.slice(7,31)}`))continue;
   candidates.push(parseCandidate({schema_version:'candidate.v1',candidate_id:`candidate_${identity.slice(7,31)}`,provider:record.provider,model_id:record.model_id,snapshot_id:record.snapshot_id,effort,serving,material_serving_settings:record.material_serving_settings,provenance:{registry_id:registry.registry_id,model_record_id:record.record_id,registry_content_digest:registry.content_digest}}));
  }
 }
 return candidates;
}
