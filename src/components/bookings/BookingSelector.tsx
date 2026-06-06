"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { BookableService, ServiceSchedule } from "@/lib/types";
import { getServiceCheckoutHref } from "@/lib/bookings/routes";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMonthOffset(date: Date) {
  const today = new Date();
  return (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth();
}

export default function BookingSelector({
  service,
  schedules,
  currentUserId,
}: {
  service: BookableService;
  schedules: ServiceSchedule[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const initialMonthKey = toMonthKey(new Date().getFullYear(), new Date().getMonth());
  const [schedulesByMonth, setSchedulesByMonth] = useState<Record<string, ServiceSchedule[]>>({
    [initialMonthKey]: schedules,
  });
  const [loadingMonthKey, setLoadingMonthKey] = useState<string | null>(null);
  const [monthError, setMonthError] = useState<string | null>(null);

  const isScheduled = service.type === "group" || service.type === "trainer";
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentMonthKey = toMonthKey(currentYear, currentMonth);
  const currentMonthOffset = getMonthOffset(currentDate);
  const canGoPrevMonth = currentMonthOffset > 0;
  const canGoNextMonth = currentMonthOffset < 12;
  const allSchedules = useMemo(
    () => Object.values(schedulesByMonth).flat(),
    [schedulesByMonth],
  );

  useEffect(() => {
    if (!isScheduled || schedulesByMonth[currentMonthKey]) {
      return;
    }

    let cancelled = false;
    setLoadingMonthKey(currentMonthKey);
    setMonthError(null);

    const params = new URLSearchParams({
      year: currentYear.toString(),
      month: (currentMonth + 1).toString(),
    });

    fetch(`/api/bookings/services/${service.id}/schedules?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Nepodarilo sa nacitat terminy.");
        }

        return response.json() as Promise<{ schedules: ServiceSchedule[] }>;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        setSchedulesByMonth((current) => ({
          ...current,
          [currentMonthKey]: payload.schedules,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setMonthError("Terminy pre tento mesiac sa nepodarilo nacitat.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMonthKey(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentMonth, currentMonthKey, currentYear, isScheduled, schedulesByMonth, service.id]);

  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ServiceSchedule[]>();

    for (const schedule of allSchedules) {
      const start = new Date(schedule.start_time);
      const key = toDateKey(start);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(schedule);
    }

    for (const slotList of map.values()) {
      slotList.sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime());
    }

    return map;
  }, [allSchedules]);

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    const now = new Date();
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);

    const cursor = new Date(start);
    while (cursor <= end) {
      const key = toDateKey(cursor);
      const daySlots = schedulesByDate.get(key) ?? [];
      const hasFutureSlot = daySlots.some((schedule) => {
        const startTime = new Date(schedule.start_time);
        return startTime > now;
      });

      if (hasFutureSlot) {
        dates.add(key);
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }, [currentMonth, currentYear, schedulesByDate]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
  const availableSlots = selectedDateStr ? schedulesByDate.get(selectedDateStr) ?? [] : [];
  const selectedSchedule = allSchedules.find((schedule) => schedule.id === selectedScheduleId) ?? null;
  const isCurrentMonthLoading = loadingMonthKey === currentMonthKey;

  const handleContinue = () => {
    if (isScheduled && !selectedScheduleId) return;

    setLoading(true);
    const params = new URLSearchParams();

    if (selectedScheduleId) {
      params.set("scheduleId", selectedScheduleId);
    }

    if (!isScheduled) {
      params.set("duration", duration.toString());
    }

    router.push(`${getServiceCheckoutHref(service.type, service.id)}?${params.toString()}`);
  };

  const nextMonth = () => {
    if (!canGoNextMonth) return;

    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDateStr(null);
    setSelectedScheduleId(null);
    setMonthError(null);
  };

  const prevMonth = () => {
    if (!canGoPrevMonth) return;

    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDateStr(null);
    setSelectedScheduleId(null);
    setMonthError(null);
  };

  const handleDateSelect = (dateKey: string) => {
    setSelectedDateStr(dateKey);
    setSelectedScheduleId(null);
  };

  const coverImage = (service.metadata as { image_url?: string } | null)?.image_url;

  if (isScheduled) {
    return (
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16 items-stretch">
        <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] text-white">
          <div className="relative min-h-[24rem] flex-grow overflow-hidden">
            {coverImage ? (
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${coverImage})` }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-red-950/60 via-[#0d0d0d] to-black" />
            )}
            <div className="absolute inset-0 bg-black/60 [background-image:radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.12),_transparent_40%)]" />
            <div className="absolute inset-0 flex items-end">
              <div className="p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.32em] text-white/45">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Skupinová lekcia
                </div>
                <h2 className="mt-4 text-3xl font-bold text-white">{service.name}</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-white/65">
                  Vyber si dátum a čas v rovnakom vizuálnom štýle ako ostatné booking flow. Presne ten istý checkout sa použije aj ďalej.
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/5 bg-[#0d0d0d]/80 p-6 backdrop-blur-xl sm:p-8">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              Tvoja rezervacia
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Služba</span>
                <span className="font-medium text-white">{service.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Cas</span>
                <span className="font-medium text-white text-right">
                  {selectedSchedule ? (
                    <>
                      {new Date(selectedSchedule.start_time).toLocaleDateString("sk-SK")} <br className="sm:hidden" />
                      {new Date(selectedSchedule.start_time).toLocaleTimeString("sk-SK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} - {new Date(selectedSchedule.end_time).toLocaleTimeString("sk-SK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  ) : (
                    "Zatial nevybrany"
                  )}
                </span>
              </div>
              <div className="h-px w-full bg-white/10" />
              {selectedSchedule?.current_capacity !== null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Volne miesta</span>
                  <span className="font-medium text-white">
                    {selectedSchedule?.booking_status === "pending" &&
                    selectedSchedule.booking_user_id === currentUserId
                      ? "Tvoje drzane"
                      : selectedSchedule?.current_capacity && selectedSchedule.current_capacity > 0
                        ? selectedSchedule.current_capacity
                        : "Obsadene"}
                  </span>
                </div>
              )}
              {selectedSchedule?.profiles?.full_name && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Instruktor</span>
                  <span className="font-medium text-white text-right">
                    {selectedSchedule.profiles.full_name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md sm:p-8">
          {!selectedDateStr ? (
            <div className="flex h-full flex-col">
              <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-center text-2xl font-bold text-white sm:text-left">Vyberte si dátum</h2>
                <div className="grid w-full grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={prevMonth}
                    disabled={!canGoPrevMonth || isCurrentMonthLoading}
                    className="p-2 text-white/50 transition hover:text-white disabled:cursor-not-allowed disabled:text-white/15"
                  >
                    ←
                  </button>
                  <span className="min-w-0 text-center text-lg font-medium text-white">
                    {currentDate.toLocaleString("sk-SK", { month: "long" })} {currentYear}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    disabled={!canGoNextMonth || isCurrentMonthLoading}
                    className="p-2 text-white/50 transition hover:text-white disabled:cursor-not-allowed disabled:text-white/15"
                  >
                    →
                  </button>
                </div>
              </div>
              {(isCurrentMonthLoading || monthError) && (
                <div className="mb-4 text-center text-sm text-white/45">
                  {isCurrentMonthLoading ? "Nacitavam terminy..." : monthError}
                </div>
              )}

              <div className="mb-4 grid grid-cols-7 gap-1.5 text-center sm:gap-2">
                {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((day) => (
                  <div key={day} className="py-2 text-xs font-semibold uppercase text-white/40">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
                {blanks.map((_, index) => (
                  <div key={`blank-${index}`} className="h-11 sm:h-14" />
                ))}

                {days.map((day) => {
                  const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasSlots = availableDates.has(dateKey);

                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!hasSlots}
                      onClick={() => handleDateSelect(dateKey)}
                      className={`relative flex h-11 items-center justify-center rounded-xl text-base transition-all sm:h-14 sm:rounded-2xl sm:text-lg ${
                        hasSlots
                          ? "cursor-pointer border border-transparent bg-white/5 font-medium text-white hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300"
                          : "cursor-not-allowed text-white/20"
                      }`}
                    >
                      {day}
                      {hasSlots && (
                        <span className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="mb-8 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateStr(null);
                    setSelectedScheduleId(null);
                  }}
                  className="rounded-full bg-white/5 p-2 text-white/60 transition hover:text-white"
                >
                  ←
                </button>
                <div>
                  <h2 className="text-2xl font-bold text-white">Vyberte si čas</h2>
                  <p className="text-white/50">
                    {new Date(selectedDateStr).toLocaleDateString("sk-SK", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                </div>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-3 text-[15px] sm:grid-cols-3">
                {availableSlots.length > 0 ? (
                  availableSlots.map((schedule) => {
                    const start = new Date(schedule.start_time);
                    const end = new Date(schedule.end_time);
                    const isSelected = schedule.id === selectedScheduleId;
                    const isPending = schedule.booking_status === "pending";
                    const isCurrentUserPending =
                      isPending && schedule.booking_user_id === currentUserId;
                    const isFull = schedule.current_capacity !== null && schedule.current_capacity <= 0;
                    const disabled = isFull && !isCurrentUserPending;

                    return (
                      <button
                        key={schedule.id}
                        type="button"
                        onClick={() => setSelectedScheduleId(schedule.id)}
                        disabled={disabled}
                        className={`rounded-xl border p-4 text-center transition-all ${
                          isSelected
                            ? "border-red-500/50 bg-red-500/20 font-bold text-white"
                            : disabled
                              ? isPending
                                ? "cursor-not-allowed border-amber-300/25 bg-amber-400/10 text-amber-100/45 line-through"
                                : "cursor-not-allowed border-white/10 bg-white/5 text-white/25 line-through"
                              : isCurrentUserPending
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-200/90 hover:bg-amber-500/20 hover:text-amber-100"
                                : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span>
                          {start.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="mt-1 block text-[11px] no-underline text-white/45">
                          {end.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {(schedule.current_capacity !== null || isCurrentUserPending) && (
                          <span className="mt-1 block text-[11px] no-underline">
                            {isCurrentUserPending
                              ? "tvoje drzane"
                              : isPending && isFull
                                ? "drzane"
                                : isFull
                                ? "obsadene"
                                : `volne miesta: ${schedule.current_capacity}`}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-full py-8 text-center text-white/40">
                    V tento deň nie sú voľné časy.
                  </div>
                )}
              </div>

              <div className="mt-auto flex items-center justify-end border-t border-white/10 pt-4">
                <button
                  type="button"
                  disabled={!selectedScheduleId || loading}
                  onClick={handleContinue}
                  className="rounded-xl bg-red-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Spracovavam..." : "Pokracovat k platbe"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
      <h2 className="mb-6 text-2xl font-bold text-white">Zvoľte si termín</h2>

      <div className="space-y-4">
        <label className="block font-medium text-white/60">
          Trvanie ({service.price_unit === "minute" ? "minút" : "hodín"})
        </label>
        <input
          type="number"
          min="1"
          max="120"
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors focus:border-red-500/50 focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={loading}
        className="mt-8 flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Spracovávam..." : "Pokračovať k platbe"}
      </button>
    </div>
  );
}
