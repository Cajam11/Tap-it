import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMusic } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const force = request.nextUrl.searchParams.get("force") === "1";
    const music = await getCurrentMusic(user.id, { force });
    return NextResponse.json(music);
  } catch (error) {
    console.error("Music current failed", error);
    return NextResponse.json({ error: "music_current_failed" }, { status: 500 });
  }
}
