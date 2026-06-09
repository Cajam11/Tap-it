"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Repeat,
  UserRound,
  X,
} from "lucide-react";
import { hasMinAdminRole } from "@/lib/admin-authz";
import {
  approveShift,
  cancelFutureSeriesShifts,
  cancelShift,
  createRecurringShifts,
  createShift,
  rejectShift,
  requestOwnShift,
} from "@/app/admin/(panel)/shifts/actions";
import type { StaffShift, StaffShiftCoverageRule, UserRole } from "@/lib/types";

type StaffOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
};

type AdminShiftsWorkspaceProps = {
  currentUserId: string;
  currentRole: UserRole;
  staff: StaffOption[];
  shifts: StaffShift[];
  coverageRules: StaffShiftCoverageRule[];
};

type ShiftFormState = {
  assigneeId: string;
  startTime: string;
  endTime: string;
};

type RecurringFormState = ShiftFormState & {
  startDate: string;
  endDate: string;
  daysOfWeek: number[];
};

type ShiftViewMode = "calendar" | "timeline";

type ReasonAction = {
  kind: "reject" | "cancel" | "series";
  id: string;
  title: string;
  label: string;
  confirmLabel: string;
};

const WEEK_DAYS = ["Po", "Ut", "St", "Stv", "Pi", "So", "Ne"];
const REPEAT_DAYS = [
  { id: 1, label: "Po" },
  { id: 2, label: "Ut" },
  { id: 3, label: "St" },
  { id: 4, label: "Stv" },
  { id: 5, label: "Pi" },
  { id: 6, label: "So" },
  { id: 0, label: "Ne" },
];
const OPEN_MINUTES = 6 * 60;
const CLOSE_MINUTES = 22 * 60;

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(key: string, count: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + count);
  return toDateKey(date);
}

function normalizeTime(value: string) {
  return value.substring(0, 5);
}

function minutesFromTime(value: string) {
  const [hours, minutes] = normalizeTime(value).split(":").map(Number);
  return hours * 60 + minutes;
}

function timeLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function overlapsSlot(shift: Pick<StaffShift, "start_time" | "end_time">, slotStart: number, slotEnd: number) {
  const shiftStart = minutesFromTime(shift.start_time);
  const shiftEnd = minutesFromTime(shift.end_time);
  return shiftStart < slotEnd && slotStart < shiftEnd;
}

function formatStaffName(staff?: StaffOption) {
  if (!staff) return "Neznamy admin";
  return staff.full_name || staff.email || "Admin";
}

function statusTone(status: StaffShift["status"]) {
  if (status === "approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "pending") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (status === "rejected") return "border-white/10 bg-white/[0.04] text-white/45";
  return "border-red-500/25 bg-red-500/10 text-red-200";
}

function statusLabel(status: StaffShift["status"]) {
  if (status === "approved") return "Schvalena";
  if (status === "pending") return "Caka";
  if (status === "rejected") return "Zamietnuta";
  return "Zrusena";
}

function buildTimeOptions() {
  const options = [];
  for (let minutes = OPEN_MINUTES; minutes <= CLOSE_MINUTES; minutes += 30) {
    options.push(timeLabel(minutes));
  }
  return options;
}

export default function AdminShiftsWorkspace({
  currentUserId,
  currentRole,
  staff,
  shifts,
  coverageRules,
}: AdminShiftsWorkspaceProps) {
  const router = useRouter();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(new Date()));
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ShiftViewMode>("calendar");
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [selfForm, setSelfForm] = useState({ startTime: "08:00", endTime: "14:00" });
  const [assignForm, setAssignForm] = useState<ShiftFormState>({
    assigneeId: staff[0]?.id ?? "",
    startTime: "08:00",
    endTime: "14:00",
  });
  const [recurringForm, setRecurringForm] = useState<RecurringFormState>({
    assigneeId: staff[0]?.id ?? "",
    startDate: selectedDateKey,
    endDate: addDays(selectedDateKey, 28),
    daysOfWeek: [dateFromKey(selectedDateKey).getDay()],
    startTime: "08:00",
    endTime: "14:00",
  });
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const canManage = hasMinAdminRole(currentRole, "manager");
  const timeOptions = useMemo(buildTimeOptions, []);
  const selectedDate = dateFromKey(selectedDateKey);

  const staffById = useMemo(() => {
    const map = new Map<string, StaffOption>();
    for (const staffMember of staff) {
      map.set(staffMember.id, staffMember);
    }
    return map;
  }, [staff]);

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, StaffShift[]>();
    for (const shift of shifts) {
      map.set(shift.work_date, [...(map.get(shift.work_date) ?? []), shift]);
    }

    for (const dayShifts of map.values()) {
      dayShifts.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }

    return map;
  }, [shifts]);

  const rulesByDay = useMemo(() => {
    const map = new Map<number, StaffShiftCoverageRule[]>();
    for (const rule of coverageRules) {
      map.set(rule.day_of_week, [...(map.get(rule.day_of_week) ?? []), rule]);
    }
    return map;
  }, [coverageRules]);

  const selectedDayShifts = shiftsByDate.get(selectedDateKey) ?? [];
  const selectedDayActiveShifts = selectedDayShifts.filter(
    (shift) => shift.status === "pending" || shift.status === "approved",
  );
  const selectedRules = rulesByDay.get(selectedDate.getDay()) ?? [];

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    return eachDayOfInterval({
      start: startOfWeek(monthStart, { weekStartsOn: 1 }),
      end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
    });
  }, [currentMonth]);

  const getDayCoverage = (dateKey: string) => {
    const day = dateFromKey(dateKey);
    const dayRules = rulesByDay.get(day.getDay()) ?? [];
    const dayShifts = shiftsByDate.get(dateKey) ?? [];
    let hasGap = false;
    let hasPendingGap = false;
    let coveredSlots = 0;
    let checkedSlots = 0;

    for (const rule of dayRules) {
      const ruleStart = minutesFromTime(rule.start_time);
      const ruleEnd = minutesFromTime(rule.end_time);

      for (let slotStart = ruleStart; slotStart < ruleEnd; slotStart += 30) {
        const slotEnd = slotStart + 30;
        checkedSlots += 1;
        const approvedCount = dayShifts.filter(
          (shift) => shift.status === "approved" && overlapsSlot(shift, slotStart, slotEnd),
        ).length;
        const pendingCount = dayShifts.filter(
          (shift) => shift.status === "pending" && overlapsSlot(shift, slotStart, slotEnd),
        ).length;

        if (approvedCount >= rule.required_count) {
          coveredSlots += 1;
        } else {
          hasGap = true;
          if (pendingCount > 0) {
            hasPendingGap = true;
          }
        }
      }
    }

    return { hasGap, hasPendingGap, coveredSlots, checkedSlots };
  };

  const runAction = (
    action: () => Promise<{ success?: true; error?: string; generatedCount?: number; skippedCount?: number }>,
    success: string,
  ) => {
    setMessage("");
    startTransition(async () => {
      const result = await action();

      if (result.error) {
        setMessage(result.error);
        return;
      }

      const generatedSuffix =
        typeof result.generatedCount === "number"
          ? ` Vygenerovane: ${result.generatedCount}, preskocene: ${result.skippedCount ?? 0}.`
          : "";
      setMessage(`${success}${generatedSuffix}`);
      router.refresh();
    });
  };

  const requestShift = () => {
    runAction(
      () =>
        requestOwnShift({
          workDate: selectedDateKey,
          startTime: selfForm.startTime,
          endTime: selfForm.endTime,
        }),
      "Ziadost o smenu bola odoslana.",
    );
  };

  const assignShift = () => {
    runAction(
      () =>
        createShift({
          assigneeId: assignForm.assigneeId,
          workDate: selectedDateKey,
          startTime: assignForm.startTime,
          endTime: assignForm.endTime,
        }),
      "Smena bola vytvorena.",
    );
  };

  const createRecurring = () => {
    runAction(
      () =>
        createRecurringShifts({
          assigneeId: recurringForm.assigneeId,
          startDate: recurringForm.startDate,
          endDate: recurringForm.endDate,
          daysOfWeek: recurringForm.daysOfWeek,
          startTime: recurringForm.startTime,
          endTime: recurringForm.endTime,
        }),
      "Opakovanie bolo vytvorene.",
    );
  };

  const approveSelectedShift = (shiftId: string) => {
    runAction(() => approveShift(shiftId), "Smena bola schvalena.");
  };

  const openReasonAction = (action: ReasonAction) => {
    setReasonText("");
    setReasonAction(action);
  };

  const rejectSelectedShift = (shiftId: string) => {
    openReasonAction({
      kind: "reject",
      id: shiftId,
      title: "Zamietnut smenu",
      label: "Dovod zamietnutia",
      confirmLabel: "Zamietnut",
    });
  };

  const cancelSelectedShift = (shiftId: string) => {
    openReasonAction({
      kind: "cancel",
      id: shiftId,
      title: "Zrusit smenu",
      label: "Dovod zrusenia",
      confirmLabel: "Zrusit",
    });
  };

  const cancelSeries = (seriesId: string) => {
    openReasonAction({
      kind: "series",
      id: seriesId,
      title: "Zrusit buduce smeny v serii",
      label: "Dovod zrusenia serie",
      confirmLabel: "Zrusit seriu",
    });
  };

  const closeReasonAction = () => {
    setReasonAction(null);
    setReasonText("");
  };

  const submitReasonAction = () => {
    if (!reasonAction) return;

    const reason = reasonText.trim();
    if (!reason) {
      setMessage("Dovod je povinny.");
      return;
    }

    const action = reasonAction;
    closeReasonAction();

    if (action.kind === "reject") {
      runAction(() => rejectShift(action.id, reason), "Smena bola zamietnuta.");
      return;
    }

    if (action.kind === "cancel") {
      runAction(() => cancelShift(action.id, reason), "Smena bola zrusena.");
      return;
    }

    runAction(() => cancelFutureSeriesShifts(action.id, reason), "Buduce smeny v serii boli zrusene.");
  };

  const toggleRecurringDay = (day: number) => {
    setRecurringForm((current) => ({
      ...current,
      daysOfWeek: current.daysOfWeek.includes(day)
        ? current.daysOfWeek.filter((currentDay) => currentDay !== day)
        : [...current.daysOfWeek, day].sort((a, b) => a - b),
    }));
  };

  const selectCalendarDay = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setDayDetailOpen(true);
  };

  const moveSelectedDate = (days: number) => {
    setSelectedDateKey((current) => addDays(current, days));
    setDayDetailOpen(true);
  };

  const selectedCoverage = getDayCoverage(selectedDateKey);

  return (
    <div className="flex min-h-full flex-col gap-6 p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Smeny</h1>
          <p className="mt-2 text-sm text-white/55">
            Planovanie pokrytia recepcie a admin sluzieb od 06:00 do 22:00.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                viewMode === "calendar"
                  ? "bg-red-600 text-white"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              Kalendar
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                viewMode === "timeline"
                  ? "bg-red-600 text-white"
                  : "text-white/60 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <Clock3 className="h-4 w-4" />
              Casova os
            </button>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/65">
            <Clock3 className="h-4 w-4 text-red-300" />
            30 minutove kroky
          </div>
        </div>
      </div>

      {viewMode === "calendar" ? (
        dayDetailOpen ? (
          <div className="space-y-6">
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setDayDetailOpen(false)}
                    className="mt-1 rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                    aria-label="Spat na kalendar"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-white/35">Detail dna</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">
                      {format(selectedDate, "d. MMMM yyyy")}
                    </h2>
                  </div>
                </div>
                {canManage && selectedCoverage.hasGap ? (
                  <span className="w-fit rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
                    Diera v pokryti
                  </span>
                ) : (
                  <span className="w-fit rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Pokryte
                  </span>
                )}
              </div>

              {message ? (
                <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                  message.includes("Nepodarilo") ||
                  message.includes("Dovod") ||
                  message.includes("Skontroluj") ||
                  message.includes("Nie je")
                    ? "border-red-500/25 bg-red-500/10 text-red-200"
                    : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                }`}>
                  {message}
                </p>
              ) : null}
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
              <DayTimelinePanel
                activeShifts={selectedDayActiveShifts}
                selectedRules={selectedRules}
                staffById={staffById}
                canManage={canManage}
              />

              <div className="space-y-4">
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-red-300" />
                    <h3 className="text-sm font-semibold text-white">
                      {canManage ? "Pridat schvalenu smenu" : "Poziadat o smenu"}
                    </h3>
                  </div>

                  {canManage ? (
                    <div className="space-y-3">
                      <SelectField
                        label="Admin"
                        value={assignForm.assigneeId}
                        onChange={(assigneeId) => setAssignForm((current) => ({ ...current, assigneeId }))}
                      >
                        {staff.map((staffMember) => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {formatStaffName(staffMember)} ({staffMember.role})
                          </option>
                        ))}
                      </SelectField>
                      <TimeFields
                        startTime={assignForm.startTime}
                        endTime={assignForm.endTime}
                        options={timeOptions}
                        onStartChange={(startTime) => setAssignForm((current) => ({ ...current, startTime }))}
                        onEndChange={(endTime) => setAssignForm((current) => ({ ...current, endTime }))}
                      />
                      <button
                        type="button"
                        onClick={assignShift}
                        disabled={isPending || !assignForm.assigneeId}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Pridat smenu
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <TimeFields
                        startTime={selfForm.startTime}
                        endTime={selfForm.endTime}
                        options={timeOptions}
                        onStartChange={(startTime) => setSelfForm((current) => ({ ...current, startTime }))}
                        onEndChange={(endTime) => setSelfForm((current) => ({ ...current, endTime }))}
                      />
                      <button
                        type="button"
                        onClick={requestShift}
                        disabled={isPending}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Odoslat ziadost
                      </button>
                    </div>
                  )}
                </section>

                <DayShiftCards
                  shifts={selectedDayShifts}
                  staffById={staffById}
                  canManage={canManage}
                  isPending={isPending}
                  onApprove={approveSelectedShift}
                  onReject={rejectSelectedShift}
                  onCancel={cancelSelectedShift}
                  onCancelSeries={cancelSeries}
                />

                {canManage ? (
                  <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-red-300" />
                      <h3 className="text-sm font-semibold text-white">Opakovanie</h3>
                    </div>
                    <div className="space-y-3">
                      <SelectField
                        label="Admin"
                        value={recurringForm.assigneeId}
                        onChange={(assigneeId) => setRecurringForm((current) => ({ ...current, assigneeId }))}
                      >
                        {staff.map((staffMember) => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {formatStaffName(staffMember)} ({staffMember.role})
                          </option>
                        ))}
                      </SelectField>
                      <div className="grid grid-cols-2 gap-3">
                        <TextField
                          label="Od datumu"
                          type="date"
                          value={recurringForm.startDate}
                          onChange={(startDate) => setRecurringForm((current) => ({ ...current, startDate }))}
                        />
                        <TextField
                          label="Do datumu"
                          type="date"
                          value={recurringForm.endDate}
                          onChange={(endDate) => setRecurringForm((current) => ({ ...current, endDate }))}
                        />
                      </div>
                      <TimeFields
                        startTime={recurringForm.startTime}
                        endTime={recurringForm.endTime}
                        options={timeOptions}
                        onStartChange={(startTime) => setRecurringForm((current) => ({ ...current, startTime }))}
                        onEndChange={(endTime) => setRecurringForm((current) => ({ ...current, endTime }))}
                      />
                      <div className="grid grid-cols-7 gap-1">
                        {REPEAT_DAYS.map((day) => {
                          const selected = recurringForm.daysOfWeek.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleRecurringDay(day.id)}
                              className={`h-9 rounded-lg border text-xs font-semibold transition ${
                                selected
                                  ? "border-red-500/50 bg-red-500/15 text-white"
                                  : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={createRecurring}
                        disabled={isPending || !recurringForm.assigneeId}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Repeat className="h-4 w-4" />
                        Vytvorit opakovanie
                      </button>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
        <div className="min-h-0">
          <section className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#141414]">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-red-300" />
                <h2 className="text-lg font-semibold text-white capitalize">
                  {format(currentMonth, "MMMM yyyy")}
                </h2>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((value) => subMonths(value, 1))}
                  className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Predchadzajuci mesiac"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((value) => addMonths(value, 1))}
                  className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
                  aria-label="Dalsi mesiac"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02]">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="py-2 text-center text-xs font-semibold text-white/45">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((day) => {
                const dateKey = toDateKey(day);
                const dayShifts = shiftsByDate.get(dateKey) ?? [];
                const activeDayShifts = dayShifts.filter(
                  (shift) => shift.status === "pending" || shift.status === "approved",
                );
                const ownShift = activeDayShifts.some((shift) => shift.assignee_id === currentUserId);
                const pendingCount = activeDayShifts.filter((shift) => shift.status === "pending").length;
                const approvedCount = activeDayShifts.filter((shift) => shift.status === "approved").length;
                const coverage = getDayCoverage(dateKey);
                const selected = dayDetailOpen && selectedDateKey === dateKey;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => selectCalendarDay(dateKey)}
                    className={`h-28 border-b border-r border-white/5 p-2 text-left transition ${
                      isSameMonth(day, currentMonth) ? "bg-[#141414] text-white" : "bg-black/20 text-white/30"
                    } ${selected ? "outline outline-1 outline-red-500/70" : "hover:bg-white/[0.04]"}`}
                  >
                    <div className="flex items-start justify-between">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                          isToday(day) ? "bg-red-600 text-white" : selected ? "bg-white/10 text-white" : ""
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {canManage && coverage.hasGap ? (
                        <AlertTriangle className="h-4 w-4 text-red-300" />
                      ) : null}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {ownShift ? (
                        <span className="rounded border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                          Moje
                        </span>
                      ) : null}
                      {approvedCount > 0 ? (
                        <span className="rounded border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                          {approvedCount} schv.
                        </span>
                      ) : null}
                      {pendingCount > 0 ? (
                        <span className="rounded border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                          {pendingCount} caka
                        </span>
                      ) : null}
                      {canManage && coverage.hasGap ? (
                        <span className="rounded border border-red-400/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                          {coverage.hasPendingGap ? "pending gap" : "diera"}
                        </span>
                      ) : coverage.checkedSlots > 0 && !coverage.hasGap ? (
                        <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-white/55">
                          pokryte
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="hidden">
            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/35">
                    {dayDetailOpen ? "Vybrany den" : "Detail dna"}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">
                    {dayDetailOpen ? format(selectedDate, "d. MMMM yyyy") : "Vyber den v kalendari"}
                  </h2>
                </div>
                {dayDetailOpen ? (
                  canManage && selectedCoverage.hasGap ? (
                    <span className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
                      Diera
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                      OK
                    </span>
                  )
                ) : null}
              </div>

              {message ? (
                <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                  message.includes("Nepodarilo") ||
                  message.includes("Dovod") ||
                  message.includes("Skontroluj") ||
                  message.includes("Nie je")
                    ? "border-red-500/25 bg-red-500/10 text-red-200"
                    : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                }`}>
                  {message}
                </p>
              ) : null}
            </section>

            {dayDetailOpen ? (
              <>
                <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-red-300" />
                    <h3 className="text-sm font-semibold text-white">
                      {canManage ? "Pridat schvalenu smenu" : "Poziadat o smenu"}
                    </h3>
                  </div>

                  {canManage ? (
                    <div className="space-y-3">
                      <SelectField
                        label="Admin"
                        value={assignForm.assigneeId}
                        onChange={(assigneeId) => setAssignForm((current) => ({ ...current, assigneeId }))}
                      >
                        {staff.map((staffMember) => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {formatStaffName(staffMember)} ({staffMember.role})
                          </option>
                        ))}
                      </SelectField>
                      <TimeFields
                        startTime={assignForm.startTime}
                        endTime={assignForm.endTime}
                        options={timeOptions}
                        onStartChange={(startTime) => setAssignForm((current) => ({ ...current, startTime }))}
                        onEndChange={(endTime) => setAssignForm((current) => ({ ...current, endTime }))}
                      />
                      <button
                        type="button"
                        onClick={assignShift}
                        disabled={isPending || !assignForm.assigneeId}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Pridat smenu
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <TimeFields
                        startTime={selfForm.startTime}
                        endTime={selfForm.endTime}
                        options={timeOptions}
                        onStartChange={(startTime) => setSelfForm((current) => ({ ...current, startTime }))}
                        onEndChange={(endTime) => setSelfForm((current) => ({ ...current, endTime }))}
                      />
                      <button
                        type="button"
                        onClick={requestShift}
                        disabled={isPending}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Odoslat ziadost
                      </button>
                    </div>
                  )}
                </section>

                <DayTimelinePanel
                  activeShifts={selectedDayActiveShifts}
                  selectedRules={selectedRules}
                  staffById={staffById}
                  canManage={canManage}
                />

                <DayShiftCards
                  shifts={selectedDayShifts}
                  staffById={staffById}
                  canManage={canManage}
                  isPending={isPending}
                  onApprove={approveSelectedShift}
                  onReject={rejectSelectedShift}
                  onCancel={cancelSelectedShift}
                  onCancelSeries={cancelSeries}
                />

                {canManage ? (
                  <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-4 flex items-center gap-2">
                      <Repeat className="h-4 w-4 text-red-300" />
                      <h3 className="text-sm font-semibold text-white">Opakovanie</h3>
                    </div>
                    <div className="space-y-3">
                      <SelectField
                        label="Admin"
                        value={recurringForm.assigneeId}
                        onChange={(assigneeId) => setRecurringForm((current) => ({ ...current, assigneeId }))}
                      >
                        {staff.map((staffMember) => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {formatStaffName(staffMember)} ({staffMember.role})
                          </option>
                        ))}
                      </SelectField>
                      <div className="grid grid-cols-2 gap-3">
                        <TextField
                          label="Od datumu"
                          type="date"
                          value={recurringForm.startDate}
                          onChange={(startDate) => setRecurringForm((current) => ({ ...current, startDate }))}
                        />
                        <TextField
                          label="Do datumu"
                          type="date"
                          value={recurringForm.endDate}
                          onChange={(endDate) => setRecurringForm((current) => ({ ...current, endDate }))}
                        />
                      </div>
                      <TimeFields
                        startTime={recurringForm.startTime}
                        endTime={recurringForm.endTime}
                        options={timeOptions}
                        onStartChange={(startTime) => setRecurringForm((current) => ({ ...current, startTime }))}
                        onEndChange={(endTime) => setRecurringForm((current) => ({ ...current, endTime }))}
                      />
                      <div className="grid grid-cols-7 gap-1">
                        {REPEAT_DAYS.map((day) => {
                          const selected = recurringForm.daysOfWeek.includes(day.id);
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => toggleRecurringDay(day.id)}
                              className={`h-9 rounded-lg border text-xs font-semibold transition ${
                                selected
                                  ? "border-red-500/50 bg-red-500/15 text-white"
                                  : "border-white/10 bg-white/[0.03] text-white/50 hover:text-white"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={createRecurring}
                        disabled={isPending || !recurringForm.assigneeId}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Repeat className="h-4 w-4" />
                        Vytvorit opakovanie
                      </button>
                    </div>
                  </section>
                ) : null}
              </>
            ) : (
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
                Klikni na den v kalendari a tu sa zobrazia casy, smeny a akcie pre vybrany den.
              </section>
            )}
          </aside>
        </div>
        )
      ) : (
        <ShiftVisualization
          selectedDateKey={selectedDateKey}
          selectedDayShifts={selectedDayShifts}
          staff={staff}
          staffById={staffById}
          onPreviousDay={() => moveSelectedDate(-1)}
          onNextDay={() => moveSelectedDate(1)}
          onDateChange={(dateKey) => {
            setSelectedDateKey(dateKey);
            setDayDetailOpen(true);
          }}
        />
      )}
      <ReasonModal
        action={reasonAction}
        reason={reasonText}
        disabled={isPending}
        onReasonChange={setReasonText}
        onCancel={closeReasonAction}
        onConfirm={submitReasonAction}
      />
    </div>
  );
}

function ReasonModal({
  action,
  reason,
  disabled,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  action: ReasonAction | null;
  reason: string;
  disabled: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-md rounded-xl border border-white/10 bg-neutral-950 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{action.title}</h2>
            <p className="mt-1 text-sm text-white/50">Dovod je povinny a ulozi sa ku smene.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="rounded-lg border border-white/10 p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Zavriet"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-xs font-medium text-white/55">{action.label}</span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={4}
            autoFocus
            className="w-full resize-none rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-red-500"
            placeholder="Napriklad zmena planu alebo choroba"
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="inline-flex items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Zavriet
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled || !reason.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/35 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/25 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {action.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function DayTimelinePanel({
  activeShifts,
  selectedRules,
  staffById,
  canManage,
}: {
  activeShifts: StaffShift[];
  selectedRules: StaffShiftCoverageRule[];
  staffById: Map<string, StaffOption>;
  canManage: boolean;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-red-300" />
          <h3 className="text-sm font-semibold text-white">Casy dna</h3>
        </div>
        <span className="text-xs text-white/40">06:00 - 22:00</span>
      </div>

      <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
        {Array.from({ length: 32 }, (_, index) => OPEN_MINUTES + index * 30).map((slotStart) => {
          const slotEnd = slotStart + 30;
          const slotShifts = activeShifts.filter((shift) => overlapsSlot(shift, slotStart, slotEnd));
          const rule = selectedRules.find(
            (item) => minutesFromTime(item.start_time) <= slotStart && minutesFromTime(item.end_time) >= slotEnd,
          );
          const approvedCount = slotShifts.filter((shift) => shift.status === "approved").length;
          const pendingCount = slotShifts.filter((shift) => shift.status === "pending").length;
          const hasGap = Boolean(rule && approvedCount < rule.required_count);
          const hasPendingGap = hasGap && pendingCount > 0;

          return (
            <div
              key={slotStart}
              className={`rounded-lg border p-3 ${
                canManage && hasGap
                  ? hasPendingGap
                    ? "border-amber-500/25 bg-amber-500/10"
                    : "border-red-500/25 bg-red-500/10"
                  : "border-white/10 bg-black/20"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold tabular-nums text-white">
                  {timeLabel(slotStart)} - {timeLabel(slotEnd)}
                </p>
                {canManage && hasGap ? (
                  <span className={`text-xs font-semibold ${hasPendingGap ? "text-amber-200" : "text-red-200"}`}>
                    {hasPendingGap ? "pending" : "diera"}
                  </span>
                ) : (
                  <span className="text-xs text-white/35">{slotShifts.length > 0 ? "obsadene" : "volne"}</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {slotShifts.map((shift) => (
                  <span
                    key={shift.id}
                    className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${statusTone(shift.status)}`}
                  >
                    {formatStaffName(staffById.get(shift.assignee_id))}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DayShiftCards({
  shifts,
  staffById,
  canManage,
  isPending,
  onApprove,
  onReject,
  onCancel,
  onCancelSeries,
}: {
  shifts: StaffShift[];
  staffById: Map<string, StaffOption>;
  canManage: boolean;
  isPending: boolean;
  onApprove: (shiftId: string) => void;
  onReject: (shiftId: string) => void;
  onCancel: (shiftId: string) => void;
  onCancelSeries: (seriesId: string) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-red-300" />
        <h3 className="text-sm font-semibold text-white">Smeny dna</h3>
      </div>

      {shifts.length === 0 ? (
        <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/45">
          V tento den zatial nie je ziadna smena.
        </p>
      ) : (
        <div className="space-y-2">
          {shifts.map((shift) => (
            <div key={shift.id} className={`rounded-lg border p-3 ${statusTone(shift.status)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {formatStaffName(staffById.get(shift.assignee_id))}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {normalizeTime(shift.start_time)} - {normalizeTime(shift.end_time)} - {statusLabel(shift.status)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-black/20 px-2 py-1 text-[11px] font-semibold">
                  {staffById.get(shift.assignee_id)?.role ?? "admin"}
                </span>
              </div>

              {canManage && (shift.status === "pending" || shift.status === "approved") ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {shift.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onApprove(shift.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Schvalit
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(shift.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Zamietnut
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onCancel(shift.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-100 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Zrusit
                  </button>
                  {shift.series_id ? (
                    <button
                      type="button"
                      onClick={() => onCancelSeries(shift.series_id!)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-50"
                    >
                      <Repeat className="h-3.5 w-3.5" />
                      Zrusit seriu
                    </button>
                  ) : null}
                </div>
              ) : null}

              {shift.cancellation_reason || shift.rejection_reason ? (
                <p className="mt-2 text-xs opacity-75">
                  Dovod: {shift.cancellation_reason || shift.rejection_reason}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ShiftVisualization({
  selectedDateKey,
  selectedDayShifts,
  staff,
  staffById,
  onPreviousDay,
  onNextDay,
  onDateChange,
}: {
  selectedDateKey: string;
  selectedDayShifts: StaffShift[];
  staff: StaffOption[];
  staffById: Map<string, StaffOption>;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onDateChange: (dateKey: string) => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  const activeShifts = selectedDayShifts.filter(
    (shift) => shift.status === "pending" || shift.status === "approved",
  );
  const hourMarks = Array.from({ length: 9 }, (_, index) => OPEN_MINUTES + index * 120);
  const totalMinutes = CLOSE_MINUTES - OPEN_MINUTES;
  const currentMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const currentTimeLabel = currentMinutes === null ? "" : timeLabel(currentMinutes);
  const currentTimeLeft =
    now !== null &&
    currentMinutes !== null &&
    selectedDateKey === toDateKey(now) &&
    currentMinutes >= OPEN_MINUTES &&
    currentMinutes <= CLOSE_MINUTES
      ? ((currentMinutes - OPEN_MINUTES) / totalMinutes) * 100
      : null;
  const currentTimeLabelLeft = currentTimeLeft === null ? null : Math.min(98, Math.max(2, currentTimeLeft));

  useEffect(() => {
    setNow(new Date());

    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white/35">Vizualizovanie smien</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {format(dateFromKey(selectedDateKey), "d. MMMM yyyy")}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPreviousDay}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Predchadzajuci den"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="date"
            value={selectedDateKey}
            onChange={(event) => onDateChange(event.target.value)}
            className="h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none transition focus:border-red-500"
          />
          <button
            type="button"
            onClick={onNextDay}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Dalsi den"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          <div className="relative">
            {currentTimeLeft !== null && currentTimeLabelLeft !== null ? (
              <div className="pointer-events-none absolute bottom-0 left-48 right-0 top-0 z-20" aria-hidden="true">
                <span
                  className="absolute bottom-0 top-0 w-px bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.75)]"
                  style={{ left: `${currentTimeLeft}%` }}
                />
                <span
                  className="absolute -translate-x-1/2 rounded-full border border-red-300/70 bg-red-600 px-2.5 py-1 text-xs font-bold tabular-nums text-white shadow-[0_8px_22px_rgba(239,68,68,0.55)]"
                  style={{ left: `${currentTimeLabelLeft}%` }}
                >
                  {currentTimeLabel}
                </span>
              </div>
            ) : null}

            <div className="grid grid-cols-[12rem_minmax(0,1fr)] border-b border-white/10 pb-2">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-white/35">Admin</div>
              <div className="relative h-8">
                {hourMarks.map((minutes) => {
                  const left = ((minutes - OPEN_MINUTES) / totalMinutes) * 100;
                  return (
                    <span
                      key={minutes}
                      className="absolute top-0 -translate-x-1/2 text-xs font-semibold tabular-nums text-white/40"
                      style={{ left: `${left}%` }}
                    >
                      {timeLabel(minutes)}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="divide-y divide-white/10">
              {staff.map((staffMember) => {
                const staffShifts = activeShifts.filter((shift) => shift.assignee_id === staffMember.id);

                return (
                  <div key={staffMember.id} className="grid grid-cols-[12rem_minmax(0,1fr)] py-3">
                    <div className="min-w-0 pr-4">
                      <p className="truncate text-sm font-semibold text-white">{formatStaffName(staffMember)}</p>
                      <p className="mt-1 text-xs text-white/40">{staffMember.role}</p>
                    </div>
                    <div className="relative h-16 rounded-lg border border-white/10 bg-black/25">
                      {hourMarks.map((minutes) => {
                        const left = ((minutes - OPEN_MINUTES) / totalMinutes) * 100;
                        return (
                          <span
                            key={minutes}
                            className="absolute inset-y-0 w-px bg-white/[0.06]"
                            style={{ left: `${left}%` }}
                          />
                        );
                      })}
                      {staffShifts.map((shift) => {
                        const start = minutesFromTime(shift.start_time);
                        const end = minutesFromTime(shift.end_time);
                        const left = ((start - OPEN_MINUTES) / totalMinutes) * 100;
                        const width = ((end - start) / totalMinutes) * 100;

                        return (
                          <div
                            key={shift.id}
                            className={`absolute top-2 h-12 overflow-hidden rounded-lg border px-3 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.28)] ${statusTone(shift.status)}`}
                            style={{
                              left: `${Math.max(0, left)}%`,
                              width: `${Math.max(4, Math.min(100 - Math.max(0, left), width))}%`,
                            }}
                            title={`${formatStaffName(staffById.get(shift.assignee_id))} ${normalizeTime(shift.start_time)} - ${normalizeTime(shift.end_time)}`}
                          >
                            <p className="truncate text-xs font-semibold">
                              {normalizeTime(shift.start_time)} - {normalizeTime(shift.end_time)}
                            </p>
                            <p className="truncate text-[11px] opacity-80">{statusLabel(shift.status)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {activeShifts.length === 0 ? (
            <p className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/45">
              V tento den zatial nie je ziadna aktivna smena.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function TimeFields({
  startTime,
  endTime,
  options,
  onStartChange,
  onEndChange,
}: {
  startTime: string;
  endTime: string;
  options: string[];
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectField label="Od" value={startTime} onChange={onStartChange}>
        {options.slice(0, -1).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </SelectField>
      <SelectField label="Do" value={endTime} onChange={onEndChange}>
        {options.slice(1).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </SelectField>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-white/55">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none transition focus:border-red-500"
      >
        {children}
      </select>
    </label>
  );
}

function TextField({
  label,
  type,
  value,
  onChange,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-medium text-white/55">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none transition focus:border-red-500"
      />
    </label>
  );
}
