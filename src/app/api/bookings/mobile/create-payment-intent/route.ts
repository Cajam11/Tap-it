import { NextRequest, NextResponse } from "next/server";
import { createBookingIntent } from "@/lib/bookings";
import { getRequestUser } from "../auth";

const FACILITY_OPEN_HOUR = 6;
const FACILITY_CLOSE_HOUR = 21;
const FACILITY_MINUTE_STEP = 5;

type BookableServiceRow = {
  id: string;
  name: string;
  type: "group" | "trainer" | "facility";
  base_price: number;
  price_unit: "hour" | "minute" | "session";
  metadata: Record<string, unknown> | null;
  is_active: boolean | null;
};

type ServiceScheduleRow = {
  id: string;
  service_id: string;
  trainer_id: string | null;
  start_time: string;
  end_time: string;
};

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getFacilityCloseDate(date: Date) {
  const close = new Date(date);
  close.setHours(FACILITY_CLOSE_HOUR, 0, 0, 0);
  return close;
}

function isValidFacilityStart(date: Date, isMinuteRate: boolean) {
  return (
    !Number.isNaN(date.getTime()) &&
    (isMinuteRate
      ? date.getMinutes() % FACILITY_MINUTE_STEP === 0
      : date.getMinutes() === 0) &&
    date.getSeconds() === 0 &&
    date.getHours() >= FACILITY_OPEN_HOUR &&
    date.getHours() < FACILITY_CLOSE_HOUR
  );
}

function getMetadataNumber(metadata: Record<string, unknown> | null, key: string) {
  const value = Number(metadata?.[key]);
  return Number.isFinite(value) ? value : null;
}

function calculateFacilityPrice(
  service: BookableServiceRow,
  startTime: Date,
  endTime: Date,
) {
  const durationMinutes = Math.round(
    (endTime.getTime() - startTime.getTime()) / 60_000,
  );

  if (service.price_unit === "minute") {
    if (
      durationMinutes < FACILITY_MINUTE_STEP ||
      durationMinutes > 30 ||
      durationMinutes % FACILITY_MINUTE_STEP !== 0
    ) {
      throw new Error("Neplatné minútové trvanie.");
    }

    return Number(service.base_price) * durationMinutes;
  }

  const durationHours = durationMinutes / 60;
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 16) {
    throw new Error("Neplatné hodinové trvanie.");
  }

  const firstHour = getMetadataNumber(service.metadata, "first_hour_price");
  const nextHour = getMetadataNumber(service.metadata, "next_hour_price");

  if (firstHour !== null && nextHour !== null) {
    return firstHour + Math.max(0, durationHours - 1) * nextHour;
  }

  return Number(service.base_price) * durationHours;
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const serviceId = asString(body.serviceId);
  const scheduleId = asString(body.scheduleId);
  const startTimeInput = asString(body.startTime);
  const endTimeInput = asString(body.endTime);

  if (!serviceId || !startTimeInput || !endTimeInput) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { data: service, error: serviceError } = await supabase
    .from("bookable_services")
    .select("id, name, type, base_price, price_unit, metadata, is_active")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle<BookableServiceRow>();

  if (serviceError || !service) {
    return NextResponse.json({ error: "service_not_found" }, { status: 404 });
  }

  let startTime = new Date(startTimeInput);
  let endTime = new Date(endTimeInput);
  let totalPrice = Number(service.base_price);
  let resolvedScheduleId: string | null = null;

  try {
    if (service.type === "group" || service.type === "trainer") {
      if (!scheduleId) {
        return NextResponse.json({ error: "missing_schedule" }, { status: 400 });
      }

      const { data: schedule } = await supabase
        .from("service_schedules")
        .select("id, service_id, trainer_id, start_time, end_time")
        .eq("id", scheduleId)
        .eq("service_id", serviceId)
        .maybeSingle<ServiceScheduleRow>();

      if (!schedule) {
        return NextResponse.json({ error: "schedule_not_found" }, { status: 404 });
      }

      startTime = new Date(schedule.start_time);
      endTime = new Date(schedule.end_time);
      resolvedScheduleId = schedule.id;
      totalPrice = Number(service.base_price);
    } else {
      const isMinuteRate = service.price_unit === "minute";
      const minValidStart = new Date(Date.now() - 20 * 60 * 1000);
      const closeTime = getFacilityCloseDate(startTime);

      if (
        !isValidFacilityStart(startTime, isMinuteRate) ||
        Number.isNaN(endTime.getTime()) ||
        endTime <= startTime ||
        endTime > closeTime ||
        startTime < minValidStart
      ) {
        return NextResponse.json({ error: "invalid_facility_time" }, { status: 400 });
      }

      totalPrice = calculateFacilityPrice(service, startTime, endTime);
      resolvedScheduleId = null;
    }

    const intent = await createBookingIntent(
      user.id,
      service.id,
      resolvedScheduleId,
      startTime,
      endTime,
      totalPrice,
      service.name,
    );

    return NextResponse.json({
      clientSecret: intent.clientSecret,
      bookingId: intent.bookingId,
      amount: totalPrice,
      currency: "EUR",
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "booking_create_failed";

    return NextResponse.json(
      {
        error: "booking_create_failed",
        details,
      },
      { status: 400 },
    );
  }
}
