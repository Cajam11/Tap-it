import Link from "next/link";
import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";

type Service = {
  id: string;
  name: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
};

export default async function FacilitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single();

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

  const { data: services } = await supabase
    .from("bookable_services")
    .select("id, name, base_price, price_unit")
    .eq("type", "facility")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const facilities = (services ?? []) as Service[];

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-5xl space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/35">Bookings</p>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Priestory</h1>
              <p className="max-w-xl text-base text-white/60">Vyber si priestor, ktorý chceš rezervovať.</p>
            </div>

            <Link
              href="/bookings"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
            >
              Späť na rozcestník
            </Link>
          </div>

          {facilities.length === 0 ? (
            <p className="text-white/40">Zatiaľ žiadne priestory v ponuke.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {facilities.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ServiceCard({ service }: { service: Service }) {
  const unitLabel = service.price_unit === "session" ? "/ vstup" : service.price_unit === "minute" ? "/ min." : "/ hod.";

  return (
    <Link
      href={`/bookings/${service.id}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white transition hover:border-red-500/50 hover:bg-white/[0.05]"
    >
      <h3 className="mb-2 text-xl font-semibold">{service.name}</h3>
      <div className="mt-auto pt-4 font-medium text-white/60">
        Cena: <span className="text-white">{service.base_price}€ {unitLabel}</span>
      </div>
    </Link>
  );
}