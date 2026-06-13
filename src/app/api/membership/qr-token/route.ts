import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createQrToken, QR_TTL_SECONDS } from "@/lib/qr-token";
import { getCurrentActiveMembership } from "@/lib/membership-access";

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
      {
        global: {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);

    return { supabase, user };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: activeMembership } = await getCurrentActiveMembership<{ id: string }>(
    supabase,
    user.id,
    "id"
  );

  let hasOpenEntry = false;
  if (!activeMembership) {
    const { data: openEntries, error: openEntryError } = await supabase
      .from("entries")
      .select("id")
      .eq("user_id", user.id)
      .is("check_out", null)
      .eq("is_valid", true)
      .limit(1);

    if (openEntryError) {
      return NextResponse.json({ error: "entry_lookup_failed" }, { status: 500 });
    }

    hasOpenEntry = Array.isArray(openEntries) && openEntries.length > 0;
  }

  if (!activeMembership && !hasOpenEntry) {
    return NextResponse.json({ error: "membership_not_active" }, { status: 403 });
  }

  let tokenResult: ReturnType<typeof createQrToken>;
  try {
    tokenResult = createQrToken(user.id, QR_TTL_SECONDS);
  } catch {
    return NextResponse.json({ error: "qr_secret_not_configured" }, { status: 500 });
  }

  const expiresAtIso = new Date(tokenResult.payload.exp * 1000).toISOString();

  return NextResponse.json(
    {
      token: tokenResult.token,
      expiresAt: expiresAtIso,
      ttlSeconds: QR_TTL_SECONDS,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
