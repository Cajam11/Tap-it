import { NextRequest, NextResponse } from "next/server";
import { syncCurrentMusic } from "@/lib/spotify";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_secret_missing" }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const music = await syncCurrentMusic(null, { force: true });
    return NextResponse.json({
      ok: true,
      connected: music.connected,
      reconnectRequired: music.reconnectRequired,
      current: music.current,
    });
  } catch (error) {
    console.error("Music sync cron failed", error);
    return NextResponse.json({ error: "music_sync_failed" }, { status: 500 });
  }
}
