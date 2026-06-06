"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Filter } from "lucide-react";

type BookingStatus = "pending" | "paid" | "cancelled" | "refunded";
type FilterStatus = "all" | BookingStatus;

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

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "Všetky" },
  { value: "pending", label: "Čaká na platbu" },
  { value: "paid", label: "Zaplatené" },
  { value: "cancelled", label: "Zrušené" },
  { value: "refunded", label: "Refundované" },
];

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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredItems = useMemo(
    () => (filterStatus === "all" ? items : items.filter((b) => b.status === filterStatus)),
    [items, filterStatus],
  );

  const visibleItems = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
  const hasMore = visibleCount < filteredItems.length;

  function handleFilterSelect(value: FilterStatus) {
    setFilterStatus(value);
    setVisibleCount(10);
    setFilterOpen(false);
  }

  const isFiltered = filterStatus !== "all";

  return (
    <>
      <div className="flex flex-none items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Historia bookingov</h2>
          <p className="text-sm text-white/45">Zobrazuje sa po 10 rezervacii</p>
        </div>

        <div className="flex items-center gap-2">
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
              isFiltered
                ? "border-red-500/40 bg-red-600/15 text-red-300 hover:bg-red-600/25"
                : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/20 hover:bg-white/[0.07] hover:text-white/80"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            {isFiltered
              ? (FILTER_OPTIONS.find((o) => o.value === filterStatus)?.label ?? "Filter")
              : "Filter"}
          </button>

          {filterOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#111] shadow-xl">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFilterSelect(opt.value)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition ${
                    filterStatus === opt.value
                      ? "bg-white/[0.08] text-white"
                      : "text-white/60 hover:bg-white/[0.05] hover:text-white/90"
                  }`}
                >
                  {opt.label}
                  {filterStatus === opt.value && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

          <span className="shrink-0 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white/60">
            {isFiltered ? `${filteredItems.length} / ${items.length}` : `${items.length} spolu`}
          </span>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="mt-6 flex-none text-white/50">
          {items.length === 0 ? "Zatial nemate ziadne rezervacie." : "Žiadne rezervácie pre zvolený filter."}
        </p>
      ) : (
        <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-0 [-ms-overflow-style:none] [scrollbar-width:none] sm:pr-1 [&::-webkit-scrollbar]:hidden">
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
                onClick={() => setVisibleCount((count) => Math.min(count + 10, filteredItems.length))}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
              >
                Zobraziť viac
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
