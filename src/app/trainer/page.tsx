import Link from "next/link";
import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import { Calendar } from "lucide-react";

const NAV_LINKS: [string, string][] = [];

type TrainerSchedule = {
  id: string;
  start_time: string;
  end_time: string;
  current_capacity: number | null;
  bookable_services: {
    name: string;
    type: string;
  } | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

function formatTimeRange(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startValue} - ${endValue}`;
  }
  return `${start.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}`;
}

export default async function TrainerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer") {
    redirect("/profile");
  }

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
    },
  };

  const navProfile = {
    full_name: typeof profile.full_name === "string" ? profile.full_name : null,
    avatar_url: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
  };

  const { data: schedules } = await supabase
    .from("service_schedules")
    .select("id, start_time, end_time, current_capacity, bookable_services(name, type)")
    .eq("trainer_id", user.id)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(30);

  const items = (schedules ?? []).map((schedule) => {
    const rawService = schedule.bookable_services;
    const normalizedService = Array.isArray(rawService)
      ? rawService[0] ?? null
      : rawService ?? null;

    return {
      ...schedule,
      bookable_services: normalizedService,
    };
  }) as TrainerSchedule[];
  const upcomingCount = items.length;
  const nextSchedule = items[0];

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                Tréner
              </p>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-white">
                Váš tréningový plán
              </h1>
              <p className="text-white/60">
                Prehľad najbližších tréningov a skupinových lekcií.
              </p>
            </div>
            
            <Link
              href="/trainer/availability"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 active:scale-[0.98]"
            >
              <Calendar className="h-4 w-4" />
              Nastaviť dostupnosť
            </Link>
          </header>

          <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Najbližší termín
              </p>
              {nextSchedule ? (
                <div className="mt-4 space-y-3">
                  <div className="text-2xl font-semibold text-white">
                    {nextSchedule.bookable_services?.name ?? "Tréning"}
                  </div>
                  <div className="text-white/70">
                    {formatDate(nextSchedule.start_time)}
                  </div>
                  <div className="text-white/90 font-medium">
                    {formatTimeRange(nextSchedule.start_time, nextSchedule.end_time)}
                  </div>
                  <div className="mt-4 inline-flex items-center rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
                    Kapacita: {nextSchedule.current_capacity ?? "—"}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-white/50">
                  Zatiaľ nemáte naplánované žiadne tréningy.
                </p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                Štatistika
              </p>
              <div className="mt-4 text-3xl font-semibold text-white">
                {upcomingCount}
              </div>
              <p className="text-white/60">Nadchádzajúce tréningy</p>
              <div className="mt-6 text-sm text-white/50">
                Kompletný zoznam je nižšie. Detaily účastníkov doplníme v ďalšom kroku.
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Najbližšie tréningy</h2>
              <span className="text-sm text-white/50">Zobrazených {Math.min(upcomingCount, 30)}</span>
            </div>

            {items.length === 0 ? (
              <p className="mt-6 text-white/50">Žiadne naplánované tréningy.</p>
            ) : (
              <div className="mt-6 grid gap-4">
                {items.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 sm:px-6"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-base font-semibold text-white">
                          {schedule.bookable_services?.name ?? "Tréning"}
                        </div>
                        <div className="text-sm text-white/60">
                          {formatDate(schedule.start_time)}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-white/80">
                        {formatTimeRange(schedule.start_time, schedule.end_time)}
                      </div>
                      <div className="text-xs text-white/50">
                        Kapacita: {schedule.current_capacity ?? "—"}
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
