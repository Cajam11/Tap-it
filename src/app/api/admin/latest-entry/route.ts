import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";

type EntryProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type EntryRow = {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  duration_min: number | null;
};

type EntryWithProfiles = EntryRow & {
  profiles?: EntryProfile | EntryProfile[] | null;
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";

    const supabase = await createClient();
    const context = await getCurrentAdminContext(supabase);

    if (!context.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: latestEntry, error: queryError } = await supabase
      .from("entries")
      .select(
        `
        id,
        user_id,
        check_in,
        check_out,
        duration_min,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `
      )
      .order("check_in", { ascending: false })
      .limit(1)
      .maybeSingle();

    // If PostgREST cannot find an FK relationship, fall back to manual lookup
    let finalEntry: EntryWithProfiles | null = latestEntry;
    let fallbackProfile: EntryProfile | null = null;
    let fallbackError: unknown = null;

    if (queryError) {
      console.warn("FK query failed, falling back to manual lookup:", queryError);
      try {
        // Manual fallback: fetch latest entry without relationship, then fetch profile by user_id
        const { data: entryOnly, error: entryError } = await supabase
          .from("entries")
          .select("id, user_id, check_in, check_out, duration_min")
          .order("check_in", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (entryError) {
          console.error("Failed to fetch entry in fallback:", entryError);
          fallbackError = entryError;
        } else if (entryOnly) {
          console.debug("Fallback entry fetched:", entryOnly);
          finalEntry = entryOnly;
          if (entryOnly.user_id) {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", entryOnly.user_id)
              .maybeSingle();
            if (profileError) {
              console.error("Failed to fetch profile in fallback:", profileError);
              fallbackError = profileError;
            } else if (profile) {
              console.debug("Fallback profile fetched:", profile);
              // Normalize to shape expected by the rest of the code
              finalEntry.profiles = [profile];
              fallbackProfile = profile;
            }
          }
        }
      } catch (fallbackEx) {
        console.error("Exception during fallback:", fallbackEx);
        fallbackError = fallbackEx;
      }
    }

    // Normalize response: ensure profiles is always accessible consistently
    // When FK works, profiles is a single object; we need it in the response
    let entryToReturn: EntryWithProfiles | null = finalEntry;
    if (entryToReturn && entryToReturn.profiles && !Array.isArray(entryToReturn.profiles)) {
      // Wrap single object in array for consistency
      entryToReturn = {
        ...entryToReturn,
        profiles: [entryToReturn.profiles],
      };
    }

    const normalizedProfiles =
      entryToReturn?.profiles == null
        ? []
        : Array.isArray(entryToReturn.profiles)
          ? entryToReturn.profiles
          : [entryToReturn.profiles];

    if (debug) {
      return Response.json({
        context,
        latestEntry: entryToReturn,
        queryError,
        fallbackProfile,
        fallbackError,
      });
    }

    if (!entryToReturn || normalizedProfiles.length === 0) {
      return Response.json({ entry: null });
    }

    return Response.json({
      entry: {
        id: entryToReturn.id,
        user_id: entryToReturn.user_id,
        check_in: entryToReturn.check_in,
        check_out: entryToReturn.check_out,
        full_name: normalizedProfiles[0].full_name,
        avatar_url: normalizedProfiles[0].avatar_url,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Error fetching latest entry:", errorMsg, error);

    // Include error details in response for debugging
    const url = new URL(request.url);
    const debug = url.searchParams.get("debug") === "1";

    if (debug) {
      return Response.json({
        error: "Internal server error",
        details: errorMsg,
        stack: error instanceof Error ? error.stack : undefined,
      }, { status: 500 });
    }

    return Response.json({ error: "Failed to fetch entry" }, { status: 500 });
  }
}
