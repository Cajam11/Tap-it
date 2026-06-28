import { NextRequest, NextResponse } from "next/server";
import { getMusicRequestUser } from "../auth";
import { syncCurrentMusic } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getMusicRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const music = await syncCurrentMusic(user.id, {
      force: true,
      bypassLock: true,
    });
    return NextResponse.json(music);
  } catch (error) {
    console.error("Music manual sync failed", error);
    return NextResponse.json({ error: "music_sync_failed" }, { status: 500 });
  }
}
