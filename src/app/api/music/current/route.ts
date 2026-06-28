import { NextRequest, NextResponse } from "next/server";
import { getMusicRequestUser } from "../auth";
import { getCurrentMusic } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getMusicRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const music = await getCurrentMusic(user.id);
    return NextResponse.json(music);
  } catch (error) {
    console.error("Music current failed", error);
    return NextResponse.json({ error: "music_current_failed" }, { status: 500 });
  }
}
