import { existsSync, mkdtempSync, readFileSync, symlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseSelectionInput } from "../../src/governance/index.js";
import { renderClaude, readNativeConfiguration, verifyRendered, writeRendered } from "../../src/adapters/index.js";
const directories: string[] = [];
afterEach(() => { for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true }); });
function fixture() { const value = JSON.parse(readFileSync("fixtures/bindings/valid-initial-backend.json", "utf8")); return { binding: value.binding, selection: parseSelectionInput(value.selection), mode: "adapter-test" as const, runtimeVersion: "2.1.222", outputSchema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"], additionalProperties: false } }; }
function directory() { const path = mkdtempSync(join(tmpdir(), "governor claude ")); directories.push(path); return path; }
describe("Claude compiler", () => {
  it("renders deterministic native YAML and verifies actual byte identity", () => {
    const input = fixture(); const artifact = renderClaude(input); expect(renderClaude(input)).toEqual(artifact);
    const path = directory(); writeRendered(path, artifact); verifyRendered(path, artifact);
    expect(readNativeConfiguration(path, artifact)).toMatchObject({ model: input.binding.candidate.model_id, effort: input.binding.candidate.effort });
    expect(artifact.manifest.mode).toBe("adapter-test"); expect(artifact.manifest.enforcement).toBe("explicit-cli-bridge");
  });
  it.each(["modified", "extra", "missing"])("rejects %s generated files", (mutation) => {
    const artifact = renderClaude(fixture()); const path = directory(); writeRendered(path, artifact);
    const native = join(path, artifact.manifest.native_config_path);
    if (mutation === "modified") writeFileSync(native, "tampered"); else if (mutation === "missing") rmSync(native); else writeFileSync(join(path, "extra.json"), "{}");
    expect(() => verifyRendered(path, artifact)).toThrow(/DRIFT/);
  });
  it("refuses simulation promotion, stale runtime versions and missing output control", () => {
    expect(() => renderClaude({ ...fixture(), mode: "production" })).toThrow(/MODE/);
    expect(() => renderClaude({ ...fixture(), runtimeVersion: "0.0.0" })).toThrow(/VERSION/);
    const input = fixture(); const { outputSchema: _, ...missing } = input;
    expect(() => renderClaude(missing)).toThrow(/OUTPUT_SCHEMA_REQUIRED/);
    input.binding.policy_digest = `sha256:${"0".repeat(64)}`;
    expect(() => renderClaude(input)).toThrow(/BINDING_INVALID/);
  });
  it("rejects a symlink ancestor before creating any generated files", () => {
    const parent = directory(); const destination = directory(); const link = join(parent, "link");
    symlinkSync(destination, link);
    expect(() => writeRendered(join(link, "nested"), renderClaude(fixture()))).toThrow(/SYMLINK/);
    expect(existsSync(join(destination, "nested"))).toBe(false);
    expect(() => writeRendered(link, renderClaude(fixture()))).toThrow(/SYMLINK/);
  });

});
