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

type NormalizedEntry = {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

function buildEvents(entries: NormalizedEntry[]): LogEvent[] {
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

const MAX_FETCH_ENTRIES = 1000;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function normalizeEntriesWithProfiles(entries: Array<{
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  profiles: { id: string; full_name: string | null; avatar_url: string | null } | { id: string; full_name: string | null; avatar_url: string | null }[] | null;
}>): NormalizedEntry[] {
  return entries.map((entry) => {
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
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = parsePositiveInt(url.searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(url.searchParams.get("pageSize"), 20), 100);
    const query = (url.searchParams.get("q") || "").trim().toLowerCase();

    const supabase = await createClient();
    const context = await getCurrentAdminContext(supabase);

    if (!context.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch a sufficiently large snapshot and paginate events in-memory.
    // This keeps response shape compatible with existing dashboard consumers.
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
      .limit(MAX_FETCH_ENTRIES);

    let normalizedEntries: NormalizedEntry[] = [];

    if (error) {
      console.error("Query error:", error);
      // Manual fallback if FK doesn't work
      const { data: entriesOnly } = await supabase
        .from("entries")
        .select("id, user_id, check_in, check_out")
        .order("check_in", { ascending: false })
        .limit(MAX_FETCH_ENTRIES);

      if (!entriesOnly) {
        return Response.json({ entries: [], total: 0, page, pageSize, totalPages: 0, query });
      }

      // Fetch profiles for each entry
      normalizedEntries = await Promise.all(
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
    } else {
      normalizedEntries = normalizeEntriesWithProfiles(entries);
    }

    let events = buildEvents(normalizedEntries);
    if (query) {
      events = events.filter((event) => {
        const name = (event.full_name || "").toLowerCase();
        const userId = event.user_id.toLowerCase();
        return name.includes(query) || userId.includes(query);
      });
    }

    const total = events.length;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
    const offset = (page - 1) * pageSize;
    const paginatedEntries = events.slice(offset, offset + pageSize);

    return Response.json({
      entries: paginatedEntries,
      total,
      page,
      pageSize,
      totalPages,
      query,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching entries logs:", errorMsg);
    return Response.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
