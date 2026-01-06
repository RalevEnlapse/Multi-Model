import type { Mode } from "../types";
import { getCache, setCache } from "../tools/cache";

export type StoredSseEvent = {
  event: SseEventName;
  data: unknown;
};

export type RunVersionRecord = {
  id: string;
  competitor: string;
  mode: Mode;
  createdAt: string;
  events: StoredSseEvent[];
};

export type RunHistoryIndex = {
  createdAt: string;
  runs: Array<{
    id: string;
    competitor: string;
    mode: Mode;
    createdAt: string;
  }>;
};

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

function cacheKeyLatest(competitor: string, mode: Mode) {
  return `run:latest:${mode}:${competitor.toLowerCase()}`;
}

function cacheKeyRun(id: string) {
  return `run:record:${id}`;
}

function cacheKeyIndex() {
  return `run:index`;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(competitor: string, mode: Mode) {
  // Unique enough: time + normalized
  const slug = competitor
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${Date.now()}-${mode}-${slug || "competitor"}`;
}

export function getCachedLatestRun(params: { competitor: string; mode: Mode }): RunVersionRecord | undefined {
  const latestId = getCache<string>(cacheKeyLatest(params.competitor, params.mode));
  if (!latestId) return undefined;
  const rec = getCache<RunVersionRecord>(cacheKeyRun(latestId));
  return rec;
}

export function saveRunToHistory(params: { competitor: string; mode: Mode; events: StoredSseEvent[] }): RunVersionRecord {
  const id = makeId(params.competitor, params.mode);
  const record: RunVersionRecord = {
    id,
    competitor: params.competitor,
    mode: params.mode,
    createdAt: nowIso(),
    events: params.events,
  };

  // Store record + latest pointer for 15 minutes.
  setCache(cacheKeyRun(id), record, FIFTEEN_MINUTES_MS);
  setCache(cacheKeyLatest(params.competitor, params.mode), id, FIFTEEN_MINUTES_MS);

  // Store index (best-effort) so UI can list recent runs within TTL window.
  const current = getCache<RunHistoryIndex>(cacheKeyIndex()) ?? { createdAt: nowIso(), runs: [] };
  const next: RunHistoryIndex = {
    createdAt: current.createdAt,
    runs: [
      { id: record.id, competitor: record.competitor, mode: record.mode, createdAt: record.createdAt },
      ...current.runs,
    ].slice(0, 50),
  };

  setCache(cacheKeyIndex(), next, FIFTEEN_MINUTES_MS);

  return record;
}

export function getHistoryIndex(): RunHistoryIndex {
  return getCache<RunHistoryIndex>(cacheKeyIndex()) ?? { createdAt: nowIso(), runs: [] };
}

export function getRunById(id: string): RunVersionRecord | undefined {
  return getCache<RunVersionRecord>(cacheKeyRun(id));
}

export function replaySseEvents(params: {
  record: RunVersionRecord;
  write: (event: string, data: unknown) => void;
}) {
  for (const e of params.record.events) {
    params.write(e.event, e.data);
  }
}
