"use client";

import { useState, useEffect } from "react";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailyVisit {
  label: string;
  value: number;
}

interface VisitTrendChartProps {
  dailyVisitSeries: DailyVisit[];
  maxDailyVisits: number;
}

export default function VisitTrendChart({ dailyVisitSeries, maxDailyVisits }: VisitTrendChartProps) {
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="relative h-full min-h-0 w-full overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a] p-5 ring-1 ring-white/10 group/chart-container">
        {/* Toggle Button */}
        <div className="absolute right-5 top-5 z-20 flex overflow-hidden rounded-full border border-white/10 bg-black/50 p-0.5 backdrop-blur-md transition-opacity duration-300 opacity-0 group-hover/chart-container:opacity-100">
          <button
            onClick={() => setChartType("bar")}
            className={`flex items-center justify-center rounded-full p-2 transition-all ${
              chartType === "bar"
                ? "bg-white/10 text-white shadow-sm" 
                : "text-white/40 hover:text-white/70"
            }`}
            title="Stĺpcový graf"
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`flex items-center justify-center rounded-full p-2 transition-all ${
              chartType === "line"
                ? "bg-white/10 text-white shadow-sm" 
                : "text-white/40 hover:text-white/70"
            }`}
            title="Čiarový graf"
          >
            <LineChartIcon className="h-4 w-4" />
          </button>
        </div>

        {chartType === "bar" ? (
          <>
            {/* Background Grid for Bar */}
            <div className="absolute inset-y-5 left-5 right-5 flex flex-col justify-between pb-8 pt-6 pointer-events-none">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-[1px] w-full bg-white/[0.04]" />
              ))}
            </div>

            {/* Main Bar Chart Area */}
            <div className="relative z-10 flex h-full items-end justify-between px-2 pb-8 pt-10">
              {dailyVisitSeries.map((day, i) => {
                const isToday = i === dailyVisitSeries.length - 1;
                // Pre nulu min. výška aby sa ukázal aspoň náznak
                const heightPercent = day.value === 0 ? 0 : Math.max(8, (day.value / Math.max(1, maxDailyVisits)) * 85);

                return (
                  <div key={day.label} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                    {/* Value Hover / Today Badge */}
                    <div
                      className={`absolute text-sm font-semibold tabular-nums transition-all duration-300 ${isToday ? "text-white" : "text-white/0 group-hover:-translate-y-2 group-hover:text-white"}`}
                      style={{ bottom: `calc(${heightPercent}% + 12px)` }}
                    >
                      {day.value}
                    </div>

                    {/* Bar Container */}
                    <div className="relative flex h-full w-full max-w-[48px] items-end justify-center">
                      <div
                        className={`w-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                          isToday
                            ? "bg-gradient-to-t from-red-600/80 to-red-400 shadow-[0_0_24px_rgba(248,113,113,0.25)] border-t border-red-300/60 rounded-t-xl"
                            : day.value > 0 
                              ? "bg-gradient-to-t from-white/[0.03] to-white/[0.08] border-t border-white/10 group-hover:from-red-600/40 group-hover:to-red-400/50 group-hover:border-red-300/40 rounded-t-xl"
                              : "bg-white/[0.02] border-t border-white/5 rounded-t-md" // Nulové hodnoty
                        }`}
                        style={{ height: heightPercent === 0 ? "4px" : `${heightPercent}%` }}
                      />
                    </div>

                    {/* Day Label */}
                    <div
                      className={`absolute -bottom-6 text-[10px] uppercase font-bold tracking-[0.15em] transition-colors duration-300 ${
                        isToday ? "text-red-400" : "text-white/30 group-hover:text-white/70"
                      }`}
                    >
                      {day.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Line Chart */
          <div className="relative z-10 h-full w-full pt-2 pb-2">
            {!isMounted ? (
              <div className="flex h-full w-full animate-pulse flex-col items-start justify-end gap-[18px]">
                <div className="h-[1px] w-full bg-white/5" />
                <div className="h-[1px] w-full bg-white/5" />
                <div className="h-[1px] w-full bg-white/5" />
                <div className="h-[1px] w-full bg-white/5" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyVisitSeries} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lineColorAdmin" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff1a" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="#ffffff30" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={15} 
                    tickFormatter={(val) => val.toUpperCase()}
                  />
                  <YAxis 
                    domain={[0, Math.ceil(maxDailyVisits * 1.2)]} 
                    stroke="#ffffff40" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#ffffff20', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      backgroundColor: "#171717", 
                      borderColor: "#ffffff1a",
                      borderRadius: "0.75rem",
                      color: "#fff",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)"
                    }}
                    itemStyle={{ color: "#ef4444", fontWeight: 600 }}
                    formatter={(value) => [String(value), "Návštevy"]}
                    labelStyle={{ color: "#ffffff80", marginBottom: "4px", fontSize: "12px", textTransform: "uppercase" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="url(#lineColorAdmin)" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#171717", stroke: "#ef4444", strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: "#ef4444", stroke: "#ffffff", strokeWidth: 2 }}
                    isAnimationActive={true}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </>
  );
}
