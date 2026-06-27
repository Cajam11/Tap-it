import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import {
  completeSpotifyConnection,
  verifySpotifyOAuthState,
} from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const redirectUrl = new URL("/admin/music", request.url);
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId || context.role !== "owner") {
    redirectUrl.searchParams.set("spotify", "unauthorized");
    return NextResponse.redirect(redirectUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const spotifyError = request.nextUrl.searchParams.get("error");

  if (spotifyError) {
    redirectUrl.searchParams.set("spotify", "denied");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    redirectUrl.searchParams.set("spotify", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    verifySpotifyOAuthState(state, context.userId);
    await completeSpotifyConnection(code, request.url);
    redirectUrl.searchParams.set("spotify", "connected");
  } catch (error) {
    console.error("Spotify callback failed", error);
    redirectUrl.searchParams.set("spotify", "connect_error");
  }

  return NextResponse.redirect(redirectUrl);
}
