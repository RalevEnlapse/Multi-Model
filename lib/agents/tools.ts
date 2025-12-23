import { tool } from "@openai/agents";
import { z } from "zod";

import { tavilyWebSearch } from "../tools/tavily";
import { financeLookup } from "../tools/finance";

export const webSearchTool = tool({
  name: "web_search",
  description:
    "Search the web for recent, relevant sources. Returns a list of structured results with title, snippet, url, and optional date.",
  parameters: z.object({
    query: z.string().min(3),
  }),
  execute: async ({ query }) => {
    const { results, warnings } = await tavilyWebSearch(query);
    return { results, warnings };
  },
});

export const financeLookupTool = tool({
  name: "finance_lookup",
  description:
    "Lookup financial performance and key metrics for a company. Returns structured data; may be mocked if ALPHA_VANTAGE_API_KEY is missing.",
  parameters: z.object({
    company: z.string().min(1),
  }),
  execute: async ({ company }) => {
    return financeLookup(company);
  },
});
