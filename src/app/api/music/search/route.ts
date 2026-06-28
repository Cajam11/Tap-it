import { NextRequest, NextResponse } from "next/server";
import { getMusicRequestUser } from "../auth";
import { searchSpotifyTracks } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getMusicRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q") ?? "";
  if (query.trim().length < 2) {
    return NextResponse.json({ tracks: [] });
  }

  try {
    const tracks = await searchSpotifyTracks(query);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Music search failed", error);
    return NextResponse.json({ error: "music_search_failed" }, { status: 500 });
  }
}
