"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookableService, ServiceSchedule } from "@/lib/types";
import { getServiceCheckoutHref } from "@/lib/bookings/routes";

export default function BookingSelector({
  service,
  schedules,
}: {
  service: BookableService;
  schedules: ServiceSchedule[];
}) {
  const router = useRouter();
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const isScheduled = service.type === "group" || service.type === "trainer";

  const handleContinue = () => {
    if (isScheduled && !selectedScheduleId) return;
    
    setLoading(true);
    // Redirect to checkout with necessary query params
    const params = new URLSearchParams();
    if (selectedScheduleId) params.set("scheduleId", selectedScheduleId);
    if (!isScheduled) params.set("duration", duration.toString());
    
    router.push(`${getServiceCheckoutHref(service.type, service.id)}?${params.toString()}`);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
      <h2 className="text-2xl font-bold mb-6 text-white">Zvoľte si termín</h2>

      {isScheduled ? (
        <div className="space-y-4 text-white">
          {schedules.length === 0 ? (
            <p className="text-white/40">Momentálne nie sú dostupné žiadne voľné termíny.</p>
          ) : (
            schedules.map((schedule) => {
              const start = new Date(schedule.start_time);
              const end = new Date(schedule.end_time);
              const isSelected = selectedScheduleId === schedule.id;
              const isFull = schedule.current_capacity !== null && schedule.current_capacity <= 0;

              return (
                <button
                  key={schedule.id}
                  onClick={() => setSelectedScheduleId(schedule.id)}
                  disabled={isFull}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-red-500/50 bg-red-500/10 text-white"
                      : isFull
                        ? "border-white/10 bg-white/5 text-white/30 line-through cursor-not-allowed"
                        : "border-white/10 bg-white/5 hover:border-white/20 text-white/80 hover:text-white"
                  }`}
                >
                  <div className="flex justify-between items-center text-[15px]">
                    <span className="font-semibold">
                      {start.toLocaleDateString("sk-SK")}
                    </span>
                    <span className={isSelected ? "text-red-400 font-bold" : "text-white/90"}>
                      {start.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {end.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {schedule.current_capacity !== null && (
                    <div className="mt-2 text-sm text-white/50">
                      {isFull ? "Obsadené" : `Voľné miesta: ${schedule.current_capacity}`}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block text-white/60 mb-2 font-medium">Trvanie ({service.price_unit === 'minute' ? 'minút' : 'hodín'})</label>
          <input
            type="number"
            min="1"
            max="120"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={loading || (isScheduled && !selectedScheduleId)}
        className="mt-8 flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Spracovávam..." : "Pokračovať k platbe"}
      </button>
    </div>
  );
}
