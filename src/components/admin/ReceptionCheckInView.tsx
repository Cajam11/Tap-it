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

    const refreshLatestEntry = async () => {
      try {
        setFetchError(null);
        const res = await fetch("/api/admin/latest-entry", { credentials: "same-origin" });
        if (!res.ok) {
          const msg = `Failed to fetch latest entry: ${res.status}`;
          console.error(msg);
          setFetchError(msg);
          return;
        }
        const data = await res.json();
        if (data.entry) {
          setLatestEntry(data.entry);
        } else {
          // no entry yet
          setLatestEntry(null);
        }
      } catch (error) {
        console.error("Failed to fetch latest entry:", error);
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

          // Refresh on any change (new check-in or check-out)
          if ((wasOpen && !isNowOpen) || (!wasOpen && isNowOpen)) {
            void refreshLatestEntry();
          }
        }
      )
      .subscribe((status) => {
        console.debug("reception channel status:", status);
        setIsRealtimeConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          void refreshLatestEntry();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  if (!latestEntry) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <Clock className="w-16 h-16 text-white/40 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Čakanie na check-in</h2>
          <p className="text-white/60">Naskenuj QR kód na to aby sa zobrazili údaje návštevníka</p>
          <p className="text-xs text-white/40 mt-4">{isRealtimeConnected ? "🟢 Realtime pripojené" : "🔄 Pripájam realtime..."}</p>
          {fetchError ? (
            <p className="text-xs text-red-400 mt-3">{fetchError}</p>
          ) : null}
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Realtime Check-In</h1>
        <p className="text-white/60 mt-2">Údaje návštevníka čo sa práve checkinol</p>
      </div>

      {/* Large Check-In Card - Avatar Left, Info Right */}
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.03] p-8">
        <div className="flex items-center gap-12">
          {/* Avatar (Left) */}
          <div className="flex-shrink-0">
            {latestEntry.avatar_url ? (
              <Image
                src={latestEntry.avatar_url}
                alt={latestEntry.full_name || "User"}
                width={200}
                height={200}
                className="w-48 h-48 rounded-full border-4 border-red-600 object-cover"
              />
            ) : (
              <div className="w-48 h-48 rounded-full border-4 border-red-600 bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                <span className="text-6xl font-bold text-white">
                  {latestEntry.full_name?.charAt(0).toUpperCase() || "?"}
                </span>
              </div>
            )}
          </div>

          {/* Info (Right) */}
          <div className="flex-1">
            <h2 className="text-4xl font-bold text-white mb-2">{latestEntry.full_name || "Unknown"}</h2>
            <p className="text-white/60 font-mono text-sm mb-6">ID: {latestEntry.user_id.slice(0, 12)}...</p>

            {/* Check-In Status */}
            <div className="flex items-center gap-3 mb-6">
              <span className={`w-3 h-3 rounded-full animate-pulse ${latestEntry.check_out ? "bg-red-500" : "bg-emerald-500"}`}></span>
              <p className={`font-semibold text-lg ${latestEntry.check_out ? "text-red-400" : "text-emerald-400"}`}>
                {latestEntry.check_out ? "CHECK-OUT ZAREGISTROVANÝ" : "CHECK-IN ZAREGISTROVANÝ"}
              </p>
            </div>

            {/* Time Info Grid */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl bg-white/[0.05] p-4">
                <p className="text-white/60 text-sm mb-2">Check-In Čas</p>
                <p className="text-white font-mono text-lg font-semibold">{checkInTime.toLocaleTimeString("sk-SK")}</p>
              </div>
              <div className="rounded-xl bg-white/[0.05] p-4">
                <p className="text-white/60 text-sm mb-2">Trvanie v posilňovni</p>
                <p className="text-white font-mono text-lg font-semibold">
                  {durationMin > 0 ? `${durationMin}m ${durationSec}s` : `${durationSec}s`}
                </p>
              </div>
            </div>

            {/* Action Button */}
            <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors">
              <LogOut className="w-5 h-5" />
              Zaregistruj Odchod
            </button>
          </div>
        </div>

        {/* Realtime status */}
        <p className="text-white/40 text-xs mt-8 text-center">
          {isRealtimeConnected ? "🟢 Stránka sa automaticky aktualizuje keď sa naskenuje nový QR kód" : "🔄 Pripájam realtime..."}
        </p>
      </div>
    </div>
  );
}
