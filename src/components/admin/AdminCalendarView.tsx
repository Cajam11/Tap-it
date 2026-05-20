"use client";

import { useMemo, useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminCalendarDayModal from "@/components/admin/AdminCalendarDayModal";

interface BookingItem {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  bookable_services?: {
    name: string;
  };
  profiles?: {
    full_name: string | null;
    email?: string | null;
  };
}

interface AdminCalendarViewProps {
  initialBookings: BookingItem[];
}

interface DayBookingData {
  date: Date;
  bookings: BookingItem[];
}

export default function AdminCalendarView({
  initialBookings,
}: AdminCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayBookingData | null>(null);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Ponedelok first
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, BookingItem[]>();

    initialBookings.forEach((booking) => {
      const key = format(new Date(booking.start_time), "yyyy-MM-dd");
      const existing = map.get(key);

      if (existing) {
        existing.push(booking);
      } else {
        map.set(key, [booking]);
      }
    });

    map.forEach((bookings) => {
      bookings.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );
    });

    return map;
  }, [initialBookings]);

  const formatReservationCount = (count: number) => {
    if (count === 1) return "1 rezervacia";
    if (count >= 2 && count <= 4) return `${count} rezervacie`;
    return `${count} rezervacii`;
  };

  return (
    <>
      <div className="bg-[#1a1a1a] rounded-xl border border-white/10 overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white capitalize">
            {format(currentDate, dateFormat)}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded hover:bg-white/10 text-white transition-colors"
              type="button"
              aria-label="Predchadzajuci mesiac"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded hover:bg-white/10 text-white transition-colors"
              type="button"
              aria-label="Dalsi mesiac"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week days labels */}
        <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.02]">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="py-2 text-center text-xs font-semibold text-white/50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day) => {
            const isSelectedMonth = isSameMonth(day, monthStart);
            const dayKey = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDay.get(dayKey) ?? [];
            const dayHasBookings = dayBookings.length > 0;

            return (
              <button
                key={day.toString()}
                type="button"
                onClick={() => {
                  if (dayHasBookings) {
                    setSelectedDay({ date: day, bookings: dayBookings });
                  }
                }}
                className={`h-[96px] overflow-hidden p-1.5 border-r border-b border-white/5 text-left transition-colors ${
                  !isSelectedMonth
                    ? "bg-white/[0.01] text-white/30"
                    : "bg-[#1a1a1a] text-white/80"
                } ${dayHasBookings ? "cursor-pointer hover:bg-white/[0.03]" : "cursor-default"}`}
                title={
                  dayHasBookings
                    ? `${formatReservationCount(dayBookings.length)} - kliknite pre detaily`
                    : undefined
                }
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday(day) ? "bg-red-600 text-white" : ""
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                <div className="max-h-[62px] overflow-hidden">
                  {dayHasBookings && (
                    <div className="inline-flex rounded-md border border-green-500/40 bg-green-500/15 px-2 py-1 text-[11px] font-semibold text-green-300">
                      {formatReservationCount(dayBookings.length)}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <AdminCalendarDayModal
        selectedDay={selectedDay}
        onClose={() => setSelectedDay(null)}
        formatReservationCount={formatReservationCount}
      />
    </>
  );
}
