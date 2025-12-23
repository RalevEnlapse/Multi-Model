import { run } from "@openai/agents";
import { z } from "zod";

import type { AgentName } from "../types";

export async function runAgentJson<T>(params: {
  agentName: AgentName;
  agent: any;
  input: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  const { agentName, agent, input, schema } = params;

  const result = await run(agent, input);

  // Agents SDK returns a structured RunResult; extractAllTextOutput is available,
  // but we keep dependencies minimal and parse the last text output we can find.
  const asAny = result as any;

  const text: string | undefined =
    asAny?.output_text ??
    asAny?.outputText ??
    asAny?.finalOutputText ??
    (Array.isArray(asAny?.output)
      ? asAny.output
          .map((it: any) => it?.content)
          .flat()
          .map((c: any) => (typeof c === "string" ? c : c?.text))
          .filter(Boolean)
          .join("\n")
      : undefined);

  if (!text) {
    throw new Error(`${agentName} produced no parseable text output.`);
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    // try to recover if model wrapped in ```json
    const m = text.match(/```json\s*([\s\S]*?)\s*```/i) ?? text.match(/```\s*([\s\S]*?)\s*```/);
    if (!m?.[1]) throw new Error(`${agentName} output was not valid JSON.`);
    json = JSON.parse(m[1]);
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `${agentName} JSON schema validation failed: ${parsed.error.message}`
    );
  }

  return parsed.data;
}

export async function runAgentMarkdown(params: {
  agentName: AgentName;
  agent: any;
  input: string;
}): Promise<string> {
  const result = await run(params.agent, params.input);
  const asAny = result as any;

  const text: string | undefined =
    asAny?.output_text ??
    asAny?.outputText ??
    asAny?.finalOutputText ??
    (Array.isArray(asAny?.output)
      ? asAny.output
          .map((it: any) => it?.content)
          .flat()
          .map((c: any) => (typeof c === "string" ? c : c?.text))
          .filter(Boolean)
          .join("\n")
      : undefined);

  if (!text) {
    throw new Error(`${params.agentName} produced no markdown output.`);
  }

  return text;
}
