"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, CardBody, CardHeader, CardMeta, CardTitle } from "../../lib/ui/primitives";

export type DashboardPanelId = "activity" | "raw" | "memo" | "chart";

export type DashboardLayoutSettings = {
  version: 1;
  visible: Record<DashboardPanelId, boolean>;
  order: DashboardPanelId[];
};

const STORAGE_KEY = "dashboardLayout.v1";

const DEFAULT_SETTINGS: DashboardLayoutSettings = {
  version: 1,
  visible: {
    activity: true,
    raw: true,
    memo: true,
    chart: true,
  },
  // Default order requested: activity -> memo -> chart -> raw
  order: ["activity", "memo", "chart", "raw"],
};

function normalizeSettings(value: unknown): DashboardLayoutSettings {
  if (!value || typeof value !== "object") return DEFAULT_SETTINGS;

  const v = value as Partial<DashboardLayoutSettings>;
  const visible = v.visible ?? DEFAULT_SETTINGS.visible;
  const order = Array.isArray(v.order) ? (v.order.filter(Boolean) as DashboardPanelId[]) : DEFAULT_SETTINGS.order;

  const all: DashboardPanelId[] = ["activity", "memo", "chart", "raw"];

  const safeVisible: DashboardLayoutSettings["visible"] = {
    activity: typeof (visible as any).activity === "boolean" ? (visible as any).activity : DEFAULT_SETTINGS.visible.activity,
    raw: typeof (visible as any).raw === "boolean" ? (visible as any).raw : DEFAULT_SETTINGS.visible.raw,
    memo: typeof (visible as any).memo === "boolean" ? (visible as any).memo : DEFAULT_SETTINGS.visible.memo,
    chart: typeof (visible as any).chart === "boolean" ? (visible as any).chart : DEFAULT_SETTINGS.visible.chart,
  };

  // Order: keep known ids, de-dupe, then append missing defaults.
  const deduped: DashboardPanelId[] = [];
  for (const id of order) {
    if (all.includes(id) && !deduped.includes(id)) deduped.push(id);
  }
  for (const id of all) {
    if (!deduped.includes(id)) deduped.push(id);
  }

  return {
    version: 1,
    visible: safeVisible,
    order: deduped,
  };
}

export function loadDashboardLayoutSettings(): DashboardLayoutSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function persistDashboardLayoutSettings(next: DashboardLayoutSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function createDefaultDashboardLayoutSettings(): DashboardLayoutSettings {
  return DEFAULT_SETTINGS;
}

export type DashboardSettingsProps = {
  value: DashboardLayoutSettings;
  onChange: (next: DashboardLayoutSettings) => void;
};

const PANEL_LABEL: Record<DashboardPanelId, string> = {
  activity: "Live activity",
  raw: "Raw outputs",
  memo: "Final memo",
  chart: "Chart",
};

export default function DashboardSettings({ value, onChange }: DashboardSettingsProps) {
  const [open, setOpen] = useState(false);

  const hiddenCount = useMemo(() => Object.values(value.visible).filter((v) => !v).length, [value.visible]);

  function toggleVisible(id: DashboardPanelId) {
    onChange({
      ...value,
      visible: {
        ...value.visible,
        [id]: !value.visible[id],
      },
    });
  }

  function move(id: DashboardPanelId, dir: -1 | 1) {
    const idx = value.order.indexOf(id);
    if (idx === -1) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= value.order.length) return;

    const nextOrder = value.order.slice();
    const tmp = nextOrder[idx];
    nextOrder[idx] = nextOrder[nextIdx];
    nextOrder[nextIdx] = tmp;

    onChange({ ...value, order: nextOrder });
  }

  function reset() {
    onChange(DEFAULT_SETTINGS);
  }

  useEffect(() => {
    // Close settings panel on Escape for quick UX.
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <Card className="mt-4 shrink-0" variant="default">
      <CardBody>
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="text-sm">Dashboard</CardTitle>
            <CardMeta className="mt-1 block">Choose which panels are shown and reorder them.</CardMeta>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={hiddenCount === 0 ? "green" : "amber"}>{hiddenCount === 0 ? "all visible" : `${hiddenCount} hidden`}</Badge>
            <Button intent="secondary" size="sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Hide settings" : "Show settings"}
            </Button>
          </div>
        </CardHeader>

        {open && (
          <div className="mt-4 grid grid-cols-1 gap-3">
            {value.order.map((id) => (
              <div key={id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800/70 bg-zinc-950/20 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-zinc-200">{PANEL_LABEL[id]}</div>
                  <div className="mt-0.5 text-xs text-zinc-500">id: <span className="font-mono">{id}</span></div>
                </div>

                <div className="flex items-center gap-2">
                  <Button intent="ghost" size="sm" onClick={() => move(id, -1)} disabled={value.order.indexOf(id) === 0}>
                    ↑
                  </Button>
                  <Button intent="ghost" size="sm" onClick={() => move(id, 1)} disabled={value.order.indexOf(id) === value.order.length - 1}>
                    ↓
                  </Button>
                  <Button intent={value.visible[id] ? "secondary" : "primary"} size="sm" onClick={() => toggleVisible(id)}>
                    {value.visible[id] ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button intent="ghost" size="sm" onClick={reset}>
                Reset to default
              </Button>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
