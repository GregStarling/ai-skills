import {z} from 'zod';
import {hashBytes} from '../core/canonical.js';

export const sourcesSchema=z.record(z.string().regex(/^sha256:[a-f0-9]{64}$/),z.union([z.string(),z.object({encoding:z.literal('base64'),data:z.string()}).strict()]));
export function encodeSources(sources:ReadonlyMap<string,string|Uint8Array>){return Object.fromEntries([...sources].map(([key,value])=>[key,typeof value==='string'?value:{encoding:'base64' as const,data:Buffer.from(value).toString('base64')}]));}
export function decodeSources(value:unknown):Map<string,string|Uint8Array>{
 return new Map(Object.entries(sourcesSchema.parse(value)).map(([key,value])=>{
  const bytes=typeof value==='string'?value:Buffer.from(value.data,'base64');
  if(typeof value!=='string'&&Buffer.from(bytes).toString('base64')!==value.data)throw new Error('EVALUATION_SOURCE_ENCODING_INVALID');
  if(hashBytes(bytes)!==key)throw new Error('EVALUATION_SOURCE_DIGEST_MISMATCH');
  return [key,bytes];
 }));
}
