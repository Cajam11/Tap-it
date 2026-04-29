"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { LogOut, LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface LogEntry {
  id: string;
  entry_id: string;
  user_id: string;
  kind: "check_in" | "check_out";
  timestamp: string;
  full_name: string | null;
  avatar_url: string | null;
}

type IncomingLegacyEntry = {
  id: string;
  user_id: string;
  check_in?: string;
  check_out?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

type IncomingEvent = {
  id: string;
  entry_id?: string;
  user_id: string;
  kind?: "check_in" | "check_out";
  timestamp?: string;
  check_in?: string;
  check_out?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

const normalizeIncomingLog = (value: IncomingEvent | IncomingLegacyEntry): LogEntry[] => {
  if ("kind" in value && value.kind && value.timestamp) {
    return [
      {
        id: value.id,
        entry_id: value.entry_id || value.id,
        user_id: value.user_id,
        kind: value.kind,
        timestamp: value.timestamp,
        full_name: value.full_name || null,
        avatar_url: value.avatar_url || null,
      },
    ];
  }

  const checkInTimestamp = value.check_in;
  if (!checkInTimestamp) {
    return [];
  }

  const events: LogEntry[] = [
    {
      id: `${value.id}:check_in`,
      entry_id: value.id,
      user_id: value.user_id,
      kind: "check_in",
      timestamp: checkInTimestamp,
      full_name: value.full_name || null,
      avatar_url: value.avatar_url || null,
    },
  ];

  if (value.check_out) {
    events.push({
      id: `${value.id}:check_out`,
      entry_id: value.id,
      user_id: value.user_id,
      kind: "check_out",
      timestamp: value.check_out,
      full_name: value.full_name || null,
      avatar_url: value.avatar_url || null,
    });
  }

  return events;
};

const upsertEntryEvents = (prev: LogEntry[], nextEvents: LogEntry[]) => {
  const byId = new Map(prev.map((event) => [event.id, event]));

  nextEvents.forEach((event) => {
    byId.set(event.id, event);
  });

  return Array.from(byId.values()).sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
  );
};

export default function EntriesLogsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);

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

  const getEntryKind = (entry: LogEntry) => (entry.kind === "check_out" ? "Exit" : "Entry");

  const fetchAndAddEntry = useCallback(async (entryId: string) => {
    try {
      const res = await fetch(`/api/admin/entry/${entryId}`, { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.entry) {
        const nextEvents = normalizeIncomingLog(data.entry);
        setLogs((prev) => upsertEntryEvents(prev, nextEvents));
      }
    } catch (error) {
      console.error("Failed to fetch entry:", error);
    }
  }, []);

  useEffect(() => {
    const fetchHistoricalLogs = async () => {
      try {
        const res = await fetch("/api/admin/entries-logs", { credentials: "same-origin" });
        if (!res.ok) {
          console.error("Failed to fetch logs:", res.status);
          return;
        }
        const data = await res.json();
        if (data.entries) {
          const normalized = (data.entries as Array<IncomingEvent | IncomingLegacyEntry>).flatMap(normalizeIncomingLog);
          setLogs(normalized);
        }
      } catch (error) {
        console.error("Failed to fetch historical logs:", error);
      }
    };

    void fetchHistoricalLogs();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("entries-logs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
        },
        (payload) => {
          if (payload.new && typeof payload.new === "object") {
            const newEntry = payload.new as { id: string };
            void fetchAndAddEntry(newEntry.id);
          }
        }
      )
      .subscribe((status) => {
        console.debug("logs channel status:", status);
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, fetchAndAddEntry]);

  const visibleLogs = logs.slice(0, 10);

  return (
    <aside className="h-full w-[380px] shrink-0 border-l border-white/5 bg-[#0b0b0c] p-3">
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/8 bg-[#121213] px-4 py-3 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_24px_60px_rgba(0,0,0,0.45)]">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-white">
              Live Scan Logs
            </h3>
            <p className="mt-1 text-[11px] text-white/45">
              {isRealtimeConnected ? "Realtime active" : "Connecting..."}
            </p>
          </div>
          <span
            className={`mt-1 h-2.5 w-2.5 rounded-full ${isRealtimeConnected ? "bg-emerald-400" : "bg-white/15"}`}
          />
        </div>

        <div className="flex-1 space-y-1 overflow-hidden">
          {visibleLogs.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-sm text-white/45">
              No scan logs yet.
            </div>
          ) : (
            visibleLogs.map((entry) => {
              const isExit = entry.kind === "check_out";
              const iconBg = isExit ? "bg-rose-950/70" : "bg-emerald-950/70";
              const iconText = isExit ? "text-rose-400" : "text-emerald-400";
              const Icon = isExit ? LogOut : LogIn;

              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-2.5 rounded-2xl px-2 py-1.5 transition-colors hover:bg-white/5"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconBg}`}
                  >
                    <Icon className={`h-4 w-4 ${iconText}`} strokeWidth={2.5} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold leading-tight text-white">
                      {entry.full_name || "Unknown"}
                    </div>
                    <div className="truncate text-[11px] text-white/45">
                      {getEntryKind(entry)} | {formatRelativeTime(entry.timestamp)}
                    </div>
                  </div>

                  <div className="shrink-0 text-[13px] tabular-nums text-white/38">
                    {formatTime(entry.timestamp)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 text-center">
          <Link href="/admin/logs" className="text-sm font-medium text-red-400 transition-colors hover:text-red-300">
            View All Logs
          </Link>
        </div>
      </div>
    </aside>
  );
}
