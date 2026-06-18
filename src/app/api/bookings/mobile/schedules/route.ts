import { NextRequest, NextResponse } from "next/server";
import { expireStalePendingBookings } from "@/lib/bookings";
import {
  fetchServiceSchedulesForMonth,
  isScheduleMonthInRange,
} from "@/lib/booking-schedules";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRequestUser } from "../auth";
import type { ServiceSchedule } from "@/lib/types";

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function GET(request: NextRequest) {
  const { supabase, user } = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const serviceId = request.nextUrl.searchParams.get("serviceId") ?? "";
  const trainerId = request.nextUrl.searchParams.get("trainerId");
  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));

  if (!serviceId) {
    return NextResponse.json({ error: "missing_service" }, { status: 400 });
  }

  if (!isScheduleMonthInRange(year, month)) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  const { data: service } = await supabase
    .from("bookable_services")
    .select("id, type, is_active")
    .eq("id", serviceId)
    .in("type", ["group", "trainer"])
    .eq("is_active", true)
    .maybeSingle<{ id: string; type: string; is_active: boolean }>();

  if (!service) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!trainerId) {
    const schedules = await fetchServiceSchedulesForMonth(serviceId, year, month, user.id);
    return NextResponse.json({ schedules });
  }

  if (service.type !== "trainer") {
    return NextResponse.json({ error: "invalid_trainer_service" }, { status: 400 });
  }

  await expireStalePendingBookings(serviceId);

  const admin = createAdminClient();
  const { start, end } = getMonthRange(year, month);
  const now = new Date();
  const rangeStart = start < now ? now : start;

  const { data: scheduleData } = await admin
    .from("service_schedules")
    .select("*, profiles:trainer_id(full_name, avatar_url, bio)")
    .eq("service_id", serviceId)
    .eq("trainer_id", trainerId)
    .gte("start_time", rangeStart.toISOString())
    .lte("start_time", end.toISOString())
    .order("start_time", { ascending: true })
    .limit(250);

  const schedules = (scheduleData ?? []) as ServiceSchedule[];
  const scheduleIds = schedules.map((schedule) => schedule.id);

  const { data: bookedSchedules } = scheduleIds.length
    ? await admin
        .from("bookings")
        .select("schedule_id, status, user_id")
        .eq("service_id", serviceId)
        .in("status", ["pending", "paid"])
        .in("schedule_id", scheduleIds)
    : { data: [] as { schedule_id: string | null; status: string; user_id: string }[] };

  const bookedBySchedule = new Map(
    (bookedSchedules ?? [])
      .filter(
        (booking): booking is { schedule_id: string; status: string; user_id: string } =>
          Boolean(booking.schedule_id),
      )
      .map((booking) => [
        booking.schedule_id,
        { status: booking.status, userId: booking.user_id },
      ]),
  );

  const visibleSchedules = schedules.map((schedule) => {
    const booked = bookedBySchedule.get(schedule.id);

    return booked
      ? {
          ...schedule,
          current_capacity: 0,
          booking_status: booked.status as "pending" | "paid",
          booking_user_id: booked.userId,
        }
      : schedule;
  });

  return NextResponse.json({ schedules: visibleSchedules });
}
