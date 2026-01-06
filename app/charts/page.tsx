"use client";

import { useMemo, useState } from "react";

import type { FinanceLookupOutput, Mode } from "../../lib/types";
import type { StoredSseEvent } from "../../lib/server/run-history";

import HistoryPanel from "../components/history-panel";
import FinancePriceChangeChart from "../components/finance-price-change-chart";
import FinanceTrendChart from "../components/finance-trend-chart";
import TradingViewWidget from "../components/tradingview-widget";
import { Card, CardBody, CardHeader, CardMeta, CardTitle } from "../../lib/ui/primitives";

function extractFinanceFromEvents(events: StoredSseEvent[]): FinanceLookupOutput | undefined {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e?.event !== "raw") continue;

    const d = e.data as { agent?: unknown; payload?: unknown };
    if (d?.agent === "FinancialAnalyst" && d.payload && typeof d.payload === "object") {
      return d.payload as FinanceLookupOutput;
    }
  }
  return undefined;
}

export default function ChartsPage() {
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedMeta, setSelectedMeta] = useState<{ competitor: string; mode: Mode; createdAt: string } | null>(null);
  const [events, setEvents] = useState<StoredSseEvent[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function selectRun(runId: string) {
    setSelectedRunId(runId);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/history?id=${encodeURIComponent(runId)}`, { cache: "no-store" });
      const json = (await res.json()) as {
        competitor?: string;
        mode?: Mode;
        createdAt?: string;
        events?: StoredSseEvent[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      const nextEvents = Array.isArray(json.events) ? (json.events as StoredSseEvent[]) : [];
      setEvents(nextEvents);
      setSelectedMeta({
        competitor: typeof json.competitor === "string" ? json.competitor : "",
        mode: json.mode === "sequential" || json.mode === "hierarchical" ? json.mode : "sequential",
        createdAt: typeof json.createdAt === "string" ? json.createdAt : "",
      });
    } catch (e) {
      setEvents(null);
      setSelectedMeta(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const finance = useMemo(() => {
    return events ? extractFinanceFromEvents(events) : undefined;
  }, [events]);

  const strictNoMock = finance?.is_mock === true;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
      <Card className="shrink-0" variant="default">
        <CardBody>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle className="text-sm">Charts</CardTitle>
              <CardMeta className="mt-1 block">
                Select a cached run to render charts. Charts never render mock finance data.
              </CardMeta>
            </div>
          </CardHeader>
        </CardBody>
      </Card>

      <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-h-0 lg:col-span-4">
          <HistoryPanel
            title="History"
            onSelectRunId={(id) => {
              void selectRun(id);
            }}
          />
        </div>

        <div className="min-h-0 lg:col-span-8">
          <div className="flex min-h-0 flex-col gap-6">
            <Card className="shrink-0" variant="default">
              <CardBody>
                <div className="text-sm font-semibold text-zinc-200">Selection</div>

                {!selectedRunId ? (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    Pick a run from the history list to view financial charts.
                  </p>
                ) : loading ? (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">Loading run…</p>
                ) : error ? (
                  <div className="mt-3 rounded-xl border border-red-900/45 bg-red-950/35 px-4 py-3 text-sm text-red-200">
                    <div className="font-semibold">Failed to load run</div>
                    <div className="mt-1 text-red-200/90">{error}</div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-zinc-800/70 bg-zinc-950/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-zinc-400">
                        <span className="text-zinc-500">Competitor:</span> {selectedMeta?.competitor || "—"}
                      </div>
                      <div className="text-xs text-zinc-400">
                        <span className="text-zinc-500">Mode:</span> {selectedMeta?.mode || "—"}
                      </div>
                      <div className="text-xs text-zinc-400">
                        <span className="text-zinc-500">Created:</span>{" "}
                        {selectedMeta?.createdAt ? new Date(selectedMeta.createdAt).toLocaleString() : "—"}
                      </div>
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-zinc-600">id: {selectedRunId}</div>
                  </div>
                )}
              </CardBody>
            </Card>

            {selectedRunId && !loading && !error && (
              <div className="min-h-0 flex flex-col gap-6">
                {!finance ? (
                  <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-sm text-zinc-400">
                    <div className="font-semibold text-zinc-200">Financial charts</div>
                    <p className="mt-2 leading-relaxed">
                      This run doesn’t include a FinancialAnalyst output payload, so no financial charts can be rendered.
                    </p>
                  </div>
                ) : strictNoMock ? (
                  <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-4 text-sm text-amber-100">
                    <div className="font-semibold">Charts disabled (mock finance data)</div>
                    <p className="mt-2 leading-relaxed text-amber-100/90">
                      This run used mock finance data. Per your rule, charts only render when the finance tool returns real data.
                    </p>
                  </div>
                ) : (
                  <>
                    <TradingViewWidget finance={finance} />
                    <FinanceTrendChart finance={finance} />
                    <FinancePriceChangeChart finance={finance} />

                    {Array.isArray(finance.warnings) && finance.warnings.length > 0 && (
                      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-sm text-zinc-400">
                        <div className="font-semibold text-zinc-200">Finance warnings</div>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {finance.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
