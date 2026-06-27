import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { getAdminMusicSuggestions } from "@/lib/spotify";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId || !context.isAdmin || !hasMinAdminRole(context.role, "recepcny")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const suggestions = await getAdminMusicSuggestions();
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Admin music suggestions failed", error);
    return NextResponse.json({ error: "music_suggestions_failed" }, { status: 500 });
  }
}
