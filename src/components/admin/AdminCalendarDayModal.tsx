"use client";

import { format } from "date-fns";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

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

interface DayBookingData {
  date: Date;
  bookings: BookingItem[];
}

interface AdminCalendarDayModalProps {
  selectedDay: DayBookingData | null;
  onClose: () => void;
  formatReservationCount: (count: number) => string;
}

export default function AdminCalendarDayModal({
  selectedDay,
  onClose,
  formatReservationCount,
}: AdminCalendarDayModalProps) {
  if (!selectedDay || selectedDay.bookings.length === 0) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 transform px-4">
        <div className="rounded-2xl border border-white/10 bg-black/95 p-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {format(selectedDay.date, "d. MMMM yyyy")}
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  {formatReservationCount(selectedDay.bookings.length)}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg text-white/60 transition-colors hover:text-white"
                aria-label="Zavriet"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto pr-2">
              {selectedDay.bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-lg border border-white/10 bg-white/[0.05] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {booking.bookable_services?.name || "Rezervacia"}
                      </p>
                      <p className="mt-1 text-sm text-white/70">
                        {booking.profiles?.full_name || "Neznamy pouzivatel"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        booking.status === "paid"
                          ? "bg-green-500/20 text-green-300"
                          : booking.status === "pending"
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-white/10 text-white/70"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-white/60">
                    {format(new Date(booking.start_time), "HH:mm")} -{" "}
                    {format(new Date(booking.end_time), "HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
