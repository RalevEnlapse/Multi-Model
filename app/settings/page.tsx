"use client";

import { useEffect, useState } from "react";

import DashboardSettings, {
  loadDashboardLayoutSettings,
  persistDashboardLayoutSettings,
  type DashboardLayoutSettings,
} from "../components/dashboard-settings";
import { Card, CardBody, CardHeader, CardMeta, CardTitle } from "../../lib/ui/primitives";

export default function SettingsPage() {
  const [layout, setLayout] = useState<DashboardLayoutSettings>(() => ({
    version: 1,
    visible: { activity: true, raw: true, memo: true, chart: true },
    order: ["activity", "chart", "memo", "raw"],
  }));

  useEffect(() => {
    setLayout(loadDashboardLayoutSettings());
  }, []);

  useEffect(() => {
    persistDashboardLayoutSettings(layout);
  }, [layout]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-4xl flex-col">
      <Card className="shrink-0" variant="default">
        <CardBody>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle className="text-sm">Settings</CardTitle>
              <CardMeta className="mt-1 block">Customize dashboard layout. Saved locally in your browser.</CardMeta>
            </div>
          </CardHeader>
        </CardBody>
      </Card>

      <DashboardSettings value={layout} onChange={setLayout} />

      <Card className="mt-6" variant="default">
        <CardBody>
          <div className="text-xs text-zinc-500">
            Chart-specific settings will live here next (which charts to show, data rules, etc.).
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
