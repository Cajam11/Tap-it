"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Entry {
  check_in: string;
  duration_min: number | null;
  check_out?: string | null;
}

interface ActivityCalendarProps {
  entries: Entry[];
  userName?: string;
}

interface DayData {
  dateKey: string;
  minutes: number;
  count: number;
  entries: Entry[];
}

function toUtcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseCheckInDayKey(value: string): string | null {
  const fromIsoPrefix = value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (fromIsoPrefix) return fromIsoPrefix;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toUtcDayKey(parsed);
}

function formatTime(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("sk-SK", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  } catch {
    return "-";
  }
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function ActivityCalendar({
  entries,
  userName = "User",
}: ActivityCalendarProps) {
  const [currentMonthStart, setCurrentMonthStart] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });

  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();

    entries.forEach((entry) => {
      const dayKey = parseCheckInDayKey(entry.check_in);
      if (!dayKey) return;

      const current = map.get(dayKey);
      if (!current) {
        map.set(dayKey, {
          dateKey: dayKey,
          minutes: entry.duration_min ?? 0,
          count: 1,
          entries: [entry],
        });
        return;
      }

      current.minutes += entry.duration_min ?? 0;
      current.count += 1;
      current.entries.push(entry);
    });

    // Sort entries within each day by check_in time
    map.forEach((day) => {
      day.entries.sort(
        (a, b) =>
          new Date(a.check_in).getTime() - new Date(b.check_in).getTime(),
      );
    });

    return map;
  }, [entries]);

  const maxMinutes = useMemo(() => {
    let max = 0;
    dayMap.forEach((day) => {
      if (day.minutes > max) max = day.minutes;
    });
    return Math.max(max, 60);
  }, [dayMap]);

  const getColor = (minutes: number): string => {
    if (minutes === 0) return "bg-white/5 hover:bg-white/10";
    const intensity = Math.min(minutes / maxMinutes, 1);
    if (intensity < 0.25) return "bg-red-900/30 hover:bg-red-900/40";
    if (intensity < 0.5) return "bg-red-800/40 hover:bg-red-800/50";
    if (intensity < 0.75) return "bg-red-700/50 hover:bg-red-700/60";
    return "bg-red-600/60 hover:bg-red-600/70";
  };

  const year = currentMonthStart.getUTCFullYear();
  const monthIndex = currentMonthStart.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0));
  const daysInMonth = lastDay.getUTCDate();

  const jsDay = firstDay.getUTCDay();
  const startingDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const calendarDays: (DayData | null)[] = [];

  for (let i = 0; i < startingDayOfWeek; i += 1) {
    calendarDays.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(year, monthIndex, day));
    const key = toUtcDayKey(date);
    const dayData = dayMap.get(key) ?? {
      dateKey: key,
      minutes: 0,
      count: 0,
      entries: [],
    };
    calendarDays.push(dayData);
  }

  const weeks: (DayData | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const monthName = currentMonthStart.toLocaleDateString("sk-SK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const currentMonthMinutes = Array.from(dayMap.values())
    .filter((day) => day.dateKey.startsWith(monthKey))
    .reduce((sum, day) => sum + day.minutes, 0);

  const handlePrevMonth = () => {
    setCurrentMonthStart(
      (prev) =>
        new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() - 1, 1)),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonthStart(
      (prev) =>
        new Date(Date.UTC(prev.getUTCFullYear(), prev.getUTCMonth() + 1, 1)),
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/45">
            Treningovy kalendar
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-white">
            {monthName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="mr-2 text-right">
            <p className="text-xs text-white/50">Spolu</p>
            <p className="text-lg font-bold text-red-500">
              {currentMonthMinutes}m
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="rounded-lg border border-white/10 p-1.5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            aria-label="Predchadzajuci mesiac"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="rounded-lg border border-white/10 p-1.5 text-white/70 transition-colors hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            aria-label="Dalsi mesiac"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white/[0.01] p-3">
        <div className="grid grid-cols-7 gap-1">
          {["Po", "Ut", "St", "Ct", "Pi", "So", "Ne"].map(
            (label, labelIndex) => (
              <div
                key={`${label}-${labelIndex}`}
                className="py-1 text-center text-[10px] font-semibold text-white/40"
              >
                {label}
              </div>
            ),
          )}

          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => (
              <button
                key={`${weekIndex}-${dayIndex}`}
                onClick={() => {
                  if (day && day.count > 0) {
                    setSelectedDay(day);
                  }
                }}
                className={`flex aspect-square flex-col items-center justify-center rounded-md border text-[11px] transition-all ${
                  day === null
                    ? "border-transparent bg-transparent cursor-default"
                    : `border-white/10 ${getColor(day.minutes)} ${day.count > 0 ? "cursor-pointer hover:scale-105" : "cursor-help"}`
                }`}
                title={
                  day
                    ? `${day.dateKey}: ${day.minutes} min, ${day.count} vstupov${day.count > 0 ? " (kliknite pre detaily)" : ""}`
                    : undefined
                }
                type="button"
              >
                {day && (
                  <>
                    <span className="leading-none text-white/80">
                      {Number(day.dateKey.slice(8, 10))}
                    </span>
                    {day.minutes > 0 && (
                      <span className="mt-0.5 text-[9px] text-white/60">
                        {day.minutes}m
                      </span>
                    )}
                  </>
                )}
              </button>
            )),
          )}
        </div>
      </div>

      {/* Modal Portal */}
      {selectedDay &&
        selectedDay.count > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedDay(null)}
            />

            {/* Modal Content */}
            <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform px-4 rounded-2xl border border-white/10 bg-black/95 p-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{userName}</h2>
                    <p className="mt-1 text-sm text-white/60">
                      {selectedDay.dateKey}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDay(null)}
                    className="rounded-lg text-white/60 transition-colors hover:text-white"
                    aria-label="Zavriet"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Entries List */}
                <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
                  {selectedDay.entries.map((entry, index) => (
                    <div
                      key={`${entry.check_in}-${index}`}
                      className="rounded-lg border border-white/10 bg-white/[0.05] p-3"
                    >
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-white/50">Príchod</p>
                          <p className="mt-1 font-semibold text-white">
                            {formatTime(entry.check_in)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50">Odchod</p>
                          <p className="mt-1 font-semibold text-white">
                            {formatTime(entry.check_out)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-white/50">Trvanie</p>
                          <p className="mt-1 font-semibold text-white">
                            {formatDuration(entry.duration_min)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
