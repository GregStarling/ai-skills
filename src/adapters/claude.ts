import { stringify } from "yaml";
import { finishRender, nativeInstructions, validatedRenderBinding, type RenderInput, type RenderedAdapter } from "./shared.js";
export function renderClaude(input: RenderInput): RenderedAdapter {
  const binding = validatedRenderBinding(input, "anthropic");
  if (!["low", "medium", "high", "xhigh", "max", "not_applicable"].includes(binding.candidate.effort)) throw new Error("UNSUPPORTED_CLAUDE_EFFORT");
  const name = "governor-worker";
  const tools = binding.candidate.serving.tool_use === "none" ? [] : ["Read", "Glob", "Grep", "Bash", "Edit", "Write"];
  const path = `.claude/agents/${name}.md`;
  const description = `Governed ${binding.role_id} for ${binding.task_class_id}. ${input.mode === "adapter-test" ? "NONPRODUCTION ADAPTER TEST." : "Generated binding."}`;
  return finishRender(input, "anthropic", binding, path, {
    [path]: `---\n${stringify({ name, description, model: binding.candidate.model_id, ...(binding.candidate.effort === "not_applicable" ? {} : { effort: binding.candidate.effort }), tools })}---\n${nativeInstructions(binding)}\n`,
    [`.claude/skills/${name}/SKILL.md`]: `---\n${stringify({ name, description })}---\n${nativeInstructions(binding)}\nInvoke through the governor CLI bridge; this skill does not authorize direct production dispatch.\n`
  });
}
