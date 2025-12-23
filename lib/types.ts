export type Mode = "sequential" | "hierarchical";

export type AgentName =
  | "Manager"
  | "NewsResearcher"
  | "FinancialAnalyst"
  | "ReportWriter";

export type SseEventName = "log" | "raw" | "final" | "error" | "done";

export type TavilySearchResult = {
  title: string;
  url: string;
  content?: string;
  snippet?: string;
  published_date?: string;
};

export type WebSearchResultItem = {
  title: string;
  url: string;
  snippet: string;
  date?: string;
};

export type NewsResearcherOutput = {
  key_events: Array<{
    date: string;
    title: string;
    summary: string;
    url: string;
  }>;
  positioning_notes: string[];
  product_mentions: string[];
  red_flags: string[];
  warnings?: string[];
};

export type FinanceLookupOutput = {
  company: string;
  company_type: "public" | "private" | "unknown";
  key_metrics: Record<string, string | number>;
  performance_summary: string;
  risks: string[];
  confidence: "high" | "medium" | "low";
  is_mock?: boolean;
  warnings?: string[];
  sources?: string[];
};

export type RunRawOutputs = {
  NewsResearcher?: NewsResearcherOutput;
  FinancialAnalyst?: FinanceLookupOutput;
  ReportWriter?: string;
  Manager?: unknown;
};

export type LogEventData = {
  ts: string;
  agent: AgentName;
  message: string;
};

export type RawEventData = {
  ts: string;
  agent: AgentName;
  payload: unknown;
};

export type FinalEventData = {
  ts: string;
  markdown: string;
};

export type ErrorEventData = {
  ts: string;
  message: string;
  details?: unknown;
};

export type DoneEventData = {
  ts: string;
};

export type RunRequest = {
  competitor: string;
  mode: Mode;
};
