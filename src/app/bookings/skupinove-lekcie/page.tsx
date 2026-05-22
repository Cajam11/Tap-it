import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";

const GROUP_CLASS_PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&q=80",
  "https://images.pexels.com/photos/6456037/pexels-photo-6456037.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&q=80",
] as const;

type Service = {
  id: string;
  name: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
};

export default async function GroupClassesPage() {
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

  const { data: services } = await supabase
    .from("bookable_services")
    .select("id, name, base_price, price_unit")
    .eq("type", "group")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const groupClasses = (services ?? []) as Service[];

  return (
    <>
      <NavBarAuth
        navLinks={[]}
        initialUser={navUser}
        initialProfile={navProfile}
      />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-12 lg:space-y-14">
          <div className="flex flex-col gap-6 pt-4 lg:pt-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.38em] text-white/35">
                <Link
                  href="/bookings"
                  className="inline-flex items-center gap-2 transition hover:text-white/65"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Bookings
                </Link>
              </div>
            </div>

            <div className="max-w-3xl space-y-5">
              <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Skupinové lekcie
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/60 sm:text-lg lg:max-w-xl">
                Vyber si skupinovú lekciu, ktorú chceš rezervovať.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-white/55">
              <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 font-medium text-white/70">
                {groupClasses.length} dostupných lekcií
              </span>
              <span className="h-px w-16 bg-white/15" />
              <span>Vyber si podľa názvu a ceny</span>
            </div>
          </div>

          {groupClasses.length === 0 ? (
            <p className="text-white/40">
              Zatiaľ žiadne skupinové lekcie v ponuke.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
              {groupClasses.map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  image={
                    GROUP_CLASS_PLACEHOLDER_IMAGES[
                      index % GROUP_CLASS_PLACEHOLDER_IMAGES.length
                    ]
                  }
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ServiceCard({ service, image }: { service: Service; image: string }) {
  const unitLabel =
    service.price_unit === "session"
      ? "/ vstup"
      : service.price_unit === "minute"
        ? "/ min."
        : "/ hod.";

  return (
    <Link
      href={`/bookings/${service.id}`}
      className="group relative flex min-h-[24rem] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] text-white transition hover:-translate-y-1 hover:border-red-500/40 hover:bg-white/[0.05]"
    >
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={service.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
          priority={false}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />

      <div className="relative mt-auto p-5 sm:p-6">
        <div className="rounded-[1.5rem] border border-white/10 bg-black/40 px-4 py-4 text-center backdrop-blur-md">
          <div className="text-xl font-semibold text-white">{service.name}</div>
          <div className="mt-2 text-sm text-white/70">
            Cena: {service.base_price}€ {unitLabel}
          </div>
        </div>
      </div>
    </Link>
  );
}
