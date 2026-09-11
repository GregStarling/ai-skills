import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalJson, digest, hashBytes } from "../core/canonical.js";
import { candidateIdentity, parseBinding, parseCandidate, type Candidate, type RuntimeReport } from "../schema/index.js";
import { validateBinding, type SelectionInput } from "../governance/index.js";
import { inventory, readNativeConfiguration, renderClaude, renderCodex, supportsRuntimeVersion, safeOutputDirectory, verifyRendered, type NativeProvider, type RenderedAdapter } from "../adapters/index.js";
import { runProcess, type ProcessResult } from "./process.js";
import { parseNativeTelemetry, type NativeTelemetry } from "./telemetry.js";
import { captureIdentityEnvironment, deriveIdentityAssurance, identityAssuranceMeetsMinimum } from "./identity-assurance.js";

export type ContextPackage = { directory: string; files: Record<string, string>; artifactDigest: string };
export type NativeInput = {
  provider: NativeProvider; candidate: Candidate; cwd: string; prompt: string; timeoutMs: number; outputDirectory: string;
  mode: "evaluation" | "production"; sandbox: "read-only" | "workspace-write";
  rendered?: { directory: string; artifact: RenderedAdapter }; selection?: SelectionInput; binding?: unknown;
  outputSchema?: Record<string, unknown>; contextPackage?: ContextPackage;
};
export type NativeExecution = NativeTelemetry & {
  schema_version: "native_execution.v1"; mode: "evaluation" | "production"; report: RuntimeReport; report_digest: string;
  stdout_path: string; stderr_path: string; runtime_version: string; cleanup: ProcessResult["cleanup"];
  invocation: { argv: string[]; environment_override_names: string[]; bridge: "explicit-cli-bridge"; sandbox: NativeInput["sandbox"] };
  context: { fresh_process: true; prompt_digest: string; package_digest: string | null; artifact_digest: string | null; instruction_scope: "runtime-managed" | "isolated-package" };
  qualification_blockers: string[];
  identity_assurance: ReturnType<typeof deriveIdentityAssurance>;
  evidence_paths: string[];
};
const removedKeys = /^(?:ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|ANTHROPIC_BASE_URL|ANTHROPIC_MODEL|ANTHROPIC_SMALL_FAST_MODEL|ANTHROPIC_DEFAULT_.*_MODEL|OPENAI_API_KEY|OPENAI_BASE_URL|OPENAI_API_BASE|CODEX_API_KEY|CODEX_BASE_URL|CLAUDE_CODE_USE_(?:BEDROCK|VERTEX|FOUNDRY)|CLAUDE_CODE_SUBAGENT_MODEL|CLAUDE_CODE_EFFORT_LEVEL|CLAUDE_CODE_SIMPLE|CLAUDE_CODE_SAFE_MODE|CLAUDECODE|CODEX_THREAD_ID)$/;
export function nativeEnvironment(provider: NativeProvider, candidate: Candidate, inherited: NodeJS.ProcessEnv = process.env): { env: NodeJS.ProcessEnv; overrideNames: string[] } {
  const env: NodeJS.ProcessEnv = {}; const names: string[] = [];
  for (const key of Object.keys(inherited)) { if (removedKeys.test(key)) names.push(key); else env[key] = inherited[key]; }
  if (provider === "anthropic") { env["CLAUDE_CODE_SUBAGENT_MODEL"] = candidate.model_id; names.push("CLAUDE_CODE_SUBAGENT_MODEL"); if (candidate.effort !== "not_applicable") { env["CLAUDE_CODE_EFFORT_LEVEL"] = candidate.effort; names.push("CLAUDE_CODE_EFFORT_LEVEL"); } }
  return { env, overrideNames: [...new Set(names)].sort() };
}
function checkPackage(input: NativeInput): string | null {
  if (!input.contextPackage) return null;
  if (input.sandbox !== "read-only" || realpathSync(input.cwd) !== realpathSync(input.contextPackage.directory)) throw new Error("REVIEW_PACKAGE_BOUNDARY_MISMATCH");
  if (canonicalJson(inventory(input.contextPackage.directory)) !== canonicalJson(input.contextPackage.files)) throw new Error("REVIEW_PACKAGE_DRIFT");
  return digest(input.contextPackage.files);
}
export async function runNative(input: NativeInput): Promise<NativeExecution> {
  if (!["anthropic", "openai"].includes(input.provider) || !["production", "evaluation"].includes(input.mode) || !["read-only", "workspace-write"].includes(input.sandbox)) throw new Error("INVALID_NATIVE_INVOCATION");
  const candidate = parseCandidate(input.candidate);
  if (candidate.provider !== input.provider) throw new Error("NATIVE_PROVIDER_MISMATCH");
  if (input.provider === "openai" && candidate.serving.tool_use === "none") throw new Error("UNSUPPORTED_CODEX_TOOL_SUPPRESSION");
  if (candidate.serving.fallback !== "disabled" || candidate.serving.tool_use === "provider_tools") throw new Error("UNSUPPORTED_NATIVE_SERVING_CONFIGURATION");
  if (candidate.serving.json_schema !== (input.outputSchema !== undefined || input.rendered?.artifact.manifest.output_schema_path != null)) throw new Error("NATIVE_OUTPUT_SCHEMA_MISMATCH");
  const output = safeOutputDirectory(input.outputDirectory); mkdirSync(output, { recursive: true });
  const { env, overrideNames } = nativeEnvironment(input.provider, candidate);
  const executable = input.provider === "anthropic" ? "claude" : "codex";
  const probe = await runProcess({ executable, args: ["--version"], cwd: input.cwd, timeoutMs: 10_000, outputDirectory: join(output, "version"), env });
  const versionText = readFileSync(probe.stdout_path, "utf8").trim();
  const version = /\b(\d+\.\d+\.\d+)\b/.exec(versionText)?.[1];
  if (probe.exit_code !== 0 || !version || !supportsRuntimeVersion(input.provider, version)) throw new Error("RUNTIME_VERSION_MISMATCH");
  let instructions = "Perform only the bounded task in the provided prompt. If it cannot be completed within scope, return ESCALATE.";
  let outputSchema = input.outputSchema;
  if (input.rendered) {
    verifyRendered(input.rendered.directory, input.rendered.artifact);
    if (input.rendered.artifact.manifest.provider !== input.provider || input.rendered.artifact.manifest.runtime_version !== version) throw new Error("NATIVE_BUNDLE_MISMATCH");
    if (input.rendered.artifact.manifest.mode === "adapter-test") throw new Error("ADAPTER_TEST_DISPATCH_REFUSED");
    const config = readNativeConfiguration(input.rendered.directory, input.rendered.artifact);
    if (config.model !== candidate.model_id || config.effort !== candidate.effort) throw new Error("NATIVE_BUNDLE_TREATMENT_MISMATCH");
    instructions = config.instructions;
    if (input.rendered.artifact.manifest.output_schema_path) {
      const compiled = JSON.parse(readFileSync(join(input.rendered.directory, input.rendered.artifact.manifest.output_schema_path), "utf8")) as Record<string, unknown>;
      if (outputSchema !== undefined && canonicalJson(outputSchema) !== canonicalJson(compiled)) throw new Error("NATIVE_SCHEMA_OVERRIDE_MISMATCH");
      outputSchema = compiled;
    }
  }
  if (input.mode === "production") {
    if (!input.selection || input.selection.mode !== "production" || !input.rendered || input.binding === undefined) throw new Error("PRODUCTION_AUTHORITY_REQUIRED");
    if (input.selection.policy.policy_version >= 4 && input.selection.request.execution_environment !== (input.provider === "anthropic" ? "claude_code" : "codex")) throw new Error("HOST_EXECUTION_EVIDENCE_REQUIRED");
    const validation = validateBinding(input.binding, { ...input.selection, now: new Date().toISOString() });
    if (!validation.ok || validation.status !== "VALID") throw new Error("PRODUCTION_BINDING_INVALID");
    const binding = parseBinding(input.binding);
    if (canonicalJson(binding.candidate) !== canonicalJson(candidate)) throw new Error("PRODUCTION_CANDIDATE_MISMATCH");
    const request = { binding, selection: { ...input.selection, now: new Date().toISOString() }, mode: "production" as const, runtimeVersion: version, ...(outputSchema === undefined ? {} : { outputSchema }) };
    const expected = input.provider === "anthropic" ? renderClaude(request) : renderCodex(request);
    if (canonicalJson(expected) !== canonicalJson(input.rendered.artifact)) throw new Error("PRODUCTION_RENDER_RECOMPUTATION_MISMATCH");
    if ((input.selection.policy.policy_version < 5 || ["high", "critical"].includes(input.selection.request.risk)) && candidate.material_serving_settings.includes("fallback")) throw new Error("PRODUCTION_FALLBACK_CONTROL_UNVERIFIED");
  }
  const packageDigest = checkPackage(input);
  let schemaPath: string | undefined;
  if (outputSchema !== undefined) { schemaPath = join(output, "output.schema.json"); writeFileSync(schemaPath, canonicalJson(outputSchema), { flag: "wx" }); }
  let args: string[];
  const configurationFiles: { path: string; content_digest: string }[] = [];
  if (input.provider === "anthropic") {
    const tools = candidate.serving.tool_use === "none" ? "" : input.sandbox === "read-only" ? "Read,Glob,Grep" : "Bash";
    const settings = { sandbox: { enabled: true, failIfUnavailable: true, allowUnsandboxedCommands: false, excludedCommands: [], filesystem: { disabled: false }, network: { allowedDomains: [] } }, permissions: { blockReadsOutsideWorkingDirectories: true, additionalDirectories: [] } };
    const settingsPath = join(output, "claude-settings.json"); writeFileSync(settingsPath, canonicalJson(settings), { flag: "wx" });
    configurationFiles.push({ path: settingsPath, content_digest: hashBytes(readFileSync(settingsPath)) });
    args = ["--print", "--output-format", "stream-json", "--verbose", "--safe-mode", "--no-session-persistence", "--session-id", randomUUID(), "--model", candidate.model_id, ...(candidate.effort === "not_applicable" ? [] : ["--effort", candidate.effort]), "--setting-sources", "", "--settings", settingsPath, "--strict-mcp-config", "--mcp-config", "{\"mcpServers\":{}}", "--tools", tools, "--permission-mode", "dontAsk", "--system-prompt", instructions];
    if (tools) args.push("--allowedTools", tools);
    if (outputSchema !== undefined) args.push("--json-schema", canonicalJson(outputSchema));
  } else {
    args = ["exec", "--json", "--ephemeral", "--ignore-user-config", "--ignore-rules", "--strict-config", "--skip-git-repo-check", "--color", "never", "-C", resolve(input.cwd), "--sandbox", input.sandbox, "-m", candidate.model_id, ...(candidate.effort === "not_applicable" ? [] : ["-c", `model_reasoning_effort=${JSON.stringify(candidate.effort)}`]), "-c", `developer_instructions=${JSON.stringify(instructions)}`, "-c", "project_doc_max_bytes=0", "-c", "approval_policy=\"never\"", "-c", "sandbox_workspace_write.writable_roots=[]", "-c", "sandbox_workspace_write.network_access=false", "-c", "sandbox_workspace_write.exclude_slash_tmp=true", "-c", "sandbox_workspace_write.exclude_tmpdir_env_var=true", "-c", "features.apps=false", "-c", "features.multi_agent=false"];
    args.push("-c", `projects.${JSON.stringify(realpathSync(input.cwd))}.trust_level="untrusted"`);
    for (const feature of ["browser_use", "computer_use", "image_generation", "in_app_browser", "plugins", "hooks", "workspace_dependencies", "skill_mcp_dependency_install", "shell_snapshot", "memories"]) args.push("--disable", feature);
    if (schemaPath) { args.push("--output-schema", schemaPath); configurationFiles.push({ path: schemaPath, content_digest: hashBytes(readFileSync(schemaPath)) }); }
    args.push("-");
  }
  const requestPath = join(output, "native-request.json");
  const requestBytes = canonicalJson({ schema_version: "native_execution_request.v1", execution_environment: input.provider === "anthropic" ? "claude_code" : "codex", candidate_identity: candidateIdentity(candidate), command: { executable, args, cwd: resolve(input.cwd) }, environment: captureIdentityEnvironment(env), prompt_digest: digest(input.prompt), configuration_files: configurationFiles });
  // Preserve the exact argv/configuration before invoking the host. A model's
  // later receipt is not the authority for what the process was asked to run.
  writeFileSync(requestPath, requestBytes, { flag: "wx" });
  const requestDigest = hashBytes(requestBytes);
  const processResult = await runProcess({ executable, args, cwd: input.cwd, timeoutMs: input.timeoutMs, outputDirectory: join(output, "execution"), stdin: input.prompt, env });
  let packageChanged = false; try { checkPackage(input); } catch { packageChanged = true; }
  const telemetry = parseNativeTelemetry(input.provider, readFileSync(processResult.stdout_path, "utf8"), candidate.model_id);
  const processPath = join(output, "native-process.json");
  const processBytes = canonicalJson({ schema_version: "native_execution_process.v1", request_digest: requestDigest, started_at: processResult.started_at, completed_at: processResult.completed_at, exit_code: processResult.exit_code, signal: processResult.signal, timed_out: processResult.timed_out, spawn_error: processResult.spawn_error, stdout_digest: processResult.stdout_digest, stderr_digest: processResult.stderr_digest });
  writeFileSync(processPath, processBytes, { flag: "wx" });
  const evidencePaths = [requestPath, processPath, probe.stdout_path, processResult.stdout_path, processResult.stderr_path, ...configurationFiles.map(file => file.path)];
  const sources = new Map(evidencePaths.map(path => { const bytes = readFileSync(path); return [hashBytes(bytes), bytes] as const; }));
  const v5 = input.selection?.policy.policy_version !== undefined && input.selection.policy.policy_version >= 5;
  const legacyIdentityRules = input.selection !== undefined && input.selection.policy.policy_version < 5;
  const requireAttestedFallback = legacyIdentityRules || v5 && ["high", "critical"].includes(input.selection!.request.risk);
  const failed = (input.mode === "production" && !v5 && telemetry.identity_status !== "matched") || processResult.spawn_error !== null || processResult.output_limited || processResult.exit_code !== 0 || telemetry.provider_error || telemetry.malformed_events > 0 || packageChanged || processResult.cleanup !== "complete";
  const report: RuntimeReport = { schema_version: "runtime_report.v1", report_id: `runtime_${randomUUID().replaceAll("-", "")}`, provider: input.provider, execution_environment: input.provider === "anthropic" ? "claude_code" : "codex", candidate_id: candidate.candidate_id, started_at: processResult.started_at, completed_at: processResult.completed_at, command: { executable, args, cwd: resolve(input.cwd) }, status: processResult.timed_out ? "timed_out" : failed ? "failed" : "completed", exit_code: processResult.exit_code, signal: processResult.signal, timeout_ms: input.timeoutMs, stdout_digest: processResult.stdout_digest, stderr_digest: processResult.stderr_digest, observed_identity: telemetry.observed_model_ids.length === 1 || telemetry.observed_efforts.length === 1 ? { ...(telemetry.observed_model_ids.length === 1 ? { model_id: telemetry.observed_model_ids[0]! } : {}), ...(telemetry.observed_efforts.length === 1 ? { effort: telemetry.observed_efforts[0]! } : {}), source: "provider_receipt" } : { source: "unknown" }, native_evidence: { request_digest: requestDigest, process_digest: hashBytes(processBytes), version_digest: probe.stdout_digest }, usage: { ...(telemetry.input_tokens === null ? {} : { input_tokens: telemetry.input_tokens }), ...(telemetry.output_tokens === null ? {} : { output_tokens: telemetry.output_tokens }), cost_usd: telemetry.cost_usd } };
  let assurance = deriveIdentityAssurance({ candidate, report, sources });
  const identityBlockers = assurance.diagnostics.map(item => item.rule_id);
  if (input.mode === "production" && v5) {
    const minimum = input.selection!.policy.identity_assurance!.minimum_by_risk[input.selection!.request.risk];
    if (!identityAssuranceMeetsMinimum(assurance.overall, minimum) && !identityBlockers.includes("identity_assurance_insufficient")) identityBlockers.push("identity_assurance_insufficient");
    if (assurance.diagnostics.some(item => item.hard) || !identityAssuranceMeetsMinimum(assurance.overall, minimum)) { report.status = "failed"; assurance = deriveIdentityAssurance({ candidate, report, sources }); }
  }
  const blockers = [ ...identityBlockers, ...(legacyIdentityRules && telemetry.identity_status !== "matched" ? ["SERVED_MODEL_UNVERIFIED"] : []), ...(requireAttestedFallback ? ["PROVIDER_FALLBACK_CONTROL_UNVERIFIED"] : []), ...(input.contextPackage && input.provider === "openai" ? ["GLOBAL_SKILL_CONTEXT_UNVERIFIED"] : []), ...(telemetry.cost_usd === null ? ["COST_UNKNOWN"] : ["COST_IS_PROVIDER_ESTIMATE"]), ...(packageChanged ? ["REVIEW_PACKAGE_DRIFT"] : []) ];
  const result: NativeExecution = { ...telemetry, schema_version: "native_execution.v1", mode: input.mode, report, report_digest: digest(report), stdout_path: processResult.stdout_path, stderr_path: processResult.stderr_path, runtime_version: version, cleanup: processResult.cleanup, invocation: { argv: args, environment_override_names: overrideNames, bridge: "explicit-cli-bridge", sandbox: input.sandbox }, context: { fresh_process: true, prompt_digest: digest(input.prompt), package_digest: packageDigest, artifact_digest: input.contextPackage?.artifactDigest ?? null, instruction_scope: packageDigest === null || packageChanged || input.provider === "openai" ? "runtime-managed" : "isolated-package" }, qualification_blockers: blockers, identity_assurance: assurance, evidence_paths: evidencePaths };
  writeFileSync(join(output, "receipt.json"), `${canonicalJson(result)}\n`, { flag: "wx" });
  return result;
}

export { captureIdentityEnvironment } from './identity-assurance.js';
