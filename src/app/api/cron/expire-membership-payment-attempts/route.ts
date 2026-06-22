import { NextRequest, NextResponse } from "next/server";
import { expireStaleMembershipPaymentAttempts } from "@/lib/membership-payments";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_secret_missing" }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireStaleMembershipPaymentAttempts();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Membership payment expiry cron failed", error);
    return NextResponse.json({ error: "membership_payment_expiry_failed" }, { status: 500 });
  }
}
