"use client";

import { useMemo } from "react";

interface WorkoutTrendsChartProps {
  entries: Array<{
    check_in: string;
    duration_min: number | null;
  }>;
}

interface WeekData {
  week: number;
  count: number;
  minutes: number;
  label: string;
}

export default function WorkoutTrendsChart({
  entries,
}: WorkoutTrendsChartProps) {
  const weeklyData = useMemo(() => {
    const weeks = new Map<string, WeekData>();
    const today = new Date();
    const currentYear = today.getFullYear();

    entries.forEach((entry) => {
      const date = new Date(entry.check_in);

      // Only count entries from current year
      if (date.getFullYear() !== currentYear) return;

      const weekNum = Math.ceil(
        (date.getDate() +
          new Date(date.getFullYear(), date.getMonth(), 1).getDay()) /
          7
      );
      const monthIndex = date.getMonth();

      // Create week-month based key
      const weekDate = new Date(date);
      weekDate.setDate(
        weekDate.getDate() - weekDate.getDay() - (7 * (13 - Math.ceil(date.getDate() / 7)))
      ); // Approximate

      const key = `${monthIndex}-w${weekNum}`;

      if (!weeks.has(key)) {
        weeks.set(key, {
          week: weekNum,
          count: 0,
          minutes: 0,
          label: `W${weekNum}`,
        });
      }

      const weekData = weeks.get(key)!;
      weekData.count += 1;
      weekData.minutes += entry.duration_min ?? 0;
    });

    // Get last 12 weeks
    const sorted = Array.from(weeks.values())
      .sort((a, b) => a.week - b.week)
      .slice(-12);

    return sorted;
  }, [entries]);

  const maxCount = Math.max(...weeklyData.map((w) => w.count), 1);
  const maxMinutes = Math.max(...weeklyData.map((w) => w.minutes), 60);

  const chartWidth = 280;
  const chartHeight = 150;
  const padding = 30;

  const graphWidth = chartWidth - padding * 2;
  const graphHeight = chartHeight - padding * 2;

  if (weeklyData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-white/40 text-sm">
        Žiadne údaje o tréningoch
      </div>
    );
  }

  const countPoints = weeklyData.map((data, i) => {
    const x = (i / (weeklyData.length - 1)) * graphWidth + padding;
    const y = chartHeight - (data.count / maxCount) * graphHeight - padding;
    return `${x},${y}`;
  });

  const minutePoints = weeklyData.map((data, i) => {
    const x = (i / (weeklyData.length - 1)) * graphWidth + padding;
    const y = chartHeight - (data.minutes / maxMinutes) * graphHeight - padding;
    return `${x},${y}`;
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
      <p className="text-xs uppercase tracking-wide text-white/45 mb-4">Trendy tréningov</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Visit count chart */}
        <div>
          <p className="text-sm font-semibold text-white/75 mb-3">Počet návštev (12 týždňov)</p>
          <svg
            width="100%"
            height="140"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full"
          >
            {/* Grid lines */}
            {[0, 1, 2, 3].map((i) => (
              <line
                key={`grid-h-${i}`}
                x1={padding}
                y1={padding + ((graphHeight / 3) * i)}
                x2={chartWidth - padding}
                y2={padding + ((graphHeight / 3) * i)}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2,2"
              />
            ))}

            {/* Y axis */}
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />

            {/* X axis */}
            <line
              x1={padding}
              y1={chartHeight - padding}
              x2={chartWidth - padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />

            {/* Line */}
            <polyline
              points={countPoints.join(" ")}
              fill="none"
              stroke="rgb(239, 68, 68)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {countPoints.map((point, i) => {
              const [x, y] = point.split(",").map(Number);
              return (
                <circle
                  key={i}
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

        {/* Minutes chart */}
        <div>
          <p className="text-sm font-semibold text-white/75 mb-3">Minúty za týždeň (12 týždňov)</p>
          <svg
            width="100%"
            height="140"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full"
          >
            {/* Grid lines */}
            {[0, 1, 2, 3].map((i) => (
              <line
                key={`grid-h-${i}`}
                x1={padding}
                y1={padding + ((graphHeight / 3) * i)}
                x2={chartWidth - padding}
                y2={padding + ((graphHeight / 3) * i)}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="2,2"
              />
            ))}

            {/* Y axis */}
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />

            {/* X axis */}
            <line
              x1={padding}
              y1={chartHeight - padding}
              x2={chartWidth - padding}
              y2={chartHeight - padding}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />

            {/* Line */}
            <polyline
              points={minutePoints.join(" ")}
              fill="none"
              stroke="rgb(168, 85, 247)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {minutePoints.map((point, i) => {
              const [x, y] = point.split(",").map(Number);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="3"
                  fill="rgb(168, 85, 247)"
                  opacity="0.9"
                />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
