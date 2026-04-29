"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { LogOut, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CheckInUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  check_in: string;
  check_out: string | null;
  user_id: string;
}

interface ReceptionCheckInViewProps {
  initialLatestEntry: CheckInUser | null;
}

export default function ReceptionCheckInView({ initialLatestEntry }: ReceptionCheckInViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const [latestEntry, setLatestEntry] = useState<CheckInUser | null>(initialLatestEntry);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Auto-hide after 5 seconds
  useEffect(() => {
    if (!latestEntry) return;

    const timer = setTimeout(() => {
      setLatestEntry(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [latestEntry]);

  useEffect(() => {
    const isOpen = (row: unknown) => {
      if (!row || typeof row !== "object") {
        return false;
      }

      const record = row as { check_out?: string | null; is_valid?: boolean };
      return record.check_out === null && record.is_valid === true;
    };

    const refreshEntryById = async (entryId: string) => {
      try {
        setFetchError(null);
        const res = await fetch(`/api/admin/entry/${entryId}`, { credentials: "same-origin" });
        if (!res.ok) {
          const msg = `Failed to fetch entry: ${res.status}`;
          console.error(msg);
          setFetchError(msg);
          return;
        }
        const data = await res.json();
        if (data.entry) {
          setLatestEntry(data.entry);
        }
      } catch (error) {
        console.error("Failed to fetch entry:", error);
        setFetchError(String(error));
      }
    };

    const channel = supabase
      .channel("reception-check-in")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
        },
        (payload) => {
          const wasOpen = isOpen(payload.old);
          const isNowOpen = isOpen(payload.new);
          const entryId =
            typeof payload.new === "object" && payload.new && "id" in payload.new
              ? String((payload.new as { id?: string }).id || "")
              : typeof payload.old === "object" && payload.old && "id" in payload.old
                ? String((payload.old as { id?: string }).id || "")
                : "";

          // Refresh on any change (new check-in or check-out)
          if (entryId && ((wasOpen && !isNowOpen) || (!wasOpen && isNowOpen))) {
            void refreshEntryById(entryId);
          }
        }
      )
      .subscribe((status) => {
        console.debug("reception channel status:", status);
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!latestEntry) {
    return (
      <div
        className="flex h-full min-h-[420px] items-center rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6"
        style={{ boxShadow: "0 0 50px rgba(220,38,38,0.07), inset 0 1px 0 rgba(255,255,255,0.06)" }}
      >
        <div className="flex w-full flex-col items-center justify-center gap-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Clock className="h-8 w-8 text-white/40" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">Čakanie na check-in</h2>
            <p className="mt-2 text-base text-white/60">Naskenuj QR kód a údaje návštevníka sa ukážu tu.</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-white/40">{isRealtimeConnected ? "🟢 Realtime pripojené" : "🔄 Pripájam realtime..."}</p>
            {fetchError ? <p className="text-xs text-red-400">{fetchError}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  const checkInTime = new Date(latestEntry.check_in);
  const now = new Date();
  const durationMs = now.getTime() - checkInTime.getTime();
  const durationMin = Math.floor(durationMs / 60000);
  const durationSec = Math.floor((durationMs % 60000) / 1000);

  return (
    <div
      className="flex h-full min-h-[420px] flex-col rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-6"
      style={{ boxShadow: "0 0 50px rgba(220,38,38,0.07), inset 0 1px 0 rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Realtime Check-In</h1>
          <p className="mt-1 text-sm text-white/60">Údaje návštevníka, ktorý sa práve check-inol</p>
        </div>
        <p className="text-xs text-white/40">{isRealtimeConnected ? "🟢 Realtime pripojené" : "🔄 Pripájam realtime..."}</p>
      </div>

      <div className="mt-5 flex flex-1 items-start gap-8 lg:gap-10">
        <div className="flex-shrink-0">
            {latestEntry.avatar_url ? (
              <Image
                src={latestEntry.avatar_url}
                alt={latestEntry.full_name || "User"}
                width={512}
                height={512}
                className="h-[28rem] w-[28rem] rounded-[28px] border border-white/15 object-cover shadow-[0_20px_70px_rgba(0,0,0,0.45)]"
              />
            ) : (
              <div className="flex h-[28rem] w-[28rem] items-center justify-center rounded-[28px] border border-white/15 bg-gradient-to-br from-white/10 to-white/5 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
                <span className="text-[10rem] font-bold text-white/90 leading-none">
                  {latestEntry.full_name?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            )}
        </div>

        <div className="min-w-0 flex-1 pt-2">
          <div className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full animate-pulse ${latestEntry.check_out ? "bg-red-500" : "bg-emerald-500"}`} />
            <p className={`text-lg font-semibold ${latestEntry.check_out ? "text-red-400" : "text-emerald-400"}`}>
              {latestEntry.check_out ? "CHECK-OUT ZAREGISTROVANÝ" : "CHECK-IN ZAREGISTROVANÝ"}
            </p>
          </div>

          <h2 className="mt-4 text-4xl font-bold tracking-tight text-white">{latestEntry.full_name || "Unknown"}</h2>
          <p className="mt-2 font-mono text-sm text-white/60">ID: {latestEntry.user_id.slice(0, 12)}...</p>

          <div className="mt-6 space-y-3">
            <div className="h-4 w-full max-w-[420px] rounded-full bg-white/10" />
            <div className="h-4 w-full max-w-[320px] rounded-full bg-white/10" />
            <div className="h-4 w-full max-w-[380px] rounded-full bg-white/10" />
            <div className="h-4 w-full max-w-[280px] rounded-full bg-white/10" />
          </div>

          <div className="mt-7 grid max-w-[520px] grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/[0.05] p-4">
              <p className="text-xs text-white/60 mb-1">Check-In Čas</p>
              <p className="font-mono text-base font-semibold text-white">{checkInTime.toLocaleTimeString("sk-SK")}</p>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-4">
              <p className="text-xs text-white/60 mb-1">Trvanie v posilňovni</p>
              <p className="font-mono text-base font-semibold text-white">
                {durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`}
              </p>
            </div>
          </div>

          <button className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-emerald-700">
            <LogOut className="h-5 w-5" />
            Zaregistruj Odchod
          </button>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-white/40">
        {isRealtimeConnected ? "🟢 Stránka sa automaticky aktualizuje keď sa naskenuje nový QR kód" : "🔄 Pripájam realtime..."}
      </p>
    </div>
  );
}
