"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, Card, CardBody, CardHeader, CardMeta, CardTitle } from "../../lib/ui/primitives";

export type HistoryListItem = {
  id: string;
  competitor: string;
  mode: string;
  createdAt: string;
};

export type HistoryPanelProps = {
  title?: string;
  onSelectRunId?: (id: string) => void;
  className?: string;
};

function groupByCompetitor(items: HistoryListItem[]) {
  const m = new Map<string, HistoryListItem[]>();
  for (const it of items) {
    const key = it.competitor;
    m.set(key, [...(m.get(key) ?? []), it]);
  }
  return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
}

export default function HistoryPanel({ title = "History", onSelectRunId, className }: HistoryPanelProps) {
  const [items, setItems] = useState<HistoryListItem[]>([]);
  const [error, setError] = useState<string>("");

  async function load() {
    setError("");
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const json = (await res.json()) as { runs?: HistoryListItem[]; error?: string };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setItems(Array.isArray(json.runs) ? json.runs : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => groupByCompetitor(items), [items]);

  return (
    <Card className={"flex min-h-0 flex-col " + (className ?? "")} variant="default">
      <CardBody className="flex min-h-0 flex-col">
        <CardHeader className="shrink-0">
          <div className="min-w-0">
            <CardTitle className="text-sm">{title}</CardTitle>
            <CardMeta className="mt-1 block">Runs cached for ~15 minutes (server memory).</CardMeta>
          </div>
          <Button intent="secondary" size="sm" onClick={load}>
            Refresh
          </Button>
        </CardHeader>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/20 p-3">
          {error && <div className="mb-3 text-xs text-red-200">{error}</div>}

          {items.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-4">
              <div className="text-sm font-medium text-zinc-200">No history yet</div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">Run at least one report to populate cached versions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(([competitor, runs]) => (
                <div key={competitor}>
                  <div className="text-xs font-semibold text-zinc-200">{competitor}</div>
                  <div className="mt-2 space-y-2">
                    {runs.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => onSelectRunId?.(r.id)}
                        className="w-full rounded-xl border border-zinc-800/60 bg-zinc-950/25 px-3 py-2 text-left text-xs text-zinc-200 hover:bg-zinc-950/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[11px] text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span>
                          <span className="text-[11px] text-zinc-500">{r.mode}</span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-zinc-500">id: {r.id}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
