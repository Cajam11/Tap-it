import Link from "next/link";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import {
  Smartphone,
  Scan,
  Zap,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Dumbbell,
  Clock,
  Users,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import FadeIn from "@/components/FadeIn";
import { MEMBERSHIP_PLANS } from "@/lib/memberships";
import LiveOccupancyCard from "@/components/LiveOccupancyCard";
import type { LivePresenceMember } from "@/components/LiveOccupancyCard";

import SplashWrapper from "@/components/SplashWrapper";

/* ═══════════════════════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const NAV_LINKS: [string, string][] = [
  ["#about", "O nás"],
  ["#group", "Skupinovky"],
  ["#trainers", "Tréneri"],
  ["#locations", "Priestory"],
  ["#pricing", "Cenník"],
  ["#entry", "Vstup"],
  ["#contact", "Kontakt"],
];

const HIGHLIGHTS: Array<{ value: string; label: string; Icon: LucideIcon }> = [
  { value: "1 000+ m²", label: "Tréningová plocha", Icon: Dumbbell },
  { value: "100%", label: "Špičkové vybavenie", Icon: Sparkles },
  { value: "24/7", label: "Otvorené nonstop", Icon: Clock },
  { value: "500+", label: "Aktívnych členov", Icon: Users },
];

const GROUP_TRAININGS = [
  {
    name: "LesMills",
    desc: "Sila, kondícia a energia",
    img: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80",
    span: "col-span-2 row-span-2",
  },
  {
    name: "Booty & Legs",
    desc: "Zadok, stehná a lýtka",
    img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80",
    span: "col-span-1 row-span-1",
  },
  {
    name: "Full Body",
    desc: "Sila a držanie tela",
    img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80",
    span: "col-span-1 row-span-1",
  },
  {
    name: "Stretch & Release",
    desc: "Uvoľni stuhnuté svaly",
    img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80",
    span: "col-span-1 row-span-1",
  },
];

const TRAINERS = [
  {
    name: "Ján Ostraczký",
    phone: "+421 907 767 090",
    lang: "Slovenský, Anglický",
    img: "https://i.pravatar.cc/600?img=11",
  },
  {
    name: "Tamara Iglárová",
    phone: "+421 905 824 005",
    lang: "Slovenský, Anglický",
    img: "https://i.pravatar.cc/600?img=47",
  },
  {
    name: "Laura Miškufová",
    phone: "+421 917 418 245",
    lang: "Slovenský, Anglický",
    img: "https://i.pravatar.cc/600?img=9",
  },
];

const LOCATIONS = [
  {
    name: "OC Tehelko",
    address: "Bajkalská 2i",
    area: "1 000 m²",
    hours: ["Po – Pia / 5:30 – 22:00", "So – Ne / 7:00 – 22:00"],
    badge: null,
    img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=900&q=80",
  },
  {
    name: "ePORT Mall",
    address: "Ivanská cesta 26",
    area: "2 000 m²",
    hours: ["Po – Pia / 5:30 – 22:00", "So – Ne / 7:00 – 22:00", "24/7 (schválená žiadosť)"],
    badge: "Otvorené 24/7 – NONSTOP",
    img: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=900&q=80",
  },
];

const GALLERY = [
  { src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80", alt: "Free weights area" },
  { src: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80", alt: "Cardio machines" },
  { src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80", alt: "Training floor" },
  { src: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80", alt: "Stretching area" },
  { src: "https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1200", alt: "Gym interior" },
  { src: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=800&q=80", alt: "Equipment" },
];

const PRICING = MEMBERSHIP_PLANS;

const STEPS: Array<{ n: number; title: string; desc: string; Icon: LucideIcon }> = [
  { n: 1, title: "Otvor appku", desc: "Spusti Tap-it na tvojom telefóne.", Icon: Smartphone },
  { n: 2, title: "Naskenuj sa", desc: "Pridrž telefón k skeneru pri vstupe.", Icon: Scan },
  { n: 3, title: "Trénuj", desc: "Žiadne čakanie. Rovno na tréning.", Icon: Zap },
];

const SOCIAL: Array<{ label: string; href: string; Icon: LucideIcon }> = [
  { label: "Facebook", href: "#", Icon: Facebook },
  { label: "Instagram", href: "#", Icon: Instagram },
  { label: "Twitter", href: "#", Icon: Twitter },
  { label: "LinkedIn", href: "#", Icon: Linkedin },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const navUser = user
    ? {
        id: user.id,
        email: user.email ?? null,
        user_metadata: {
          full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
          avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
        },
      }
    : null;

  let navProfile: { full_name?: string | null; avatar_url?: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    navProfile = data ?? null;
  }

  let liveOccupancyCount = 0;
  const { count: openEntriesCount } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .is("check_out", null)
    .eq("is_valid", true);

  if (typeof openEntriesCount === "number") {
    liveOccupancyCount = openEntriesCount;
  }

  let initialMembers: LivePresenceMember[] = [];
  if (user) {
    const { data: presenceRows } = await supabase.rpc("get_live_gym_presence");
    if (Array.isArray(presenceRows)) {
      initialMembers = presenceRows
        .map((row) => {
          if (!row || typeof row !== "object") {
            return null;
          }

          const record = row as Partial<LivePresenceMember>;
          if (
            typeof record.user_id !== "string" ||
            typeof record.display_name !== "string" ||
            typeof record.check_in !== "string"
          ) {
            return null;
          }

          return {
            user_id: record.user_id,
            display_name: record.display_name,
            avatar_url: typeof record.avatar_url === "string" ? record.avatar_url : null,
            check_in: record.check_in,
          };
        })
        .filter((row): row is LivePresenceMember => row !== null);
    }
  }

  return (
    <SplashWrapper>
      {/* Skip link */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-4 focus-visible:left-4 focus-visible:z-[100] focus-visible:bg-white focus-visible:text-black focus-visible:px-4 focus-visible:py-2 focus-visible:rounded-md"
      >
        Skip to main content
      </a>

      {/* ── Floating pill nav ─────────────────────────────────────────── */}
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main id="main" className="bg-[#080808] overflow-x-hidden">

        {/* ════════════════════════ HERO ════════════════════════════════ */}
        <section
          className="relative min-h-[100vh] flex items-end pb-40 sm:items-center sm:pb-0 px-6 lg:px-12"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-label="Hero"
        >
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.65) 0%, rgba(8,8,8,0.35) 40%, #080808 100%)" }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 80%, rgba(220,38,38,0.10) 0%, transparent 70%)" }}
            aria-hidden="true"
          />

          <div className="relative z-10 mx-auto max-w-7xl w-full anim-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/15 border border-red-500/20 text-red-400 text-sm font-medium mb-8 anim-fade" style={{ animationDelay: "0ms" }}>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              Next Level Fitness · Powered by Tap-it
            </div>

            <h1 className="text-6xl sm:text-8xl lg:text-[120px] xl:text-[140px] font-black text-white leading-[0.95] tracking-tight uppercase">
              Špičkové
              <br />
              <span className="bg-gradient-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-transparent">
                prostredie
              </span>
            </h1>

            <p className="mt-8 text-lg sm:text-xl lg:text-2xl text-white/50 max-w-2xl leading-relaxed">
              Moderné vybavenie, prémiové prostredie a bezproblémový vstup
              cez&nbsp;Tap-it. Žiadne fronty. Len výsledky.
            </p>

            <div className="mt-12 flex items-center gap-5 flex-wrap">
              <Link
                href="/register"
                className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold px-10 py-4 rounded-full transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-white outline-none shadow-[0_0_30px_rgba(220,38,38,0.35)] text-base uppercase tracking-wide"
              >
                Pridaj sa
              </Link>
              <a
                href="#about"
                className="group flex items-center gap-2 text-white/60 hover:text-white text-base font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full px-3 py-3"
              >
                Zisti viac
                <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        {/* ════════════════════ HIGHLIGHT STATS ═════════════════════════ */}
        <section className="relative z-10 -mt-20 px-4 lg:px-8" aria-label="Key statistics">
          <div className="mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-4 gap-4">
            {HIGHLIGHTS.map(({ value, label, Icon }, i) => (
              <FadeIn key={label} delay={i * 80}>
                <div
                  className="rounded-3xl border border-white/[0.08] p-7 sm:p-8 text-center"
                  style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  }}
                >
                  <Icon className="w-6 h-6 text-red-500 mx-auto mb-3" aria-hidden="true" />
                  <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{value}</p>
                  <p className="text-xs text-white/40 mt-2 font-medium uppercase tracking-wider">{label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>

        {/* ════════════════════ LIVE CAPACITY ═══════════════════════════ */}
        <section
          className="py-28 px-4 lg:px-8"
          style={{ background: "linear-gradient(180deg, #080808 0%, #0e0a0a 50%, #080808 100%)" }}
          aria-labelledby="capacity-heading"
        >
          <LiveOccupancyCard
            initialCount={liveOccupancyCount}
            initialMembers={initialMembers}
            showMemberList={Boolean(user)}
          />
        </section>

        {/* ════════════════════ GROUP TRAININGS ═════════════════════════ */}
        <section
          id="group"
          className="py-28 px-4 lg:px-8"
          style={{ background: "linear-gradient(180deg, #080808, #0c0c0c)" }}
          aria-labelledby="group-heading"
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn>
              <h2 id="group-heading" className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic leading-[0.95]">
                Skupinové{" "}
                <span className="text-red-500">tréningy</span>
              </h2>
              <p className="mt-6 text-white/50 text-lg sm:text-xl max-w-2xl leading-relaxed">
                ZADARMO! v rámci platného jednorazového vstupu (14€) alebo platnej permanentky či MultiSport a UpBalansea.
              </p>
              <Link
                href="#pricing"
                className="inline-block mt-8 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-sm px-8 py-3.5 rounded-full transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-white outline-none uppercase tracking-wide"
              >
                Zobraziť celý rozvrh
              </Link>
            </FadeIn>

            {/* Bento grid — 1 large left + stacked right */}
            <div className="mt-14 grid grid-cols-1 md:grid-cols-4 auto-rows-[240px] sm:auto-rows-[280px] gap-4">
              {GROUP_TRAININGS.map((t, i) => (
                <FadeIn key={t.name} delay={i * 80} className={t.span}>
                  <div className="relative rounded-3xl overflow-hidden group h-full cursor-default border border-white/[0.06]">
                    <img
                      src={t.img}
                      alt={t.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-[transform] duration-700 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" aria-hidden="true" />

                    {/* Arrow icon top-right */}
                    <div className="absolute top-5 right-5 w-11 h-11 rounded-xl border border-white/20 bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true">
                      <ArrowUpRight className="w-5 h-5 text-white" />
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                      <p className="text-xl sm:text-2xl font-bold text-white">{t.name}</p>
                      <p className="text-sm text-white/60 mt-1">{t.desc}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ ABOUT / REASONS ═════════════════════════ */}
        <section
          id="about"
          className="py-32 px-4 lg:px-8 relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, #0c0c0c, #080808)" }}
          aria-labelledby="about-heading"
        >
          <div
            className="absolute right-0 top-0 w-1/2 h-full pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 60% at 100% 50%, rgba(220,38,38,0.06) 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-7xl grid md:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <h2
                id="about-heading"
                className="text-5xl sm:text-7xl lg:text-8xl font-black text-white leading-[0.95] uppercase italic"
              >
                Dôvody
                <br />
                začať cvičiť
              </h2>
              <p className="mt-8 text-white/50 text-lg leading-relaxed max-w-xl">
                Naša posilňovňa ponúka viac ako 1&nbsp;000&nbsp;m² tréningovej plochy,
                špičkové vybavenie a moderné LED prostredie. Po náročnom tréningu si
                môžeš dopriať relax v saune. Plne integrované s technológiou Tap-it
                pre rýchly a bezproblémový vstup.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/register"
                  className="bg-white/[0.06] hover:bg-white/[0.12] text-white font-semibold text-sm px-8 py-4 rounded-full border border-white/[0.12] transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-white outline-none uppercase tracking-wide"
                >
                  Vyber si svoj priestor
                </Link>
              </div>
            </FadeIn>

            <FadeIn delay={150} className="relative">
              <div className="overflow-hidden rounded-3xl">
                <img
                  src="https://images.unsplash.com/photo-1550345332-09e3ac987658?w=800&q=80"
                  alt="Trainer"
                  width={800}
                  height={1000}
                  loading="lazy"
                  className="w-full aspect-[3/4] object-cover"
                />
              </div>
              {/* Overlay price card like 77fitness */}
              <div
                className="absolute bottom-8 left-8 rounded-2xl p-6 border border-white/[0.1]"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
                }}
              >
                <p className="text-5xl sm:text-6xl font-black text-white tracking-tight">14 €</p>
                <p className="text-sm text-white/50 mt-1">Jednorazový vstup</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ════════════════════ LOCATIONS ═══════════════════════════════ */}
        <section
          id="locations"
          className="py-28 px-4 lg:px-8"
          style={{ background: "linear-gradient(180deg, #080808, #0c0c0c)" }}
          aria-labelledby="locations-heading"
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn className="text-center mb-16">
              <h2 id="locations-heading" className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic leading-[0.95]">
                Vyber si svoj{" "}
                <span className="text-red-500">priestor</span>
              </h2>
            </FadeIn>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {LOCATIONS.map((loc, i) => (
                <FadeIn key={loc.name} delay={i * 120}>
                  <div className="relative rounded-3xl overflow-hidden group h-[420px] sm:h-[480px] border border-white/[0.06]">
                    <img
                      src={loc.img}
                      alt={loc.name}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover transition-[transform] duration-700 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" aria-hidden="true" />

                    {/* arrow icon top-right */}
                    <div className="absolute top-6 right-6 w-12 h-12 rounded-xl border border-white/20 bg-black/30 backdrop-blur-sm flex items-center justify-center" aria-hidden="true">
                      <ArrowUpRight className="w-5 h-5 text-white" />
                    </div>

                    {/* badge */}
                    {loc.badge && (
                      <span className="absolute top-6 left-6 bg-red-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full">
                        {loc.badge}
                      </span>
                    )}

                    {/* info card overlay */}
                    <div
                      className="absolute bottom-6 left-6 right-6 rounded-2xl p-6 sm:p-7"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <p className="text-3xl sm:text-4xl font-black text-white">{loc.name}</p>
                      <p className="text-sm text-white/60 mt-2">
                        {loc.address} | <span className="font-semibold text-white/80">{loc.area}</span> rozloha
                      </p>
                      <div className="mt-3 space-y-0.5">
                        {loc.hours.map((h) => (
                          <p key={h} className="text-sm text-white/50">{h}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ TRAINERS ════════════════════════════════ */}
        <section
          id="trainers"
          className="py-28 px-4 lg:px-8"
          style={{ background: "linear-gradient(180deg, #0c0c0c, #080808)" }}
          aria-labelledby="trainers-heading"
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn className="text-center mb-16">
              <h2 id="trainers-heading" className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic leading-[0.95]">
                Osobní{" "}
                <span className="text-red-500">tréneri</span>
              </h2>
              <p className="mt-6 text-white/45 text-lg sm:text-xl max-w-2xl mx-auto">
                Skúsení a profesionálni osobní tréneri pripravení posunúť tvoj výkon
              </p>
            </FadeIn>

            <ul className="grid grid-cols-1 sm:grid-cols-3 gap-6 list-none p-0" role="list">
              {TRAINERS.map((t, i) => (
                <FadeIn key={t.name} as="li" delay={i * 120}>
                  <div className="group">
                    {/* image card */}
                    <div className="relative rounded-3xl overflow-hidden border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-300">
                      <img
                        src={t.img}
                        alt={t.name}
                        width={600}
                        height={750}
                        loading="lazy"
                        className="w-full aspect-[3/4] object-cover transition-[transform] duration-700 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" aria-hidden="true" />

                      {/* arrow icon top-right like 77fitness */}
                      <div className="absolute top-5 right-5 w-12 h-12 rounded-xl border border-white/20 bg-black/30 backdrop-blur-sm flex items-center justify-center" aria-hidden="true">
                        <ArrowUpRight className="w-5 h-5 text-white" />
                      </div>

                      {/* language overlay at bottom of image */}
                      <div className="absolute bottom-0 inset-x-0 px-6 pb-5">
                        <p className="text-sm text-white/60">{t.lang}</p>
                      </div>
                    </div>

                    {/* name + phone below card */}
                    <div className="mt-5 text-center">
                      <p className="text-xl sm:text-2xl font-bold text-white">{t.name}</p>
                      <a
                        href={`tel:${t.phone.replace(/\s/g, "")}`}
                        className="block text-base text-white/40 hover:text-white transition-colors mt-1 focus-visible:ring-2 focus-visible:ring-white rounded outline-none"
                      >
                        {t.phone}
                      </a>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </ul>
          </div>
        </section>

        {/* ════════════════════ GALLERY ═════════════════════════════════ */}
        <section
          id="gallery"
          className="py-28 px-4 lg:px-8"
          style={{ background: "linear-gradient(180deg, #080808 0%, #0a0808 50%, #080808 100%)" }}
          aria-labelledby="gallery-heading"
        >
          <div className="mx-auto max-w-7xl">
            <FadeIn className="text-center mb-14">
              <h2 id="gallery-heading" className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic leading-[0.95]">
                Vysokokvalitné{" "}
                <span className="text-red-500">vybavenie</span>
              </h2>
              <p className="mt-6 text-white/45 text-lg max-w-xl mx-auto">
                Moderné stroje a unikátne prostredie pre tvoj progres a motiváciu.
              </p>
            </FadeIn>

            <FadeIn className="grid grid-cols-2 sm:grid-cols-3 gap-4" delay={80}>
              {GALLERY.map((img) => (
                <div key={img.alt} className="overflow-hidden rounded-3xl border border-white/[0.06] group bg-black/40">
                  <img
                    src={img.src}
                    alt={img.alt}
                    width={800}
                    height={600}
                    loading="lazy"
                    className="w-full h-full aspect-[4/3] object-cover object-center scale-100 transition-[transform] duration-700 group-hover:scale-110 motion-reduce:group-hover:scale-100"
                  />
                </div>
              ))}
            </FadeIn>
          </div>
        </section>

        {/* ════════════════════ PRICING ═════════════════════════════════ */}
        <section
          id="pricing"
          className="py-28 px-4 lg:px-8 relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, #080808, #0c0c0c)" }}
          aria-labelledby="pricing-heading"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(220,38,38,0.06) 0%, transparent 70%)" }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-5xl">
            <FadeIn className="text-center mb-14">
              <h2 id="pricing-heading" className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic leading-[0.95]">
                Vyber si{" "}
                <span className="text-red-500">členstvo</span>
              </h2>
              <p className="mt-6 text-white/45 text-lg max-w-lg mx-auto">
                Ponúkame rôzne možnosti — jednorazový vstup, mesačné či ročné balíčky.
              </p>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {PRICING.map((p, i) => (
                <FadeIn key={p.name} delay={i * 100}>
                  <div
                    className={`rounded-3xl p-8 border h-full flex flex-col ${
                      p.highlight
                        ? "border-red-500/40 shadow-[0_0_50px_rgba(220,38,38,0.12)]"
                        : "border-white/[0.08]"
                    }`}
                    style={{
                      background: p.highlight
                        ? "linear-gradient(160deg, rgba(220,38,38,0.12) 0%, rgba(255,255,255,0.03) 100%)"
                        : "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                    }}
                  >
                    {p.highlight && (
                      <span className="inline-block text-[11px] font-bold uppercase tracking-wider bg-red-600 text-white px-4 py-1.5 rounded-full mb-5 self-start">
                        Najobľúbenejší
                      </span>
                    )}
                    <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">{p.name}</p>
                    <p className="mt-3">
                      <span className="text-5xl font-black text-white">{p.price}</span>
                      <span className="text-base text-white/30 ml-2">{p.period}</span>
                    </p>
                    <ul className="mt-8 space-y-3.5 flex-1" role="list">
                      {p.features.map((f) => (
                        <li key={f} className="text-base text-white/50 flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" aria-hidden="true" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={user ? "/membership" : "/register"}
                      className={`mt-8 block text-center text-sm font-bold py-4 rounded-full transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-white outline-none uppercase tracking-wide ${
                        p.highlight
                          ? "bg-red-600 hover:bg-red-500 text-white"
                          : "bg-white/[0.07] hover:bg-white/[0.12] text-white/70 hover:text-white border border-white/[0.08]"
                      }`}
                    >
                      Vybrať
                    </Link>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════ TAP-IT ENTRY ════════════════════════════ */}
        <section
          id="entry"
          className="py-32 px-4 lg:px-8 relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, #0c0c0c, #1a0505 40%, #1a0505 60%, #0c0c0c)" }}
          aria-labelledby="entry-heading"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(220,38,38,0.09) 0%, transparent 70%)" }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl text-center">
            <FadeIn>
              <h2 id="entry-heading" className="text-5xl sm:text-7xl lg:text-8xl font-black text-white uppercase italic leading-[0.95]">
                Bezproblémový vstup{" "}
                <span className="text-red-500">s Tap-it</span>
              </h2>
              <p className="mt-6 text-white/45 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed">
                Zabudni na kartičky. Tvoj telefón je tvoja permanentka — rýchlo, bezpečne a pohodlne.
              </p>
            </FadeIn>

            <div className="mt-20 grid grid-cols-3 gap-8 sm:gap-16">
              {STEPS.map(({ n, title, desc, Icon }, i) => (
                <FadeIn key={title} delay={i * 120}>
                  <div className="flex flex-col items-center gap-5">
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, rgba(220,38,38,0.2), rgba(220,38,38,0.05))",
                        border: "1px solid rgba(220,38,38,0.2)",
                        boxShadow: "0 0 30px rgba(220,38,38,0.12)",
                      }}
                      aria-hidden="true"
                    >
                      <Icon className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-base sm:text-lg font-bold text-white">{n}.&nbsp;{title}</p>
                    <p className="text-sm text-white/35 leading-relaxed">{desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn className="mt-16" delay={300}>
              <Link
                href="/register"
                className="inline-block bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-base px-10 py-4 rounded-full transition-colors touch-manipulation focus-visible:ring-2 focus-visible:ring-white outline-none shadow-[0_0_28px_rgba(220,38,38,0.3)] uppercase tracking-wide"
              >
                Stiahnuť Tap-it
              </Link>
            </FadeIn>
          </div>
        </section>

      </main>

      {/* ════════════════════ FOOTER ════════════════════════════════════ */}
      <footer
        id="contact"
        className="px-4 lg:px-8 py-20 border-t border-white/[0.06]"
        style={{ background: "linear-gradient(180deg, #0a0a0a, #060606)" }}
      >
        <div className="mx-auto max-w-7xl grid grid-cols-2 sm:grid-cols-4 gap-12">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-extrabold text-white text-xl">
              Premium<span className="text-red-500">Gyms</span>
            </p>
            <p className="mt-4 text-sm text-white/30 leading-relaxed max-w-[220px]">
              Next Level Fitness. Plne integrované s technológiou Tap-it.
            </p>
            <div className="flex gap-3 mt-6">
              {SOCIAL.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.06] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-white outline-none"
                >
                  <Icon className="w-4 h-4 text-white/40" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white/60 mb-5 uppercase tracking-wider">Navigácia</p>
            <nav className="space-y-3" aria-label="Footer navigation">
              {NAV_LINKS.map(([href, label]) => (
                <a
                  key={href}
                  href={href}
                  className="block text-sm text-white/30 hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-white rounded outline-none"
                >
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold text-white/60 mb-5 uppercase tracking-wider">Kontakt</p>
            <div className="space-y-4 text-sm text-white/30">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-white/20" aria-hidden="true" />
                <span>123 Fitness Boulevard<br />Metro City, NY 10023</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 shrink-0 text-white/20" aria-hidden="true" />
                <a href="tel:+15551234567" className="hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-white rounded outline-none">
                  (555) 123-4567
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0 text-white/20" aria-hidden="true" />
                <a href="mailto:info@premiumgyms.com" className="hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-white rounded outline-none">
                  info@premiumgyms.com
                </a>
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-white/60 mb-5 uppercase tracking-wider">Informácie</p>
            <div className="space-y-3 text-sm text-white/30">
              <a href="#" className="block hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-white rounded outline-none">Všeobecné obchodné podmienky</a>
              <a href="#" className="block hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-white rounded outline-none">Ochrana osobných údajov</a>
              <a href="#" className="block hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-white rounded outline-none">Prevádzkový poriadok</a>
              <a href="#" className="block hover:text-white transition-colors focus-visible:ring-1 focus-visible:ring-white rounded outline-none">Cookies</a>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl mt-16 pt-6 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/15">
            © {new Date().getFullYear()} Premium Gyms. Všetky práva vyhradené.
          </p>
          <p className="text-xs text-white/15">
            Powered by <span className="text-red-500/50">Tap-it</span>
          </p>
        </div>
      </footer>
    </SplashWrapper>
  );
}

