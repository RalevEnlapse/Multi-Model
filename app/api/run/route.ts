import { NextResponse } from "next/server";

import { getCachedLatestRun, replaySseEvents } from "../../../lib/server/run-history";
import { orchestrateRun } from "../../../lib/server/orchestrate";
import type { Mode } from "../../../lib/types";

export const runtime = "nodejs";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const competitor = (url.searchParams.get("competitor") ?? "").trim();
  const mode = (url.searchParams.get("mode") ?? "sequential") as Mode;

  // If present, bypass the 15-min cache and force a fresh run.
  // (Useful when you want to re-run with the same competitor/mode and not reuse cached output.)
  const bypassCache = url.searchParams.get("fresh") === "1";

  if (!competitor) return badRequest("Missing competitor");
  if (mode !== "sequential" && mode !== "hierarchical")
    return badRequest("Invalid mode");

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      const cached = bypassCache ? undefined : getCachedLatestRun({ competitor, mode });
      if (cached) {
        // Replay cached events immediately.
        const encoder = new TextEncoder();
        const write = (event: string, data: unknown) => {
          const payload = typeof data === "string" ? data : JSON.stringify(data);
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${payload}\n\n`));
        };
        replaySseEvents({ record: cached, write });
        controller.close();
        return;
      }

      await orchestrateRun({ competitor, mode, controller });
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(req: Request) {
  // Convenience endpoint for non-SSE usage; UI uses GET (EventSource) for streaming.
  try {
    const body = (await req.json()) as { competitor?: string; mode?: Mode };
    const competitor = (body.competitor ?? "").trim();
    const mode = (body.mode ?? "sequential") as Mode;

    if (!competitor) return badRequest("Missing competitor");
    if (mode !== "sequential" && mode !== "hierarchical")
      return badRequest("Invalid mode");

    // For POST, we still return SSE (fetch can read it too), but the primary path is GET.
    const stream = new ReadableStream<Uint8Array>({
      start: async (controller) => {
        await orchestrateRun({ competitor, mode, controller });
        controller.close();
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch {
    return badRequest("Invalid JSON body");
  }
}
