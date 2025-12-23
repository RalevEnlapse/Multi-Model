# Automated Market Research Team (Multi‑Agent Demo)

Production-ready Next.js (App Router) + TypeScript web app demonstrating a collaborative multi-agent system for automated market research using the OpenAI Agents SDK.

## Custom OpenAI client / base URL

Set optional env vars to use a custom OpenAI-compatible gateway:
- `OPENAI_BASE_URL` (example: `https://api.openai.com/v1`)
- `OPENAI_API_MODE` (`responses` or `chat_completions`)
- `OPENAI_AGENTS_DISABLE_TRACING=1` to disable the Agents SDK tracing exporter (suppresses noisy non-fatal tracing errors)

This is wired in [`initOpenAI()`](lib/server/openai.ts:1) and called before each run from [`orchestrateRun()`](lib/server/orchestrate.ts:151).

## What it does

Given a competitor name (e.g. “Competitor X”), the system generates a competitor brief.

**Two run modes:**
- **Sequential:** NewsResearcher → FinancialAnalyst → ReportWriter
- **Hierarchical:** Manager coordinates NewsResearcher + FinancialAnalyst, requests one revision if needed, then hands off to ReportWriter

**UX:**
- live activity log via Server-Sent Events (SSE)
- final memo rendered from markdown
- “View raw outputs” panel to inspect intermediate agent outputs

## Tech stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- OpenAI Agents SDK via [`@openai/agents`](package.json:12)
- Tavily web search (`TAVILY_API_KEY`)
- Alpha Vantage finance (`ALPHA_VANTAGE_API_KEY`) with deterministic mock fallback

## Setup

1) Install dependencies

```bash
npm install
```

2) Create your env file

Copy [`.env.example`](.env.example:1) to `.env.local` and fill in values:

- `OPENAI_API_KEY` (required)
- `TAVILY_API_KEY` (recommended; otherwise news will be empty with warnings)
- `ALPHA_VANTAGE_API_KEY` (optional; if missing, finance tool uses deterministic mock values)

3) Run dev

```bash
npm run dev
```

Open http://localhost:3000

## How it works (code map)

- API route (SSE): [`GET/POST /api/run`](app/api/run/route.ts:1)
- Orchestration logic (sequential vs hierarchical): [`orchestrateRun()`](lib/server/orchestrate.ts:1)
- SSE writer helper: [`createSseWriter()`](lib/server/sse.ts:1)
- Agents:
  - News researcher: [`NewsResearcherAgent`](lib/agents/agents.ts:1)
  - Finance analyst: [`FinancialAnalystAgent`](lib/agents/agents.ts:1)
  - Report writer: [`ReportWriterAgent`](lib/agents/agents.ts:1)
  - Manager (hierarchical): [`ManagerAgent`](lib/agents/agents.ts:1)
- Tools:
  - Tavily search: [`tavilyWebSearch()`](lib/tools/tavily.ts:1)
  - Finance lookup (Alpha Vantage + mock fallback): [`financeLookup()`](lib/tools/finance.ts:1)
  - In-memory caching (10 min TTL): [`getCache()`](lib/tools/cache.ts:1)

## Notes on streaming

The UI uses `EventSource` (SSE) to stream progress messages in real time.

- Start a run by opening `/api/run?competitor=...&mode=...`
- The server emits `log`, `raw`, `final`, `error`, and `done` events.

## Security notes
- API keys are only used server-side in route handlers and tool implementations.
- The browser talks to the server via SSE; no secrets are exposed.

## Troubleshooting
- If you see `OPENAI_API_KEY is missing`, add it to `.env.local` and restart the dev server.
- If Tavily fails / rate limits, you’ll still get a partial report with warnings.
