import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SLOT_MINUTES = 60;

function isMissingColumnError(error: { message?: string; code?: string } | null) {
  return error?.code === "42703" || error?.message?.includes("does not exist");
}

function getMissingMigrationMessage() {
  return "Databaza este nema aplikovanu migraciu 20260519130000_monthly_trainer_availability.sql.";
}

function getMonthlyWindow() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function addMinutes(value: Date, minutes: number) {
  const next = new Date(value);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

export async function detachBookedTrainerSchedules(
  trainerId: string,
  serviceId?: string,
  from?: string,
  until?: string
) {
  const admin = createAdminClient();

  let schedulesQuery = admin
    .from("service_schedules")
    .select("id")
    .eq("trainer_id", trainerId);

  if (serviceId) schedulesQuery = schedulesQuery.eq("service_id", serviceId);

  if (from) schedulesQuery = schedulesQuery.gte("start_time", from);
  if (until) schedulesQuery = schedulesQuery.lt("end_time", until);

  const { data: schedules, error: schedulesError } = await schedulesQuery;
  if (schedulesError) {
    throw new Error(`Nepodarilo sa nacitat terminy: ${schedulesError.message}`);
  }

  const scheduleIds = (schedules || []).map((schedule) => schedule.id);
  if (scheduleIds.length === 0) return new Set<string>();

  const { data: bookings, error: bookingsError } = await admin
    .from("bookings")
    .select("schedule_id")
    .in("schedule_id", scheduleIds)
    .in("status", ["pending", "paid"]);

  if (bookingsError) {
    throw new Error(`Nepodarilo sa nacitat rezervacie terminov: ${bookingsError.message}`);
  }

  const bookedScheduleIds = new Set(
    (bookings || []).flatMap((booking) => (booking.schedule_id ? [booking.schedule_id] : []))
  );

  if (bookedScheduleIds.size > 0) {
    const { error: detachError } = await admin
      .from("service_schedules")
      .update({ recurring_rule_id: null })
      .in("id", [...bookedScheduleIds]);

    if (detachError) {
      throw new Error(`Nepodarilo sa zachovat rezervovane terminy: ${detachError.message}`);
    }
  }

  return bookedScheduleIds;
}

export async function cleanupExpiredTrainerSchedules(trainerId: string, serviceId?: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const bookedScheduleIds = await detachBookedTrainerSchedules(trainerId, serviceId, undefined, now);

  let expiredSchedulesQuery = supabase
    .from("service_schedules")
    .select("id")
    .eq("trainer_id", trainerId)
    .lt("end_time", now);

  if (serviceId) {
    expiredSchedulesQuery = expiredSchedulesQuery.eq("service_id", serviceId);
  }

  const { data: expiredSchedules, error: expiredSchedulesError } = await expiredSchedulesQuery;
  if (expiredSchedulesError) {
    throw new Error(`Nepodarilo sa nacitat stare terminy: ${expiredSchedulesError.message}`);
  }

  const expiredScheduleIds = (expiredSchedules || [])
    .map((schedule) => schedule.id)
    .filter((scheduleId) => !bookedScheduleIds.has(scheduleId));

  const schedulesQuery = supabase
    .from("service_schedules")
    .delete()
    .in("id", expiredScheduleIds);

  if (expiredScheduleIds.length > 0) {
    const { error: schedulesError } = await schedulesQuery;
    if (schedulesError) {
      throw new Error(`Nepodarilo sa upratat stare terminy: ${schedulesError.message}`);
    }
  }

  let rulesQuery = supabase
    .from("recurring_rules")
    .delete()
    .eq("trainer_id", trainerId)
    .lt("active_until", now.slice(0, 10));

  if (serviceId) {
    rulesQuery = rulesQuery.eq("service_id", serviceId);
  }

  const { error: rulesError } = await rulesQuery;
  if (rulesError) {
    if (isMissingColumnError(rulesError)) {
      return;
    }

    throw new Error(`Nepodarilo sa upratat stare pravidla: ${rulesError.message}`);
  }
}

/**
 * Generates concrete one-hour schedules from the trainer's monthly availability.
 */
export async function generateSchedulesForTrainer(trainerId: string, serviceId: string) {
  const supabase = await createClient();
  const { start, end } = getMonthlyWindow();

  const { data: service } = await supabase
    .from("bookable_services")
    .select("capacity")
    .eq("id", serviceId)
    .single();

  if (!service) throw new Error("Sluzba nebola najdena.");
  const capacity = service.capacity ?? 1;

  const { data: rules, error: rulesError } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("service_id", serviceId)
    .gte("active_until", start.toISOString().slice(0, 10))
    .lte("active_from", end.toISOString().slice(0, 10));

  if (rulesError) {
    if (isMissingColumnError(rulesError)) {
      throw new Error(getMissingMigrationMessage());
    }

    throw new Error("Chyba pri nacitani pravidiel.");
  }
  if (!rules || rules.length === 0) return 0;

  const { data: existingSchedules, error: existingSchedulesError } = await supabase
    .from("service_schedules")
    .select("id, start_time, end_time, recurring_rule_id")
    .eq("trainer_id", trainerId)
    .eq("service_id", serviceId)
    .gte("start_time", start.toISOString())
    .lte("start_time", end.toISOString());

  if (existingSchedulesError) {
    if (isMissingColumnError(existingSchedulesError)) {
      throw new Error(getMissingMigrationMessage());
    }

    throw new Error("Chyba pri nacitani existujucich terminov.");
  }

  const existingSet = new Set(
    (existingSchedules || []).map(
      (schedule) =>
        `${schedule.recurring_rule_id ?? "legacy"}|${new Date(schedule.start_time).toISOString()}|${new Date(schedule.end_time).toISOString()}`
    )
  );
  const existingTimes = new Set(
    (existingSchedules || []).map(
      (schedule) =>
        `${new Date(schedule.start_time).toISOString()}|${new Date(schedule.end_time).toISOString()}`
    )
  );

  const newSchedules = [];
  const now = new Date();
  const currentDate = new Date(start);

  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const rulesForDay = rules.filter((rule) => rule.day_of_week === dayOfWeek);

    for (const rule of rulesForDay) {
      const [startH, startM] = rule.start_time.split(":");
      const [endH, endM] = rule.end_time.split(":");

      const ruleStart = new Date(currentDate);
      ruleStart.setHours(parseInt(startH, 10), parseInt(startM, 10), 0, 0);

      const ruleEnd = new Date(currentDate);
      ruleEnd.setHours(parseInt(endH, 10), parseInt(endM, 10), 0, 0);

      let currentSlotStart = new Date(ruleStart);

      while (currentSlotStart < ruleEnd) {
        const currentSlotEnd = addMinutes(currentSlotStart, SLOT_MINUTES);

        if (currentSlotEnd > ruleEnd) break;

        if (currentSlotStart > now) {
          const key = `${rule.id}|${currentSlotStart.toISOString()}|${currentSlotEnd.toISOString()}`;

          const timeKey = `${currentSlotStart.toISOString()}|${currentSlotEnd.toISOString()}`;

          if (!existingSet.has(key) && !existingTimes.has(timeKey)) {
            newSchedules.push({
              service_id: serviceId,
              trainer_id: trainerId,
              recurring_rule_id: rule.id,
              start_time: currentSlotStart.toISOString(),
              end_time: currentSlotEnd.toISOString(),
              current_capacity: capacity,
            });
          }
        }

        currentSlotStart = new Date(currentSlotEnd);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (newSchedules.length > 0) {
    const { error: insertError } = await supabase
      .from("service_schedules")
      .insert(newSchedules);

    if (insertError) {
      throw new Error("Chyba pri ukladani vygenerovanych terminov: " + insertError.message);
    }
  }

  return newSchedules.length;
}
