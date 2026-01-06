"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { classNames } from "../../lib/ui/class-names";
import { Card } from "../../lib/ui/primitives";
import HistoryPanel from "./history-panel";

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", description: "Run agents and view outputs" },
  { href: "/charts", label: "Charts", description: "Visualize results" },
  { href: "/settings", label: "Settings", description: "Customize panels" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/";

  return (
    <div className="relative h-dvh text-zinc-100">
      {/* Subtle decorative layer (kept globally) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background:radial-gradient(600px_300px_at_20%_0%,rgba(255,255,255,0.10),transparent_60%),radial-gradient(700px_300px_at_80%_0%,rgba(255,255,255,0.06),transparent_60%)]"
      />

      <div className="relative grid h-full min-h-0 w-full grid-cols-1 gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <Card className="flex h-full min-h-0 flex-col" variant="default">
            <div className="border-b border-zinc-800/60 p-4 sm:p-5">
              <div className="text-sm font-semibold text-zinc-100">Multi-modal</div>
              <div className="mt-1 text-xs text-zinc-500">Navigation</div>
            </div>

            <nav className="flex-1 overflow-auto p-3">
              <ul className="space-y-2">
                {NAV.map((it) => {
                  const active = isActive(pathname, it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={classNames(
                          "block rounded-xl border px-3 py-2 transition",
                          active
                            ? "border-zinc-700/70 bg-zinc-950/35"
                            : "border-zinc-800/50 bg-zinc-950/10 hover:bg-zinc-950/25"
                        )}
                      >
                        <div
                          className={classNames(
                            "text-sm font-medium",
                            active ? "text-zinc-100" : "text-zinc-200"
                          )}
                        >
                          {it.label}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">{it.description}</div>
                      </Link>
                    </li>
                  );
                })}

                <li className="pt-2">
                  <details className="group rounded-xl border border-zinc-800/60 bg-zinc-950/15">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-sm font-medium text-zinc-200">
                      <span>
                        Cached runs
                        <span className="ml-2 text-xs font-normal text-zinc-500">(15 min)</span>
                      </span>

                      <svg
                        aria-hidden
                        viewBox="0 0 20 20"
                        className="chev h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150 group-open:rotate-180"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </summary>
                    <div className="p-2">
                      <HistoryPanel
                        title=""
                        className="border-0 bg-transparent shadow-none"
                        onSelectRunId={(id) => {
                          // Navigate to dashboard and let it load by query param.
                          window.location.href = `/dashboard?runId=${encodeURIComponent(id)}`;
                        }}
                      />
                    </div>
                  </details>
                </li>
              </ul>
            </nav>

            <div className="border-t border-zinc-800/60 p-4 text-xs text-zinc-500">App Router • SSE runs on Dashboard</div>
          </Card>
        </aside>

        <div className="min-h-0 flex flex-col lg:col-span-9">
          <main className="min-h-0 flex-1 overflow-auto">{children}</main>

          <footer className="shrink-0 border-t border-zinc-800/60 pt-4 text-xs text-zinc-500">
            Built with Next.js App Router, TypeScript, Tailwind, Tavily search, and the OpenAI Agents SDK.
          </footer>
        </div>
      </div>
    </div>
  );
}
