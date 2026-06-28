import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { syncCurrentMusic } from "@/lib/spotify";

export const dynamic = "force-dynamic";

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

async function getRequestUser(request: NextRequest) {
  const bearerToken = getBearerToken(request);

  if (bearerToken) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);
    return user;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
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
