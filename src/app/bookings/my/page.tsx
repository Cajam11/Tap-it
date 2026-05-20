import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";

type BookingRow = {
  id: string;
  start_time: string;
  end_time: string;
  status: "pending" | "paid" | "cancelled" | "refunded";
  total_price: number;
  bookable_services: {
    name: string;
    type: string;
  } | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const NAV_LINKS: [string, string][] = [];

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
    },
  };

  const navProfile = {
    full_name: typeof profile?.full_name === "string" ? profile.full_name : null,
    avatar_url: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
  };

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, start_time, end_time, status, total_price, bookable_services(name, type)")
    .eq("user_id", user.id)
    .eq("status", "paid")
    .order("start_time", { ascending: true });

  const items = (bookings ?? []).map((booking) => {
    const rawService = booking.bookable_services;
    const normalizedService = Array.isArray(rawService)
      ? rawService[0] ?? null
      : rawService ?? null;

    return {
      ...booking,
      bookable_services: normalizedService,
    };
  }) as BookingRow[];

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-4xl space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Moje rezervácie</h1>
            <p className="text-white/60">Prehľad vašich rezervovaných tréningov a služieb.</p>
          </div>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
            {items.length === 0 ? (
              <p className="text-white/50">Zatiaľ nemáte žiadne rezervácie.</p>
            ) : (
              <div className="space-y-4">
                {items.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">
                          {booking.bookable_services?.name ?? "Rezervácia"}
                        </div>
                        <div className="text-sm text-white/60">
                          {formatDate(booking.start_time)} – {formatDate(booking.end_time)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-white/70">
                          {booking.status === "paid" ? "Zaplatené" : booking.status === "pending" ? "Čaká na platbu" : booking.status === "cancelled" ? "Zrušené" : "Refundované"}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {booking.total_price.toFixed(2)}€
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
