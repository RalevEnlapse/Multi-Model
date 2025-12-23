import { z } from "zod";

import { getCache, setCache, TEN_MINUTES_MS } from "./cache";
import type { WebSearchResultItem } from "../types";

const TavilyResponseSchema = z.object({
  results: z
    .array(
      z.object({
        title: z.string().default(""),
        url: z.string().url(),
        content: z.string().optional(),
        snippet: z.string().optional(),
        published_date: z.string().optional(),
      })
    )
    .default([]),
});

export async function tavilyWebSearch(query: string): Promise<{
  results: WebSearchResultItem[];
  warnings: string[];
}> {
  const warnings: string[] = [];
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    warnings.push(
      "TAVILY_API_KEY is not set. Returning empty search results (news section may be incomplete)."
    );
    return { results: [], warnings };
  }

  const cacheKey = `tavily:${query}`;
  const cached = getCache<{ results: WebSearchResultItem[]; warnings: string[] }>(
    cacheKey
  );
  if (cached) return cached;

  try {
    const url = "https://api.tavily.com/search";

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: false,
        include_images: false,
        include_raw_content: false,
        max_results: 8,
        // Tavily supports time ranges in some tiers; keep query constrained instead.
      }),
    });

    // Helpful diagnostics: the 405 you are seeing typically comes from the upstream
    // provider used by the Agents SDK (not from Tavily directly). Still, logging
    // here rules Tavily out quickly if it ever happens.
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      warnings.push(`Tavily error: HTTP ${res.status} ${text}`);
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn(`[tavily] ${url} -> ${res.status} body=${text.slice(0, 300)}`);
      }
      const value = { results: [], warnings };
      setCache(cacheKey, value, TEN_MINUTES_MS);
      return value;
    }

    const json = await res.json();
    const parsed = TavilyResponseSchema.safeParse(json);
    if (!parsed.success) {
      warnings.push("Tavily response validation failed; returning empty results.");
      const value = { results: [], warnings };
      setCache(cacheKey, value, TEN_MINUTES_MS);
      return value;
    }

    const results: WebSearchResultItem[] = parsed.data.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.snippet ?? r.content ?? "",
      date: r.published_date,
    }));

    const value = { results, warnings };
    setCache(cacheKey, value, TEN_MINUTES_MS);
    return value;
  } catch (err) {
    warnings.push(
      `Tavily request failed: ${err instanceof Error ? err.message : String(err)}`
    );
    const value = { results: [], warnings };
    setCache(cacheKey, value, TEN_MINUTES_MS);
    return value;
  }
}
