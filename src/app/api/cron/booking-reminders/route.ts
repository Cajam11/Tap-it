import { NextRequest, NextResponse } from "next/server";
import { sendUpcomingBookingReminders } from "@/lib/booking-reminders";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_secret_missing" }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await sendUpcomingBookingReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Booking reminder cron failed", error);
    return NextResponse.json({ error: "booking_reminder_cron_failed" }, { status: 500 });
  }
}
