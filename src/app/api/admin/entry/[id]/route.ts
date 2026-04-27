import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const context = await getCurrentAdminContext(supabase);

    if (!context.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch single entry with profile
    const { data: entry, error } = await supabase
      .from("entries")
      .select(
        `
        id,
        user_id,
        check_in,
        check_out,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Query error:", error);
      // Manual fallback
      const { data: entryOnly } = await supabase
        .from("entries")
        .select("id, user_id, check_in, check_out")
        .eq("id", id)
        .maybeSingle();

      if (!entryOnly) {
        return Response.json({ entry: null });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", entryOnly.user_id)
        .maybeSingle();

      const result = {
        id: entryOnly.id,
        user_id: entryOnly.user_id,
        check_in: entryOnly.check_in,
        check_out: entryOnly.check_out,
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
      };

      return Response.json({ entry: result });
    }

    if (!entry) {
      return Response.json({ entry: null });
    }

    // Normalize profiles
    const profiles = Array.isArray(entry.profiles) ? entry.profiles : [entry.profiles];
    const profile = profiles[0];

    const result = {
      id: entry.id,
      user_id: entry.user_id,
      check_in: entry.check_in,
      check_out: entry.check_out,
      full_name: profile?.full_name || null,
      avatar_url: profile?.avatar_url || null,
    };

    return Response.json({ entry: result });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching entry:", errorMsg);
    return Response.json({ error: "Failed to fetch entry" }, { status: 500 });
  }
}
