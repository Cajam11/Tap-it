"use client";

import { useEffect, useMemo, useState } from "react";
import FadeIn from "@/components/FadeIn";
import { createClient } from "@/lib/supabase/client";

export type LivePresenceMember = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  check_in: string;
};

type LiveOccupancyCardProps = {
  initialCount: number;
  initialMembers?: LivePresenceMember[];
  showMemberList?: boolean;
};

function occupancyTone(count: number) {
  if (count > 100) {
    return {
      badge: "bg-red-500/20 text-red-400",
      value: "text-red-400",
      label: "Vysoká obsadenosť",
    };
  }

  if (count > 50) {
    return {
      badge: "bg-orange-500/20 text-orange-300",
      value: "text-orange-300",
      label: "Stredná obsadenosť",
    };
  }

  return {
    badge: "bg-emerald-500/20 text-emerald-400",
    value: "text-emerald-400",
    label: "Nízka obsadenosť",
  };
}

export default function LiveOccupancyCard({
  initialCount,
  initialMembers = [],
  showMemberList = false,
}: LiveOccupancyCardProps) {
  const supabase = useMemo(() => createClient(), []);
  const [current, setCurrent] = useState<number>(Math.max(0, initialCount));
  const [members, setMembers] = useState<LivePresenceMember[]>(initialMembers);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const tone = occupancyTone(current);

  useEffect(() => {
    const isOpen = (row: unknown) => {
      if (!row || typeof row !== "object") {
        return false;
      }

      const record = row as { check_out?: string | null; is_valid?: boolean };
      return record.check_out === null && record.is_valid === true;
    };

    const refreshMembers = async () => {
      if (!showMemberList) {
        return;
      }

      const { data, error } = await supabase.rpc("get_live_gym_presence");
      if (error || !Array.isArray(data)) {
        return;
      }

      const parsedMembers = data
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }

          const record = row as Partial<LivePresenceMember>;
          if (
            typeof record.user_id !== "string" ||
            typeof record.display_name !== "string" ||
            typeof record.check_in !== "string"
          ) {
            return null;
          }

          return {
            user_id: record.user_id,
            display_name: record.display_name,
            avatar_url: typeof record.avatar_url === "string" ? record.avatar_url : null,
            check_in: record.check_in,
          };
        })
        .filter((row): row is LivePresenceMember => row !== null);

      setMembers(parsedMembers);
    };

    const channel = supabase
      .channel("landing-live-occupancy")
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

          if (!wasOpen && isNowOpen) {
            setCurrent((prev) => prev + 1);
            void refreshMembers();
            return;
          }

          if (wasOpen && !isNowOpen) {
            setCurrent((prev) => Math.max(0, prev - 1));
            void refreshMembers();
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          void refreshMembers();
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [showMemberList, supabase]);

  return (
    <FadeIn className="mx-auto max-w-md">
      <div
        className="rounded-3xl border border-white/[0.08] p-8"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 100%)",
          boxShadow: "0 0 50px rgba(220,38,38,0.07), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span id="capacity-heading" className="text-base font-semibold text-white/80">
            Aktuálna obsadenosť
          </span>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${tone.badge}`}>
            {tone.label}
          </span>
        </div>
        <p className={`text-7xl font-black tabular-nums mt-4 tracking-tight ${tone.value}`}>
          {current}
        </p>
        <p className="text-sm text-white/30 mt-2 mb-5">Počet ľudí vo fitku práve teraz</p>
        <p className="text-[11px] text-white/30 mb-1">Prahy: do 50 zelená, nad 50 oranžová, nad 100 červená</p>
        <p className="text-[11px] text-white/20 mt-6 text-center">
          ⚡ Powered by Tap-it · {isRealtimeConnected ? "aktualizácia v reálnom čase" : "pripájam realtime"}
        </p>

        {showMemberList ? (
          <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/85">Kto je teraz vo fitku</p>
              <span className="text-xs text-white/40">{members.length} online</span>
            </div>

            {members.length === 0 ? (
              <p className="text-sm text-white/45">Aktuálne nikto nie je prihlásený vo fitku.</p>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => {
                  const initial = member.display_name.trim().charAt(0).toUpperCase() || "A";

                  return (
                    <li
                      key={`${member.user_id}-${member.check_in}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white">
                        {member.avatar_url ? (
                          <img
                            src={member.avatar_url}
                            alt={member.display_name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{member.display_name}</p>
                        <p className="text-xs text-white/45">Check-in {new Date(member.check_in).toLocaleTimeString()}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </FadeIn>
  );
}