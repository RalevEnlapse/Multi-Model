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
  const cash = 50_000_000 + (seed % 450_000_000);

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

    const searchJson = (await searchRes.json()) as any;
    const best = Array.isArray(searchJson?.bestMatches)
      ? searchJson.bestMatches[0]
      : undefined;

    const symbol: string | undefined = best?.["1. symbol"];

    if (!symbol) {
      const value: FinanceLookupOutput = {
        company,
        company_type: "unknown",
        key_metrics: {
          "Coverage": "No public symbol found via Alpha Vantage",
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

    const quoteUrl = new URL("https://www.alphavantage.co/query");
    quoteUrl.searchParams.set("function", "GLOBAL_QUOTE");
    quoteUrl.searchParams.set("symbol", symbol);
    quoteUrl.searchParams.set("apikey", apiKey);

    const quoteRes = await fetch(quoteUrl.toString());
    const quoteJson = quoteRes.ok ? ((await quoteRes.json()) as any) : null;
    const q = quoteJson?.["Global Quote"];

    const price = q?.["05. price"] ? Number(q["05. price"]) : undefined;
    const changePercent = q?.["10. change percent"]
      ? String(q["10. change percent"])
      : undefined;

    const value: FinanceLookupOutput = {
      company,
      company_type: "public",
      key_metrics: {
        Symbol: symbol,
        "Last price": price ?? "unknown",
        "Change percent": changePercent ?? "unknown",
        "Exchange": best?.["4. region"] ?? "unknown",
        Currency: best?.["8. currency"] ?? "unknown",
      },
      performance_summary:
        "Public-market snapshot based on Alpha Vantage symbol search and global quote. Revenue/profitability are not provided by this endpoint.",
      risks: [
        "Alpha Vantage free endpoints may be rate-limited.",
        "Revenue/profitability require additional data sources beyond GLOBAL_QUOTE.",
      ],
      confidence: "medium",
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
