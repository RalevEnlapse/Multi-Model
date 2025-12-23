"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import type { AgentName, Mode, RunRawOutputs } from "../lib/types";

type ActivityItem = {
  ts: string;
  agent: AgentName;
  message: string;
};

type UiState = "idle" | "running" | "done" | "error";

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

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
        [data.agent]: data.payload as any,
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">
            Automated Market Research Team
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">
            Multi-agent competitor research using the OpenAI Agents SDK. Choose a
            process mode, watch each agent’s progress, and get a final memo.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="text-sm font-medium">Competitor name</label>
              <input
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                placeholder='e.g. "Competitor X"'
              />
              <p className="mt-2 text-xs text-zinc-500">
                Runs are executed server-side; API keys are never exposed to the
                browser.
              </p>
            </div>

            <div className="md:col-span-3">
              <label className="text-sm font-medium">Process mode</label>
              <select
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900"
                value={mode}
                onChange={(e) => setMode(e.target.value as Mode)}
              >
                <option value="sequential">Sequential</option>
                <option value="hierarchical">Hierarchical</option>
              </select>
              <p className="mt-2 text-xs text-zinc-500">
                Sequential: News → Finance → Report. Hierarchical: Manager
                coordinates.
              </p>
            </div>

            <div className="md:col-span-3 flex items-end">
              <button
                className={classNames(
                  "w-full rounded-lg px-4 py-2 text-sm font-medium",
                  canRun
                    ? "bg-zinc-900 text-white hover:bg-zinc-800"
                    : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
                )}
                onClick={startRun}
                disabled={!canRun}
              >
                {state === "running" ? "Running…" : "Generate Report"}
              </button>
            </div>
          </div>

          {state === "error" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {error}
            </div>
          )}
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="lg:col-span-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Live activity</h2>
              <span className="text-xs text-zinc-500">
                {state === "running"
                  ? "streaming"
                  : state === "done"
                    ? "done"
                    : state === "error"
                      ? "error"
                      : "idle"}
              </span>
            </div>
            <div className="mt-3 h-[420px] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              {activity.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No activity yet. Start a run to see each agent’s progress.
                </p>
              ) : (
                <ul className="space-y-2">
                  {activity.map((it, idx) => (
                    <li key={idx} className="text-xs">
                      <span className="font-mono text-zinc-400">
                        {new Date(it.ts).toLocaleTimeString()} 
                      </span>
                      <span className="font-semibold">{it.agent}</span>
                      <span className="text-zinc-500">: </span>
                      <span className="text-zinc-800">{it.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <details className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium">
                View raw outputs
              </summary>
              <div className="mt-3 space-y-3">
                {rawEntries.length === 0 ? (
                  <p className="text-xs text-zinc-500">No raw outputs yet.</p>
                ) : (
                  rawEntries.map((entry) => (
                    <div key={entry.agent}>
                      <div className="text-xs font-semibold text-zinc-800">
                        {entry.agent}
                      </div>
                      <pre className="mt-2 overflow-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-[11px] leading-relaxed">
                        {typeof entry.value === "string"
                          ? entry.value
                          : JSON.stringify(entry.value, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </details>
          </section>

          <section className="lg:col-span-7 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Final memo (markdown)</h2>
              <span className="text-xs text-zinc-500">
                {finalMarkdown ? "ready" : "pending"}
              </span>
            </div>

            <div className="prose prose-zinc mt-4 max-w-none">
              {finalMarkdown ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {finalMarkdown}
                </ReactMarkdown>
              ) : (
                <p className="text-sm text-zinc-500">
                  The final memo will appear here once the agents finish.
                </p>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-10 text-xs text-zinc-500">
          Built with Next.js App Router, TypeScript, Tailwind, Tavily search, and
          the OpenAI Agents SDK.
        </footer>
      </div>
    </div>
  );
}
