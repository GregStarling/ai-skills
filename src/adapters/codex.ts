import TOML from "@iarna/toml";
import { stringify } from "yaml";
import { finishRender, nativeInstructions, validatedRenderBinding, type RenderInput, type RenderedAdapter } from "./shared.js";
export function renderCodex(input: RenderInput): RenderedAdapter {
  const binding = validatedRenderBinding(input, "openai");
  if (binding.candidate.serving.tool_use === "none") throw new Error("UNSUPPORTED_CODEX_TOOL_SUPPRESSION");
  const name = "governor_worker";
  const path = `.codex/agents/${name}.toml`;
  const description = `Governed ${binding.role_id} for ${binding.task_class_id}. ${input.mode === "adapter-test" ? "NONPRODUCTION ADAPTER TEST." : "Generated binding."}`;
  return finishRender(input, "openai", binding, path, {
    [path]: TOML.stringify({ name, description, model: binding.candidate.model_id, model_reasoning_effort: binding.candidate.effort, sandbox_mode: binding.role_id === "reviewer" ? "read-only" : "workspace-write", developer_instructions: nativeInstructions(binding) }),
    [`.agents/skills/governor-worker/SKILL.md`]: `---\n${stringify({ name: "governor-worker", description })}---\n${nativeInstructions(binding)}\nInvoke through the governor CLI bridge; this skill does not authorize direct production dispatch.\n`
  });
}
