"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityCalendarProps {
  entries: Array<{
    check_in: string;
    duration_min: number | null;
  }>;
  className?: string;
}

interface DayData {
  dateKey: string;
  minutes: number;
  count: number;
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

export default function ActivityCalendar({
  entries,
  className,
}: ActivityCalendarProps) {
  const [currentMonthStart, setCurrentMonthStart] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  });

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
        });
        return;
      }

      current.minutes += entry.duration_min ?? 0;
      current.count += 1;
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
    };
    calendarDays.push(dayData);
  }

  const weeks: (DayData | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // Ensure calendar always has 6 rows to prevent height jumping between months
  while (weeks.length < 6) {
    weeks.push(Array(7).fill(null));
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
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] px-5 pt-5 pb-3 backdrop-blur-sm h-full",
        className,
      )}
    >
      <div className="mb-4 flex shrink-0 items-center justify-between">
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

      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-white/[0.01] px-2 pt-2 pb-0 sm:px-3 sm:pt-3 sm:pb-0">
        <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-1">
          {["Po", "Ut", "St", "Ct", "Pi", "So", "Ne"].map(
            (label, labelIndex) => (
              <div
                key={`${label}-${labelIndex}`}
                className="pb-1 text-center text-[9px] sm:text-[10px] font-semibold text-white/40"
              >
                {label}
              </div>
            ),
          )}

          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`flex w-full cursor-help flex-col items-center justify-center rounded-md border transition-all h-[22px] sm:h-[26px] lg:h-[24px] overflow-hidden ${
                  day === null
                    ? "border-transparent bg-transparent"
                    : `border-white/10 ${getColor(day.minutes)}`
                }`}
                title={
                  day
                    ? `${day.dateKey}: ${day.minutes} min, ${day.count} vstupov`
                    : undefined
                }
              >
                {day && (
                  <>
                    <span className="leading-none text-white/80 text-[10px] sm:text-[11px]">
                      {Number(day.dateKey.slice(8, 10))}
                    </span>
                    {day.minutes > 0 && (
                      <span className="mt-[1px] text-[7px] sm:text-[8px] leading-none text-white/60">
                        {day.minutes}m
                      </span>
                    )}
                  </>
                )}
              </div>
            )),
          )}
        </div>
      </div>
    </div>
  );
}
