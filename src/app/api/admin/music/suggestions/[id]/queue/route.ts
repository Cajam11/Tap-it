import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { queueMusicSuggestion } from "@/lib/spotify";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId || !context.isAdmin || !hasMinAdminRole(context.role, "recepcny")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const suggestion = await queueMusicSuggestion(id, context.userId);
    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("Queue music suggestion failed", error);
    return NextResponse.json({ error: "queue_suggestion_failed" }, { status: 500 });
  }
}
