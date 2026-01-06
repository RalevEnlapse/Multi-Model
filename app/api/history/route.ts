import { NextResponse } from "next/server";

import { getHistoryIndex, getRunById } from "../../../lib/server/run-history";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "").trim();

  if (id) {
    const record = getRunById(id);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      id: record.id,
      competitor: record.competitor,
      mode: record.mode,
      createdAt: record.createdAt,
      events: record.events,
    });
  }

  return NextResponse.json(getHistoryIndex());
}
