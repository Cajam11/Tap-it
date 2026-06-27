import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { buildSpotifyAuthorizeUrl, createSpotifyOAuthState } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId || context.role !== "owner") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const state = createSpotifyOAuthState(context.userId);
    return NextResponse.redirect(buildSpotifyAuthorizeUrl(request.url, state));
  } catch (error) {
    console.error("Spotify connect failed", error);
    return NextResponse.redirect(new URL("/admin/music?spotify=connect_error", request.url));
  }
}
