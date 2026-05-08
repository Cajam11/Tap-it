"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ActivityCalendarProps {
  entries: Array<{
    check_in: string;
    duration_min: number | null;
  }>;
}

interface DayData {
  date: Date;
  minutes: number;
  count: number;
}

export default function ActivityCalendar({ entries }: ActivityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  function ymd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();

    entries.forEach((entry) => {
      const date = new Date(entry.check_in);
      const key = ymd(date);

      if (!map.has(key)) {
        map.set(key, {
          date,
          minutes: 0,
          count: 0,
        });
      }

      const day = map.get(key)!;
      day.minutes += entry.duration_min ?? 0;
      day.count += 1;
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

  // Generate calendar days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );
  const daysInMonth = lastDay.getDate();
  // Convert getDay() (0=Sunday) to our week format (0=Monday)
  // JavaScript: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
  // Our format: Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6
  const jsDay = firstDay.getDay();
  const startingDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

  const calendarDays: (DayData | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const key = ymd(date);
    const dayData = dayMap.get(key) || {
      date,
      minutes: 0,
      count: 0,
    };
    calendarDays.push(dayData);
  }

  const weeks: (DayData | null)[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  const monthName = currentDate.toLocaleDateString("sk-SK", {
    month: "long",
    year: "numeric",
  });

  const currentMonthMinutes = Array.from(dayMap.values())
    .filter(
      (day) =>
        day.date.getMonth() === currentDate.getMonth() &&
        day.date.getFullYear() === currentDate.getFullYear()
    )
    .reduce((sum, day) => sum + day.minutes, 0);

  const handlePrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/45">Tréningový Kalendár</p>
          <p className="text-sm font-semibold text-white mt-1 capitalize">{monthName}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <p className="text-xs text-white/50">Spolu</p>
            <p className="text-lg font-bold text-red-500">{currentMonthMinutes}m</p>
          </div>
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-colors text-white/70 hover:text-white"
            aria-label="Predchádzajúci mesiac"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/[0.05] transition-colors text-white/70 hover:text-white"
            aria-label="Ďalší mesiac"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-white/[0.01] rounded-lg p-3">
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-semibold text-white/40 py-1"
            >
              {label}
            </div>
          ))}

          {/* Calendar days */}
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`aspect-square rounded-md border transition-all cursor-help flex flex-col items-center justify-center text-[11px] ${
                  day === null
                    ? "bg-transparent border-transparent"
                    : `border-white/10 ${getColor(day.minutes)} group`
                }`}
                title={
                  day
                    ? `${day.date.toLocaleDateString("sk-SK")}: ${day.minutes}min`
                    : undefined
                }
              >
                {day && (
                  <>
                    <span className="font-semibold text-white/80 leading-none">
                      {day.date.getDate()}
                    </span>
                    {day.minutes > 0 && (
                      <span className="text-[9px] text-white/60 mt-0.5">
                        {day.minutes}m
                      </span>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
