"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";

type RuleInput = {
  serviceId: string;
  trainerId: string;
  days: number[];
  startTime: string;
  endTime: string;
};

type ServiceInput = {
  serviceId?: string | null;
  name: string;
  room: string;
  exerciseKind: string;
  basePrice: number;
  capacity: number | null;
  imageUrl?: string | null;
};

type RecurringRuleRow = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type ExistingScheduleRow = {
  recurring_rule_id: string | null;
  start_time: string;
  end_time: string;
};

type InsertableQuery = {
  insert(values: Record<string, unknown> | Record<string, unknown>[]): Promise<{ error: { message?: string } | null }>;
};

type InsertableSelectQuery = {
  insert(values: Record<string, unknown>): InsertableSelectQuery;
  select(columns: string): InsertableSelectQuery;
  single<T>(): Promise<{ data: T | null; error: { message?: string } | null }>;
};

type UpdatableQuery = {
  update(values: Record<string, unknown>): UpdatableQuery;
  eq(column: string, value: string): Promise<{ error: { message?: string } | null }>;
};

const RULE_MONTHS_AHEAD = 12;

function getRuleWindow() {
  const activeFrom = new Date();
  activeFrom.setHours(0, 0, 0, 0);

  const activeUntil = new Date(activeFrom);
  activeUntil.setMonth(activeUntil.getMonth() + RULE_MONTHS_AHEAD);
  activeUntil.setHours(23, 59, 59, 999);

  return {
    activeFrom,
    activeUntil,
    activeFromDate: activeFrom.toISOString().slice(0, 10),
    activeUntilDate: activeUntil.toISOString().slice(0, 10),
  };
}

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function normalizeDays(days: number[]) {
  return Array.from(new Set(days.map(Number)))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

function setDateTime(day: Date, time: string) {
  const [hours, minutes] = time.split(":").map((part) => parseInt(part, 10));
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function assertCanManageBookings() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.isAdmin || !hasMinAdminRole(context.role, "recepcny")) {
    throw new Error("Nemate opravnenie upravovat skupinove lekcie.");
  }
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function saveGroupClassService(input: ServiceInput) {
  try {
    await assertCanManageBookings();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }

  const name = normalizeText(input.name);
  const room = normalizeText(input.room);
  const exerciseKind = normalizeText(input.exerciseKind || input.name);
  const basePrice = Number(input.basePrice);
  const capacity = input.capacity === null ? null : Number(input.capacity);

  if (!name) {
    return { error: "Nazov lekcie je povinny." };
  }

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return { error: "Cena musi byt nezaporne cislo." };
  }

  if (capacity !== null && (!Number.isInteger(capacity) || capacity <= 0)) {
    return { error: "Kapacita musi byt prazdna alebo kladne cele cislo." };
  }

  const admin = createAdminClient();
  const payload = {
    name,
    type: "group",
    base_price: basePrice,
    price_unit: "session",
    capacity,
    is_active: true,
    metadata: {
      room: room || null,
      exercise_kind: exerciseKind || name,
      image_url: input.imageUrl || null,
    },
  };

  if (input.serviceId) {
    const { data: existingService } = await admin
      .from("bookable_services")
      .select("id")
      .eq("id", input.serviceId)
      .eq("type", "group")
      .maybeSingle<{ id: string }>();

    if (!existingService) {
      return { error: "Skupinova lekcia neexistuje." };
    }

    const { error } = await (admin.from("bookable_services") as unknown as UpdatableQuery)
      .update(payload)
      .eq("id", input.serviceId);

    if (error) {
      return { error: `Nepodarilo sa upravit lekciu: ${error.message}` };
    }

    revalidatePath("/admin/bookings");
    revalidatePath("/bookings/skupinove-lekcie");
    revalidatePath(`/bookings/skupinove-lekcie/${input.serviceId}`);

    return { success: true, serviceId: input.serviceId };
  }

  const { data, error } = await (admin.from("bookable_services") as unknown as InsertableSelectQuery)
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return { error: `Nepodarilo sa vytvorit lekciu: ${error?.message ?? "neznamy problem"}` };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/bookings/skupinove-lekcie");

  return { success: true, serviceId: data.id };
}

async function generateGroupClassSchedules(serviceId: string, trainerId: string) {
  const admin = createAdminClient();
  const { activeFrom, activeUntil } = getRuleWindow();

  const { data: service } = await admin
    .from("bookable_services")
    .select("capacity")
    .eq("id", serviceId)
    .eq("type", "group")
    .maybeSingle<{ capacity: number | null }>();

  if (!service) {
    throw new Error("Skupinova lekcia neexistuje.");
  }

  const { data: rules, error: rulesError } = await admin
    .from("recurring_rules")
    .select("id, day_of_week, start_time, end_time")
    .eq("service_id", serviceId)
    .eq("trainer_id", trainerId)
    .gte("active_until", activeFrom.toISOString().slice(0, 10));

  if (rulesError) {
    throw new Error("Nepodarilo sa nacitat opakovacie pravidla.");
  }

  const typedRules = (rules ?? []) as RecurringRuleRow[];
  if (typedRules.length === 0) return 0;

  const { data: existingSchedules } = await admin
    .from("service_schedules")
    .select("recurring_rule_id, start_time, end_time")
    .eq("service_id", serviceId)
    .gte("start_time", activeFrom.toISOString())
    .lte("start_time", activeUntil.toISOString());

  const typedExistingSchedules = (existingSchedules ?? []) as ExistingScheduleRow[];
  const existingSet = new Set(
    typedExistingSchedules.map(
      (schedule) =>
        `${schedule.recurring_rule_id ?? "legacy"}|${new Date(schedule.start_time).toISOString()}|${new Date(schedule.end_time).toISOString()}`,
    ),
  );

  const now = new Date();
  const schedules = [];
  const current = new Date(activeFrom);

  while (current <= activeUntil) {
    const dayRules = typedRules.filter((rule) => rule.day_of_week === current.getDay());

    for (const rule of dayRules) {
      const start = setDateTime(current, rule.start_time.substring(0, 5));
      const end = setDateTime(current, rule.end_time.substring(0, 5));

      if (start <= now || end <= start) {
        continue;
      }

      const key = `${rule.id}|${start.toISOString()}|${end.toISOString()}`;
      if (!existingSet.has(key)) {
        schedules.push({
          service_id: serviceId,
          trainer_id: trainerId,
          recurring_rule_id: rule.id,
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          current_capacity: service.capacity ?? null,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  if (schedules.length === 0) return 0;

  const { error: insertError } = await (admin.from("service_schedules") as unknown as InsertableQuery)
    .insert(schedules);
  if (insertError) {
    throw new Error(`Nepodarilo sa vygenerovat terminy: ${insertError.message}`);
  }

  return schedules.length;
}

export async function saveGroupClassRecurringRule(input: RuleInput) {
  try {
    await assertCanManageBookings();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }

  const days = normalizeDays(input.days);
  const startTime = input.startTime;
  const endTime = input.endTime;

  if (!input.serviceId || !input.trainerId || days.length === 0) {
    return { error: "Vyber lekciu, instruktora a aspon jeden den." };
  }

  if (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime) {
    return { error: "Skontroluj casy. Koniec musi byt neskor ako zaciatok." };
  }

  const admin = createAdminClient();

  const { data: service } = await admin
    .from("bookable_services")
    .select("id")
    .eq("id", input.serviceId)
    .eq("type", "group")
    .maybeSingle<{ id: string }>();

  if (!service) {
    return { error: "Vybrana skupinova lekcia neexistuje." };
  }

  const { data: trainer } = await admin
    .from("profiles")
    .select("id")
    .eq("id", input.trainerId)
    .eq("role", "trainer")
    .maybeSingle<{ id: string }>();

  if (!trainer) {
    return { error: "Vybrany instruktor nie je trener v databaze." };
  }

  const now = new Date().toISOString();
  const { count: activeBookingsCount } = await admin
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("service_id", input.serviceId)
    .in("status", ["pending", "paid"])
    .gte("start_time", now);

  if ((activeBookingsCount ?? 0) > 0) {
    return {
      error:
        "Tato lekcia uz ma buduce aktivne rezervacie. Najprv ich vybavte alebo zmente rozvrh rucne, aby sme neodpojili rezervacie od terminov.",
    };
  }

  const { error: deleteSchedulesError } = await admin
    .from("service_schedules")
    .delete()
    .eq("service_id", input.serviceId)
    .gte("start_time", now);

  if (deleteSchedulesError) {
    return { error: "Nepodarilo sa zmazat povodne buduce terminy." };
  }

  const { error: deleteRulesError } = await admin
    .from("recurring_rules")
    .delete()
    .eq("service_id", input.serviceId);

  if (deleteRulesError) {
    return { error: "Nepodarilo sa zmazat povodne pravidla." };
  }

  const { activeFromDate, activeUntilDate } = getRuleWindow();
  const payload = days.map((day) => ({
    service_id: input.serviceId,
    trainer_id: input.trainerId,
    day_of_week: day,
    start_time: startTime,
    end_time: endTime,
    weeks_ahead: 52,
    active_from: activeFromDate,
    active_until: activeUntilDate,
  }));

  const { error: insertRulesError } = await (admin.from("recurring_rules") as unknown as InsertableQuery)
    .insert(payload);
  if (insertRulesError) {
    return { error: `Nepodarilo sa ulozit pravidla: ${insertRulesError.message}` };
  }

  try {
    const generatedCount = await generateGroupClassSchedules(input.serviceId, input.trainerId);
    revalidatePath("/admin/bookings");
    revalidatePath("/bookings/skupinove-lekcie");
    revalidatePath(`/bookings/skupinove-lekcie/${input.serviceId}`);

    return { success: true, generatedCount, activeUntil: activeUntilDate };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Pravidla su ulozene, ale terminy sa nepodarilo vygenerovat.",
    };
  }
}
