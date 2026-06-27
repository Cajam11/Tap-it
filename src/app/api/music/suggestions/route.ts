import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMusicSuggestion } from "@/lib/spotify";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    trackId?: unknown;
  } | null;
  const trackId = typeof body?.trackId === "string" ? body.trackId.trim() : "";

  if (!/^[A-Za-z0-9]{10,40}$/.test(trackId)) {
    return NextResponse.json({ error: "invalid_track" }, { status: 400 });
  }

  try {
    const suggestion = await createMusicSuggestion(user.id, trackId);
    return NextResponse.json({ suggestion }, { status: 201 });
  } catch (error) {
    console.error("Music suggestion failed", error);
    return NextResponse.json({ error: "music_suggestion_failed" }, { status: 500 });
  }
}
