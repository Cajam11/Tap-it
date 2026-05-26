"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { BookableService, ServiceSchedule } from "@/lib/types";
import { getServiceCheckoutHref } from "@/lib/bookings/routes";

// Pomocne datumove funkcie
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Vrátime 0 pre pondelok, aspoň v našom UI (JS Date má nedeľu ako 0)
  return day === 0 ? 6 : day - 1;
}

export default function TrainerBookingClient({
  trainerProfile,
  service,
  schedules,
  currentUserId,
}: {
  trainerProfile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  service: BookableService;
  schedules: ServiceSchedule[];
  currentUserId: string;
}) {
  const router = useRouter();

  // Stavy
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  // Predspracovanie rozvrhov do mapy podľa dátumu (YYYY-MM-DD)
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, ServiceSchedule[]>();
    const dedupe = new Set<string>();

    schedules.forEach((schedule) => {
      const start = new Date(schedule.start_time);
      const end = new Date(schedule.end_time);
      const durationMinutes = (end.getTime() - start.getTime()) / 60000;

      // Zobrazujeme len hodinové sloty (legacy dlhé bloky ignorujeme)
      if (durationMinutes !== 60) return;

      const key = `${start.toISOString()}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);

      const dateKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(schedule);
    });

    // Zoradíme sloty podľa času
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
    }

    return map;
  }, [schedules]);

  // Vygenerovanie buniek kalendára
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);

  const nextMonth = () =>
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const prevMonth = () =>
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));

  // Funkcie zobrazenia
  const availableSlots = selectedDateStr
    ? schedulesByDate.get(selectedDateStr) || []
    : [];
  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  const handleContinue = () => {
    if (!selectedScheduleId) return;
    setLoading(true);
    router.push(
      `${getServiceCheckoutHref(service.type, service.id, trainerProfile.id)}?scheduleId=${selectedScheduleId}&serviceId=${service.id}`,
    );
  };

  const displayName = trainerProfile.full_name ?? "Tréner";
  const avatarFallback = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
      {/* ĽAVÝ STĹPEC - Informácie o trénerovi a resumé */}
      <div className="flex flex-col gap-6">
        <div className="group relative flex min-h-[28rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] text-white">
          <div className="absolute inset-0">
            {trainerProfile.avatar_url ? (
              <Image
                src={trainerProfile.avatar_url}
                alt={displayName}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.04]">
                <span className="text-6xl font-semibold text-white/70">
                  {avatarFallback}
                </span>
              </div>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />

          <div className="relative mt-auto p-6">
            <h2 className="text-3xl font-bold text-white">{displayName}</h2>
            {trainerProfile.bio && (
              <p className="mt-3 text-sm leading-relaxed text-white/60 line-clamp-3">
                {trainerProfile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Vybraný termín - Zhrnutie */}
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
          <h3 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">
            Tvoja rezervácia
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">Služba</span>
              <span className="text-white font-medium">Osobný tréning</span>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">Termín</span>
              <span className="text-white font-medium">
                {selectedSchedule ? (
                  <>
                    {new Date(selectedSchedule.start_time).toLocaleDateString(
                      "sk-SK",
                    )}{" "}
                    o{" "}
                    {new Date(selectedSchedule.start_time).toLocaleTimeString(
                      "sk-SK",
                      { hour: "2-digit", minute: "2-digit" },
                    )}
                  </>
                ) : (
                  <span className="text-white/30 italic">Zatiaľ nevybraný</span>
                )}
              </span>
            </div>

            <div className="h-px w-full bg-white/10 my-2" />

            <div className="flex justify-between items-center text-base">
              <span className="text-white/80">Cena</span>
              <span className="text-white font-bold">
                {service.base_price}€
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* PRAVÝ STĹPEC - Kalendár a časy */}
      <div className="flex flex-col gap-6">
        {!selectedDateStr ? (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">
                Vyberte si dátum
              </h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={prevMonth}
                  className="p-2 text-white/50 hover:text-white transition"
                >
                  ←
                </button>
                <span className="text-lg font-medium text-white min-w-[120px] text-center">
                  {currentDate.toLocaleString("sk-SK", { month: "long" })}{" "}
                  {currentYear}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-2 text-white/50 hover:text-white transition"
                >
                  →
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4 text-center">
              {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
                <div
                  key={d}
                  className="text-xs font-semibold text-white/40 uppercase py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="p-4" />
              ))}

              {days.map((day) => {
                const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const daySlots = schedulesByDate.get(dateKey) ?? [];
                const hasSlots = daySlots.some((slot) => {
                  const isCurrentUserPending =
                    slot.booking_status === "pending" &&
                    slot.booking_user_id === currentUserId;
                  const isLocked =
                    slot.booking_status === "paid" ||
                    (slot.booking_status === "pending" && !isCurrentUserPending) ||
                    ((slot.current_capacity !== null && slot.current_capacity <= 0) && !isCurrentUserPending);

                  return !isLocked;
                });

                return (
                  <button
                    key={day}
                    disabled={!hasSlots}
                    onClick={() => {
                      setSelectedDateStr(dateKey);
                      setSelectedScheduleId(null);
                    }}
                    className={`relative p-3 rounded-2xl text-center transition-all ${
                      hasSlots
                        ? "bg-white/5 text-white hover:bg-red-500/20 hover:text-red-300 border border-transparent hover:border-red-500/30 font-medium cursor-pointer"
                        : "text-white/20 cursor-not-allowed"
                    }`}
                  >
                    {day}
                    {hasSlots && (
                      <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-md">
            <div className="flex items-center gap-4 mb-8">
              <button
                onClick={() => {
                  setSelectedDateStr(null);
                  setSelectedScheduleId(null);
                }}
                className="p-2 rounded-full bg-white/5 text-white/60 hover:text-white transition"
              >
                ←
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Vyberte si čas
                </h2>
                <p className="text-white/50">
                  {new Date(selectedDateStr).toLocaleDateString("sk-SK", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-8 text-[15px]">
              {availableSlots.length > 0 ? (
                availableSlots.map((slot) => {
                  const isSelected = slot.id === selectedScheduleId;
                  const isPending = slot.booking_status === "pending";
                  const isPaid = slot.booking_status === "paid";
                  const isCurrentUserPending =
                    isPending && slot.booking_user_id === currentUserId;
                  const isFull =
                    slot.current_capacity !== null &&
                    slot.current_capacity <= 0;
                  const timeStr = new Date(slot.start_time).toLocaleTimeString(
                    "sk-SK",
                    { hour: "2-digit", minute: "2-digit" },
                  );
                  const isLocked =
                    isPaid || (isPending && !isCurrentUserPending) || (isFull && !isCurrentUserPending);

                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedScheduleId(slot.id)}
                      disabled={isLocked}
                      className={`p-4 rounded-xl text-center transition-all ${
                        isSelected
                        ? "bg-red-500/20 border border-red-500/50 text-white font-bold"
                        : isLocked
                          ? isPending
                            ? "border border-amber-300/25 bg-amber-400/10 text-amber-100/45 line-through cursor-not-allowed"
                            : "border border-white/10 bg-white/5 text-white/25 line-through cursor-not-allowed"
                          : isCurrentUserPending
                            ? "border border-amber-500/30 bg-amber-500/10 text-amber-200/90 hover:bg-amber-500/20 hover:text-amber-100"
                            : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {timeStr}
                      {isPending && (
                        <span className="mt-1 block text-[11px] no-underline">
                          {isCurrentUserPending ? "tvoje drzane" : "drzane"}
                        </span>
                      )}
                      {isPaid && (
                        <span className="mt-1 block text-[11px] no-underline text-white/45">
                          obsadene
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

            <div className="flex justify-end pt-4 border-t border-white/10">
              <button
                disabled={!selectedScheduleId || loading}
                onClick={handleContinue}
                className="rounded-xl bg-red-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Spracovávam..." : "Pokračovať k platbe"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
