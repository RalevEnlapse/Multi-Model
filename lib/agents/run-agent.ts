import { run, type Agent } from "@openai/agents";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAgent = Agent<unknown, any>;
import { z } from "zod";

import type { AgentName } from "../types";

export async function runAgentJson<T>(params: {
  agentName: AgentName;
  // The Agents SDK Agent type is generic and currently not ergonomically type-safe
  // to thread through this helper without leaking `any`. We keep the unsafety
  // localized via a single internal cast below.
  agent: AnyAgent;
  input: string;
  schema: z.ZodType<T>;
}): Promise<T> {
  const { agentName, agent, input, schema } = params;

  const result = await run(agent, input);

  // Agents SDK returns a structured RunResult; extractAllTextOutput is available,
  // but we keep dependencies minimal and parse the last text output we can find.
  const asAny = result as {
    output_text?: unknown;
    outputText?: unknown;
    finalOutputText?: unknown;
    output?: Array<{ content?: unknown }>;
  };

  const text: string | undefined =
    (typeof asAny?.output_text === "string" ? asAny.output_text : undefined) ??
    (typeof asAny?.outputText === "string" ? asAny.outputText : undefined) ??
    (typeof asAny?.finalOutputText === "string" ? asAny.finalOutputText : undefined) ??
    (Array.isArray(asAny?.output)
      ? asAny.output
          .flatMap((it) => (Array.isArray((it as { content?: unknown })?.content) ? ((it as { content?: unknown }).content as unknown[]) : [(it as { content?: unknown })?.content]))
          .map((c) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && "text" in c) {
              const t = (c as { text?: unknown }).text;
              return typeof t === "string" ? t : undefined;
            }
            return undefined;
          })
          .filter((v): v is string => Boolean(v))
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
  agent: AnyAgent;
  input: string;
}): Promise<string> {
  const result = await run(params.agent, params.input);
  const asAny = result as {
    output_text?: unknown;
    outputText?: unknown;
    finalOutputText?: unknown;
    output?: Array<{ content?: unknown }>;
  };

  const text: string | undefined =
    (typeof asAny?.output_text === "string" ? asAny.output_text : undefined) ??
    (typeof asAny?.outputText === "string" ? asAny.outputText : undefined) ??
    (typeof asAny?.finalOutputText === "string" ? asAny.finalOutputText : undefined) ??
    (Array.isArray(asAny?.output)
      ? asAny.output
          .flatMap((it) => (Array.isArray((it as { content?: unknown })?.content) ? ((it as { content?: unknown }).content as unknown[]) : [(it as { content?: unknown })?.content]))
          .map((c) => {
            if (typeof c === "string") return c;
            if (c && typeof c === "object" && "text" in c) {
              const t = (c as { text?: unknown }).text;
              return typeof t === "string" ? t : undefined;
            }
            return undefined;
          })
          .filter((v): v is string => Boolean(v))
          .join("\n")
      : undefined);

  if (!text) {
    throw new Error(`${params.agentName} produced no markdown output.`);
  }

  return text;
}
