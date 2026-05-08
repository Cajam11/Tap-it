"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface WorkoutTrendsChartProps {
  entries: Array<{
    check_in: string;
    duration_min: number | null;
  }>;
  className?: string;
}

interface WeekData {
  key: string;
  label: string;
  count: number;
  minutes: number;
}

function toUtcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfIsoWeekUtc(date: Date): Date {
  const normalized = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = normalized.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  normalized.setUTCDate(normalized.getUTCDate() + diffToMonday);
  return normalized;
}

function shiftWeeks(date: Date, weekDelta: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + weekDelta * 7);
  return next;
}

export default function WorkoutTrendsChart({
  entries,
  className,
}: WorkoutTrendsChartProps) {
  const weeklyData = useMemo(() => {
    const aggregate = new Map<string, { count: number; minutes: number }>();

    entries.forEach((entry) => {
      const parsed = new Date(entry.check_in);
      if (Number.isNaN(parsed.getTime())) return;

      const weekStart = startOfIsoWeekUtc(parsed);
      const weekKey = toUtcDayKey(weekStart);
      const current = aggregate.get(weekKey) ?? { count: 0, minutes: 0 };
      current.count += 1;
      current.minutes += entry.duration_min ?? 0;
      aggregate.set(weekKey, current);
    });

    const currentWeekStart = startOfIsoWeekUtc(new Date());
    const points: WeekData[] = [];

    for (let i = 11; i >= 0; i -= 1) {
      const weekStart = shiftWeeks(currentWeekStart, -i);
      const weekKey = toUtcDayKey(weekStart);
      const weekData = aggregate.get(weekKey);

      points.push({
        key: weekKey,
        label: weekStart.toLocaleDateString("sk-SK", {
          day: "2-digit",
          month: "2-digit",
          timeZone: "UTC",
        }),
        count: weekData?.count ?? 0,
        minutes: weekData?.minutes ?? 0,
      });
    }

    return points;
  }, [entries]);

  const hasAnyData = weeklyData.some((week) => week.count > 0);

  const maxCount = Math.max(...weeklyData.map((week) => week.count), 1);
  const maxMinutes = Math.max(...weeklyData.map((week) => week.minutes), 60);

  const chartWidth = 300;
  const chartHeight = 160;
  const padding = 30;
  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  if (!hasAnyData) {
    return (
      <div
        className={cn(
          "flex flex-col h-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm",
          className,
        )}
      >
        <p className="mb-4 shrink-0 text-xs uppercase tracking-wide text-white/45">
          Trendy treningov
        </p>
        <div className="flex flex-1 min-h-0 items-center justify-center text-sm text-white/40">
          Ziadne udaje o treningoch za poslednych 12 tyzdnov.
        </div>
      </div>
    );
  }

  const denominator = Math.max(weeklyData.length - 1, 1);

  const countPoints = weeklyData.map((data, i) => {
    const x = (i / denominator) * graphWidth + padding;
    const y = chartHeight - (data.count / maxCount) * graphHeight - padding;
    return `${x},${y}`;
  });

  const minutePoints = weeklyData.map((data, i) => {
    const x = (i / denominator) * graphWidth + padding;
    const y = chartHeight - (data.minutes / maxMinutes) * graphHeight - padding;
    return `${x},${y}`;
  });

  return (
    <div
      className={cn(
        "flex flex-col h-full rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm",
        className,
      )}
    >
      <p className="mb-4 shrink-0 text-xs uppercase tracking-wide text-white/45">
        Trendy treningov
      </p>
      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col">
          <p className="mb-3 text-sm font-semibold text-white/75 shrink-0">
            Pocet navstev (12 tyzdnov)
          </p>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full flex-1 min-h-[100px] max-h-[140px]"
          >
            {[0, 1, 2, 3].map((i) => (
              <line
                key={`count-grid-${i}`}
                x1={padding}
                y1={padding + (graphHeight / 3) * i}
                x2={chartWidth - padding}
                y2={padding + (graphHeight / 3) * i}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2,2"
              />
            ))}

            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={chartHeight - padding}
              x2={chartWidth - padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />

            <polyline
              points={countPoints.join(" ")}
              fill="none"
              stroke="rgb(239, 68, 68)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {countPoints.map((point, i) => {
              const [x, y] = point.split(",").map(Number);
              return (
                <circle
                  key={`count-point-${weeklyData[i].key}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="rgb(239, 68, 68)"
                  opacity="0.9"
                />
              );
            })}
          </svg>
        </div>

        <div className="flex flex-col">
          <p className="mb-3 text-sm font-semibold text-white/75 shrink-0">
            Minuty za tyzden (12 tyzdnov)
          </p>
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="none"
            className="w-full flex-1 min-h-[100px] max-h-[140px]"
          >
            {[0, 1, 2, 3].map((i) => (
              <line
                key={`minute-grid-${i}`}
                x1={padding}
                y1={padding + (graphHeight / 3) * i}
                x2={chartWidth - padding}
                y2={padding + (graphHeight / 3) * i}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2,2"
              />
            ))}

            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
            <line
              x1={padding}
              y1={chartHeight - padding}
              x2={chartWidth - padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />

            <polyline
              points={minutePoints.join(" ")}
              fill="none"
              stroke="rgb(251, 146, 60)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {minutePoints.map((point, i) => {
              const [x, y] = point.split(",").map(Number);
              return (
                <circle
                  key={`minute-point-${weeklyData[i].key}`}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="rgb(251, 146, 60)"
                  opacity="0.9"
                />
              );
            })}
          </svg>
        </div>
      </div>
      <div className="mt-3 flex shrink-0 items-center justify-between text-[10px] text-white/40">
        <span>{weeklyData[0]?.label}</span>
        <span>{weeklyData[weeklyData.length - 1]?.label}</span>
      </div>
    </div>
  );
}
