import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";

const CATEGORY_CARDS = [
  {
    href: "/bookings/trainers",
    title: "Tréneri",
    description: "Vyber si trénera a pokračuj na rezerváciu tréningu.",
    image:
      "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=800&q=80",
    alt: "Tréner na domovskej stránke",
  },
  {
    href: "/bookings/priestory",
    title: "Priestory",
    description: "Rezervuj si priestor alebo miestnosť v gyme.",
    image:
      "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Gym interior",
  },
  {
    href: "/bookings/skupinove-lekcie",
    title: "Skupinové lekcie",
    description: "Zvoľ si skupinový tréning z ponuky na domovskej stránke.",
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
    alt: "Skupinový tréning",
  },
] as const;

export default async function BookingsCatalogPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
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

  return (
    <>
      <NavBarAuth
        navLinks={[]}
        initialUser={navUser}
        initialProfile={navProfile}
      />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-12%] top-[-16%] h-[34rem] w-[34rem] rounded-full bg-red-600/20 blur-[140px]" />
        <div className="pointer-events-none absolute right-[-12%] top-[10%] h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-[160px]" />
        <div className="pointer-events-none absolute bottom-[-18%] right-[-12%] h-[34rem] w-[34rem] rounded-full bg-red-900/15 blur-[180px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-14 lg:space-y-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="max-w-3xl space-y-5 pt-4 lg:pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/35">
                Bookings
              </p>
              <h1 className="max-w-2xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Rezervácie
              </h1>
              <p className="max-w-2xl text-base leading-7 text-white/60 sm:text-lg lg:max-w-xl">
                Vyber si kategóriu a pokračuj na konkrétnu službu, trénera alebo
                termín.
              </p>
            </div>

            <Link
              href="/bookings/my"
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
            >
              Moje rezervácie
            </Link>
          </div>

          <section>
            <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
              {CATEGORY_CARDS.map((card) => (
                <CategoryTile key={card.title} {...card} />
              ))}
            </div>
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
  image,
  alt,
}: {
  href: string;
  title: string;
  description: string;
  image: string;
  alt: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-white/[0.08] via-white/[0.05] to-white/[0.03] text-left transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_50px_rgba(0,0,0,0.28)]"
    >
      <div className="relative flex h-full min-h-[20rem] flex-col items-center px-5 pb-6 pt-8 sm:px-6">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[#111111] p-1 shadow-[0_10px_25px_rgba(0,0,0,0.3)] ring-1 ring-white/10 sm:h-28 sm:w-28">
          <div className="relative h-full w-full overflow-hidden rounded-full">
            <Image
              src={image}
              alt={alt}
              fill
              sizes="112px"
              className="object-cover"
            />
          </div>
        </div>

        <div className="mt-7 flex w-full flex-1 flex-col items-center text-center">
          <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h3>
          <p className="mt-3 max-w-[14rem] text-sm leading-6 text-white/62 sm:text-[0.95rem]">
            {description}
          </p>

          <div className="mt-auto w-full pt-8">
            <div className="mx-auto flex max-w-[10rem] items-center justify-center rounded-full bg-red-500/20 px-6 py-3 text-sm font-semibold text-white transition group-hover:bg-white group-hover:text-slate-900 sm:text-base">
              Select
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
