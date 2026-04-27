import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";

type LogEvent = {
  id: string;
  entry_id: string;
  user_id: string;
  kind: "check_in" | "check_out";
  timestamp: string;
  full_name: string | null;
  avatar_url: string | null;
};

function buildEvents(entries: Array<{
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  full_name: string | null;
  avatar_url: string | null;
}>): LogEvent[] {
  const events = entries.flatMap((entry) => {
    const checkInEvent: LogEvent = {
      id: `${entry.id}:check_in`,
      entry_id: entry.id,
      user_id: entry.user_id,
      kind: "check_in",
      timestamp: entry.check_in,
      full_name: entry.full_name,
      avatar_url: entry.avatar_url,
    };

    const checkOutEvent = entry.check_out
      ? ({
          id: `${entry.id}:check_out`,
          entry_id: entry.id,
          user_id: entry.user_id,
          kind: "check_out",
          timestamp: entry.check_out,
          full_name: entry.full_name,
          avatar_url: entry.avatar_url,
        } satisfies LogEvent)
      : null;

    return checkOutEvent ? [checkInEvent, checkOutEvent] : [checkInEvent];
  });

  return events.sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

export async function GET() {
  try {
    const supabase = await createClient();
    const context = await getCurrentAdminContext(supabase);

    if (!context.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch last 50 entries with profile info, ordered by check_in descending
    const { data: entries, error } = await supabase
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
      .order("check_in", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Query error:", error);
      // Manual fallback if FK doesn't work
      const { data: entriesOnly } = await supabase
        .from("entries")
        .select("id, user_id, check_in, check_out")
        .order("check_in", { ascending: false })
        .limit(50);

      if (!entriesOnly) {
        return Response.json({ entries: [] });
      }

      // Fetch profiles for each entry
      const enrichedEntries = await Promise.all(
        entriesOnly.map(async (entry) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .eq("id", entry.user_id)
            .maybeSingle();
          return {
            id: entry.id,
            user_id: entry.user_id,
            check_in: entry.check_in,
            check_out: entry.check_out,
            full_name: profile?.full_name || null,
            avatar_url: profile?.avatar_url || null,
          };
        })
      );

      return Response.json({ entries: buildEvents(enrichedEntries) });
    }

    // Normalize entries similar to latest-entry route
    const normalizedEntries = entries.map((entry) => {
      const profiles = Array.isArray(entry.profiles) ? entry.profiles : [entry.profiles];
      const profile = profiles[0];
      return {
        id: entry.id,
        user_id: entry.user_id,
        check_in: entry.check_in,
        check_out: entry.check_out,
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
      };
    });

    return Response.json({ entries: buildEvents(normalizedEntries) });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching entries logs:", errorMsg);
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
