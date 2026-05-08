import { redirect } from "next/navigation";
import { Award, Trophy } from "lucide-react";
import NavBarAuth from "@/components/NavBarAuth";
import WeightChart from "@/components/profile/WeightChart";
import ActivityCalendar from "@/components/stats/ActivityCalendar";
import WorkoutTrendsChart from "@/components/stats/WorkoutTrendsChart";
import StatsCards from "@/components/stats/StatsCards";
import { createClient } from "@/lib/supabase/server";

const NAV_LINKS: [string, string][] = [];

type EarnedBadge = {
  key: string;
  name: string;
  description: string;
};

type EntryRow = {
  check_in: string;
  duration_min: number | null;
};

type DbQueryErrorLike = {
  code?: string | null;
  message?: string | null;
};

function isMissingTableError(
  error: DbQueryErrorLike | null | undefined,
  tableName: string,
): boolean {
  return Boolean(
    error?.code === "PGRST205" &&
      typeof error.message === "string" &&
      error.message.includes(`'public.${tableName}'`),
  );
}

function toUtcDayKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseCheckInDayKey(value: string): string | null {
  const fromIsoPrefix = value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (fromIsoPrefix) return fromIsoPrefix;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return toUtcDayKey(parsed);
}

function shiftUtcDayKey(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return toUtcDayKey(date);
}

function getCurrentStreak(checkIns: string[]): number {
  const uniqueDays = new Set<string>();

  checkIns.forEach((checkIn) => {
    const dayKey = parseCheckInDayKey(checkIn);
    if (dayKey) uniqueDays.add(dayKey);
  });

  if (uniqueDays.size === 0) return 0;

  const sortedDays = Array.from(uniqueDays).sort((a, b) => (a < b ? 1 : -1));
  const latestDay = sortedDays[0];
  const todayKey = toUtcDayKey(new Date());
  const yesterdayKey = shiftUtcDayKey(todayKey, -1);

  if (latestDay !== todayKey && latestDay !== yesterdayKey) {
    return 0;
  }

  let streak = 0;
  let cursor = latestDay === todayKey ? todayKey : yesterdayKey;

  while (uniqueDays.has(cursor)) {
    streak += 1;
    cursor = shiftUtcDayKey(cursor, -1);
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

  if (stats.streak >= 7) {
    badges.push({
      key: "streak_7",
      name: "Weekly Warrior",
      description: "7 dni po sebe si bol na treningu.",
    });
  }

  if (stats.streak >= 14) {
    badges.push({
      key: "streak_14",
      name: "Fortnight Fighter",
      description: "14 dni po sebe si bol na treningu.",
    });
  }

  if (stats.monthTrainings >= 8) {
    badges.push({
      key: "month_8",
      name: "Weekly Regular",
      description: "Aspo 8 treningov za mesiac.",
    });
  }

  if (stats.monthTrainings >= 16) {
    badges.push({
      key: "month_16",
      name: "Monthly Machine",
      description: "Aspo 16 treningov za mesiac.",
    });
  }

  if (stats.totalTrainings >= 25) {
    badges.push({
      key: "total_25",
      name: "Getting Strong",
      description: "25+ treningov celkovo.",
    });
  }

  if (stats.totalTrainings >= 50) {
    badges.push({
      key: "total_50",
      name: "Iron Habit",
      description: "50+ treningov celkovo.",
    });
  }

  if (stats.totalTrainings >= 100) {
    badges.push({
      key: "total_100",
      name: "Century Champion",
      description: "100+ treningov celkovo.",
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

export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const now = new Date();
  const monthStartUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  const [
    monthEntriesRes,
    totalCountRes,
    streakEntriesRes,
    membershipRes,
    dbBadgesRes,
    weightLogsRes,
    profileRes,
  ] = await Promise.all([
    supabase
      .from("entries")
      .select("duration_min, check_in")
      .eq("user_id", user.id)
      .gte("check_in", monthStartUtc.toISOString()),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("entries")
      .select("check_in, duration_min")
      .eq("user_id", user.id)
      .order("check_in", { ascending: false }),
    supabase
      .from("user_memberships")
      .select("status, end_date")
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
      .limit(12),
    supabase
      .from("weight_logs")
      .select("id, weight_kg, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(120),
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (monthEntriesRes.error || totalCountRes.error || streakEntriesRes.error) {
    console.error("Failed to load core stats data", {
      monthEntriesError: monthEntriesRes.error,
      totalCountError: totalCountRes.error,
      streakEntriesError: streakEntriesRes.error,
    });
    throw new Error("Nepodarilo sa nacitat statistiky.");
  }

  if (membershipRes.error) {
    console.error("Failed to load membership data", membershipRes.error);
  }
  if (dbBadgesRes.error && !isMissingTableError(dbBadgesRes.error, "user_badges")) {
    console.error("Failed to load badges", dbBadgesRes.error);
  }
  if (weightLogsRes.error) {
    console.error("Failed to load weight logs", weightLogsRes.error);
  }
  if (profileRes.error) {
    console.error("Failed to load profile", profileRes.error);
  }

  const allEntries = (streakEntriesRes.data ?? []).filter(
    (item): item is EntryRow => typeof item.check_in === "string",
  );
  const monthTrainings = (monthEntriesRes.data ?? []).length;
  const totalTrainings = totalCountRes.count ?? 0;
  const monthMinutes = (monthEntriesRes.data ?? []).reduce(
    (acc, row) =>
      acc + (typeof row.duration_min === "number" ? row.duration_min : 0),
    0,
  );

  const streakEntries = allEntries.map((item) => item.check_in);
  const streak = getCurrentStreak(streakEntries);

  const membershipRow = membershipRes.data;
  const membershipEndTimestamp = membershipRow?.end_date
    ? new Date(membershipRow.end_date).getTime()
    : null;
  const hasActiveMembership = Boolean(
    membershipRow &&
      (membershipEndTimestamp === null ||
        Number.isNaN(membershipEndTimestamp) ||
        membershipEndTimestamp >= Date.now()),
  );

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
  );

  const weightLogs = (weightLogsRes.data ?? [])
    .filter(
      (
        log,
      ): log is { id: string | number; weight_kg: number; created_at: string } =>
        (typeof log.id === "string" || typeof log.id === "number") &&
        typeof log.weight_kg === "number" &&
        typeof log.created_at === "string",
    )
    .map((log) => ({
      id: String(log.id),
      weight_kg: log.weight_kg,
      created_at: log.created_at,
    }))
    .reverse();

  const profile = profileRes.data;
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

      <main className="relative h-screen overflow-hidden bg-[#080808] px-4 pt-28 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col pb-4">
          <div className="mb-5 shrink-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              Statistiky
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Vas treningovy prehlad
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Detailny prehlad vasej aktivity a pokroku
            </p>
          </div>

          <section className="mb-5 shrink-0">
            <StatsCards
              monthTrainings={monthTrainings}
              monthMinutes={monthMinutes}
              totalTrainings={totalTrainings}
              streak={streak}
            />
          </section>

          <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-3 lg:items-stretch">
            <div className="flex min-h-0 flex-col gap-4 lg:col-span-1">
              <div className="shrink-0">
                <ActivityCalendar entries={allEntries} />
              </div>

              <div className="min-h-0 flex-1">
                {uniqueBadges.length > 0 ? (
                  <section className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
                    <div className="mb-4 shrink-0 flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-red-500" />
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Vase odznaky
                      </p>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {uniqueBadges.map((badge) => (
                          <div
                            key={badge.key}
                            className="rounded-xl border border-red-500/30 bg-white/[0.02] p-3 transition-all hover:border-red-500/50 hover:bg-red-500/8"
                          >
                            <div className="flex items-start gap-2">
                              <Award className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-500" />
                              <div className="flex-1">
                                <h3 className="text-[12px] font-semibold leading-tight text-white">
                                  {badge.name}
                                </h3>
                                <p className="mt-1 text-[10px] text-white/50">
                                  {badge.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                ) : (
                  <section className="flex h-full min-h-0 flex-col justify-center rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-xl sm:p-8">
                    <Trophy className="mx-auto mb-3 h-8 w-8 text-white/20" />
                    <p className="text-sm text-white/50">
                      Zatial nemate ziadne odznaky. Pokracujte v treningu a
                      odomknete ich.
                    </p>
                  </section>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-6 lg:col-span-2">
              <div className="shrink-0">
                <WorkoutTrendsChart entries={allEntries} />
              </div>

              {weightLogs.length > 0 && (
                <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
                  <p className="mb-4 shrink-0 text-xs uppercase tracking-wide text-white/45">
                    Vahovy trend
                  </p>
                  <div className="min-h-0 flex-1">
                    <WeightChart
                      logs={weightLogs.map((log) => ({
                        id: log.id,
                        weight_kg: log.weight_kg,
                        created_at: log.created_at,
                      }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
