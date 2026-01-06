"use client";

import type { FinanceLookupOutput } from "../../lib/types";

function extent(nums: number[]): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const n of nums) {
    if (n < min) min = n;
    if (n > max) max = n;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 0 };
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

export default function FinanceTrendChart(props: { finance: FinanceLookupOutput }) {
  const { finance } = props;

  if (finance.is_mock === true) {
    return null;
  }

  const series = Array.isArray(finance.price_series) ? finance.price_series : undefined;
  if (!series || series.length < 2) {
    return (
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-sm text-zinc-400">
        <div className="font-semibold text-zinc-200">90-day close trend</div>
        <p className="mt-2 leading-relaxed">
          No daily close series available for this run.
        </p>
      </div>
    );
  }

  const closes = series.map((p) => p.close);
  const { min, max } = extent(closes);
  const first = series[0]?.close ?? closes[0];
  const last = series[series.length - 1]?.close ?? closes[closes.length - 1];
  const deltaPct = first ? ((last - first) / first) * 100 : 0;
  const up = deltaPct >= 0;

  const width = 860;
  const height = 220;
  const padX = 12;
  const padY = 12;

  const xFor = (i: number) => {
    const t = series.length === 1 ? 0 : i / (series.length - 1);
    return padX + t * (width - padX * 2);
  };

  const yFor = (v: number) => {
    const t = (v - min) / (max - min);
    // invert y
    return padY + (1 - t) * (height - padY * 2);
  };

  let d = "";
  for (let i = 0; i < series.length; i++) {
    const p = series[i];
    const x = xFor(i);
    const y = yFor(p.close);
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }

  const tone = up ? "text-emerald-300" : "text-red-300";

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-200">90-day close trend</div>
          <div className="mt-1 text-xs text-zinc-500">{finance.company}</div>
        </div>
        <div className={"shrink-0 text-xs font-semibold " + tone}>
          {up ? "+" : ""}
          {deltaPct.toFixed(2)}%
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/20">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[220px] w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label="Daily close trend line"
        >
          <path d={d} fill="none" stroke={up ? "rgba(52, 211, 153, 0.85)" : "rgba(248, 113, 113, 0.85)"} strokeWidth="3" />
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
        <span>
          Start: <span className="font-mono">{first.toFixed(2)}</span>
        </span>
        <span>
          End: <span className="font-mono">{last.toFixed(2)}</span>
        </span>
        <span>
          Range: <span className="font-mono">{min.toFixed(2)}–{max.toFixed(2)}</span>
        </span>
      </div>
    </div>
  );
}
