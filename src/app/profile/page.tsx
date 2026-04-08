import { redirect } from "next/navigation";
import Link from "next/link";
import NavBarAuth from "@/components/NavBarAuth";
import WeightChart from "@/components/profile/WeightChart";
import { createClient } from "@/lib/supabase/server";
import { Award, CalendarCheck2, Clock3, Dumbbell, ShieldCheck, Trophy, LineChart as LineChartIcon, Settings } from "lucide-react";

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
  const allowed: Goal[] = ["strength", "fitness", "fat_loss", "mobility", "mixed"];
  return typeof value === "string" && allowed.includes(value as Goal) ? (value as Goal) : "mixed";
}

function normalizeLevel(value: unknown): Level {
  const allowed: Level[] = ["beginner", "intermediate", "advanced"];
  return typeof value === "string" && allowed.includes(value as Level) ? (value as Level) : "beginner";
}

function normalizeEquipment(value: unknown): Equipment {
  const allowed: Equipment[] = ["none", "basic", "full_gym"];
  return typeof value === "string" && allowed.includes(value as Equipment) ? (value as Equipment) : "basic";
}

function getCurrentStreak(checkIns: string[]) {
  if (!checkIns.length) return 0;

  const uniqueDays = Array.from(
    new Set(checkIns.map((value) => new Date(value).toISOString().slice(0, 10)))
  ).sort((a, b) => (a > b ? -1 : 1));

  let streak = 0;
  let cursor = new Date();

  const latestDate = new Date(uniqueDays[0]);
  const today = new Date();
  const latestGapDays = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    profileRes,
    monthEntriesRes,
    totalCountRes,
    streakEntriesRes,
    membershipRes,
    dbBadgesRes,
    weightLogsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name, avatar_url, bio, height_cm, weight_kg, goal, experience_level, sessions_per_week, session_length_min, equipment_level, onboarding_completed_at, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("entries")
      .select("duration_min")
      .eq("user_id", user.id)
      .gte("check_in", monthStart.toISOString()),
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
    supabase
      .from("weight_logs")
      .select("id, weight_kg, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(120),
  ]);

  const profile = profileRes.data;

  const initialProfile = {
    email: typeof profile?.email === "string" ? profile.email : user.email ?? "",
    full_name:
      typeof profile?.full_name === "string"
        ? profile.full_name
        : typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : user.email?.split("@")[0] ?? "",
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
      typeof profile?.sessions_per_week === "number" ? profile.sessions_per_week : 3,
    session_length_min:
      typeof profile?.session_length_min === "number" ? profile.session_length_min : 45,
    equipment_level: normalizeEquipment(profile?.equipment_level),
  };

  const monthTrainings = (monthEntriesRes.data ?? []).length;
  const totalTrainings = totalCountRes.count ?? 0;
  const monthMinutes = (monthEntriesRes.data ?? []).reduce(
    (acc, row) => acc + (typeof row.duration_min === "number" ? row.duration_min : 0),
    0
  );

  const streakEntries = (streakEntriesRes.data ?? []).map((item) => item.check_in);
  const lastTrainingAt = streakEntries[0] ?? null;
  const streak = getCurrentStreak(streakEntries);

  const membershipRow = membershipRes.data;
  const hasActiveMembership = Boolean(membershipRow);
  const membershipName =
    membershipRow &&
    typeof membershipRow.membership === "object" &&
    membershipRow.membership !== null &&
    "name" in membershipRow.membership &&
    typeof membershipRow.membership.name === "string"
      ? membershipRow.membership.name
      : null;

  const memberSinceRaw =
    (typeof profile?.created_at === "string" ? profile.created_at : null) ?? user.created_at;

  const memberSince = memberSinceRaw
    ? new Date(memberSinceRaw).toLocaleDateString("sk-SK", { year: "numeric", month: "long" })
    : "neuvedene";

  const dynamicBadges = buildDynamicBadges({
    monthTrainings,
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
        description: typeof badge.description === "string" ? badge.description : "Odznak ziskany aktivitou.",
      },
    ];
  });

  const uniqueBadges = Array.from(
    new Map([...dbBadges, ...dynamicBadges].map((badge) => [badge.name, badge])).values()
  ).slice(0, 8);

  const weightLogs = (weightLogsRes.data ?? []).reverse();

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
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-8">
          <section className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
            <Link
              href="/settings"
              aria-label="Otvorit nastavenia"
              className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/75 transition hover:border-red-500/50 hover:text-white"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
              <div className="flex flex-col items-center gap-4 lg:items-start">
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 ring-4 ring-red-500/20">
                  {initialProfile.avatar_url ? (
                    <img src={initialProfile.avatar_url} alt="Profilovy avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl font-black text-white">
                      {(initialProfile.full_name.trim().charAt(0) || "U").toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40">Member since {memberSince}</p>
                <div className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
                  {hasActiveMembership ? "Aktivne clenstvo" : "Bez aktivneho clenstva"}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Profil</p>
                <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-white">
                  {initialProfile.full_name}
                </h1>
                <p className="mt-2 text-sm text-white/55">{initialProfile.email}</p>

                <p className="mt-5 max-w-3xl text-white/75">
                  {initialProfile.bio || "Zatial bez bio. Doplnenie bude dostupne v nastaveniach profilu."}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-white/45">Ciel</p>
                    <p className="mt-1 text-sm font-semibold text-white">{initialProfile.goal}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-white/45">Uroven</p>
                    <p className="mt-1 text-sm font-semibold text-white">{initialProfile.experience_level}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-white/45">Vyska / Vaha</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {initialProfile.height_cm ?? "-"} cm / {initialProfile.weight_kg ?? "-"} kg
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-white/45">Vybavenie</p>
                    <p className="mt-1 text-sm font-semibold text-white">{initialProfile.equipment_level}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/55">Treningy tento mesiac</p>
                <CalendarCheck2 className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-black text-white">{monthTrainings}</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/55">Minut tento mesiac</p>
                <Clock3 className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-black text-white">{monthMinutes}</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/55">Aktualny streak</p>
                <Trophy className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-3xl font-black text-white">{streak} dni</p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/55">Clenstvo</p>
                <ShieldCheck className="h-5 w-5 text-red-400" />
              </div>
              <p className="mt-4 text-lg font-bold text-white">
                {hasActiveMembership ? membershipName ?? "Aktivne" : "Neaktivne"}
              </p>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2 text-white">
                <Award className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-bold">Odznaky</h2>
              </div>

              {uniqueBadges.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {uniqueBadges.map((badge) => (
                    <div key={badge.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <p className="text-sm font-semibold text-white">{badge.name}</p>
                      <p className="mt-1 text-xs text-white/60">{badge.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/60">
                  Zatial bez odznakov. Prvy ziskas po pravidelnych treningoch.
                </p>
              )}
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="mb-4 flex items-center gap-2 text-white">
                <Dumbbell className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-bold">Aktivita</h2>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-white/70">Celkovo treningov: <span className="font-semibold text-white">{totalTrainings}</span></p>
                <p className="text-white/70">
                  Posledny trening: <span className="font-semibold text-white">
                    {lastTrainingAt ? new Date(lastTrainingAt).toLocaleDateString("sk-SK") : "zatial ziadny"}
                  </span>
                </p>
                <p className="text-white/70">Dlzka preferencie: <span className="font-semibold text-white">{initialProfile.session_length_min} min</span></p>
              </div>
            </article>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
            <div className="mb-6 flex items-center gap-2 text-white">
              <LineChartIcon className="h-5 w-5 text-red-400" />
              <h2 className="text-lg font-bold">Vývoj váhy</h2>
            </div>
            <WeightChart logs={weightLogs} />
          </section>
        </div>
      </main>
    </>
  );
}
