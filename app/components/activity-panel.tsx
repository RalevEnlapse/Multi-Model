import type { AgentName, RunRawOutputs } from "../../lib/types";

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
  rawEntries: Array<{ agent: AgentName; value: RunRawOutputs[AgentName] }>;
};

function stateBadge(state: UiState) {
  if (state === "running") return { tone: "amber" as const, label: "streaming" };
  if (state === "done") return { tone: "green" as const, label: "done" };
  if (state === "error") return { tone: "red" as const, label: "error" };
  return { tone: "zinc" as const, label: "idle" };
}

export default function ActivityPanel({ state, activity, rawEntries }: ActivityPanelProps) {
  const badge = stateBadge(state);

  return (
    <Card className="flex min-h-0 flex-col lg:col-span-5" variant="default">
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
                  <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  <span className="font-mono text-zinc-500">{new Date(it.ts).toLocaleTimeString()}</span>
                  <span className="text-zinc-500"> · </span>
                  <span className="font-semibold text-zinc-200">{it.agent}</span>
                  <span className="text-zinc-500"> — </span>
                  <span className="text-zinc-300">{it.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <details className="group mt-4 rounded-xl border border-zinc-800/70 bg-zinc-950/20 p-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-zinc-200">
            <span className="inline-flex items-center gap-2">
              Raw outputs
              <span className="text-xs text-zinc-500">(debug)</span>
            </span>
          </summary>
          <div className="mt-3 space-y-3">
            {rawEntries.length === 0 ? (
              <p className="text-xs text-zinc-500">No raw outputs yet.</p>
            ) : (
              rawEntries.map((entry) => (
                <div key={entry.agent}>
                  <div className="text-xs font-semibold text-zinc-200">{entry.agent}</div>
                  <pre className="output-scroll mt-2 max-h-56 overflow-auto rounded-xl border border-zinc-800/70 bg-zinc-950/35 p-3 text-[11px] leading-relaxed text-zinc-100">
                    {typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </div>
        </details>
      </CardBody>
    </Card>
  );
}
