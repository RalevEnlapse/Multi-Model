import type { AgentName, ErrorEventData, FinalEventData, LogEventData, RawEventData } from "../types";

export type SseWriter = {
  writeEvent: (event: string, data: unknown) => void;
  log: (agent: AgentName, message: string) => void;
  raw: (agent: AgentName, payload: unknown) => void;
  final: (markdown: string) => void;
  error: (message: string, details?: unknown) => void;
  done: () => void;
};

function nowIso(): string {
  return new Date().toISOString();
}

function encodeSse(event: string, data: unknown): string {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  // SSE format: event + data lines + double newline
  return `event: ${event}\ndata: ${payload}\n\n`;
}

export function createSseWriter(controller: ReadableStreamDefaultController<Uint8Array>): SseWriter {
  const encoder = new TextEncoder();

  const writeEvent = (event: string, data: unknown) => {
    controller.enqueue(encoder.encode(encodeSse(event, data)));
  };

  return {
    writeEvent,
    log: (agent, message) => {
      const data: LogEventData = { ts: nowIso(), agent, message };
      writeEvent("log", data);
    },
    raw: (agent, payload) => {
      const data: RawEventData = { ts: nowIso(), agent, payload };
      writeEvent("raw", data);
    },
    final: (markdown) => {
      const data: FinalEventData = { ts: nowIso(), markdown };
      writeEvent("final", data);
    },
    error: (message, details) => {
      const data: ErrorEventData = { ts: nowIso(), message, details };
      writeEvent("error", data);
    },
    done: () => {
      writeEvent("done", { ts: nowIso() });
    },
  };
}
