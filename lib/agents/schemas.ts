import { z } from "zod";

export const NewsResearcherOutputSchema = z.object({
  key_events: z
    .array(
      z.object({
        date: z.string().default(""),
        title: z.string().default(""),
        summary: z.string().default(""),
        url: z.string().url(),
      })
    )
    .default([]),
  positioning_notes: z.array(z.string()).default([]),
  product_mentions: z.array(z.string()).default([]),
  red_flags: z.array(z.string()).default([]),
  warnings: z.array(z.string()).optional(),
});

export const FinanceOutputSchema = z.object({
  company: z.string().default(""),
  company_type: z.enum(["public", "private", "unknown"]),
  key_metrics: z.record(z.string(), z.union([z.string(), z.number()])),
  performance_summary: z.string(),
  risks: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low"]),
  is_mock: z.boolean().optional(),
  warnings: z.array(z.string()).optional(),
  sources: z.array(z.string()).optional(),
});

export const ManagerReviewSchema = z.object({
  needs_news_revision: z.boolean(),
  news_revision_request: z.string().optional(),
  needs_finance_revision: z.boolean(),
  finance_revision_request: z.string().optional(),
  handoff_summary: z.string(),
});
