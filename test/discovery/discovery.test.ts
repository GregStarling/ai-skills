import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parseOfficialModels,enumerateCandidates,discover} from '../../src/discovery/index.js';
import {contentDigest} from '../../src/core/canonical.js';

describe('official metadata discovery',()=>{
 it('extracts versioned model facts and API price basis while keeping availability unknown',()=>{
  const source={url:'https://developers.openai.com/api/docs/models/example.md',kind:'openai_model' as const,version:'test'};
  const body='Model ID: `example`\n`reasoning.effort` supports `low`, `high`.\n- Default snapshot: `example-2026`\n- 1,050,000 context window\n- Input modalities: text, image\n- Output modalities: text\n| Input | $10 | 1M tokens |\n| Cached input | $1 | 1M tokens |\n| Output | $50 | 1M tokens |\n## Supported features\n- function_calling\n\n## Other';
  const [model]=parseOfficialModels(source,body);
  expect(model).toMatchObject({snapshot_id:'example-2026',supported_efforts:['low','high'],context_window_tokens:1050000,account_availability:'unknown',pricing:{input_per_million:10,cached_input_per_million:1,output_per_million:50,basis:'published_api_standard_not_subscription'}});
  expect(parseOfficialModels(source,'provider layout changed')).toEqual([]);
  expect(parseOfficialModels(source,'Model ID: `example`')[0]).toMatchObject({supported_efforts:null,context_window_tokens:null,snapshot_id:null});
 });
 it('reads Claude overview table without inventing undocumented efforts or pinning',()=>{
  const source={url:'https://platform.claude.com/docs/en/about-claude/models/overview',kind:'claude_models' as const,version:'test'};
  const body='<table><tr><td>Claude API ID</td><td><code>claude-example</code></td></tr><tr><td>Default effort</td><td>high</td></tr><tr><td>Context window</td><td>1M tokens</td></tr><tr><td>Pricing</td><td>$10 / input MTok $50 / output MTok</td></tr></table>';
  expect(parseOfficialModels(source,body)[0]).toMatchObject({model_id:'claude-example',snapshot_id:null,supported_efforts:['high'],pricing:{input_per_million:10,output_per_million:50}});
 });
 it('enumerates material settings once and excludes unavailable metadata',()=>{
  const registry=JSON.parse(readFileSync('fixtures/synthetic/registry/registry.json','utf8'));
  const record=registry.records[0];record.material_serving_settings=['fallback'];record.supported_serving_settings.json_schema=[true,false];record.content_digest=contentDigest(record);registry.content_digest=contentDigest(registry);
  const candidates=enumerateCandidates(registry);
  expect(new Set(candidates.map(c=>c.candidate_id)).size).toBe(candidates.length);
  expect(candidates.filter(c=>c.provenance.model_record_id===record.record_id).length).toBe(record.supported_efforts.length*record.supported_serving_settings.fallback.length);
  record.lifecycle='unknown';record.content_digest=contentDigest(record);registry.content_digest=contentDigest(registry);
  expect(enumerateCandidates(registry).some(c=>c.provenance.model_record_id===record.record_id)).toBe(false);
 });
 it('refuses arbitrary hosts and credentials before network traffic',async()=>{
  for(const url of ['http://127.0.0.1/','https://example.com/','https://secret@example.com/'])await expect(discover({sources:[{url,kind:'official_document',version:'test'}],ledgerDirectory:'/unused'})).rejects.toThrow('DISCOVERY_');
 });
});
