"use client";

import { useEffect, useId, useMemo } from "react";

import type { FinanceLookupOutput } from "../../lib/types";

function getStringKey(obj: Record<string, unknown> | undefined, keys: string[]): string {
  if (!obj) return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function normalizeExchangeToTradingView(exchange: string, currency: string): string {
  const ex = exchange.toLowerCase();
  const cur = currency.toUpperCase();

  // US
  if (ex.includes("nasdaq")) return "NASDAQ";
  if (ex.includes("nyse")) return "NYSE";
  if (ex.includes("amex")) return "AMEX";

  // EU
  if (ex.includes("frankfurt") || ex.includes("xetra") || ex.includes("germany")) return "FWB";
  if (ex.includes("london") || ex.includes("lse") || ex.includes("united kingdom")) return "LSE";
  if (ex.includes("euronext") || ex.includes("paris")) return "EURONEXT";
  if (ex.includes("milan")) return "MIL";

  // Asia
  if (ex.includes("tokyo") || ex.includes("tse") || ex.includes("japan")) return "TSE";
  if (ex.includes("hong kong") || ex.includes("hkex")) return "HKEX";

  // Fallback heuristics by currency
  if (cur === "USD") return "NASDAQ";
  if (cur === "EUR") return "EURONEXT";
  if (cur === "GBP") return "LSE";
  if (cur === "JPY") return "TSE";

  return "NASDAQ";
}

function buildTradingViewSymbol(finance: FinanceLookupOutput): { symbol: string; exchange: string; rawSymbol: string } | null {
  if (finance.is_mock === true) return null;

  const km = finance.key_metrics as unknown as Record<string, unknown> | undefined;

  const rawSymbol = getStringKey(km, ["Symbol", "ticker", "Ticker"]);
  if (!rawSymbol) return null;

  const exchangeRaw = getStringKey(km, ["Exchange", "exchange"]);
  const currency = getStringKey(km, ["Currency", "currency"]);

  const exchange = normalizeExchangeToTradingView(exchangeRaw, currency);

  // TradingView symbol format like NASDAQ:MSFT
  return { symbol: `${exchange}:${rawSymbol}`, exchange, rawSymbol };
}

export default function TradingViewWidget(props: { finance: FinanceLookupOutput }) {
  const { finance } = props;

  const containerId = useId();

  const tv = useMemo(() => buildTradingViewSymbol(finance), [finance]);

  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;

    // Clear any previous render.
    el.innerHTML = "";

    if (!tv) return;

    // TradingView widget script approach.
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // The script expects JSON text content.
    script.text = JSON.stringify({
      autosize: true,
      symbol: tv.symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: false,
      calendar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
    });

    el.appendChild(script);

    return () => {
      // Best-effort cleanup.
      el.innerHTML = "";
    };
  }, [containerId, tv]);

  if (!tv) {
    return (
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-sm text-zinc-400">
        <div className="font-semibold text-zinc-200">TradingView</div>
        <p className="mt-2 leading-relaxed">
          TradingView widget can’t be rendered for this run (missing real ticker symbol).
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-zinc-200">TradingView chart</div>
          <div className="mt-1 text-xs text-zinc-500">{tv.symbol}</div>
        </div>
        <div className="shrink-0 rounded-full border border-zinc-800/70 bg-zinc-950/30 px-3 py-1 text-xs text-zinc-300">
          {tv.rawSymbol}
        </div>
      </div>

      <div className="mt-4 h-[520px] overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/20">
        <div id={containerId} className="h-full w-full" />
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Data and rendering provided by TradingView widget embed.
      </div>
    </div>
  );
}
