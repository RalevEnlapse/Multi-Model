import { NextResponse } from "next/server";

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

  if (!competitor) return badRequest("Missing competitor");
  if (mode !== "sequential" && mode !== "hierarchical")
    return badRequest("Invalid mode");

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
