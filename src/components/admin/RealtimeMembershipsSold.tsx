"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeMembershipsSold({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pulse, setPulse] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("realtime-memberships-kpi")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        async () => {
          const now = new Date();
          const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

          const { count: newCount } = await supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("type", "purchase")
            .eq("status", "completed")
            .gte("created_at", startOfMonth.toISOString());
            
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
        pulse ? "text-red-400 scale-105" : "text-white scale-100"
      }`}
    >
      {count}
    </p>
  );
}