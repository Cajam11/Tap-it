"use client";

import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeightLog {
  id: string;
  weight_kg: number;
  created_at: string;
}

interface WeightChartProps {
  logs: WeightLog[];
}

export default function WeightChart({ logs }: WeightChartProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Malicke oneskorenie pre krasny efekt nabehnutia chartu a zabranenie hydration mismatchu
    const timer = setTimeout(() => setIsMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];

    // Zoraď chronologicky podla datumu
    const sorted = [...logs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return sorted.map((log) => {
      const date = new Date(log.created_at);
      return {
        ...log,
        displayDate: date.toLocaleDateString("sk-SK", {
          day: "numeric",
          month: "short",
        }),
        weight_kg: Number(log.weight_kg),
      };
    });
  }, [logs]);

  if (!isMounted) {
    return (
      <div className="flex h-64 w-full animate-pulse flex-col items-start justify-end gap-6 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        <div className="h-[1px] w-full bg-white/5" />
        <div className="h-[1px] w-full bg-white/5" />
        <div className="h-[1px] w-full bg-white/5" />
        <div className="h-[1px] w-full bg-white/5" />
        <div className="flex w-full justify-between pt-2">
          <div className="h-2 w-8 rounded bg-white/10" />
          <div className="h-2 w-8 rounded bg-white/10" />
          <div className="h-2 w-8 rounded bg-white/10" />
          <div className="h-2 w-8 rounded bg-white/10" />
          <div className="h-2 w-8 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/40">
        <p>Zatiaľ nemáš žiadne záznamy o váhe.</p>
      </div>
    );
  }

  // Vypočitanie minimálnej a maximálnej váhy pre osu Y kvôli peknému grafu
  const maxWeight = Math.max(...chartData.map((d) => d.weight_kg));
  const minWeight = Math.min(...chartData.map((d) => d.weight_kg));
  let Y_DOMAIN: [number, number] = [Math.floor(minWeight - 5), Math.ceil(maxWeight + 5)];

  // Ak mame len jeden zaznam padneme z rozsahu alebo urobime custom
  if (chartData.length === 1) {
      Y_DOMAIN = [Math.floor(chartData[0].weight_kg - 5), Math.ceil(chartData[0].weight_kg + 5)];
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 20, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
          <XAxis 
            dataKey="displayDate" 
            stroke="#ffffff40" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10} 
          />
          <YAxis 
            domain={Y_DOMAIN} 
            stroke="#ffffff40" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}kg`}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "#171717", 
              borderColor: "#ffffff1a",
              borderRadius: "0.5rem",
              color: "#fff" 
            }}
            itemStyle={{ color: "#ef4444", fontWeight: 600 }}
            formatter={(value: unknown) => [`${typeof value === "number" ? value : Number(value ?? 0)} kg`, "Váha"]}
            labelStyle={{ color: "#ffffff80", marginBottom: "4px", fontSize: "12px" }}
          />
          <Line 
            type="monotone" 
            dataKey="weight_kg" 
            stroke="url(#lineColor)" 
            strokeWidth={3}
            dot={{ r: 4, fill: "#171717", stroke: "#ef4444", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
            isAnimationActive={true}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
