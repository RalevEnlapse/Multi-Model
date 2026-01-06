import type { NewsResearcherOutput } from "../../lib/types";

import { Badge, Card, CardBody, CardHeader, CardMeta, CardTitle } from "../../lib/ui/primitives";

export type KeyEventsChartPanelProps = {
  news?: NewsResearcherOutput;
};

function parseDateKey(date: string): string {
  // We only need a stable bucket key. Prefer YYYY-MM-DD if present.
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(date.trim());
  if (m) return m[1];
  // Fall back: first 10 chars, or full string.
  return date.trim().slice(0, 10) || date.trim();
}

export default function KeyEventsChartPanel({ news }: KeyEventsChartPanelProps) {
  const events = news?.key_events ?? [];

  const counts = new Map<string, number>();
  for (const ev of events) {
    const k = parseDateKey(ev.date);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const buckets = Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const max = buckets.reduce((m, b) => Math.max(m, b.count), 0);

  return (
    <Card className="flex min-h-0 flex-col lg:col-span-7" variant="default">
      <CardBody className="flex min-h-0 flex-col">
        <CardHeader className="shrink-0">
          <div className="min-w-0">
            <CardTitle>Chart</CardTitle>
            <CardMeta className="mt-1 block">Key events per day (from NewsResearcher output).</CardMeta>
          </div>
          <Badge tone={events.length > 0 ? "green" : "zinc"}>{events.length > 0 ? "ready" : "pending"}</Badge>
        </CardHeader>

        <div className="mt-4 flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/35">
          <div className="h-full overflow-auto p-4 sm:p-6">
            {events.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-4">
                <div className="text-sm font-medium text-zinc-200">No chart data yet</div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  The chart fills once the NewsResearcher provides <span className="font-mono">key_events</span>.
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xs text-zinc-400">{events.length} events • {buckets.length} day buckets</div>

                <div className="mt-3 grid gap-2">
                  {buckets.map((b) => {
                    const pct = max === 0 ? 0 : (b.count / max) * 100;
                    return (
                      <div key={b.date} className="grid grid-cols-12 items-center gap-3">
                        <div className="col-span-3 text-[11px] font-mono text-zinc-500">{b.date}</div>
                        <div className="col-span-8">
                          <div className="h-3 w-full rounded-full border border-zinc-800/70 bg-zinc-950/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-zinc-200/80"
                              style={{ width: `${Math.max(2, pct)}%` }}
                              aria-label={`${b.date}: ${b.count}`}
                            />
                          </div>
                        </div>
                        <div className="col-span-1 text-right text-xs text-zinc-200 tabular-nums">{b.count}</div>
                      </div>
                    );
                  })}
                </div>

                <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
                  Note: This chart is derived only from streamed run output (no mock data).
                </p>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
