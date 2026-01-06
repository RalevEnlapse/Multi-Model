import type { AgentName, RunRawOutputs } from "../../lib/types";

import { JsonHighlight } from "../../lib/ui/json-highlight";
import { Badge, Card, CardBody, CardHeader, CardMeta, CardTitle } from "../../lib/ui/primitives";

export type UiState = "idle" | "running" | "done" | "error";

export type ActivityItem = {
  ts: string;
  agent: AgentName;
  message: string;
};

export type ActivityPanelProps = {
  state: UiState;
  activity: ActivityItem[];
};

export type RawOutputsPanelProps = {
  rawEntries: Array<{ agent: AgentName; value: RunRawOutputs[AgentName] }>;
};

function stateBadge(state: UiState) {
  if (state === "running") return { tone: "amber" as const, label: "streaming" };
  if (state === "done") return { tone: "green" as const, label: "done" };
  if (state === "error") return { tone: "red" as const, label: "error" };
  return { tone: "zinc" as const, label: "idle" };
}

export function LiveActivityPanel({ state, activity }: ActivityPanelProps) {
  const badge = stateBadge(state);

  return (
    <Card className="flex min-h-0 flex-col" variant="default">
      <CardBody className="flex min-h-0 flex-col">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Live activity</CardTitle>
            <CardMeta className="mt-1 block">Agent events (streamed).</CardMeta>
          </div>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </CardHeader>

        <div className="mt-4 flex-1 min-h-0 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3 output-scroll">
          {activity.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-4">
              <div className="text-sm font-medium text-zinc-200">Waiting for a run</div>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Start a run to see each agent’s progress in a live timeline.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {activity.map((it, idx) => (
                <li key={idx} className="relative pl-4 text-xs leading-relaxed">
                  <span
                    className={
                      "absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full " +
                      (it.agent === "Manager"
                        ? "bg-violet-400/70"
                        : it.agent === "NewsResearcher"
                          ? "bg-sky-400/70"
                          : it.agent === "FinancialAnalyst"
                            ? "bg-emerald-400/70"
                            : "bg-amber-400/70")
                    }
                  />
                  <span className="font-mono text-zinc-500">{new Date(it.ts).toLocaleTimeString()}</span>
                  <span className="text-zinc-500"> · </span>
                  <span
                    className={
                      "font-semibold " +
                      (it.agent === "Manager"
                        ? "text-violet-200"
                        : it.agent === "NewsResearcher"
                          ? "text-sky-200"
                          : it.agent === "FinancialAnalyst"
                            ? "text-emerald-200"
                            : "text-amber-200")
                    }
                  >
                    {it.agent}
                  </span>
                  <span className="text-zinc-500"> — </span>
                  <span className="text-zinc-300">{it.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function RawOutputsPanel({ rawEntries }: RawOutputsPanelProps) {
  return (
    <Card className="flex min-h-0 flex-col" variant="default">
      <CardBody className="flex min-h-0 flex-col">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Raw outputs</CardTitle>
            <CardMeta className="mt-1 block">Debug payloads (JSON).</CardMeta>
          </div>
          <Badge tone={rawEntries.length > 0 ? "green" : "zinc"}>{rawEntries.length > 0 ? "ready" : "pending"}</Badge>
        </CardHeader>

        <div className="mt-4 flex-1 min-h-0 overflow-hidden rounded-xl border border-zinc-800/70 bg-zinc-950/35">
          <div className="output-scroll h-full overflow-auto p-4">
            {rawEntries.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/60 bg-zinc-950/20 p-4">
                <div className="text-sm font-medium text-zinc-200">No raw outputs yet</div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">Raw agent payloads will stream in during a run.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rawEntries.map((entry) => (
                  <div key={entry.agent}>
                    <div className="text-xs font-semibold text-zinc-200">{entry.agent}</div>
                    <div className="output-scroll mt-2 max-h-72 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3 text-[11px] leading-relaxed text-zinc-100">
                      {entry.agent === "ReportWriter" && typeof entry.value === "string" ? (
                        <pre className="whitespace-pre-wrap break-words text-zinc-100">
                          <span className="text-emerald-300"># Markdown</span>
                          {"\n\n"}
                          <span className="text-sky-300">{entry.value}</span>
                        </pre>
                      ) : (
                        <JsonHighlight value={entry.value} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default LiveActivityPanel;
