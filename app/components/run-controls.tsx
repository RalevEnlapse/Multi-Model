"use client";

import type { Mode } from "../../lib/types";

import { Badge, Button, Card, CardBody, CardHeader, CardMeta, CardTitle, Input, Select } from "../../lib/ui/primitives";

export type UiState = "idle" | "running" | "done" | "error";

export type RunControlsProps = {
  competitor: string;
  setCompetitor: (value: string) => void;
  mode: Mode;
  setMode: (value: Mode) => void;
  canRun: boolean;
  state: UiState;
  startRun: () => void;
  error?: string;
  forceFresh: boolean;
  setForceFresh: (value: boolean) => void;
};

export default function RunControls({
  competitor,
  setCompetitor,
  mode,
  setMode,
  canRun,
  state,
  startRun,
  error,
  forceFresh,
  setForceFresh,
}: RunControlsProps) {
  const statusTone = state === "running" ? "amber" : state === "done" ? "green" : state === "error" ? "red" : "zinc";
  const statusLabel =
    state === "running" ? "running" : state === "done" ? "complete" : state === "error" ? "error" : "ready";

  return (
    <Card className="mt-7 shrink-0" variant="default">
      <CardBody>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="text-sm">Run configuration</CardTitle>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Runs execute server-side; keys remain private. Streaming output updates in real time.
            </p>
          </div>
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </CardHeader>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="text-sm font-medium text-zinc-200">Competitor</label>
            <Input
              className="mt-2"
              value={competitor}
              onChange={(e) => setCompetitor(e.target.value)}
              placeholder='e.g. "Competitor X"'
              autoComplete="off"
            />
            <CardMeta className="mt-2 block">Tip: use the legal entity name for more accurate results.</CardMeta>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium text-zinc-200">Process mode</label>
            <Select className="mt-2" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option className="text-neutral-800" value="sequential">Sequential</option>
              <option className="text-neutral-800" value="hierarchical">Hierarchical</option>
            </Select>
            <CardMeta className="mt-2 block">Sequential: News → Finance → Report.</CardMeta>
          </div>

          <div className="md:col-span-3 flex flex-col justify-end gap-2">
            <label className="flex select-none items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-950/40"
                checked={forceFresh}
                onChange={(e) => setForceFresh(e.target.checked)}
              />
              Force fresh run (bypass 15-min cache)
            </label>

            <Button className="w-full" onClick={startRun} disabled={!canRun}>
              {state === "running" ? "Running…" : "Generate report"}
            </Button>
          </div>
        </div>

        {state === "error" && !!error && (
          <div className="mt-4 rounded-xl border border-red-900/45 bg-red-950/35 px-4 py-3 text-sm text-red-200">
            <div className="font-semibold">Run failed</div>
            <div className="mt-1 text-red-200/90">{error}</div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
