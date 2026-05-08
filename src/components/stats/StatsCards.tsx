"use client";

import { CalendarCheck2, Clock3, Flame, TrendingUp } from "lucide-react";

interface StatsCardsProps {
  monthTrainings: number;
  monthMinutes: number;
  totalTrainings: number;
  streak: number;
}

export default function StatsCards({
  monthTrainings,
  monthMinutes,
  totalTrainings,
  streak,
}: StatsCardsProps) {
  const formatter = new Intl.NumberFormat("sk-SK");

  const stats = [
    {
      label: "Treningy tento mesiac",
      value: monthTrainings,
      icon: CalendarCheck2,
    },
    {
      label: "Minuty tento mesiac",
      value: monthMinutes,
      icon: Clock3,
    },
    {
      label: "Aktualny streak",
      value: streak,
      icon: Flame,
    },
    {
      label: "Celkovo treningov",
      value: totalTrainings,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <article
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/55">{stat.label}</p>
              <Icon className="h-4 w-4 text-red-400" />
            </div>
            <p className="mt-3 text-2xl font-black text-white">
              {formatter.format(stat.value)}
            </p>
          </article>
        );
      })}
    </div>
  );
}
