"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type BookingStatus = "pending" | "paid" | "cancelled" | "refunded";

export type BookingHistoryItem = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_price: number;
  paymentHref: string | null;
};

type BookingHistoryListProps = {
  items: BookingHistoryItem[];
};

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

function getStatusLabel(status: BookingStatus) {
  if (status === "paid") return "Zaplatene";
  if (status === "pending") return "Caka na platbu";
  if (status === "cancelled") return "Zrusene";
  return "Refundovane";
}

function getStatusClass(status: BookingStatus) {
  if (status === "paid") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "pending") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  if (status === "cancelled") return "border-white/10 bg-white/[0.03] text-white/45";
  return "border-sky-300/30 bg-sky-400/10 text-sky-100";
}

export default function BookingHistoryList({ items }: BookingHistoryListProps) {
  const [visibleCount, setVisibleCount] = useState(10);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  if (items.length === 0) {
    return <p className="mt-6 flex-none text-white/50">Zatial nemate ziadne rezervacie.</p>;
  }

  return (
    <>
      <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
        {visibleItems.map((booking) => (
          <div
            key={booking.id}
            className="rounded-lg border border-white/10 bg-black/20 px-4 py-4 transition hover:border-white/18 hover:bg-white/[0.04]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-white">
                  {booking.title}
                </div>
                <div className="mt-1 text-sm text-white/55">
                  {formatDateTime(booking.start_time)} - {formatTime(booking.end_time)}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs ${getStatusClass(booking.status)}`}>
                  {getStatusLabel(booking.status)}
                </span>
                <span className="min-w-16 text-right text-sm font-semibold text-white">
                  {booking.total_price.toFixed(2)} EUR
                </span>
                {booking.status === "pending" && booking.paymentHref ? (
                  <Link
                    href={booking.paymentHref}
                    className="ml-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500"
                  >
                    Zaplatiť
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        ))}

        {hasMore ? (
          <div className="flex justify-center pb-1 pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + 10, items.length))}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
          >
            Zobraziť viac
          </button>
          </div>
        ) : null}
      </div>
    </>
  );
}