import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { syncCurrentMusic } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId || !context.isAdmin || !hasMinAdminRole(context.role, "recepcny")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const music = await syncCurrentMusic(context.userId, { force: true });
    return NextResponse.json(music);
  } catch (error) {
    console.error("Admin music sync failed", error);
    return NextResponse.json({ error: "music_sync_failed" }, { status: 500 });
  }
}
