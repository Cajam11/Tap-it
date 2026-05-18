import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";

type Service = {
  id: string;
  name: string;
  type: "group" | "trainer" | "facility";
  base_price: number;
  price_unit: "hour" | "minute" | "session";
};

type TrainerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

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

  // Fetch active services
  const { data: services } = await supabase
    .from("bookable_services")
    .select("*")
    .eq("is_active", true)
    .order("type", { ascending: true })
    .order("name", { ascending: true });

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
    .order("full_name", { ascending: true });

  const typedServices = (services ?? []) as Service[];

  // Group services by type
  const groupClasses = typedServices.filter(s => s.type === "group");
  const facilities = typedServices.filter(s => s.type === "facility");
  const trainerList = (trainerProfiles ?? []) as TrainerProfile[];

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-4xl space-y-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Rezervácie</h1>
            <Link
              href="/bookings/my"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:text-white hover:border-white/30"
            >
              Moje rezervácie
            </Link>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-6 text-white/90">Skupinové tréningy</h2>
            {groupClasses.length === 0 ? (
              <p className="text-white/40">Zatiaľ žiadne tréningy v ponuke.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {groupClasses.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6 text-white/90">Tréneri</h2>
            {trainerList.length === 0 || !trainerService ? (
              <p className="text-white/40">Zatiaľ žiadni tréneri v ponuke.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trainerList.map(trainer => (
                  <TrainerCard
                    key={trainer.id}
                    trainer={trainer}
                    trainerServiceId={trainerService.id}
                    basePrice={trainerService.base_price}
                    priceUnit={trainerService.price_unit}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6 text-white/90">Zariadenia a wellness</h2>
            {facilities.length === 0 ? (
              <p className="text-white/40">Zatiaľ žiadne zariadenia v ponuke.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {facilities.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const getUnitDisplay = (unit: string) => {
    switch (unit) {
      case "hour": return "/ hod.";
      case "minute": return "/ min.";
      case "session": return "/ vstup";
      default: return "";
    }
  };

  return (
    <Link 
      href={`/bookings/${service.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white transition hover:border-red-500/50 hover:bg-white/[0.05]"
    >
      <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
      <div className="mt-auto pt-4 text-white/60 font-medium">
        Cena: <span className="text-white">{service.base_price}€ {getUnitDisplay(service.price_unit)}</span>
      </div>
    </Link>
  );
}

function TrainerCard({
  trainer,
  trainerServiceId,
  basePrice,
  priceUnit,
}: {
  trainer: TrainerProfile;
  trainerServiceId: string;
  basePrice: number;
  priceUnit: "hour" | "minute" | "session";
}) {
  const displayName = trainer.full_name ?? "Tréner";
  const avatarFallback = displayName.trim().charAt(0).toUpperCase();

  const unitLabel = (() => {
    switch (priceUnit) {
      case "hour":
        return "/ hod.";
      case "minute":
        return "/ min.";
      case "session":
        return "/ vstup";
      default:
        return "";
    }
  })();

  return (
    <Link
      href={`/bookings/trainers/${trainer.id}?serviceId=${trainerServiceId}`}
      className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-white transition hover:border-red-500/50 hover:bg-white/[0.05]"
    >
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
        {trainer.avatar_url ? (
          <img
            src={trainer.avatar_url}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-lg font-semibold text-white">
            {avatarFallback || "T"}
          </span>
        )}
      </div>
      <div className="flex-1">
        <div className="text-lg font-semibold text-white">
          {displayName}
        </div>
        {trainer.bio ? (
          <p className="text-sm text-white/50 line-clamp-2">{trainer.bio}</p>
        ) : null}
        <div className="mt-2 text-sm text-white/70">
          Cena: <span className="text-white">{basePrice}€ {unitLabel}</span>
        </div>
      </div>
    </Link>
  );
}