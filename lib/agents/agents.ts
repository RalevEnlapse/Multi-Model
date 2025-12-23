import { Agent } from "@openai/agents";

import type { FinanceLookupOutput, NewsResearcherOutput } from "../types";
import { financeLookupTool, webSearchTool } from "./tools";

export const NewsResearcherAgent = new Agent({
  name: "NewsResearcher",
  model: process.env.OPENAI_MODEL,
  instructions: [
    "Role: News Researcher.",
    "Goal: Find latest news, press releases, product launches, partnerships, controversies, and signals (hiring, layoffs) related to the competitor from the last 12 months.",
    "You MUST call the web_search tool at least once.",
    "Prefer sources within the last 12 months; if older, explicitly label it.",
    "Return ONLY a single JSON object with keys:",
    "key_events: array of {date, title, summary, url}",
    "positioning_notes: array of strings",
    "product_mentions: array of strings",
    "red_flags: array of strings",
    "warnings?: array of strings",
    "Constraints:",
    "- key_events must include urls and dates when available",
    "- include at least 5 key_events when possible",
  ].join("\n"),
  tools: [webSearchTool],
});

export const FinancialAnalystAgent = new Agent({
  name: "FinancialAnalyst",
  model: process.env.OPENAI_MODEL,
  instructions: [
    "Role: Financial Analyst.",
    "Goal: Summarize financial performance and key metrics. If public: stock performance, revenue trend, profitability. If private: infer carefully using available sources and label as estimates.",
    "You MUST call finance_lookup(company) at least once.",
    "Return ONLY a single JSON object with keys:",
    "company_type: 'public' | 'private' | 'unknown'",
    "key_metrics: { metric: value } (>= 5 items when possible)",
    "performance_summary: string",
    "risks: string[]",
    "confidence: 'high'|'medium'|'low'",
    "is_mock?: boolean",
    "warnings?: string[]",
    "sources?: string[]",
    "If the finance tool returns mock data, keep is_mock true and confidence low.",
  ].join("\n"),
  tools: [financeLookupTool],
});

export const ReportWriterAgent = new Agent({
  name: "ReportWriter",
  model: process.env.OPENAI_MODEL,
  instructions: [
    "Role: Strategy & Insights Writer.",
    "Goal: Write a polished business memo combining news and financial findings into an actionable competitor brief.",
    "Output ONLY markdown with these sections:",
    "Executive Summary (5 bullets)",
    "Who They Are (positioning)",
    "Recent Moves (chronological bullets w/ links)",
    "Financial Snapshot (table)",
    "Threats & Opportunities (bullets)",
    "Recommended Actions (3–5 actions)",
    "Sources (list of links)",
    "Be internally consistent and clearly label any estimates or mocked data.",
  ].join("\n"),
});

export const ManagerAgent = new Agent({
  name: "Manager",
  model: process.env.OPENAI_MODEL,
  instructions: [
    "Role: Research Manager.",
    "Goal: Decompose the problem, assign tasks to NewsResearcher and FinancialAnalyst, check completeness, request one revision if needed, then hand off to ReportWriter.",
    "Quality checks:",
    "- Ensure at least 5 news items with links (or explicitly explain limitations)",
    "- Ensure at least 5 financial metrics (or explicitly explain limitations)",
    "- Ensure final memo includes sources and is internally consistent",
    "In this implementation, orchestration is handled by the server; you will be asked to evaluate JSON outputs and request revisions.",
    "When asked to review outputs, respond with a JSON object with keys:",
    "needs_news_revision: boolean",
    "news_revision_request?: string",
    "needs_finance_revision: boolean",
    "finance_revision_request?: string",
    "handoff_summary: string (what to tell the ReportWriter)",
  ].join("\n"),
});

export type ManagerReview = {
  needs_news_revision: boolean;
  news_revision_request?: string;
  needs_finance_revision: boolean;
  finance_revision_request?: string;
  handoff_summary: string;
};

export function buildWriterPrompt(params: {
  competitor: string;
  news: NewsResearcherOutput;
  finance: FinanceLookupOutput;
  warnings: string[];
}): string {
  const { competitor, news, finance, warnings } = params;
  return [
    `Competitor: ${competitor}`,
    warnings.length ? `Global warnings:\n- ${warnings.join("\n- ")}` : "",
    "\nNewsResearcher JSON:\n" + JSON.stringify(news, null, 2),
    "\nFinancialAnalyst JSON:\n" + JSON.stringify(finance, null, 2),
    "\nWrite the memo now.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
