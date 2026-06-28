import { NextRequest, NextResponse } from "next/server";
import { getMusicRequestUser } from "../auth";
import { setMusicVote } from "@/lib/spotify";
import type { GymMusicVoteValue } from "@/lib/types";

export async function POST(request: NextRequest) {
  const user = await getMusicRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    playSessionId?: unknown;
    vote?: unknown;
  } | null;

  const playSessionId =
    typeof body?.playSessionId === "string" ? body.playSessionId : "";
  const vote: GymMusicVoteValue | null =
    body?.vote === "like" || body?.vote === "dislike" ? body.vote : null;

  if (!playSessionId) {
    return NextResponse.json({ error: "invalid_play_session" }, { status: 400 });
  }

  if (body?.vote !== null && body?.vote !== "like" && body?.vote !== "dislike") {
    return NextResponse.json({ error: "invalid_vote" }, { status: 400 });
  }

  try {
    const summary = await setMusicVote(user.id, playSessionId, vote);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Music vote failed", error);
    return NextResponse.json({ error: "music_vote_failed" }, { status: 500 });
  }
}
