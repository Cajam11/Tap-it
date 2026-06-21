import { ServiceSchedule } from "@/lib/types";
import { expireStalePendingBookings } from "@/lib/bookings";
import { createAdminClient } from "@/lib/supabase/admin";

export const SCHEDULE_MONTHS_AHEAD = 12;

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  return { start, end };
}

export function getInitialScheduleMonth() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

export function isScheduleMonthInRange(year: number, month: number) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return false;
  }

  const { start } = getMonthRange(year, month);
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(currentMonth);
  lastMonth.setMonth(lastMonth.getMonth() + SCHEDULE_MONTHS_AHEAD);

  return start >= currentMonth && start <= lastMonth;
}

export async function fetchServiceSchedulesForMonth(
  serviceId: string,
  year: number,
  month: number,
  currentUserId: string,
) {
  if (!isScheduleMonthInRange(year, month)) {
    return [];
  }

  const admin = createAdminClient();
  const { start, end } = getMonthRange(year, month);
  const now = new Date();
  const rangeStart = start < now ? now : start;

  await expireStalePendingBookings(serviceId);

  const { data: scheduleData } = await admin
    .from("service_schedules")
    .select("*, profiles:trainer_id(full_name, avatar_url, bio)")
    .eq("service_id", serviceId)
    .gte("start_time", rangeStart.toISOString())
    .lte("start_time", end.toISOString())
    .order("start_time", { ascending: true })
    .limit(250);

  let schedules = (scheduleData ?? []) as ServiceSchedule[];

  if (schedules.length === 0) {
    return schedules;
  }

  const scheduleIds = schedules.map((schedule) => schedule.id);
  const { data: activeBookings } = await admin
    .from("bookings")
    .select("schedule_id, status, user_id")
    .eq("service_id", serviceId)
    .in("status", ["pending", "paid"])
    .in("schedule_id", scheduleIds);

  const activeBookingsArr = (activeBookings ?? []) as Array<{
    schedule_id: string | null;
    user_id: string | null;
    status: "pending" | "paid";
  }>;
  const pendingCounts = new Map<string, number>();
  const currentUserBookingStatus = new Map<string, "pending" | "paid">();

  for (const booking of activeBookingsArr) {
    if (!booking.schedule_id) continue;

    if (booking.status === "pending") {
      pendingCounts.set(
        booking.schedule_id,
        (pendingCounts.get(booking.schedule_id) || 0) + 1,
      );
    }

    if (booking.user_id === currentUserId) {
      const previousStatus = currentUserBookingStatus.get(booking.schedule_id);
      currentUserBookingStatus.set(
        booking.schedule_id,
        booking.status === "paid" || previousStatus !== "paid" ? booking.status : previousStatus,
      );
    }
  }

  schedules = schedules.map((schedule) => {
    const pending = pendingCounts.get(schedule.id) || 0;
    const adjustedCapacity =
      schedule.current_capacity !== null
        ? Math.max(0, schedule.current_capacity - pending)
        : null;
    const currentUserStatus = currentUserBookingStatus.get(schedule.id);

    return {
      ...schedule,
      booking_status: currentUserStatus
        ? currentUserStatus
        : adjustedCapacity === 0
          ? pending > 0
            ? "pending"
            : "paid"
          : null,
      booking_user_id: currentUserStatus ? currentUserId : null,
      current_capacity: adjustedCapacity,
    };
  });

  return schedules;
}
