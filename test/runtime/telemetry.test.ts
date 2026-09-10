import { expect, it } from "vitest";
import { nativeEnvironment, observedAssistantModel, parseNativeTelemetry } from "../../src/runtime/index.js";
import { parseCandidate } from "../../src/schema/index.js";
import { readFileSync } from "node:fs";
const lines = (...values: unknown[]) => values.map((value) => JSON.stringify(value)).join("\n");
it("uses observed Claude identities, deduplicates messages and keeps final cumulative cost estimate", () => {
  const message = { type: "assistant", session_id: "session-one", message: { id: "message-one", model: "release-one", usage: { input_tokens: 10, output_tokens: 2 } } };
  const result = parseNativeTelemetry("anthropic", lines(message, message, { type: "result", total_cost_usd: 0.3 }, { type: "result", subtype: "success", result: "done", total_cost_usd: 0.5, modelUsage: { "release-one": {} } }), "release-one");
  expect(result).toMatchObject({ session_id: "session-one", identity_status: "matched", input_tokens: 10, output_tokens: 2, cost_usd: 0.5, cost_source: "provider_estimate", result_text: "done" });
  expect(parseNativeTelemetry("anthropic", lines(message, { type: "result", modelUsage: { "other-release": {} } }), "release-one").identity_status).toBe("mixed");
});
it("never treats Codex requested model/config or absent cost as observed identity/free work", () => {
  const result = parseNativeTelemetry("openai", lines({ type: "thread.started", thread_id: "thread-one", model: "release-one" }, { type: "turn.completed", usage: { input_tokens: 3, output_tokens: 2 } }, { type: "item.completed", item: { type: "agent_message", text: "done" } }), "release-one");
  expect(result).toMatchObject({ session_id: "thread-one", identity_status: "unknown", cost_usd: null, cost_source: "unknown", input_tokens: 3, output_tokens: 2, result_text: "done" });
  expect(parseNativeTelemetry("openai", "not json", "release-one").malformed_events).toBe(1);
});
it.each(['<synthetic>', '<error>', 'synthetic', 'error', 'unknown', 'unavailable', 'null', 'undefined', 'none', 'N/A', '', ' '])("rejects placeholder identity %j in messages and usage summaries", model => {
  const result = parseNativeTelemetry('anthropic', lines({type:'assistant',message:{model}}, {type:'result',modelUsage:{[model]:{}}}), 'claude-fable-5-1');
  expect(result).toMatchObject({observed_model_ids:[],identity_status:'unknown'});
  expect(observedAssistantModel({type:'assistant',message:{model}})).toBeNull();
});
it("retains the exact unavailable-model error without treating its synthetic envelope as execution", () => {
  const error = "API Error: 400 Claude Code 2.1.222 does not support this model; version 2.1.251 or newer is required. Run 'claude update', or update the Claude desktop app, then try again.";
  const failure = {type:'assistant',is_api_error_message:true,error:'unknown',message:{model:'<synthetic>',content:[{type:'text',text:error}]}};
  const result = parseNativeTelemetry('anthropic', lines(failure,{type:'result',is_error:true,subtype:'error_during_execution',result:error,modelUsage:{'<synthetic>':{},'claude-haiku-4-5-20251001':{inputTokens:42}}}), 'claude-fable-5-1');
  expect(result).toMatchObject({observed_model_ids:[],identity_status:'unknown',provider_error:true,result_text:error});
  expect(observedAssistantModel({...failure,message:{model:'claude-fable-5-1'}})).toBeNull();
  expect(parseNativeTelemetry('anthropic',lines(failure),'claude-fable-5-1').provider_error).toBe(true);
});
it("keeps real identities when placeholder events surround an actual response", () => {
  const actual={type:'assistant',message:{model:'claude-opus-5'}};
  expect(observedAssistantModel(actual)).toBe('claude-opus-5');
  expect(parseNativeTelemetry('anthropic',lines({type:'assistant',message:{model:'<synthetic>'}},actual,{type:'result',modelUsage:{unknown:{},'claude-opus-5':{}}}),'claude-opus-5')).toMatchObject({observed_model_ids:['claude-opus-5'],identity_status:'matched'});
});
it("neutralizes child overrides without changing parent env or exposing their values", () => {
  const candidate = parseCandidate(JSON.parse(readFileSync("fixtures/bindings/valid-initial-backend.json", "utf8")).binding.candidate);
  const inherited = { HOME: "/home/auth", CODEX_HOME: "/home/auth/.codex", ANTHROPIC_API_KEY: "secret", OPENAI_BASE_URL: "private-proxy", CLAUDE_CODE_OAUTH_TOKEN: "oauth-existing", CLAUDE_CODE_EFFORT_LEVEL: "wrong" };
  const before = { ...inherited }; const child = nativeEnvironment("anthropic", candidate, inherited);
  expect(inherited).toEqual(before); expect(child.env["HOME"]).toBe(inherited.HOME); expect(child.env["CODEX_HOME"]).toBe(inherited.CODEX_HOME); expect(child.env["CLAUDE_CODE_OAUTH_TOKEN"]).toBe(inherited.CLAUDE_CODE_OAUTH_TOKEN);
  expect(child.env["ANTHROPIC_API_KEY"]).toBeUndefined(); expect(child.env["OPENAI_BASE_URL"]).toBeUndefined(); expect(child.env["CLAUDE_CODE_EFFORT_LEVEL"]).toBe(candidate.effort); expect(child.overrideNames).not.toContain("secret");
});
