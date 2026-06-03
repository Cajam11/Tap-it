import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import { Award, Dumbbell, Settings, User } from "lucide-react";

const NAV_LINKS: [string, string][] = [];

type Goal = "strength" | "fitness" | "fat_loss" | "mobility" | "mixed";
type Level = "beginner" | "intermediate" | "advanced";
type Equipment = "none" | "basic" | "full_gym";

type EarnedBadge = {
  key: string;
  name: string;
  description: string;
};

function normalizeGoal(value: unknown): Goal {
  const allowed: Goal[] = [
    "strength",
    "fitness",
    "fat_loss",
    "mobility",
    "mixed",
  ];
  return typeof value === "string" && allowed.includes(value as Goal)
    ? (value as Goal)
    : "mixed";
}

function normalizeLevel(value: unknown): Level {
  const allowed: Level[] = ["beginner", "intermediate", "advanced"];
  return typeof value === "string" && allowed.includes(value as Level)
    ? (value as Level)
    : "beginner";
}

function normalizeEquipment(value: unknown): Equipment {
  const allowed: Equipment[] = ["none", "basic", "full_gym"];
  return typeof value === "string" && allowed.includes(value as Equipment)
    ? (value as Equipment)
    : "basic";
}

function splitStoredAddress(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) {
    return { city: "", street: "", postalCode: "" };
  }

  const parts = raw.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      city: parts[0] ?? "",
      street: parts[1] ?? "",
      postalCode: parts.slice(2).join(", "),
    };
  }

  return { city: "", street: raw, postalCode: "" };
}

function formatBirthDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getCurrentStreak(checkIns: string[]) {
  if (!checkIns.length) return 0;

  const uniqueDays = Array.from(
    new Set(
      checkIns.map((value) => new Date(value).toISOString().slice(0, 10)),
    ),
  ).sort((a, b) => (a > b ? -1 : 1));

  let streak = 0;
  const cursor = new Date();

  const latestDate = new Date(uniqueDays[0]);
  const today = new Date();
  const latestGapDays = Math.floor(
    (today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (latestGapDays > 1) return 0;
  if (latestGapDays === 1) {
    cursor.setDate(cursor.getDate() - 1);
  }

  const daySet = new Set(uniqueDays);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function buildDynamicBadges(stats: {
  monthTrainings: number;
  totalTrainings: number;
  streak: number;
  hasActiveMembership: boolean;
}): EarnedBadge[] {
  const badges: EarnedBadge[] = [];

  if (stats.streak >= 3) {
    badges.push({
      key: "streak_3",
      name: "Consistency Starter",
      description: "3 dni po sebe si bol na treningu.",
    });
  }

  if (stats.monthTrainings >= 12) {
    badges.push({
      key: "month_12",
      name: "Monthly Machine",
      description: "Aspoň 12 treningov za mesiac.",
    });
  }

  if (stats.totalTrainings >= 50) {
    badges.push({
      key: "total_50",
      name: "Iron Habit",
      description: "50+ treningov celkovo.",
    });
  }

  if (stats.hasActiveMembership) {
    badges.push({
      key: "active_membership",
      name: "Active Member",
      description: "Mas aktivne clenstvo.",
    });
  }

  return badges;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    profileRes,
    totalCountRes,
    streakEntriesRes,
    membershipRes,
    dbBadgesRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "email, full_name, avatar_url, bio, height_cm, weight_kg, goal, experience_level, sessions_per_week, session_length_min, equipment_level, onboarding_completed_at, created_at, phone, address, date_of_birth, is_verified",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("entries")
      .select("check_in")
      .eq("user_id", user.id)
      .order("check_in", { ascending: false })
      .limit(120),
    supabase
      .from("user_memberships")
      .select("status, end_date, membership:memberships(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_badges")
      .select("earned_at, badge:badges(name, description)")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false })
      .limit(6),
  ]);

  const profile = profileRes.data;
  const profileAddress = splitStoredAddress(profile?.address);

  const initialProfile = {
    email:
      typeof profile?.email === "string" ? profile.email : (user.email ?? ""),
    full_name:
      typeof profile?.full_name === "string"
        ? profile.full_name
        : typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : (user.email?.split("@")[0] ?? ""),
    avatar_url:
      typeof profile?.avatar_url === "string"
        ? profile.avatar_url
        : typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : null,
    bio: typeof profile?.bio === "string" ? profile.bio : "",
    height_cm:
      typeof profile?.height_cm === "number"
        ? profile.height_cm
        : typeof user.user_metadata?.height_cm === "number"
          ? user.user_metadata.height_cm
          : null,
    weight_kg:
      typeof profile?.weight_kg === "number"
        ? profile.weight_kg
        : typeof user.user_metadata?.weight_kg === "number"
          ? user.user_metadata.weight_kg
          : null,
    goal: normalizeGoal(profile?.goal),
    experience_level: normalizeLevel(profile?.experience_level),
    sessions_per_week:
      typeof profile?.sessions_per_week === "number"
        ? profile.sessions_per_week
        : 3,
    session_length_min:
      typeof profile?.session_length_min === "number"
        ? profile.session_length_min
        : 45,
    equipment_level: normalizeEquipment(profile?.equipment_level),
    phone: typeof profile?.phone === "string" ? profile.phone : null,
    address: typeof profile?.address === "string" ? profile.address : null,
    date_of_birth: typeof profile?.date_of_birth === "string" ? profile.date_of_birth : null,
    is_verified: profile?.is_verified ?? false,
  };

  const totalTrainings = totalCountRes.count ?? 0;

  const streakEntries = (streakEntriesRes.data ?? []).map(
    (item) => item.check_in,
  );
  const lastTrainingAt = streakEntries[0] ?? null;
  const streak = getCurrentStreak(streakEntries);

  const membershipRow = membershipRes.data;
  const hasActiveMembership = Boolean(membershipRow);

  const dynamicBadges = buildDynamicBadges({
    monthTrainings: 0,
    totalTrainings,
    streak,
    hasActiveMembership,
  });

  const dbBadges: EarnedBadge[] = (dbBadgesRes.data ?? []).flatMap((row) => {
    if (!row.badge || typeof row.badge !== "object") return [];
    const badge = row.badge as { name?: unknown; description?: unknown };
    if (typeof badge.name !== "string") return [];
    return [
      {
        key: `db_${badge.name}`,
        name: badge.name,
        description:
          typeof badge.description === "string"
            ? badge.description
            : "Odznak ziskany aktivitou.",
      },
    ];
  });

  const uniqueBadges = Array.from(
    new Map(
      [...dbBadges, ...dynamicBadges].map((badge) => [badge.name, badge]),
    ).values(),
  ).slice(0, 8);

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
        navLinks={NAV_LINKS}
        initialUser={navUser}
        initialProfile={navProfile}
      />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-5xl space-y-8">

          {/* Profile header — same style as membership page */}
          <section className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <Link
              href="/settings"
              aria-label="Otvorit nastavenia"
              className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/75 transition hover:border-red-500/50 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Link>

            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                {initialProfile.avatar_url ? (
                  <Image
                    src={initialProfile.avatar_url}
                    alt="Profilovy avatar"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-black text-white">
                    {(initialProfile.full_name.trim().charAt(0) || "U").toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">PROFIL</p>
                <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                  {initialProfile.full_name}
                </h1>
                <p className="mt-1 text-sm text-white/60">{initialProfile.email}</p>
              </div>
            </div>
          </section>

          {/* Details card — two-column layout with vertical divider */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-bold text-white">Detaily</h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-white/10">
              {/* Left column */}
              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-xs text-white/50">Bio</p>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white">
                    {initialProfile.bio || <span className="text-white/35">—</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-white/50">Výška / Váha</p>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white">
                      {initialProfile.height_cm ?? "-"} cm / {initialProfile.weight_kg ?? "-"} kg
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-white/50">Úroveň</p>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white capitalize">
                      {initialProfile.experience_level}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-white/50">Cieľ / Vybavenie</p>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white capitalize">
                    {initialProfile.goal} / {initialProfile.equipment_level}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-3 lg:pl-6">
                <div>
                  <p className="mb-1 text-xs text-white/50">Dátum narodenia</p>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white">
                    {formatBirthDate(initialProfile.date_of_birth)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs text-white/50">Stav účtu</p>
                    <div className={`rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm font-semibold ${initialProfile.is_verified ? "text-green-400" : "text-yellow-400"}`}>
                      {initialProfile.is_verified ? "Overený" : "Čaká na schválenie"}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-white/50">Telefón</p>
                    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white">
                      {initialProfile.phone ?? <span className="text-white/35">—</span>}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs text-white/50">Adresa</p>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white">
                    {profileAddress.city || profileAddress.street || profileAddress.postalCode
                      ? `${profileAddress.city} / ${profileAddress.street} / ${profileAddress.postalCode}`
                      : <span className="text-white/35">—</span>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom row — Odznaky + Aktivita */}
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-bold text-white">Odznaky</h2>
              </div>

              {uniqueBadges.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {uniqueBadges.map((badge) => (
                    <div
                      key={badge.key}
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
                    >
                      <p className="text-xs font-semibold text-white">{badge.name}</p>
                      <p className="mt-0.5 text-xs text-white/50">{badge.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/50">
                  Zatiaľ bez odznakov. Prvý získaš po pravidelných tréningoch.
                </p>
              )}
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-red-400" />
                <h2 className="text-sm font-bold text-white">Aktivita</h2>
              </div>
              <div className="space-y-3 text-xs">
                <p className="text-white/60">
                  Celkovo tréningov:{" "}
                  <span className="font-semibold text-white">{totalTrainings}</span>
                </p>
                <p className="text-white/60">
                  Posledný tréning:{" "}
                  <span className="font-semibold text-white">
                    {lastTrainingAt
                      ? new Date(lastTrainingAt).toLocaleDateString("sk-SK")
                      : "zatiaľ žiadny"}
                  </span>
                </p>
                <p className="text-white/60">
                  Dĺžka preferencie:{" "}
                  <span className="font-semibold text-white">
                    {initialProfile.session_length_min} min
                  </span>
                </p>
              </div>
            </article>
          </div>

        </div>
      </main>
    </>
  );
}
