import { NextRequest, NextResponse } from "next/server";
import { expireStalePendingBookings } from "@/lib/bookings";

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
    const expired = await expireStalePendingBookings();
    return NextResponse.json({ ok: true, expired });
  } catch (error) {
    console.error("Booking checkout expiry cron failed", error);
    return NextResponse.json({ error: "booking_checkout_expiry_failed" }, { status: 500 });
  }
}
