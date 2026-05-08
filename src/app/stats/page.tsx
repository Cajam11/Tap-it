import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import WeightChart from "@/components/profile/WeightChart";
import ActivityCalendar from "@/components/stats/ActivityCalendar";
import WorkoutTrendsChart from "@/components/stats/WorkoutTrendsChart";
import StatsCards from "@/components/stats/StatsCards";
import { createClient } from "@/lib/supabase/server";
import { Trophy, Award } from "lucide-react";

const NAV_LINKS: [string, string][] = [];

type EarnedBadge = {
  key: string;
  name: string;
  description: string;
};

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
      description: "Aspoň 8 treningov za mesiac.",
    });
  }

  if (stats.monthTrainings >= 16) {
    badges.push({
      key: "month_16",
      name: "Monthly Machine",
      description: "Aspoň 16 treningov za mesiac.",
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

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

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
      .gte("check_in", monthStart.toISOString()),
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

  const monthTrainings = (monthEntriesRes.data ?? []).length;
  const totalTrainings = totalCountRes.count ?? 0;
  const monthMinutes = (monthEntriesRes.data ?? []).reduce(
    (acc, row) =>
      acc + (typeof row.duration_min === "number" ? row.duration_min : 0),
    0,
  );

  const streakEntries = (streakEntriesRes.data ?? []).map(
    (item) => item.check_in,
  );
  const lastTrainingAt = streakEntries[0] ?? null;
  const streak = getCurrentStreak(streakEntries);

  const membershipRow = membershipRes.data;
  const hasActiveMembership = Boolean(membershipRow);

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

  const weightLogs = (weightLogsRes.data ?? []).reverse();

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

        <div className="relative z-10 mx-auto w-full max-w-6xl space-y-6">
          {/* Header (open space) */}
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              Štatistiky
            </p>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-white mt-2">
              Váš Tréninkový Prehl'ad
            </h1>
            <p className="text-white/60 text-sm mt-2">
              Detailný prehľad vašej aktivity a pokroku
            </p>
          </div>

          {/* Main Stats Cards */}
          <section>
            <StatsCards
              monthTrainings={monthTrainings}
              monthMinutes={monthMinutes}
              totalTrainings={totalTrainings}
              streak={streak}
              lastTrainingAt={lastTrainingAt}
            />
          </section>

          {/* Two Column Layout: Calendar + Trends */}
          <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
            {/* Left Column - Calendar + Badges (stacked, badges bottom-aligned) */}
            <div className="lg:col-span-1 flex flex-col justify-between h-full">
              <div>
                <ActivityCalendar entries={streakEntriesRes.data ?? []} />
              </div>

              <div className="mt-4">
                {uniqueBadges.length > 0 ? (
                  <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-red-500" />
                      <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Vaše Odznaky
                      </p>
                    </div>

                    <div className="max-h-[22rem] overflow-auto pr-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {uniqueBadges.map((badge) => (
                          <div
                            key={badge.key}
                            className="rounded-2xl border border-red-500/30 bg-white/[0.02] p-4 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <Award className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <h3 className="font-semibold text-white text-xs">
                                  {badge.name}
                                </h3>
                                <p className="text-[11px] text-white/50 mt-1.5">
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
                  <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl text-center">
                    <Trophy className="w-8 h-8 text-white/20 mx-auto mb-3" />
                    <p className="text-white/50 text-sm">
                      Zatiaľ nemáte žiadne odznaky. Pokračujte v tréningu a odomknete ich!
                    </p>
                  </section>
                )}
              </div>
            </div>

            {/* Right Column - Activity Info (trends on top, weight chart bottom) */}
            <div className="lg:col-span-2 flex flex-col justify-between h-full space-y-6">
              <div>
                <WorkoutTrendsChart entries={streakEntriesRes.data ?? []} />
              </div>

              {weightLogs.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
                  <p className="text-xs uppercase tracking-wide text-white/45 mb-4">Váhový trend</p>
                  <WeightChart
                    logs={weightLogs.map((log) => ({
                      id: log.id,
                      weight_kg: log.weight_kg,
                      created_at: log.created_at,
                    }))}
                  />
                </div>
              )}
            </div>
          </div>

          {/* bottom badges removed — badges are rendered under the calendar for aligned layout */}
        </div>
      </main>
    </>
  );
}
