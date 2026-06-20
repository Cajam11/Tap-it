"use server";

import { createClient } from "@/lib/supabase/server";
import {
  cleanupExpiredTrainerSchedules,
  detachBookedTrainerSchedules,
  generateSchedulesForTrainer,
} from "@/lib/schedules.server";

type RuleInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function isMissingColumnError(error: { message?: string; code?: string } | null) {
  return error?.code === "42703" || error?.message?.includes("does not exist");
}

function getMissingMigrationMessage() {
  return "Databaza este nema aplikovanu migraciu 20260519130000_monthly_trainer_availability.sql.";
}

function getMonthlyRuleWindow() {
  const activeFrom = new Date();
  activeFrom.setHours(0, 0, 0, 0);

  const activeUntil = new Date(activeFrom);
  activeUntil.setMonth(activeUntil.getMonth() + 1);

  return {
    activeFrom: activeFrom.toISOString().slice(0, 10),
    activeUntil: activeUntil.toISOString().slice(0, 10),
  };
}

function isValidRule(rule: RuleInput) {
  return (
    Number.isInteger(rule.day_of_week) &&
    rule.day_of_week >= 0 &&
    rule.day_of_week <= 6 &&
    /^\d{2}:\d{2}$/.test(rule.start_time) &&
    /^\d{2}:\d{2}$/.test(rule.end_time) &&
    rule.start_time < rule.end_time
  );
}

export async function saveAvailabilityRules(trainerId: string, serviceId: string, rules: RuleInput[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== trainerId) {
    return { error: "Neautorizovany pristup" };
  }

  const normalizedRules = rules.map((rule) => ({
    day_of_week: Number(rule.day_of_week),
    start_time: rule.start_time,
    end_time: rule.end_time,
  }));

  if (normalizedRules.some((rule) => !isValidRule(rule))) {
    return { error: "Skontroluj dni a casy. Koniec treningu musi byt neskor ako zaciatok." };
  }

  try {
    await cleanupExpiredTrainerSchedules(trainerId, serviceId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nepodarilo sa upratat stare terminy.",
    };
  }

  const now = new Date().toISOString();

  let bookedScheduleIds: Set<string>;
  try {
    bookedScheduleIds = await detachBookedTrainerSchedules(trainerId, serviceId, now);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Nepodarilo sa zachovat rezervovane terminy.",
    };
  }

  const { data: futureSchedules, error: futureSchedulesError } = await supabase
    .from("service_schedules")
    .select("id")
    .eq("trainer_id", trainerId)
    .eq("service_id", serviceId)
    .gte("start_time", now);

  if (futureSchedulesError) {
    return { error: "Nepodarilo sa nacitat povodne buduce terminy." };
  }

  const deletableScheduleIds = (futureSchedules || [])
    .map((schedule) => schedule.id)
    .filter((scheduleId) => !bookedScheduleIds.has(scheduleId));

  const { error: deleteSchedulesError } = deletableScheduleIds.length > 0
    ? await supabase
        .from("service_schedules")
        .delete()
        .in("id", deletableScheduleIds)
    : { error: null };

  if (deleteSchedulesError) {
    return { error: "Nepodarilo sa zmazat povodne buduce terminy." };
  }

  const { error: deleteRulesError } = await supabase
    .from("recurring_rules")
    .delete()
    .eq("trainer_id", trainerId)
    .eq("service_id", serviceId);

  if (deleteRulesError) {
    return { error: "Nepodarilo sa zmazat povodne pravidla." };
  }

  const { activeFrom, activeUntil } = getMonthlyRuleWindow();

  if (normalizedRules.length > 0) {
    const payload = normalizedRules.map((rule) => ({
      trainer_id: trainerId,
      service_id: serviceId,
      day_of_week: rule.day_of_week,
      start_time: rule.start_time,
      end_time: rule.end_time,
      weeks_ahead: 4,
      active_from: activeFrom,
      active_until: activeUntil,
    }));

    const { error: insertError } = await supabase
      .from("recurring_rules")
      .insert(payload);

    if (insertError) {
      if (isMissingColumnError(insertError)) {
        return { error: getMissingMigrationMessage() };
      }

      return { error: "Nepodarilo sa ulozit nove pravidla." };
    }
  }

  try {
    const generatedCount = await generateSchedulesForTrainer(trainerId, serviceId);
    return { success: true, generatedCount, activeUntil };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Rozvrh nebol uplne vygenerovany: ${error.message}`
          : "Rozvrh nebol uplne vygenerovany.",
    };
  }
}
