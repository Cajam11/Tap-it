import { NextRequest, NextResponse } from "next/server";
import { expireStalePendingBookings } from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "../auth";

export async function GET(request: NextRequest) {
  const { supabase, user } = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const serviceId = request.nextUrl.searchParams.get("serviceId") ?? "";

  if (!serviceId) {
    return NextResponse.json({ error: "missing_service" }, { status: 400 });
  }

  const { data: service } = await supabase
    .from("bookable_services")
    .select("id, type, is_active")
    .eq("id", serviceId)
    .eq("type", "facility")
    .eq("is_active", true)
    .maybeSingle<{ id: string; type: string; is_active: boolean }>();

  if (!service) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await expireStalePendingBookings(serviceId);

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setHours(23, 59, 59, 999);

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("bookings")
    .select("id, start_time, end_time, status, user_id")
    .eq("service_id", serviceId)
    .in("status", ["pending", "paid"])
    .gte("end_time", start.toISOString())
    .lte("start_time", end.toISOString())
    .order("start_time", { ascending: true });

  const bookings = (rows ?? []).map((booking) => {
    const isCurrentUserPending =
      booking.status === "pending" && booking.user_id === user.id;

    return {
      id: isCurrentUserPending ? booking.id : null,
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      is_current_user_pending: isCurrentUserPending,
    };
  });

  return NextResponse.json({ bookings });
}
