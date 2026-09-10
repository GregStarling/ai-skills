import { existsSync, lstatSync, realpathSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { homedir } from "node:os";
import { parse as parseYaml } from "yaml";
import TOML from "@iarna/toml";
import { canonicalJson, digest, hashBytes } from "../core/canonical.js";
import { parseBinding, type Binding } from "../schema/index.js";
import { validateBinding, type SelectionInput } from "../governance/index.js";

export type NativeProvider = "anthropic" | "openai";
export const runtimeVersions = { anthropic: "2.1.267", openai: "0.154.0" } as const;
// Explicit adapter contracts; a newer version is not assumed compatible merely
// because its semantic version sorts later. Historical bundles remain readable.
export const supportedRuntimeVersions: Record<NativeProvider, readonly string[]> = {
  anthropic: ["2.1.222", runtimeVersions.anthropic], openai: ["0.142.5", runtimeVersions.openai]
};
export function supportsRuntimeVersion(provider: NativeProvider, version: string): boolean {
  return supportedRuntimeVersions[provider].includes(version);
}
export type RenderInput = { binding: unknown; selection: SelectionInput; mode: "production" | "adapter-test"; runtimeVersion: string; outputSchema?: Record<string, unknown> };
export type AdapterManifest = {
  schema_version: "adapter_manifest.v1"; provider: NativeProvider; adapter_version: "1";
  runtime_version: string; mode: "production" | "adapter-test"; binding_digest: string; policy_digest: string;
  native_config_path: string; output_schema_path: string | null; files: Record<string, string>;
  enforcement: "explicit-cli-bridge"; provider_fallback_control: "unverified";
};
export type RenderedAdapter = { manifest: AdapterManifest; files: Record<string, string> };
export function validatedRenderBinding(input: RenderInput, provider: NativeProvider): Binding {
  if (!supportsRuntimeVersion(provider, input.runtimeVersion)) throw new Error("RUNTIME_VERSION_MISMATCH");
  if (input.mode !== "production" && input.mode !== "adapter-test") throw new Error("INVALID_ADAPTER_MODE");
  if (input.selection.mode !== (input.mode === "production" ? "production" : "simulation")) throw new Error("ADAPTER_MODE_MISMATCH");
  if (input.mode === "production" && input.selection.policy.policy_version >= 4 && input.selection.request.execution_environment !== (provider === "anthropic" ? "claude_code" : "codex")) throw new Error("HOST_EXECUTION_EVIDENCE_REQUIRED: API or other-host capability cannot authorize this native adapter.");
  const validation = validateBinding(input.binding, input.selection);
  if (!validation.ok || validation.status !== "VALID") throw new Error(`BINDING_INVALID: ${validation.diagnostics.map((item) => item.rule_id).join(",") || validation.status}`);
  const binding = parseBinding(input.binding);
  if (binding.candidate.provider !== provider && !(input.mode === "adapter-test" && binding.candidate.provider === "synthetic")) throw new Error("PROVIDER_MISMATCH");
  if (binding.candidate.serving.fallback !== "disabled") throw new Error("UNSUPPORTED_FALLBACK_CONFIGURATION: an explicit fallback treatment is not implemented.");
  if (binding.candidate.serving.tool_use === "provider_tools") throw new Error("UNSUPPORTED_PROVIDER_TOOLS");
  if (binding.candidate.serving.json_schema && input.outputSchema === undefined) throw new Error("OUTPUT_SCHEMA_REQUIRED");
  if (!binding.candidate.serving.json_schema && input.outputSchema !== undefined) throw new Error("UNDECLARED_OUTPUT_SCHEMA");
  return binding;
}
export function finishRender(input: RenderInput, provider: NativeProvider, binding: Binding, nativePath: string, files: Record<string, string>): RenderedAdapter {
  const outputSchemaPath = input.outputSchema === undefined ? null : "output.schema.json";
  if (outputSchemaPath !== null) files[outputSchemaPath] = `${canonicalJson(input.outputSchema)}\n`;
  return { files, manifest: { schema_version: "adapter_manifest.v1", provider, adapter_version: "1", runtime_version: input.runtimeVersion, mode: input.mode, binding_digest: digest(binding), policy_digest: binding.policy_digest, native_config_path: nativePath, output_schema_path: outputSchemaPath, files: Object.fromEntries(Object.entries(files).map(([path, bytes]) => [path, hashBytes(bytes)])), enforcement: "explicit-cli-bridge", provider_fallback_control: "unverified" } };
}
export function nativeInstructions(binding: Binding): string {
  return `Follow the bounded work order supplied to this invocation. Stay within its allowed paths and acceptance checks. Report unresolved ambiguity or exceeded scope as ESCALATE. Source binding: ${digest(binding)}. Policy: ${binding.policy_digest}.`;
}
export function safeRelative(path: string): void {
  if (!path || isAbsolute(path) || path.includes("\\") || path.split("/").some((part) => part === ".." || part === "." || !part)) throw new Error("UNSAFE_ARTIFACT_PATH");
}
export function inventory(directory: string): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (base: string) => {
    for (const entry of readdirSync(base, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(base, entry.name);
      if (entry.isSymbolicLink()) throw new Error("SYMLINK_ARTIFACT_REJECTED");
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) files[relative(directory, path).split("\\").join("/")] = hashBytes(readFileSync(path));
      else throw new Error("NONFILE_ARTIFACT_REJECTED");
    }
  };
  if (lstatSync(directory).isSymbolicLink()) throw new Error("SYMLINK_ARTIFACT_REJECTED");
  walk(directory); return files;
}
export function verifyRendered(directory: string, expected: RenderedAdapter): void {
  for (const path of Object.keys(expected.files)) safeRelative(path);
  const hashes = Object.fromEntries(Object.entries(expected.files).map(([path, bytes]) => [path, hashBytes(bytes)]));
  if (canonicalJson(hashes) !== canonicalJson(expected.manifest.files)) throw new Error("MANIFEST_CONTENT_MISMATCH");
  const actual = inventory(directory);
  const expectedHashes = { ...hashes, "governor.manifest.json": hashBytes(`${canonicalJson(expected.manifest)}\n`) };
  if (canonicalJson(actual) !== canonicalJson(expectedHashes)) throw new Error("GENERATED_ARTIFACT_DRIFT");
  readNativeConfiguration(directory, expected);
}
export function safeOutputDirectory(directory: string): string {
  let target = resolve(directory);
  // Normalize macOS's system aliases; every user-controlled symlink is refused.
  for (const alias of ["/tmp", "/var"]) if (target === alias || target.startsWith(`${alias}/`)) target = `${realpathSync(alias)}${target.slice(alias.length)}`;
  let current = "/";
  for (const component of target.split("/").filter(Boolean)) {
    current = join(current, component);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error("SYMLINK_ARTIFACT_REJECTED");
  }
  const home = realpathSync(homedir());
  if (target === home || [".claude", ".codex", ".agents"].some((path) => target === join(home, path) || target.startsWith(`${join(home, path)}/`))) throw new Error("GLOBAL_INSTALL_REFUSED");
  return target;
}
export function writeRendered(directory: string, artifact: RenderedAdapter): void {
  const target = safeOutputDirectory(directory);
  mkdirSync(target, { recursive: true });
  if (readdirSync(target).length > 0) { verifyRendered(target, artifact); return; }
  for (const [path, bytes] of Object.entries(artifact.files)) { safeRelative(path); const output = join(target, path); mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, bytes, { flag: "wx" }); }
  writeFileSync(join(target, "governor.manifest.json"), `${canonicalJson(artifact.manifest)}\n`, { flag: "wx" });
  verifyRendered(target, artifact);
}
export function readNativeConfiguration(directory: string, artifact: RenderedAdapter): { model: string; effort: string; instructions: string; tools: string[] } {
  safeRelative(artifact.manifest.native_config_path);
  const source = readFileSync(join(directory, artifact.manifest.native_config_path), "utf8");
  if (artifact.manifest.provider === "anthropic") {
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(source);
    if (!match) throw new Error("INVALID_CLAUDE_AGENT");
    const header = parseYaml(match[1]!) as Record<string, unknown>;
    if (typeof header["name"] !== "string" || typeof header["description"] !== "string" || typeof header["model"] !== "string" || (header["effort"] !== undefined && typeof header["effort"] !== "string") || !Array.isArray(header["tools"]) || header["tools"].some((tool) => typeof tool !== "string")) throw new Error("INVALID_CLAUDE_AGENT");
    return { model: header["model"], effort: typeof header["effort"] === "string" ? header["effort"] : "not_applicable", instructions: match[2]!, tools: header["tools"] as string[] };
  }
  const value = TOML.parse(source);
  if (typeof value["name"] !== "string" || typeof value["description"] !== "string" || typeof value["model"] !== "string" || (value["model_reasoning_effort"] !== undefined && typeof value["model_reasoning_effort"] !== "string") || typeof value["developer_instructions"] !== "string") throw new Error("INVALID_CODEX_AGENT");
  return { model: value["model"], effort: typeof value["model_reasoning_effort"] === "string" ? value["model_reasoning_effort"] : "not_applicable", instructions: value["developer_instructions"], tools: [] };
}
