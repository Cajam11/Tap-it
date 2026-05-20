import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";

export default async function BookingsCatalogPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

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

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-12%] top-[-16%] h-[34rem] w-[34rem] rounded-full bg-red-600/20 blur-[140px]" />
        <div className="pointer-events-none absolute right-[-12%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-[160px]" />
        <div className="pointer-events-none absolute bottom-[-18%] right-[-12%] h-[34rem] w-[34rem] rounded-full bg-red-900/15 blur-[180px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-14 lg:space-y-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-3xl space-y-5 pt-4 lg:pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/35">Bookings</p>
              <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Rezervácie
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/60 sm:text-lg lg:max-w-xl">
                Vyber si kategóriu a pokračuj na konkrétnu službu, trénera alebo termín.
              </p>
            </div>

            <Link
              href="/bookings/my"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
            >
              Moje rezervácie
            </Link>
          </div>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
            <CategoryTile
              href="/bookings/trainers"
              title="Tréneri"
              description="Zobrazia sa tréneri, ktorých si môžeš vybrať."
              tone="amber"
            />
            <CategoryTile
              href="/bookings/priestory"
              title="Priestory"
              description="Zoznam priestorov a miestností dostupných na rezerváciu."
              tone="stone"
            />
            <CategoryTile
              href="/bookings/skupinove-lekcie"
              title="Skupinové lekcie"
              description="Prehľad skupinových lekcií, ktoré sa dajú rezervovať."
              tone="rose"
            />
          </section>
        </div>
      </main>
    </>
  );
}

function CategoryTile({
  href,
  title,
  description,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  tone: "amber" | "stone" | "rose";
}) {
  const toneClass = {
    amber: "from-amber-500/20 via-white/[0.03] to-white/[0.02] hover:border-amber-400/35",
    stone: "from-white/12 via-white/[0.03] to-white/[0.02] hover:border-white/25",
    rose: "from-rose-500/20 via-white/[0.03] to-white/[0.02] hover:border-rose-400/35",
  }[tone];

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b ${toneClass} p-7 text-left transition duration-200 hover:-translate-y-1 hover:bg-white/[0.06] sm:p-8`}
    >
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_52%)]" />
      <div className="relative flex h-full min-h-[16rem] flex-col justify-between gap-10 sm:min-h-[18rem]">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
            Kategória
          </span>
          <h3 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h3>
          <p className="max-w-xs text-sm leading-6 text-white/58 sm:text-base">{description}</p>
        </div>
        <div className="flex items-center justify-between text-sm font-medium text-white/72">
          <span>Otvoriť sekciu</span>
          <span className="transition group-hover:translate-x-1">→</span>
        </div>
      </div>
    </Link>
  );
}