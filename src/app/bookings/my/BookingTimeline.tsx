"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getServiceCheckoutHref } from "@/lib/bookings/routes";

type TimelineActivity = {
  id: string;
  start_time: string;
  end_time: string;
  trainerName: string | null;
  trainerId: string | null;
  color: string;
  label: string;
  status: string;
  service_id: string;
  schedule_id: string | null;
  bookable_services: {
    type: string;
  } | null;
};

type UpcomingBooking = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  service_id: string;
  schedule_id: string | null;
  trainerId: string | null;
  bookable_services: {
    name: string;
    type: string;
  } | null;
};

const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 22;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDayTitle(date: Date) {
  return new Intl.DateTimeFormat("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function getTimelineStyle(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const totalMinutes = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const clampedStart = Math.max(0, startMinutes - TIMELINE_START_HOUR * 60);
  const clampedEnd = Math.min(totalMinutes, endMinutes - TIMELINE_START_HOUR * 60);
  const left = (clampedStart / totalMinutes) * 100;
  const width = Math.max(((clampedEnd - clampedStart) / totalMinutes) * 100, 4);

  return { left: `${left}%`, width: `${width}%` };
}

export default function BookingTimeline({
  activities,
  upcomingPreview,
}: {
  activities: TimelineActivity[];
  upcomingPreview: UpcomingBooking[];
}) {
  const [timelineDate, setTimelineDate] = useState(() => startOfDay(new Date()));

  const timelineItems = useMemo(() => {
    const timelineStart = startOfDay(timelineDate);
    const timelineEnd = endOfDay(timelineDate);

    return activities.filter((activity) => {
      const startsAt = new Date(activity.start_time);
      return startsAt >= timelineStart && startsAt <= timelineEnd;
    });
  }, [activities, timelineDate]);

  return (
    <aside className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Najblizsie aktivity</h2>
            <p className="text-sm capitalize text-white/45">{formatDayTitle(timelineDate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimelineDate((current) => addDays(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
              aria-label="Predchadzajuci den"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setTimelineDate(startOfDay(new Date()))}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 hover:text-white"
            >
              Dnes
            </button>
            <button
              type="button"
              onClick={() => setTimelineDate((current) => addDays(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:text-white"
              aria-label="Dalsi den"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="relative h-16 rounded-lg border border-white/10 bg-black/25 px-3">
            <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-white/12" />
            {[6, 10, 14, 18, 22].map((hour) => (
              <div
                key={hour}
                className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/20"
                style={{ left: `${((hour - TIMELINE_START_HOUR) / (TIMELINE_END_HOUR - TIMELINE_START_HOUR)) * 100}%` }}
              >
                <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[11px] text-white/35">
                  {hour}:00
                </span>
              </div>
            ))}
            {timelineItems.map((activity) => (
              <div
                key={activity.id}
                className={`absolute top-4 h-8 rounded-full border px-2 shadow-lg ${activity.color}`}
                style={getTimelineStyle(activity.start_time, activity.end_time)}
                title={`${activity.label}: ${formatTime(activity.start_time)} - ${formatTime(activity.end_time)}`}
              />
            ))}
          </div>

          {timelineItems.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/45">
              V tento den nemas ziadne aktivity.
            </p>
          ) : (
            <div className="space-y-3 pt-4">
              {timelineItems.map((activity) => (
                <div key={activity.id} className={`rounded-lg border px-4 py-3 ${activity.color}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{activity.label}</div>
                      <div className="text-xs opacity-75">
                        {activity.trainerName
                          ? `Farba patri treningu s ${activity.trainerName}`
                          : "Farba patri tejto aktivite"}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-sm font-semibold">
                        {formatTime(activity.start_time)} - {formatTime(activity.end_time)}
                      </div>
                      {activity.status === "pending" && (
                        <Link
                          href={
                            activity.schedule_id
                              ? `${getServiceCheckoutHref(activity.bookable_services?.type, activity.service_id, activity.trainerId)}?scheduleId=${activity.schedule_id}${activity.bookable_services?.type === "trainer" ? `&serviceId=${activity.service_id}` : ""}`
                              : `${getServiceCheckoutHref(activity.bookable_services?.type, activity.service_id, activity.trainerId)}?start=${activity.start_time}&duration=${Math.round(
                                  (new Date(activity.end_time).getTime() - new Date(activity.start_time).getTime()) /
                                    (1000 * 60 * 60)
                                )}`
                          }
                          className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-red-500"
                        >
                          Zaplatiť
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white/40">
          Nasleduje
        </h3>
        {upcomingPreview.length === 0 ? (
          <p className="mt-4 text-sm text-white/45">Ziadne najblizsie rezervacie.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {upcomingPreview.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-white/75">
                  {booking.bookable_services?.name ?? "Rezervacia"}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-white/45">
                    {formatDateTime(booking.start_time)}
                  </span>
                  {booking.status === "pending" && (
                    <Link
                      href={
                        booking.schedule_id
                          ? `${getServiceCheckoutHref(booking.bookable_services?.type, booking.service_id, booking.trainerId)}?scheduleId=${booking.schedule_id}${booking.bookable_services?.type === "trainer" ? `&serviceId=${booking.service_id}` : ""}`
                          : `${getServiceCheckoutHref(booking.bookable_services?.type, booking.service_id, booking.trainerId)}?start=${booking.start_time}&duration=${Math.round(
                              (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) /
                                (1000 * 60 * 60)
                            )}`
                      }
                      className="rounded bg-red-600/20 px-2 py-0.5 text-[10px] font-medium text-red-100 transition hover:bg-red-500/30"
                    >
                      Zaplatiť
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </aside>
  );
}
