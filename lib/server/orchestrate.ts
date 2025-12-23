import { z } from "zod";

import type { Mode, NewsResearcherOutput, FinanceLookupOutput } from "../types";
import { initOpenAI } from "./openai";
import { createSseWriter, type SseWriter } from "./sse";
import {
  FinancialAnalystAgent,
  ManagerAgent,
  NewsResearcherAgent,
  ReportWriterAgent,
  type ManagerReview,
  buildWriterPrompt,
} from "../agents/agents";
import {
  FinanceOutputSchema,
  ManagerReviewSchema,
  NewsResearcherOutputSchema,
} from "../agents/schemas";
import { runAgentJson, runAgentMarkdown } from "../agents/runAgent";

function safeString(input: unknown): string {
  return typeof input === "string" ? input : JSON.stringify(input);
}

function clampCompetitor(input: string): string {
  return input.trim().slice(0, 80);
}

async function runNews(params: {
  competitor: string;
  writer: SseWriter;
  revisionRequest?: string;
}): Promise<NewsResearcherOutput> {
  const { competitor, writer, revisionRequest } = params;

  writer.log(
    "NewsResearcher",
    revisionRequest ? `revision requested: ${revisionRequest}` : "searching…"
  );

  const prompt = [
    `Competitor: ${competitor}`,
    "Task: Gather at least 5 key events from the last 12 months with links.",
    revisionRequest ? `Revision request: ${revisionRequest}` : "",
    "Use web_search with queries like: \"<competitor> press release 2025\", \"<competitor> partnership\", \"<competitor> product launch\", \"<competitor> layoffs\".",
  ]
    .filter(Boolean)
    .join("\n");

  const data = await runAgentJson({
    agentName: "NewsResearcher",
    agent: NewsResearcherAgent,
    input: prompt,
    schema: NewsResearcherOutputSchema,
  });

  writer.raw("NewsResearcher", data);
  writer.log(
    "NewsResearcher",
    `done (${data.key_events.length} items${data.warnings?.length ? "; warnings" : ""})`
  );
  return data;
}

async function runFinance(params: {
  competitor: string;
  writer: SseWriter;
  revisionRequest?: string;
}): Promise<FinanceLookupOutput> {
  const { competitor, writer, revisionRequest } = params;

  writer.log(
    "FinancialAnalyst",
    revisionRequest ? `revision requested: ${revisionRequest}` : "fetching…"
  );

  const prompt = [
    `Company: ${competitor}`,
    "Task: Provide at least 5 key financial metrics when possible; if not possible, explain why and label estimates.",
    revisionRequest ? `Revision request: ${revisionRequest}` : "",
    "You must call finance_lookup(company).",
  ]
    .filter(Boolean)
    .join("\n");

  const data = await runAgentJson({
    agentName: "FinancialAnalyst",
    agent: FinancialAnalystAgent,
    input: prompt,
    schema: FinanceOutputSchema,
  });

  writer.raw("FinancialAnalyst", data);
  writer.log(
    "FinancialAnalyst",
    `done (${Object.keys(data.key_metrics ?? {}).length} metrics${data.is_mock ? "; mock" : ""})`
  );
  return data;
}

async function runWriter(params: {
  competitor: string;
  writer: SseWriter;
  news: NewsResearcherOutput;
  finance: FinanceLookupOutput;
  warnings: string[];
}): Promise<string> {
  const { competitor, writer, news, finance, warnings } = params;

  writer.log("ReportWriter", "drafting memo…");
  const prompt = buildWriterPrompt({ competitor, news, finance, warnings });
  const markdown = await runAgentMarkdown({
    agentName: "ReportWriter",
    agent: ReportWriterAgent,
    input: prompt,
  });

  writer.raw("ReportWriter", markdown);
  writer.final(markdown);
  writer.log("ReportWriter", "done");
  return markdown;
}

async function runManagerReview(params: {
  competitor: string;
  writer: SseWriter;
  news: NewsResearcherOutput;
  finance: FinanceLookupOutput;
}): Promise<ManagerReview> {
  const { competitor, writer, news, finance } = params;

  writer.log("Manager", "reviewing completeness…");
  const input = [
    `Competitor: ${competitor}`,
    "Review the outputs below and decide if revisions are needed.",
    "NewsResearcher JSON:\n" + JSON.stringify(news, null, 2),
    "FinancialAnalyst JSON:\n" + JSON.stringify(finance, null, 2),
  ].join("\n\n");

  const review = await runAgentJson({
    agentName: "Manager",
    agent: ManagerAgent,
    input,
    schema: ManagerReviewSchema,
  });

  writer.raw("Manager", review);
  writer.log("Manager", "review complete");
  return review;
}

export async function orchestrateRun(params: {
  competitor: string;
  mode: Mode;
  controller: ReadableStreamDefaultController<Uint8Array>;
}): Promise<void> {
  const competitor = clampCompetitor(params.competitor);
  const writer = createSseWriter(params.controller);

  // Ensure custom OpenAI client + baseURL settings are applied before first run.
  initOpenAI();

  const warnings: string[] = [];

  if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_BASE_URL) {
    writer.error(
      "OPENAI_API_KEY is missing. Set it in your environment; it is required to run agents."
    );
    writer.done();
    return;
  }

  writer.log(
    "Manager",
    `starting run (${params.mode}) for competitor: ${competitor}`
  );

  try {
    if (params.mode === "sequential") {
      const news = await runNews({ competitor, writer });
      const finance = await runFinance({ competitor, writer });

      (news.warnings ?? []).forEach((w) => warnings.push(`News: ${w}`));
      (finance.warnings ?? []).forEach((w) => warnings.push(`Finance: ${w}`));

      await runWriter({ competitor, writer, news, finance, warnings });
      writer.done();
      return;
    }

    // hierarchical
    writer.log("Manager", "dispatching specialists…");

    const [news0, finance0] = await Promise.all([
      runNews({ competitor, writer }),
      runFinance({ competitor, writer }),
    ]);

    const review0 = await runManagerReview({
      competitor,
      writer,
      news: news0,
      finance: finance0,
    });

    const news = review0.needs_news_revision
      ? await runNews({
          competitor,
          writer,
          revisionRequest:
            review0.news_revision_request ??
            "Please add at least 5 recent news items with links.",
        })
      : news0;

    const finance = review0.needs_finance_revision
      ? await runFinance({
          competitor,
          writer,
          revisionRequest:
            review0.finance_revision_request ??
            "Please provide at least 5 financial metrics or explain why not possible.",
        })
      : finance0;

    (news.warnings ?? []).forEach((w) => warnings.push(`News: ${w}`));
    (finance.warnings ?? []).forEach((w) => warnings.push(`Finance: ${w}`));

    if (review0.handoff_summary) warnings.push(`Manager: ${review0.handoff_summary}`);

    await runWriter({ competitor, writer, news, finance, warnings });
    writer.done();
  } catch (err) {
    writer.error("Run failed", {
      message: err instanceof Error ? err.message : safeString(err),
    });
    writer.done();
  }
}
