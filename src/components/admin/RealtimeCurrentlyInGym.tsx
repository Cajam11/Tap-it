"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeCurrentlyInGym({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pulse, setPulse] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-occupancy-kpi")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entries" },
        async () => {
          const { count: newCount } = await supabase
            .from("entries")
            .select("id", { count: "exact", head: true })
            .is("check_out", null)
            .eq("is_valid", true);
            
          if (newCount !== null && newCount !== count) {
            setCount(newCount);
            setPulse(true);
            setTimeout(() => setPulse(false), 500);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, count]);

  return (
    <p 
      className={`text-4xl font-bold transition-all duration-300 ${
        pulse ? "text-emerald-400 scale-105" : "text-white scale-100"
      }`}
    >
      {count}
    </p>
  );
}