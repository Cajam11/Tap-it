import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import Breadcrumb from "@/components/bookings/Breadcrumb";

type TrainerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type TrainerService = {
  id: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
};

export default async function TrainersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
      avatar_url:
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : undefined,
    },
  };

  const navProfile = {
    full_name:
      typeof profile?.full_name === "string" ? profile.full_name : null,
    avatar_url:
      typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
  };

  const { data: trainerService } = await supabase
    .from("bookable_services")
    .select("id, base_price, price_unit")
    .eq("type", "trainer")
    .eq("is_active", true)
    .maybeSingle();

  const { data: trainerProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio")
    .eq("role", "trainer")
    .neq("id", user.id)
    .order("full_name", { ascending: true });

  const trainers = (trainerProfiles ?? []) as TrainerProfile[];
  const service = trainerService as TrainerService | null;

  return (
    <>
      <NavBarAuth
        navLinks={[]}
        initialUser={navUser}
        initialProfile={navProfile}
      />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-12%] top-[-14%] h-[32rem] w-[32rem] rounded-full bg-red-600/18 blur-[140px]" />
        <div className="pointer-events-none absolute right-[-10%] top-[12%] h-[24rem] w-[24rem] rounded-full bg-amber-500/10 blur-[150px]" />
        <div className="pointer-events-none absolute bottom-[-18%] right-[-14%] h-[34rem] w-[34rem] rounded-full bg-red-900/15 blur-[180px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-12 lg:space-y-14">
          <div className="flex flex-col gap-6 pt-4 lg:pt-8">
            <div className="flex items-center justify-between gap-4">
              <Breadcrumb
                items={[
                  { label: "Bookings", href: "/bookings" },
                  { label: "Tréneri" },
                ]}
              />
            </div>

            <div className="max-w-3xl space-y-5">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Tréneri
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/60 sm:text-lg lg:max-w-xl">
                Zoznam trénerov, ktorí sú pripravení na rezerváciu. Klikni na
                trénera a otvorí sa jeho dostupnosť.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-medium text-white/70">
                {trainers.length} dostupných trénerov
              </span>
              <span className="h-px w-16 bg-white/15" />
              <span>Vyber si trénera podľa mena a fotky</span>
            </div>
          </div>

          {trainers.length === 0 || !service ? (
            <p className="text-white/40">Zatiaľ žiadni tréneri v ponuke.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {trainers.map((trainer) => (
                <TrainerCard
                  key={trainer.id}
                  trainer={trainer}
                  trainerServiceId={service.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function TrainerCard({
  trainer,
  trainerServiceId,
}: {
  trainer: TrainerProfile;
  trainerServiceId: string;
}) {
  const displayName = trainer.full_name ?? "Tréner";
  const avatarFallback = displayName.trim().charAt(0).toUpperCase();

  return (
    <Link
      href={`/bookings/trainers/${trainer.id}?serviceId=${trainerServiceId}`}
      className="group relative flex min-h-[24rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] text-white transition hover:-translate-y-1 hover:border-red-500/40 hover:bg-white/[0.05]"
    >
      <div className="absolute inset-0">
        {trainer.avatar_url ? (
          <Image
            src={trainer.avatar_url}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/[0.04]">
            <span className="text-6xl font-semibold text-white/70">
              {avatarFallback || "T"}
            </span>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-black via-black/90 to-transparent" />

      <div className="relative mt-auto p-5 sm:p-6">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/40 px-4 py-4 text-center backdrop-blur-md">
          <div className="text-xl font-semibold text-white">{displayName}</div>
        </div>
      </div>
    </Link>
  );
}
