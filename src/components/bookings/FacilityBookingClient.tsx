"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Breadcrumb from "./Breadcrumb";
import type { BookableService } from "@/lib/types";
import { getServiceCheckoutHref } from "@/lib/bookings/routes";

type FacilityBooking = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
};

const OPEN_HOUR = 6;
const CLOSE_HOUR = 21;
const HOURS = Array.from(
  { length: CLOSE_HOUR - OPEN_HOUR },
  (_, index) => OPEN_HOUR + index,
);

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getSlotDate(dateKey: string, hour: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day, hour, 0, 0, 0);
  return date;
}

function isSameDate(date: Date, dateKey: string) {
  return toDateKey(date) === dateKey;
}

function formatPrice(service: BookableService, duration: number) {
  const firstHour = Number(service.metadata?.first_hour_price);
  const nextHour = Number(service.metadata?.next_hour_price);

  if (Number.isFinite(firstHour) && Number.isFinite(nextHour)) {
    return firstHour + Math.max(0, duration - 1) * nextHour;
  }

  if (service.price_unit === "minute") {
    return service.base_price * duration * 60;
  }

  return service.base_price * duration;
}

function getFacilityCopy(serviceName: string) {
  const normalized = serviceName.toLowerCase();

  if (normalized.includes("v") || normalized.includes("jacuzzi")) {
    return {
      title: serviceName,
      description:
        "Tepla voda, tichy rezim a priestor na vypnutie po treningu. Idealne na regeneraciu po narocnom dni.",
      image:
        "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=80",
    };
  }

  return {
    title: serviceName,
    description:
      "Rezervuj si priestor presne na cas, ktory ti sedi. Kazdy den je dostupny v hodinovych blokoch od rana do vecera.",
    image:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
  };
}

function getCoverImage(service: BookableService, fallback: string) {
  const imageUrl = service.metadata?.image_url;
  return typeof imageUrl === "string" && imageUrl.trim().length > 0 ? imageUrl : fallback;
}

export default function FacilityBookingClient({
  service,
  bookings,
  backHref,
  backLabel,
  currentUserId,
}: {
  service: BookableService;
  bookings: FacilityBooking[];
  backHref: string;
  backLabel: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const content = getFacilityCopy(service.name);
  const coverImage = getCoverImage(service, content.image);

  useEffect(() => {
    const interval = window.setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [router]);

  const bookedHoursByDate = useMemo(() => {
    const map = new Map<string, Map<number, { status: string; userId: string }>>();

    bookings.forEach((booking) => {
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      const cursor = new Date(start);
      cursor.setMinutes(0, 0, 0);

      while (cursor < end) {
        const hour = cursor.getHours();

        if (hour >= OPEN_HOUR && hour < CLOSE_HOUR) {
          const key = toDateKey(cursor);
          if (!map.has(key)) map.set(key, new Map());
          map.get(key)!.set(hour, { status: booking.status, userId: booking.user_id });
        }

        cursor.setHours(cursor.getHours() + 1);
      }
    });

    return map;
  }, [bookings]);

  const availableDates = useMemo(() => {
    const available = new Set<string>();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const cursor = new Date(start);
    const now = new Date();

    while (cursor <= end) {
      const key = toDateKey(cursor);
      const booked = bookedHoursByDate.get(key) ?? new Map<number, { status: string; userId: string }>();
      const hasAvailableHour = HOURS.some((hour) => {
        const slot = getSlotDate(key, hour);
        const bookingData = booked.get(hour);
        const isAvailable = !bookingData || (bookingData.status === "pending" && bookingData.userId === currentUserId);
        return slot > now && isAvailable;
      });

      if (hasAvailableHour) available.add(key);
      cursor.setDate(cursor.getDate() + 1);
    }

    return available;
  }, [bookedHoursByDate, currentUserId]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const blanks = Array.from({ length: firstDay });
  const days = Array.from({ length: daysInMonth }).map((_, index) => index + 1);
  const bookedHours = selectedDateStr
    ? (bookedHoursByDate.get(selectedDateStr) ?? new Map<number, { status: string; userId: string }>())
    : new Map<number, { status: string; userId: string }>();
  const now = new Date();
  const sortedSelectedHours = [...selectedHours].sort((a, b) => a - b);
  const duration = sortedSelectedHours.length;
  const totalPrice = duration > 0 ? formatPrice(service, duration) : 0;

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDateStr(null);
    setSelectedHours([]);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDateStr(null);
    setSelectedHours([]);
  };

  const handleDateSelect = (dateKey: string) => {
    setSelectedDateStr(dateKey);
    setSelectedHours([]);
  };

  const handleHourClick = (hour: number) => {
    const current = [...selectedHours].sort((a, b) => a - b);

    if (current.includes(hour)) {
      if (current.length === 1) {
        setSelectedHours([]);
        return;
      }

      const first = current[0];
      const last = current[current.length - 1];

      if (hour === first) {
        setSelectedHours(current.slice(1));
        return;
      }

      if (hour === last) {
        setSelectedHours(current.slice(0, -1));
        return;
      }

      setSelectedHours(current.filter((selectedHour) => selectedHour < hour));
      return;
    }

    if (current.length === 0) {
      setSelectedHours([hour]);
      return;
    }

    const next = [...current, hour].sort((a, b) => a - b);
    const isContiguous = next.every(
      (value, index) => index === 0 || value === next[index - 1] + 1,
    );

    setSelectedHours(isContiguous ? next : [hour]);
  };

  const handleContinue = () => {
    if (!selectedDateStr || duration === 0) return;

    setLoading(true);
    const startHour = sortedSelectedHours[0];
    const start = getSlotDate(selectedDateStr, startHour);
    const params = new URLSearchParams({
      start: start.toISOString(),
      duration: duration.toString(),
    });

    router.push(`${getServiceCheckoutHref(service.type, service.id)}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Bookings", href: "/bookings" },
          { label: backLabel, href: backHref },
          { label: service.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16 items-stretch">
        <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] text-white">
          <div className="relative min-h-[24rem] flex-grow">
            <div className="absolute inset-0">
              <Image
                src={coverImage}
                alt={content.title}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 z-10 sm:p-8">
              <h2 className="text-3xl font-bold text-white">{content.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                {content.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 border-t border-white/5 bg-[#0d0d0d]/80 p-6 backdrop-blur-xl sm:p-8">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              Tvoja rezervacia
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Priestor</span>
                <span className="font-medium text-white">{service.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Cas</span>
                <span className="font-medium text-white text-right">
                  {selectedDateStr && duration > 0 ? (
                    <>
                      {new Date(selectedDateStr).toLocaleDateString("sk-SK")} <br className="sm:hidden" />
                      {sortedSelectedHours[0]}:00 - {sortedSelectedHours[duration - 1] + 1}:00
                    </>
                  ) : (
                    "Zatial nevybrany"
                  )}
                </span>
              </div>
              <div className="h-px w-full bg-white/10" />
              <div className="flex items-center justify-between text-base">
                <span className="text-white/80">Cena</span>
                <span className="font-bold text-white">
                  {totalPrice.toFixed(2)} EUR
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md sm:p-8">
          {!selectedDateStr ? (
            <div className="flex flex-col h-full">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Vyberte si datum
              </h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={prevMonth}
                  className="p-2 text-white/50 transition hover:text-white"
                >
                  &larr;
                </button>
                <span className="min-w-[120px] text-center text-lg font-medium text-white">
                  {currentDate.toLocaleString("sk-SK", { month: "long" })}{" "}
                  {currentYear}
                </span>
                <button
                  onClick={nextMonth}
                  className="p-2 text-white/50 transition hover:text-white"
                >
                  &rarr;
                </button>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-7 gap-2 text-center">
              {["Po", "Ut", "St", "St", "Pi", "So", "Ne"].map((day, index) => (
                <div
                  key={`${day}-${index}`}
                  className="py-2 text-xs font-semibold uppercase text-white/40"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-3 flex-1 auto-rows-fr">
              {blanks.map((_, index) => (
                <div key={`blank-${index}`} className="p-4" />
              ))}
              {days.map((day) => {
                const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasSlots = availableDates.has(dateKey);

                return (
                  <button
                    key={day}
                    disabled={!hasSlots}
                    onClick={() => handleDateSelect(dateKey)}
                    className={`relative rounded-2xl flex items-center justify-center text-lg transition-all ${
                      hasSlots
                        ? "cursor-pointer border border-transparent bg-white/5 font-medium text-white hover:border-red-500/30 hover:bg-red-500/20 hover:text-red-300"
                        : "cursor-not-allowed text-white/20"
                    }`}
                  >
                    {day}
                    {hasSlots && (
                      <span className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="mb-8 flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedDateStr(null);
                  setSelectedHours([]);
                }}
                className="rounded-full bg-white/5 p-2 text-white/60 transition hover:text-white"
              >
                &larr;
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Vyberte si casy
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

            <div className="mb-8 grid grid-cols-2 gap-3 text-[15px] sm:grid-cols-4">
              {HOURS.map((hour) => {
                const slotStart = getSlotDate(selectedDateStr, hour);
                const bookingData = bookedHours.get(hour);
                const isBooked = Boolean(bookingData);
                const bookingStatus = bookingData?.status;
                const isPending = bookingStatus === "pending";
                const isCurrentUserPending = isPending && bookingData?.userId === currentUserId;
                const isPast =
                  isSameDate(now, selectedDateStr) && slotStart <= now;
                const isSelected = selectedHours.includes(hour);
                const disabled = (isBooked && !isCurrentUserPending) || isPast;

                return (
                  <button
                    key={hour}
                    onClick={() => handleHourClick(hour)}
                    disabled={disabled}
                    className={`rounded-xl border p-4 text-center transition-all ${
                      isSelected
                        ? "border-red-500/50 bg-red-500/20 font-bold text-white"
                        : disabled
                          ? isPending
                            ? "cursor-not-allowed border-amber-300/25 bg-amber-400/10 text-amber-100/45 line-through"
                            : "cursor-not-allowed border-white/10 bg-white/5 text-white/25 line-through"
                          : isCurrentUserPending
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-200/90 hover:bg-amber-500/20 hover:text-amber-100"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{hour}:00</span>
                    {isPending && (
                      <span className="mt-1 block text-[11px] no-underline">
                        {isCurrentUserPending ? "tvoje držané" : "drzane"}
                      </span>
                    )}
                    {bookingStatus === "paid" && (
                      <span className="mt-1 block text-[11px] no-underline">
                        obsadene
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <div className="text-sm text-white/50">
                {duration > 0
                  ? `${duration} hod. vybrane`
                  : "Vyber aspon jednu hodinu"}
              </div>
              <button
                disabled={duration === 0 || loading}
                onClick={handleContinue}
                className="rounded-xl bg-red-600 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Spracovavam..." : "Pokracovat k platbe"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
