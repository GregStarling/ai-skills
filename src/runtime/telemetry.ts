import type { NativeProvider } from "../adapters/shared.js";
export type NativeTelemetry = { result_text: string | null; session_id: string | null; observed_model_ids: string[]; identity_status: "matched" | "unknown" | "mixed" | "mismatched"; cost_usd: number | null; cost_source: "provider_estimate" | "unknown"; input_tokens: number | null; output_tokens: number | null; malformed_events: number; provider_error: boolean };
const object = (value: unknown): Record<string, unknown> | null => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
const finite = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const modelIdentity = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9][a-z0-9._:/@-]*$/i.test(value) && !/^(synthetic|error|unknown|unavailable|undefined|null|none|placeholder|n\/a)$/i.test(value);
/** Error envelopes may echo a requested model or use a synthetic placeholder. Neither is serving evidence. */
export function observedAssistantModel(value: unknown): string | null {
  const event = object(value), message = object(event?.["message"]);
  if (event?.["type"] !== "assistant" || event["is_api_error_message"] === true || event["is_error"] === true || event["error"]) return null;
  return modelIdentity(message?.["model"]) ? message["model"] : null;
}
export function parseNativeTelemetry(provider: NativeProvider, stdout: string, requestedModel: string): NativeTelemetry {
  const models = new Set<string>(); const messageIds = new Set<string>();
  let text: string | null = null, session: string | null = null, cost: number | null = null, inputTokens: number | null = null, outputTokens: number | null = null, malformed = 0, providerError = false;
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event: Record<string, unknown> | null;
    try { event = object(JSON.parse(line)); } catch { malformed++; continue; }
    if (!event) { malformed++; continue; }
    if (typeof event["session_id"] === "string") session = event["session_id"];
    if (event["type"] === "thread.started" && typeof event["thread_id"] === "string") session = event["thread_id"];
    if (provider === "anthropic") {
      const message = object(event["message"]);
      if (event["is_api_error_message"] === true || event["is_error"] === true || event["type"] === "error") providerError = true;
      if (event["type"] === "assistant" && message) {
        const model = observedAssistantModel(event); if (model !== null) models.add(model);
        const id = typeof message["id"] === "string" ? message["id"] : null;
        if (id !== null && !messageIds.has(id)) {
          messageIds.add(id); const usage = object(message["usage"]);
          if (usage) { const incoming = finite(usage["input_tokens"]), outgoing = finite(usage["output_tokens"]); if (incoming !== null) inputTokens = (inputTokens ?? 0) + incoming; if (outgoing !== null) outputTokens = (outputTokens ?? 0) + outgoing; }
        }
      }
      if (event["type"] === "result") {
        if (typeof event["result"] === "string") text = event["result"];
        if (event["structured_output"] !== undefined) text = JSON.stringify(event["structured_output"]);
        const reported = finite(event["total_cost_usd"]); if (reported !== null) cost = reported; // final cumulative estimate, never sum
        const modelUsage = object(event["modelUsage"]);
        // Failed results can include auxiliary-model usage despite no requested-model execution.
        if (modelUsage && event["is_error"] !== true && (event["subtype"] === undefined || event["subtype"] === "success")) for (const key of Object.keys(modelUsage)) if (modelIdentity(key)) models.add(key);
        if (event["is_error"] === true || (typeof event["subtype"] === "string" && event["subtype"] !== "success")) providerError = true;
      }
    } else {
      if (event["type"] === "turn.completed") {
        const usage = object(event["usage"]); const incoming = finite(usage?.["input_tokens"]), outgoing = finite(usage?.["output_tokens"]);
        if (incoming !== null) inputTokens = (inputTokens ?? 0) + incoming; if (outgoing !== null) outputTokens = (outputTokens ?? 0) + outgoing;
      }
      const item = object(event["item"]);
      if (event["type"] === "item.completed" && item?.["type"] === "agent_message" && typeof item["text"] === "string") text = item["text"];
      // No documented Codex CLI served-model attestation: requested/config model fields are ignored.
      if (event["type"] === "turn.failed" || event["type"] === "error") providerError = true;
    }
  }
  const observed = [...models].sort();
  return { result_text: text, session_id: session, observed_model_ids: observed, identity_status: observed.length === 0 ? "unknown" : observed.length > 1 ? "mixed" : observed[0] === requestedModel ? "matched" : "mismatched", cost_usd: cost, cost_source: cost === null ? "unknown" : "provider_estimate", input_tokens: inputTokens, output_tokens: outputTokens, malformed_events: malformed, provider_error: providerError };
}
