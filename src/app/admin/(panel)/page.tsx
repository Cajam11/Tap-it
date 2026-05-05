import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { TrendingUp } from "lucide-react";
import ReceptionCheckInView from "@/components/admin/ReceptionCheckInView";
import EntriesLogsPanel from "@/components/admin/EntriesLogsPanel";
import LiveOccupancyCard, { type LivePresenceMember } from "@/components/LiveOccupancyCard";
import VisitTrendChart from "@/components/admin/VisitTrendChart";
import RealtimeCurrentlyInGym from "@/components/admin/RealtimeCurrentlyInGym";
import RealtimeMembershipsSold from "@/components/admin/RealtimeMembershipsSold";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const chartStart = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const toLocalDateKey = (value: Date) =>
    [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");

  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(chartStart);
    day.setDate(chartStart.getDate() + index);
    return {
      label: day.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      key: toLocalDateKey(day),
    };
  });

  // If not owner, show reception check-in view with logs
  if (context.role !== "owner") {
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

    return (
      <div className="flex h-full min-w-0 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden pr-2">
          <div className="min-h-0 flex-1 overflow-hidden">
            <ReceptionCheckInView initialLatestEntry={null} />
          </div>
          <LiveOccupancyCard
            initialCount={liveOccupancyCount}
            initialMembers={initialMembers}
            showMemberList
            compact
          />
        </div>
        <EntriesLogsPanel />
      </div>
    );
  }

  // Owner dashboard with full analytics
  // Fetch stats
  const { count: currentlyInGym } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .is("check_out", null)
    .eq("is_valid", true);

  const { count: membershipsSoldThisMonth } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("type", "purchase")
    .eq("status", "completed")
    .gte("created_at", startOfMonth.toISOString());

  const { data: recentEntries } = await supabase
    .from("entries")
    .select("check_in")
    .gte("check_in", chartStart.toISOString())
    .lte("check_in", now.toISOString())
    .eq("is_valid", true);

  const { count: activeMemberships } = await supabase
    .from("user_memberships")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: expiringMemberships } = await supabase
    .from("user_memberships")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .not("end_date", "is", null)
    .gte("end_date", now.toISOString())
    .lte("end_date", thirtyDaysFromNow.toISOString());

  const activeMembershipCount = activeMemberships || 0;
  const currentlyInGymCount = currentlyInGym || 0;
  const membershipsSoldCount = membershipsSoldThisMonth || 0;
  const expiringCount = expiringMemberships || 0;
  const renewalRate =
    activeMembershipCount > 0
      ? Math.max(0, Math.round(((activeMembershipCount - expiringCount) / activeMembershipCount) * 100))
      : 0;
  const visitsByDay = new Map<string, number>(chartDays.map((day) => [day.key, 0]));

  for (const entry of recentEntries || []) {
    if (!entry || typeof entry.check_in !== "string") {
      continue;
    }

    const entryDate = new Date(entry.check_in);
    if (Number.isNaN(entryDate.getTime())) {
      continue;
    }

    const entryKey = toLocalDateKey(entryDate);
    visitsByDay.set(entryKey, (visitsByDay.get(entryKey) || 0) + 1);
  }

  const dailyVisitSeries = chartDays.map((day) => ({
    label: day.label,
    value: visitsByDay.get(day.key) || 0,
  }));
  const maxDailyVisits = Math.max(1, ...dailyVisitSeries.map((day) => day.value));
  const weeklyVisitsTotal = dailyVisitSeries.reduce((sum, day) => sum + day.value, 0);
  const dailyVisitsAverage = Math.round((weeklyVisitsTotal / dailyVisitSeries.length) * 10) / 10;
  const todayVisitCount = dailyVisitSeries[dailyVisitSeries.length - 1]?.value || 0;

    return (
      <div className="flex flex-col h-full gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-white/60 mt-2">Real-time stats for Tap-it Gym activity.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-white/70 text-sm hover:bg-white/[0.12] transition-colors">
              Download CSV
            </button>
            <button className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700 transition-colors">
              Add Member
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 flex-shrink-0">
          {/* Currently in Gym */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Currently in Gym</p>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">Live now</span>
            </div>
            <RealtimeCurrentlyInGym initialCount={currentlyInGymCount} />
          </div>

          {/* Memberships Sold */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Memberships Sold</p>
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">This month</span>
            </div>
            <RealtimeMembershipsSold initialCount={membershipsSoldCount} />
          </div>

          {/* Daily Visits Average */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Daily Visits Average</p>
              <span className="text-xs text-white/40">Last 7 days</span>
            </div>
            <p className="text-4xl font-bold text-white">{dailyVisitsAverage}</p>
          </div>

          {/* Renewal Rate */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Renewal Rate</p>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">{expiringCount} Expiring</span>
            </div>
            <p className="text-4xl font-bold text-white">{renewalRate}%</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3 flex-1 min-h-0 overflow-hidden">
          {/* Daily Visit Activity */}
          <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] flex flex-col h-full min-h-0">
            <div className="mb-5 flex items-start justify-between gap-4 flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">7-Day Visit Trend</h3>
                <p className="text-xs text-white/40 mt-1">Last 7 days</p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">Weekly total</p>
                  <p className="text-sm font-semibold text-white">{weeklyVisitsTotal} visits</p>
                </div>
                <TrendingUp className="w-5 h-5 text-white/35" />
              </div>
            </div>
            
            <div className="flex-1 min-h-0">
              <VisitTrendChart dailyVisitSeries={dailyVisitSeries} maxDailyVisits={maxDailyVisits} />
            </div>
          </div>

          <div className="flex flex-col h-full min-h-0">
            <EntriesLogsPanel variant="card" />
          </div>
        </div>
      </div>
    );
  }