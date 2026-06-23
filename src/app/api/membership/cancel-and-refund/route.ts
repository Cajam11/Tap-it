import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  cancelMembershipAndRefund,
  MembershipRefundError,
} from "@/lib/membership-refunds";

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
    const result = await cancelMembershipAndRefund(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof MembershipRefundError) {
      const status =
        error.code === "no_active_membership" ? 404 :
        error.code === "refund_not_available" || error.code === "payment_not_refundable" ? 409 :
        500;
      return NextResponse.json({ error: error.code, message: error.message }, { status });
    }

    console.error("Membership cancellation refund failed", error);
    return NextResponse.json({ error: "membership_refund_failed" }, { status: 500 });
  }
}
