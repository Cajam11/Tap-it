import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingReminderPushNotification } from "@/lib/expo-push";

const REMINDER_KEY = "start_30_minutes";
const REMINDER_OFFSET_MINUTES = 30;
const REMINDER_WINDOW_MINUTES = 3;

type ReminderBooking = {
  id: string;
  user_id: string;
  start_time: string;
  bookable_services:
    | {
        name: string | null;
        type: string | null;
      }
    | {
        name: string | null;
        type: string | null;
      }[]
    | null;
};

type InsertableReminderQuery = {
  insert(values: Record<string, unknown>): InsertableReminderQuery;
  select(columns: string): InsertableReminderQuery;
  single<T>(): Promise<{ data: T | null; error: unknown }>;
};

type UpdatableReminderQuery = {
  update(values: Record<string, unknown>): UpdatableReminderQuery;
  eq(column: string, value: string): Promise<{ error: unknown }>;
};

function normalizeService(value: ReminderBooking["bookable_services"]) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function isUniqueViolation(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

function getReminderCopy(booking: ReminderBooking) {
  const service = normalizeService(booking.bookable_services);
  const serviceName = service?.name?.trim() || "Tvoja rezervácia";
  const time = new Intl.DateTimeFormat("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bratislava",
  }).format(new Date(booking.start_time));

  if (service?.type === "trainer") {
    return {
      title: "Tréning začína o 30 minút",
      body: `${serviceName} začína o ${time}.`,
    };
  }

  if (service?.type === "group") {
    return {
      title: "Lekcia začína o 30 minút",
      body: `${serviceName} začína o ${time}.`,
    };
  }

  return {
    title: "Rezervácia začína o 30 minút",
    body: `${serviceName} začína o ${time}.`,
  };
}

async function claimReminder(booking: ReminderBooking) {
  const admin = createAdminClient();
  const { data, error } = await (admin.from("booking_push_reminders") as unknown as InsertableReminderQuery)
    .insert({
      booking_id: booking.id,
      reminder_key: REMINDER_KEY,
      scheduled_for: booking.start_time,
      status: "processing",
    })
    .select("id")
    .single<{ id: string }>();

  if (isUniqueViolation(error)) {
    return null;
  }

  if (error || !data) {
    throw new Error("Booking reminder sa nepodarilo vytvoriť.");
  }

  return data.id;
}

async function updateReminder(
  reminderId: string,
  values: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const { error } = await (admin.from("booking_push_reminders") as unknown as UpdatableReminderQuery)
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminderId);

  if (error) {
    throw new Error("Booking reminder sa nepodarilo aktualizovať.");
  }
}

export async function sendUpcomingBookingReminders(now = new Date()) {
  const windowStart = new Date(
    now.getTime() + (REMINDER_OFFSET_MINUTES - REMINDER_WINDOW_MINUTES) * 60_000,
  );
  const windowEnd = new Date(
    now.getTime() + (REMINDER_OFFSET_MINUTES + REMINDER_WINDOW_MINUTES) * 60_000,
  );
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("bookings")
    .select("id, user_id, start_time, bookable_services(name, type)")
    .eq("status", "paid")
    .gte("start_time", windowStart.toISOString())
    .lt("start_time", windowEnd.toISOString())
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(`Booking reminders sa nepodarilo načítať: ${error.message}`);
  }

  const result = {
    candidates: (data ?? []).length,
    claimed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const booking of (data ?? []) as ReminderBooking[]) {
    const reminderId = await claimReminder(booking);
    if (!reminderId) continue;

    result.claimed += 1;

    try {
      const copy = getReminderCopy(booking);
      const pushResult = await sendBookingReminderPushNotification({
        userId: booking.user_id,
        bookingId: booking.id,
        ...copy,
      });
      const isSent = pushResult.acceptedCount > 0;

      await updateReminder(reminderId, {
        status: isSent ? "sent" : "skipped",
        sent_at: isSent ? new Date().toISOString() : null,
        token_count: pushResult.tokenCount,
        error_message: pushResult.errors.length > 0 ? pushResult.errors.join(" | ") : null,
      });

      if (isSent) {
        result.sent += 1;
      } else {
        result.skipped += 1;
      }
    } catch (error) {
      result.failed += 1;
      await updateReminder(reminderId, {
        status: "failed",
        error_message: error instanceof Error ? error.message : "Unknown push reminder error",
      });
    }
  }

  return result;
}
