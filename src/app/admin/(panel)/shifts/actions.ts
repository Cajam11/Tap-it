"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole, type AdminRole } from "@/lib/admin-authz";
import type { StaffShift, StaffShiftStatus } from "@/lib/types";

type ShiftTimeInput = {
  workDate: string;
  startTime: string;
  endTime: string;
};

type AssignShiftInput = ShiftTimeInput & {
  assigneeId: string;
};

type RecurringShiftInput = {
  assigneeId: string;
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
};

type ActionResult = {
  success?: true;
  error?: string;
  generatedCount?: number;
  skippedCount?: number;
};

type ExistingShift = Pick<StaffShift, "id" | "work_date" | "start_time" | "end_time" | "status">;

const ACTIVE_SHIFT_STATUSES: StaffShiftStatus[] = ["pending", "approved"];
const OPEN_MINUTES = 6 * 60;
const CLOSE_MINUTES = 22 * 60;
const MAX_RECURRING_DAYS = 366;

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return trimmed;
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function minutesFromTime(value: string) {
  const match = value.trim().match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

function normalizeTime(value: string) {
  const minutes = minutesFromTime(value);
  if (minutes === null) {
    return null;
  }

  const hoursPart = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minutesPart = String(minutes % 60).padStart(2, "0");
  return `${hoursPart}:${minutesPart}`;
}

function validateShiftTime(input: ShiftTimeInput) {
  const workDate = normalizeDate(input.workDate);
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);

  if (!workDate || !startTime || !endTime) {
    return { error: "Skontroluj datum a casy smeny." };
  }

  const startMinutes = minutesFromTime(startTime);
  const endMinutes = minutesFromTime(endTime);

  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return { error: "Koniec smeny musi byt neskor ako zaciatok." };
  }

  if (startMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
    return { error: "Smeny musia byt v 30 minutovych krokoch." };
  }

  if (startMinutes < OPEN_MINUTES || endMinutes > CLOSE_MINUTES) {
    return { error: "Smena musi byt medzi 06:00 a 22:00." };
  }

  return { workDate, startTime, endTime, startMinutes, endMinutes };
}

function isPastSlot(workDate: string, startMinutes: number) {
  const now = new Date();
  const today = toDateKey(now);

  if (workDate < today) {
    return true;
  }

  if (workDate > today) {
    return false;
  }

  return startMinutes <= now.getHours() * 60 + now.getMinutes();
}

function normalizeReason(reason: string) {
  const normalized = reason.trim().replace(/\s+/g, " ");
  return normalized.length > 500 ? normalized.slice(0, 500) : normalized;
}

function normalizeDays(days: number[]) {
  return Array.from(new Set(days.map(Number)))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    .sort((a, b) => a - b);
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
) {
  const aStartMinutes = minutesFromTime(aStart);
  const aEndMinutes = minutesFromTime(aEnd);
  const bStartMinutes = minutesFromTime(bStart);
  const bEndMinutes = minutesFromTime(bEnd);

  if (
    aStartMinutes === null ||
    aEndMinutes === null ||
    bStartMinutes === null ||
    bEndMinutes === null
  ) {
    return false;
  }

  return aStartMinutes < bEndMinutes && bStartMinutes < aEndMinutes;
}

async function getAdminContext(requiredRole: AdminRole) {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId || !context.isAdmin || !hasMinAdminRole(context.role, requiredRole)) {
    throw new Error("Nemate opravnenie spravovat smeny.");
  }

  return context;
}

async function ensureAssignableAdmin(assigneeId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("id", assigneeId)
    .in("role", ["recepcny", "manager", "owner"])
    .maybeSingle<{ id: string }>();

  return Boolean(data);
}

async function fetchExistingActiveShifts(
  assigneeId: string,
  startDate: string,
  endDate = startDate,
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_shifts")
    .select("id, work_date, start_time, end_time, status")
    .eq("assignee_id", assigneeId)
    .gte("work_date", startDate)
    .lte("work_date", endDate)
    .in("status", ACTIVE_SHIFT_STATUSES);

  return (data ?? []) as ExistingShift[];
}

async function hasOverlap(
  assigneeId: string,
  workDate: string,
  startTime: string,
  endTime: string,
) {
  const existing = await fetchExistingActiveShifts(assigneeId, workDate);
  return existing.some((shift) => overlaps(startTime, endTime, shift.start_time, shift.end_time));
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function eachDateInRange(startDate: string, endDate: string) {
  const days: string[] = [];
  const current = dateFromKey(startDate);
  const end = dateFromKey(endDate);

  while (current <= end) {
    days.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

export async function requestOwnShift(input: ShiftTimeInput): Promise<ActionResult> {
  try {
    const context = await getAdminContext("recepcny");
    const validated = validateShiftTime(input);

    if ("error" in validated) {
      return { error: validated.error };
    }

    if (isPastSlot(validated.workDate, validated.startMinutes)) {
      return { error: "Nie je mozne poziadat o smenu v minulosti." };
    }

    if (
      await hasOverlap(
        context.userId!,
        validated.workDate,
        validated.startTime,
        validated.endTime,
      )
    ) {
      return { error: "V tomto case uz mate inu aktivnu alebo cakajucu smenu." };
    }

    const admin = createAdminClient();
    const { error } = await admin.from("staff_shifts").insert({
      assignee_id: context.userId!,
      work_date: validated.workDate,
      start_time: validated.startTime,
      end_time: validated.endTime,
      status: "pending",
      requested_by: context.userId!,
      created_by: context.userId!,
    });

    if (error) {
      return { error: `Nepodarilo sa odoslat ziadost: ${error.message}` };
    }

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }
}

export async function createShift(input: AssignShiftInput): Promise<ActionResult> {
  try {
    const context = await getAdminContext("manager");
    const validated = validateShiftTime(input);

    if ("error" in validated) {
      return { error: validated.error };
    }

    if (isPastSlot(validated.workDate, validated.startMinutes)) {
      return { error: "Nie je mozne vytvorit smenu v minulosti." };
    }

    if (!(await ensureAssignableAdmin(input.assigneeId))) {
      return { error: "Vybrany pouzivatel nema admin rolu." };
    }

    if (
      await hasOverlap(
        input.assigneeId,
        validated.workDate,
        validated.startTime,
        validated.endTime,
      )
    ) {
      return { error: "Vybrany admin uz ma v tomto case aktivnu alebo cakajucu smenu." };
    }

    const now = new Date().toISOString();
    const admin = createAdminClient();
    const { error } = await admin.from("staff_shifts").insert({
      assignee_id: input.assigneeId,
      work_date: validated.workDate,
      start_time: validated.startTime,
      end_time: validated.endTime,
      status: "approved",
      requested_by: context.userId!,
      created_by: context.userId!,
      approved_by: context.userId!,
      approved_at: now,
    });

    if (error) {
      return { error: `Nepodarilo sa vytvorit smenu: ${error.message}` };
    }

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }
}

export async function createRecurringShifts(input: RecurringShiftInput): Promise<ActionResult> {
  try {
    const context = await getAdminContext("manager");
    const startDate = normalizeDate(input.startDate);
    const endDate = normalizeDate(input.endDate);
    const daysOfWeek = normalizeDays(input.daysOfWeek);
    const validated = validateShiftTime({
      workDate: startDate ?? "",
      startTime: input.startTime,
      endTime: input.endTime,
    });

    if (!startDate || !endDate || startDate > endDate || "error" in validated) {
      return { error: "Skontroluj datumy, dni a casy opakovanej smeny." };
    }

    if (daysOfWeek.length === 0) {
      return { error: "Vyber aspon jeden den opakovania." };
    }

    const allDates = eachDateInRange(startDate, endDate);
    if (allDates.length > MAX_RECURRING_DAYS) {
      return { error: "Opakovanie moze byt najviac na 366 dni dopredu." };
    }

    if (!(await ensureAssignableAdmin(input.assigneeId))) {
      return { error: "Vybrany pouzivatel nema admin rolu." };
    }

    const existing = await fetchExistingActiveShifts(input.assigneeId, startDate, endDate);
    const existingByDate = new Map<string, ExistingShift[]>();
    for (const shift of existing) {
      existingByDate.set(shift.work_date, [...(existingByDate.get(shift.work_date) ?? []), shift]);
    }

    const rows = allDates
      .filter((workDate) => daysOfWeek.includes(dateFromKey(workDate).getDay()))
      .filter((workDate) => !isPastSlot(workDate, validated.startMinutes))
      .filter((workDate) => {
        const dayShifts = existingByDate.get(workDate) ?? [];
        return !dayShifts.some((shift) =>
          overlaps(validated.startTime, validated.endTime, shift.start_time, shift.end_time),
        );
      });

    const requestedDates = allDates.filter((workDate) =>
      daysOfWeek.includes(dateFromKey(workDate).getDay()),
    );

    if (rows.length === 0) {
      return { error: "Nevznikla ziadna volna buduca smena pre toto opakovanie." };
    }

    const admin = createAdminClient();
    const { data: series, error: seriesError } = await admin
      .from("staff_shift_series")
      .insert({
        assignee_id: input.assigneeId,
        created_by: context.userId!,
        start_date: startDate,
        end_date: endDate,
        days_of_week: daysOfWeek,
        start_time: validated.startTime,
        end_time: validated.endTime,
      })
      .select("id")
      .single<{ id: string }>();

    if (seriesError || !series) {
      return { error: `Nepodarilo sa vytvorit opakovanie: ${seriesError?.message ?? "neznamy problem"}` };
    }

    const now = new Date().toISOString();
    const { error: shiftsError } = await admin.from("staff_shifts").insert(
      rows.map((workDate) => ({
        assignee_id: input.assigneeId,
        series_id: series.id,
        work_date: workDate,
        start_time: validated.startTime,
        end_time: validated.endTime,
        status: "approved" as const,
        requested_by: context.userId!,
        created_by: context.userId!,
        approved_by: context.userId!,
        approved_at: now,
      })),
    );

    if (shiftsError) {
      await admin
        .from("staff_shift_series")
        .update({
          status: "cancelled",
          cancelled_by: context.userId!,
          cancelled_at: now,
          cancellation_reason: "Nepodarilo sa vygenerovat smeny.",
        })
        .eq("id", series.id);

      return { error: `Opakovanie sa nepodarilo vygenerovat: ${shiftsError.message}` };
    }

    revalidatePath("/admin/shifts");
    return {
      success: true,
      generatedCount: rows.length,
      skippedCount: Math.max(0, requestedDates.length - rows.length),
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }
}

export async function approveShift(shiftId: string): Promise<ActionResult> {
  try {
    const context = await getAdminContext("manager");
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from("staff_shifts")
      .update({
        status: "approved",
        approved_by: context.userId!,
        approved_at: now,
        updated_at: now,
      })
      .eq("id", shiftId)
      .eq("status", "pending");

    if (error) {
      return { error: `Nepodarilo sa schvalit smenu: ${error.message}` };
    }

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }
}

export async function rejectShift(shiftId: string, reason: string): Promise<ActionResult> {
  try {
    const context = await getAdminContext("manager");
    const normalizedReason = normalizeReason(reason);

    if (!normalizedReason) {
      return { error: "Dovod zamietnutia je povinny." };
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from("staff_shifts")
      .update({
        status: "rejected",
        rejected_by: context.userId!,
        rejected_at: now,
        rejection_reason: normalizedReason,
        updated_at: now,
      })
      .eq("id", shiftId)
      .eq("status", "pending");

    if (error) {
      return { error: `Nepodarilo sa zamietnut smenu: ${error.message}` };
    }

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }
}

export async function cancelShift(shiftId: string, reason: string): Promise<ActionResult> {
  try {
    const context = await getAdminContext("manager");
    const normalizedReason = normalizeReason(reason);

    if (!normalizedReason) {
      return { error: "Dovod zrusenia je povinny." };
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from("staff_shifts")
      .update({
        status: "cancelled",
        cancelled_by: context.userId!,
        cancelled_at: now,
        cancellation_reason: normalizedReason,
        updated_at: now,
      })
      .eq("id", shiftId)
      .in("status", ACTIVE_SHIFT_STATUSES);

    if (error) {
      return { error: `Nepodarilo sa zrusit smenu: ${error.message}` };
    }

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }
}

export async function cancelFutureSeriesShifts(
  seriesId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const context = await getAdminContext("manager");
    const normalizedReason = normalizeReason(reason);

    if (!normalizedReason) {
      return { error: "Dovod zrusenia serie je povinny." };
    }

    const admin = createAdminClient();
    const today = toDateKey(new Date());
    const now = new Date().toISOString();

    const { error: seriesError } = await admin
      .from("staff_shift_series")
      .update({
        status: "cancelled",
        cancelled_by: context.userId!,
        cancelled_at: now,
        cancellation_reason: normalizedReason,
      })
      .eq("id", seriesId)
      .eq("status", "active");

    if (seriesError) {
      return { error: `Nepodarilo sa zrusit seriu: ${seriesError.message}` };
    }

    const { error: shiftsError } = await admin
      .from("staff_shifts")
      .update({
        status: "cancelled",
        cancelled_by: context.userId!,
        cancelled_at: now,
        cancellation_reason: normalizedReason,
        updated_at: now,
      })
      .eq("series_id", seriesId)
      .gte("work_date", today)
      .in("status", ACTIVE_SHIFT_STATUSES);

    if (shiftsError) {
      return { error: `Seria je zrusena, ale buduce smeny sa nepodarilo zrusit: ${shiftsError.message}` };
    }

    revalidatePath("/admin/shifts");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }
}
