"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { AgentName, Mode, RunRawOutputs } from "../lib/types";

import ActivityPanel, { type ActivityItem } from "./components/activity-panel";
import FinalMemoPanel from "./components/final-memo-panel";
import ResearchHeader from "./components/research-header";
import RunControls, { type UiState } from "./components/run-controls";

export default function Home() {
  const [competitor, setCompetitor] = useState("");
  const [mode, setMode] = useState<Mode>("sequential");
  const [state, setState] = useState<UiState>("idle");

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [raw, setRaw] = useState<RunRawOutputs>({});
  const [finalMarkdown, setFinalMarkdown] = useState<string>("");
  const [error, setError] = useState<string>("");

  const esRef = useRef<EventSource | null>(null);

  const canRun = useMemo(() => competitor.trim().length > 0 && state !== "running", [competitor, state]);

  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  function resetOutputs() {
    setActivity([]);
    setRaw({});
    setFinalMarkdown("");
    setError("");
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
    const order: AgentName[] = [
      "Manager",
      "NewsResearcher",
      "FinancialAnalyst",
      "ReportWriter",
    ];

    return order
      .filter((k) => raw[k] !== undefined)
      .map((k) => ({ agent: k, value: raw[k] }));
  }, [raw]);

  return (
    <div className="relative h-dvh text-zinc-100">
      {/* Subtle decorative layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background:radial-gradient(600px_300px_at_20%_0%,rgba(255,255,255,0.10),transparent_60%),radial-gradient(700px_300px_at_80%_0%,rgba(255,255,255,0.06),transparent_60%)]"
      />

      <div className="relative mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 py-7 sm:px-6 sm:py-10">
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
        />

        <div className="mt-7 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-12">
          <ActivityPanel state={state} activity={activity} rawEntries={rawEntries} />
          <FinalMemoPanel finalMarkdown={finalMarkdown} />
        </div>

        <footer className="mt-7 shrink-0 border-t border-zinc-800/60 pt-4 text-xs text-zinc-500">
          Built with Next.js App Router, TypeScript, Tailwind, Tavily search, and the OpenAI Agents SDK.
        </footer>
      </div>
    </div>
  );
}
