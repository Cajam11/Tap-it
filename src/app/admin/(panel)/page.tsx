import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import Link from "next/link";
import { TrendingUp, Users } from "lucide-react";
import ReceptionCheckInView from "@/components/admin/ReceptionCheckInView";
import EntriesLogsPanel from "@/components/admin/EntriesLogsPanel";
import LiveOccupancyCard, { type LivePresenceMember } from "@/components/LiveOccupancyCard";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

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
  const { count: totalMemberships } = await supabase
    .from("user_memberships")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: entriesCount } = await supabase
    .from("entries")
    .select("*", { count: "exact", head: true })
    .gte("check_in", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return (
      <div className="space-y-8">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Currently in Gym */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Currently in Gym</p>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">+12% vs last hour</span>
            </div>
            <p className="text-4xl font-bold text-white">42</p>
          </div>

          {/* Memberships Sold */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Memberships Sold</p>
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">+5% this month</span>
            </div>
            <p className="text-4xl font-bold text-white">{totalMemberships || 0}</p>
          </div>

          {/* Daily Visits Average */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Daily Visits Average</p>
              <span className="text-xs text-white/40">Last 7 days</span>
            </div>
            <p className="text-4xl font-bold text-white">{entriesCount || 0}</p>
          </div>

          {/* Renewal Rate */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6 hover:bg-white/[0.08] transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-white/60">Renewal Rate</p>
              <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">3 Expiring</span>
            </div>
            <p className="text-4xl font-bold text-white">94%</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Daily Visit Activity */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.05] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Daily Visit Activity</h3>
                <p className="text-xs text-white/40 mt-1">Last 7 Days</p>
              </div>
              <TrendingUp className="w-5 h-5 text-white/40" />
            </div>
            
            {/* Simple bar chart placeholder */}
            <div className="h-64 flex items-end gap-2">
              {[65, 78, 90, 81, 88, 95, 72].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-red-600 to-red-400 hover:opacity-80 transition-opacity"
                  style={{ height: `${(height / 100) * 100}%` }}
                />
              ))}
            </div>
            
            <div className="mt-6 grid grid-cols-7 gap-2 text-xs text-white/50">
              {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                <div key={day} className="text-center">
                  {day}
                </div>
              ))}
            </div>
          </div>

          <EntriesLogsPanel variant="card" />
        </div>

        {/* User Management */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-white/40" />
              <div>
                <h3 className="text-lg font-semibold text-white">User Management</h3>
                <p className="text-xs text-white/40 mt-1">All Members</p>
              </div>
            </div>
            <Link href="/admin/users" className="text-red-400 text-sm hover:text-red-300">
              Manage Users →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50">
                  <th className="text-left py-3 px-3 font-medium">Member</th>
                  <th className="text-left py-3 px-3 font-medium">ID</th>
                  <th className="text-left py-3 px-3 font-medium">Membership</th>
                  <th className="text-left py-3 px-3 font-medium">Status</th>
                  <th className="text-left py-3 px-3 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/[0.05] hover:bg-white/[0.05] transition-colors">
                  <td className="py-3 px-3 text-white/80">Alex Rivera</td>
                  <td className="py-3 px-3 text-white/50 font-mono text-xs">0a1b2c3d</td>
                  <td className="py-3 px-3 text-white/70">Premium Annual</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-emerald-400/10 text-emerald-300">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-3 text-white/50">2 min ago</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }