import type { SseWriter } from "./sse";
import { createSseWriter } from "./sse";
import type { StoredSseEvent } from "./run-history";

export type RecordingSseWriter = SseWriter & {
  events: StoredSseEvent[];
};

export function createRecordingSseWriter(controller: ReadableStreamDefaultController<Uint8Array>): RecordingSseWriter {
  const base = createSseWriter(controller);
  const events: StoredSseEvent[] = [];

  function writeEvent(event: string, data: unknown) {
    events.push({ event, data });
    base.writeEvent(event, data);
  }

  return {
    events,
    writeEvent,
    log: (agent, message) => {
      // base.log would generate its own ts. We want the exact data we emit.
      writeEvent("log", { ts: new Date().toISOString(), agent, message });
    },
    raw: (agent, payload) => {
      writeEvent("raw", { ts: new Date().toISOString(), agent, payload });
    },
    final: (markdown) => {
      writeEvent("final", { ts: new Date().toISOString(), markdown });
    },
    error: (message, details) => {
      writeEvent("error", { ts: new Date().toISOString(), message, details });
    },
    done: () => {
      writeEvent("done", { ts: new Date().toISOString() });
    },
  };
}
