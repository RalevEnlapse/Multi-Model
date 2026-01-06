"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { AgentName, Mode, RunRawOutputs } from "../../lib/types";

import ActivityPanel, { RawOutputsPanel, type ActivityItem } from "../components/activity-panel";
import {
  loadDashboardLayoutSettings,
  type DashboardLayoutSettings,
  type DashboardPanelId,
} from "../components/dashboard-settings";
import FinalMemoPanel from "../components/final-memo-panel";
import ResearchHeader from "../components/research-header";
import RunControls, { type UiState } from "../components/run-controls";
import type { StoredSseEvent } from "../../lib/server/run-history";

function extractFinalFromEvents(events: StoredSseEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i]?.event === "final") {
      const d = events[i].data as { markdown?: unknown };
      return typeof d?.markdown === "string" ? d.markdown : "";
    }
  }
  return "";
}

function extractRawMapFromEvents(events: StoredSseEvent[]): RunRawOutputs {
  const out: RunRawOutputs = {};
  for (const e of events) {
    if (e.event === "raw") {
      const d = e.data as { agent?: unknown; payload?: unknown };
      if (typeof d?.agent === "string") (out as any)[d.agent] = d.payload;
    }
  }
  return out;
}

function extractActivityFromEvents(events: StoredSseEvent[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const e of events) {
    if (e.event === "log") {
      const d = e.data as { ts?: unknown; agent?: unknown; message?: unknown };
      if (typeof d?.ts === "string" && typeof d?.agent === "string" && typeof d?.message === "string") {
        out.push({ ts: d.ts, agent: d.agent as AgentName, message: d.message });
      }
    }
  }
  return out;
}

export default function DashboardPage() {
  const [competitor, setCompetitor] = useState("");
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("sequential");
  const [state, setState] = useState<UiState>("idle");
  const [forceFresh, setForceFresh] = useState(false);

  const [layout, setLayout] = useState<DashboardLayoutSettings>(() => ({
    version: 1,
    visible: { activity: true, raw: true, memo: true, chart: true },
    order: ["activity", "chart", "memo", "raw"],
  }));

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [raw, setRaw] = useState<RunRawOutputs>({});
  const [finalMarkdown, setFinalMarkdown] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [historyLoading, setHistoryLoading] = useState(false);

  const esRef = useRef<EventSource | null>(null);

  const canRun = useMemo(() => competitor.trim().length > 0 && state !== "running", [competitor, state]);

  useEffect(() => {
    setLayout(loadDashboardLayoutSettings());
    return () => {
      esRef.current?.close();
    };
  }, []);

  useEffect(() => {
    const runId = (searchParams?.get("runId") ?? "").trim();
    if (runId) loadHistory(runId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function resetOutputs() {
    setActivity([]);
    setRaw({});
    setFinalMarkdown("");
    setError("");
  }

  async function loadHistory(id: string) {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = (await res.json()) as { events?: StoredSseEvent[]; competitor?: string; mode?: Mode };
      if (!res.ok) throw new Error((json as any)?.error || `HTTP ${res.status}`);

      const events = Array.isArray(json.events) ? (json.events as StoredSseEvent[]) : [];
      setActivity(extractActivityFromEvents(events));
      setRaw(extractRawMapFromEvents(events));
      setFinalMarkdown(extractFinalFromEvents(events));

      if (typeof json.competitor === "string") setCompetitor(json.competitor);
      if (json.mode === "sequential" || json.mode === "hierarchical") setMode(json.mode);

      setError("");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    } finally {
      setHistoryLoading(false);
    }
  }

  function appendActivity(item: ActivityItem) {
    setActivity((prev) => [...prev, item].slice(-200));
  }

  function startRun() {
    const name = competitor.trim();
    if (!name) {
      setError("Please enter a competitor name.");
      setState("error");
      return;
    }

    resetOutputs();
    setState("running");

    esRef.current?.close();

    const url = new URL("/api/run", window.location.origin);
    url.searchParams.set("competitor", name);
    url.searchParams.set("mode", mode);

    // Optional: bypass the 15-min replay cache.
    if (forceFresh) url.searchParams.set("fresh", "1");

    const es = new EventSource(url.toString());
    esRef.current = es;

    es.addEventListener("log", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as ActivityItem;
      appendActivity(data);
    });

    es.addEventListener("raw", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as {
        ts: string;
        agent: AgentName;
        payload: unknown;
      };

      setRaw((prev) => ({
        ...prev,
        [data.agent]: data.payload as RunRawOutputs[AgentName],
      }));
    });

    es.addEventListener("final", (evt) => {
      const data = JSON.parse((evt as MessageEvent).data) as {
        ts: string;
        markdown: string;
      };
      setFinalMarkdown(data.markdown);
    });

    es.addEventListener("error", (evt) => {
      try {
        const data = JSON.parse((evt as MessageEvent).data) as {
          ts: string;
          message: string;
        };
        setError(data.message);
      } catch {
        setError("Unexpected error from server.");
      }
      setState("error");
      es.close();
    });

    es.addEventListener("done", () => {
      setState((s) => (s === "error" ? "error" : "done"));
      es.close();
    });

    es.onerror = () => {
      // If the server already sent an error event, this may also fire.
      setState((s) => (s === "running" ? "error" : s));
      setError((e) => e || "Connection error while streaming the run.");
      es.close();
    };
  }

  const rawEntries = useMemo(() => {
    const order: AgentName[] = ["Manager", "NewsResearcher", "FinancialAnalyst", "ReportWriter"];

    return order
      .filter((k) => raw[k] !== undefined)
      .map((k) => ({ agent: k, value: raw[k] }));
  }, [raw]);

  // Chart panel removed from dashboard for now; charts are on /charts.
  const panelsById = useMemo(() => {
    const by: Record<DashboardPanelId, React.ReactNode> = {
      activity: <ActivityPanel state={state} activity={activity} />,
      memo: <FinalMemoPanel finalMarkdown={finalMarkdown} />,
      raw: <RawOutputsPanel rawEntries={rawEntries} />,
      chart: (
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 text-sm text-zinc-400">
          <div className="flex gap-3">
            <div className="w-1 shrink-0 rounded-full bg-amber-300" />
            <div>
              Charts are available on the Charts page.
            </div>
          </div>
        </div>
      ),
    };
    return by;
  }, [activity, finalMarkdown, rawEntries, state]);

  const visibleOrderedPanels = useMemo(() => {
    return layout.order.filter((id) => layout.visible[id]);
  }, [layout.order, layout.visible]);

  // Keep layout fresh when user returns from /settings.
  useEffect(() => {
    const id = window.setInterval(() => setLayout(loadDashboardLayoutSettings()), 1500);
    return () => window.clearInterval(id);
  }, []);

  const fullWidthPanels = new Set<DashboardPanelId>(["activity", "memo", "chart"]);

  return (
    <div className="flex min-h-dvh w-full flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        <ResearchHeader />

        <RunControls
          competitor={competitor}
          setCompetitor={setCompetitor}
          mode={mode}
          setMode={setMode}
          canRun={canRun}
          state={state}
          startRun={startRun}
          error={error}
          forceFresh={forceFresh}
          setForceFresh={setForceFresh}
        />
      </div>

      <div className="mt-7 min-h-0 flex-1">
        {historyLoading && <div className="mx-auto mb-3 w-full max-w-6xl text-xs text-zinc-500">Loading cached run…</div>}

        <div className="mx-auto grid h-full min-h-0 w-full max-w-6xl grid-cols-1 gap-6">
          {visibleOrderedPanels.map((id) => (
            <div key={id} className="min-h-0">
              {panelsById[id]}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
