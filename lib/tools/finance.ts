import { getCache, setCache, TEN_MINUTES_MS } from "./cache";
import type { FinanceLookupOutput } from "../types";

function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function mockFinance(company: string): FinanceLookupOutput {
  const seed = stableHash(company.toLowerCase());
  const isPublic = seed % 3 === 0;
  const companyType: FinanceLookupOutput["company_type"] = isPublic
    ? "public"
    : seed % 3 === 1
      ? "private"
      : "unknown";

  const revenue = 500_000_000 + (seed % 2_000_000_000); // 0.5B - 2.5B
  const grossMargin = 0.35 + ((seed % 25) / 100); // 35% - 60%
  const yoy = -0.05 + ((seed % 30) / 100); // -5% to +25%
  const headcount = 400 + (seed % 6500);

  const key_metrics: Record<string, string | number> = {
    "Revenue (est.)": `$${(revenue / 1e9).toFixed(2)}B`,
    "Revenue YoY (est.)": `${(yoy * 100).toFixed(1)}%`,
    "Gross margin (est.)": `${(grossMargin * 100).toFixed(0)}%`,
    "Headcount (signal)": headcount,
    "Cash runway (proxy)": `${Math.max(6, (seed % 24) + 6)} months`,
  };

  if (companyType === "public") {
    const priceChange = -0.2 + ((seed % 50) / 100); // -20% to +30%
    const marketCap = 2_000_000_000 + (seed % 80_000_000_000);
    key_metrics["Stock (12M change)"] = `${(priceChange * 100).toFixed(1)}%`;
    key_metrics["Market cap"] = `$${(marketCap / 1e9).toFixed(1)}B`;
  }

  return {
    company,
    company_type: companyType,
    key_metrics,
    performance_summary:
      "Mocked financial snapshot generated because ALPHA_VANTAGE_API_KEY is missing. Treat as placeholders; replace with real data when available.",
    risks: [
      "Mock data may differ materially from real financials.",
      "Private-company estimates can be misleading without primary sources.",
    ],
    confidence: "low",
    is_mock: true,
    warnings: ["Using deterministic mock finance tool (no Alpha Vantage key)."],
    sources: [],
  };
}

export async function financeLookup(company: string): Promise<FinanceLookupOutput> {
  const cacheKey = `finance:${company}`;
  const cached = getCache<FinanceLookupOutput>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  // Strict no-mock rule for charts: without a real provider key, we still return a mocked
  // FinanceLookupOutput for memo generation, but we explicitly mark it as mock and never
  // attach a time series.
  if (!apiKey) {
    const value = mockFinance(company);
    setCache(cacheKey, value, TEN_MINUTES_MS);
    return value;
  }

  // Alpha Vantage is equity-focused; for a generic competitor name we attempt symbol search.
  try {
    const searchUrl = new URL("https://www.alphavantage.co/query");
    searchUrl.searchParams.set("function", "SYMBOL_SEARCH");
    searchUrl.searchParams.set("keywords", company);
    searchUrl.searchParams.set("apikey", apiKey);

    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) {
      const text = await searchRes.text().catch(() => "");
      const value = {
        ...mockFinance(company),
        is_mock: true,
        warnings: [
          `Alpha Vantage SYMBOL_SEARCH failed (HTTP ${searchRes.status}). Falling back to mock.`,
          text.slice(0, 300),
        ].filter(Boolean),
      };
      setCache(cacheKey, value, TEN_MINUTES_MS);
      return value;
    }

    const searchJson = (await searchRes.json()) as {
      bestMatches?: unknown;
    };
    const best = Array.isArray(searchJson?.bestMatches)
      ? (searchJson.bestMatches[0] as Record<string, unknown> | undefined)
      : undefined;

    const symbol = typeof best?.["1. symbol"] === "string" ? (best["1. symbol"] as string) : undefined;

    if (!symbol) {
      const value: FinanceLookupOutput = {
        company,
        company_type: "unknown",
        key_metrics: {
          Coverage: "No public symbol found via Alpha Vantage",
        },
        performance_summary:
          "Could not find a reliable public ticker symbol for this competitor; returning limited metrics.",
        risks: [
          "No ticker symbol found; financial metrics may be unavailable.",
          "Name ambiguity: multiple companies can share similar names.",
        ],
        confidence: "low",
        warnings: ["Alpha Vantage did not return a usable symbol."],
        sources: ["https://www.alphavantage.co/documentation/"],
      };
      setCache(cacheKey, value, TEN_MINUTES_MS);
      return value;
    }

    // Quote (last price + change percent)
    const quoteUrl = new URL("https://www.alphavantage.co/query");
    quoteUrl.searchParams.set("function", "GLOBAL_QUOTE");
    quoteUrl.searchParams.set("symbol", symbol);
    quoteUrl.searchParams.set("apikey", apiKey);

    const quoteRes = await fetch(quoteUrl.toString());
    const quoteJson = quoteRes.ok
      ? ((await quoteRes.json()) as Record<string, unknown>)
      : null;
    const q =
      quoteJson && typeof quoteJson === "object"
        ? (quoteJson["Global Quote"] as Record<string, unknown> | undefined)
        : undefined;

    const price = q?.["05. price"] ? Number(q["05. price"]) : undefined;
    const changePercent = q?.["10. change percent"] ? String(q["10. change percent"]) : undefined;

    // Daily time series (trend chart). We keep last 90 days.
    const seriesUrl = new URL("https://www.alphavantage.co/query");
    seriesUrl.searchParams.set("function", "TIME_SERIES_DAILY");
    seriesUrl.searchParams.set("symbol", symbol);
    // Use compact to reduce payload and rate-limit risk.
    seriesUrl.searchParams.set("outputsize", "compact");
    seriesUrl.searchParams.set("apikey", apiKey);

    let price_series: Array<{ date: string; close: number }> | undefined;
    try {
      const seriesRes = await fetch(seriesUrl.toString());
      if (seriesRes.ok) {
        const seriesJson = (await seriesRes.json()) as Record<string, unknown>;

        // Alpha Vantage returns {"Error Message": ...} and/or {"Note": ...} on failures/rate-limits.
        const maybeError =
          typeof seriesJson["Error Message"] === "string"
            ? (seriesJson["Error Message"] as string)
            : typeof seriesJson["Note"] === "string"
              ? (seriesJson["Note"] as string)
              : undefined;

        if (!maybeError) {
          const ts = seriesJson["Time Series (Daily)"] as Record<string, unknown> | undefined;

          if (ts && typeof ts === "object") {
            const points: Array<{ date: string; close: number }> = [];
            for (const [date, v] of Object.entries(ts)) {
              if (!v || typeof v !== "object") continue;
              const closeRaw = (v as Record<string, unknown>)["4. close"];
              const close =
                typeof closeRaw === "string"
                  ? Number(closeRaw)
                  : typeof closeRaw === "number"
                    ? closeRaw
                    : NaN;
              if (Number.isFinite(close)) points.push({ date, close });
            }

            // Sort ascending and take last 90 points.
            points.sort((a, b) => a.date.localeCompare(b.date));
            price_series = points.slice(-90);
          }
        }
      }
    } catch {
      // If series fails, we still return quote metrics; trend chart will not render.
      // (Do not mark as mock; we still have real quote data.)
    }

    const value: FinanceLookupOutput = {
      company,
      company_type: "public",
      key_metrics: {
        Symbol: symbol,
        "Last price": price ?? "unknown",
        "Change percent": changePercent ?? "unknown",
        Exchange: typeof best?.["4. region"] === "string" ? (best["4. region"] as string) : "unknown",
        Currency: typeof best?.["8. currency"] === "string" ? (best["8. currency"] as string) : "unknown",
      },
      price_series,
      performance_summary:
        "Public-market snapshot based on Alpha Vantage symbol search, global quote, and daily close series (when available). Revenue/profitability are not provided by this endpoint.",
      risks: [
        "Alpha Vantage free endpoints may be rate-limited.",
        "Revenue/profitability require additional data sources beyond price series.",
      ],
      confidence: price_series?.length ? "medium" : "low",
      warnings: [],
      sources: ["https://www.alphavantage.co"],
    };

    setCache(cacheKey, value, TEN_MINUTES_MS);
    return value;
  } catch (err) {
    const value = {
      ...mockFinance(company),
      is_mock: true,
      warnings: [
        `Alpha Vantage request error: ${err instanceof Error ? err.message : String(err)}`,
        "Falling back to deterministic mock.",
      ],
    };
    setCache(cacheKey, value, TEN_MINUTES_MS);
    return value;
  }
}
