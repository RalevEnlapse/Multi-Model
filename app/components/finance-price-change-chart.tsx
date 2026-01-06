"use client";

import type { FinanceLookupOutput } from "../../lib/types";

function parseNumberMaybe(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[$,\s]/g, "").trim();
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function parsePercentMaybe(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/%/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export default function FinancePriceChangeChart(props: { finance: FinanceLookupOutput }) {
  const { finance } = props;

  const symbol = String(finance.key_metrics?.["Symbol"] ?? "").trim();

  // Prefer last point from real series when available.
  const seriesLast = Array.isArray(finance.price_series)
    ? finance.price_series[finance.price_series.length - 1]
    : undefined;

  const lastPrice =
    typeof seriesLast?.close === "number" && Number.isFinite(seriesLast.close)
      ? seriesLast.close
      : parseNumberMaybe(finance.key_metrics?.["Last price"]);
  const changePct = parsePercentMaybe(finance.key_metrics?.["Change percent"]);

  const canChart =
    finance.company_type === "public" &&
    finance.is_mock !== true &&
    Boolean(symbol) &&
    typeof lastPrice === "number" &&
    typeof changePct === "number";

  if (!canChart) {
    return (
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-sm text-zinc-400">
        <div className="font-semibold text-zinc-200">Price + Change%</div>
        <p className="mt-2 leading-relaxed">
          Not enough real public-market data in this run to render a chart.
        </p>
      </div>
    );
  }

  const up = changePct >= 0;
  const tone = up ? "text-emerald-300" : "text-red-300";

  // Single-bar “indicator” chart: map absolute change percent into [0..100] width (cap at 25%).
  const width = Math.min(100, (Math.abs(changePct) / 25) * 100);

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-200">Price + Change%</div>
          <div className="mt-1 text-xs text-zinc-500">{finance.company}</div>
        </div>
        <div className="shrink-0 rounded-full border border-zinc-800/70 bg-zinc-950/30 px-3 py-1 text-xs text-zinc-300">
          {symbol}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/20 p-3">
          <div className="text-xs text-zinc-500">Last price</div>
          <div className="mt-1 text-xl font-semibold text-zinc-100">{lastPrice.toLocaleString()}</div>
        </div>

        <div className="rounded-xl border border-zinc-800/70 bg-zinc-950/20 p-3">
          <div className="text-xs text-zinc-500">Change percent</div>
          <div className={"mt-1 text-xl font-semibold " + tone}>
            {up ? "+" : ""}
            {changePct.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>Magnitude</span>
          <span>capped at 25%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-zinc-800/70 bg-zinc-950/25">
          <div
            className={"h-full " + (up ? "bg-emerald-400/70" : "bg-red-400/70")}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>

      {Array.isArray(finance.sources) && finance.sources.length > 0 && (
        <div className="mt-4 text-xs text-zinc-500">
          Source: <span className="font-mono">{finance.sources[0]}</span>
        </div>
      )}
    </div>
  );
}
