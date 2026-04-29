"use client";

import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, Search } from "lucide-react";

type LogEntry = {
  id: string;
  entry_id: string;
  user_id: string;
  kind: "check_in" | "check_out";
  timestamp: string;
  full_name: string | null;
  avatar_url: string | null;
};

type LogsResponse = {
  entries?: LogEntry[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

const PAGE_SIZE = 12;

export default function ScanLogsPageView() {
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 250);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(PAGE_SIZE),
        });

        if (debouncedSearch) {
          params.set("q", debouncedSearch);
        }

        const res = await fetch(`/api/admin/entries-logs?${params.toString()}`, { credentials: "same-origin" });
        if (!res.ok) {
          setEntries([]);
          setTotal(0);
          setTotalPages(0);
          return;
        }

        const data = (await res.json()) as LogsResponse;
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setTotalPages(typeof data.totalPages === "number" ? data.totalPages : 0);
      } catch (error) {
        console.error("Failed to fetch scan logs:", error);
        setEntries([]);
        setTotal(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    void fetchLogs();
  }, [page, debouncedSearch]);

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString("sk-SK", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatRelativeTime = (value: string) => {
    const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
    if (diffMinutes < 1) {
      return "just now";
    }
    if (diffMinutes === 1) {
      return "1 min ago";
    }
    return `${diffMinutes} mins ago`;
  };

  const pages = useMemo(() => {
    if (totalPages <= 1) {
      return [] as number[];
    }

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    const normalizedStart = Math.max(1, end - 4);

    return Array.from({ length: end - normalizedStart + 1 }, (_, i) => normalizedStart + i);
  }, [page, totalPages]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Scan Logs</h1>
          <p className="mt-2 text-white/60">Vsetky QR scan udalosti s vyhladavanim a strankovanim.</p>
        </div>

        <label className="relative block w-full md:w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Vyhladaj meno alebo user ID"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none transition focus:border-red-500/60"
          />
        </label>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-[#111214] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_60px_rgba(0,0,0,0.45)]">
        <div className="mb-3 flex items-center justify-between px-1">
          <p className="text-sm text-white/50">
            {loading ? "Nacitavam..." : `${total} zaznamov`}
          </p>
          <p className="text-xs text-white/35">Strana {page}{totalPages > 0 ? ` / ${totalPages}` : ""}</p>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 text-sm text-white/45">
              {loading ? "Nacitavam logy..." : "Nenasli sa ziadne logy pre tento filter."}
            </div>
          ) : (
            entries.map((entry) => {
              const isExit = entry.kind === "check_out";
              const iconBg = isExit ? "bg-rose-950/70" : "bg-emerald-950/70";
              const iconText = isExit ? "text-rose-400" : "text-emerald-400";
              const Icon = isExit ? LogOut : LogIn;
              const label = isExit ? "Exit" : "Entry";

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-white/5"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
                    <Icon className={`h-4 w-4 ${iconText}`} strokeWidth={2.5} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{entry.full_name || "Unknown"}</div>
                    <div className="truncate text-xs text-white/45">{label} | {formatRelativeTime(entry.timestamp)}</div>
                  </div>

                  <div className="shrink-0 text-sm tabular-nums text-white/40">{formatTime(entry.timestamp)}</div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2 border-t border-white/10 pt-4">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Prev
            </button>

            {pages.map((pageNumber) => (
              <button
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                className={`rounded-lg px-3 py-1.5 text-sm ${pageNumber === page ? "bg-red-600 text-white" : "border border-white/10 text-white/80"}`}
              >
                {pageNumber}
              </button>
            ))}

            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-white/80 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
