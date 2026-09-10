import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import TOML from "@iarna/toml";
import { parseSelectionInput } from "../../src/governance/index.js";
import { readNativeConfiguration, renderCodex, verifyRendered, writeRendered } from "../../src/adapters/index.js";
it("compiles deterministic standalone Codex TOML and portable skill with exact settings", () => {
  const fixture = JSON.parse(readFileSync("fixtures/bindings/valid-initial-backend.json", "utf8"));
  const input = { binding: fixture.binding, selection: parseSelectionInput(fixture.selection), mode: "adapter-test" as const, runtimeVersion: "0.142.5", outputSchema: { type: "object" } };
  const output = renderCodex(input); expect(renderCodex(input)).toEqual(output);
  const native = TOML.parse(output.files[output.manifest.native_config_path]!);
  expect(native["model"]).toBe(fixture.binding.candidate.model_id); expect(native["model_reasoning_effort"]).toBe(fixture.binding.candidate.effort);
  expect(native["developer_instructions"]).toContain(fixture.binding.policy_digest);
  expect(output.files[".agents/skills/governor-worker/SKILL.md"]).toContain("NONPRODUCTION");
  const directory = mkdtempSync(join(tmpdir(), "governor-codex-"));
  try { writeRendered(directory, output); verifyRendered(directory, output); expect(readNativeConfiguration(directory, output).model).toBe(fixture.binding.candidate.model_id); } finally { rmSync(directory, { recursive: true, force: true }); }
  expect(() => renderCodex({ ...input, mode: "production" })).toThrow(/MODE/);
});
