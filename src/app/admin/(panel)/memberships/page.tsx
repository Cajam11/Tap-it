import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentAdminContext,
  hasServerAdminAccess,
} from "@/lib/admin-access";
import { updateUserMembership } from "./actions";

type AdminProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

type AdminMembershipRow = {
  user_id: string;
  start_date: string;
  end_date: string | null;
  status: string | null;
  membership: { name: string } | { name: string }[] | null;
};

function formatDate(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleDateString("sk-SK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateIso;
  }
}

function getMembershipRecord(membership: AdminMembershipRow["membership"]) {
  if (Array.isArray(membership)) {
    return membership[0] ?? null;
  }

  return membership;
}

function getMembershipPlanKey(membershipRecord: { name: string } | null) {
  if (membershipRecord?.name === "Mesačná") {
    return "monthly";
  }

  if (membershipRecord?.name === "Ročná") {
    return "yearly";
  }

  return "none";
}

function isExpiredMembership(row: AdminMembershipRow | undefined) {
  if (!row || row.status !== "active") {
    return true;
  }

  if (!row.end_date) {
    return false;
  }

  return new Date(row.end_date).getTime() <= Date.now();
}

export default async function AdminMembershipsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    message?: string;
    q?: string;
    plan?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");
  const context = await getCurrentAdminContext(supabase);

  if (!hasAccess || !context.userId) {
    redirect("/");
  }

  const admin = createAdminClient();

  const [profilesResult, membershipsResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("user_memberships")
      .select(
        "user_id, start_date, end_date, status, membership:memberships(name)",
      )
      .eq("status", "active"),
  ]);

  const profiles = Array.isArray(profilesResult.data)
    ? (profilesResult.data as AdminProfileRow[])
    : [];
  const memberships = Array.isArray(membershipsResult.data)
    ? (membershipsResult.data as AdminMembershipRow[])
    : [];

  const membershipsByUserId = new Map<string, AdminMembershipRow>();
  for (const membership of memberships) {
    membershipsByUserId.set(membership.user_id, membership);
  }

  const totalActiveMemberships = memberships.filter(
    (membership) => !isExpiredMembership(membership),
  ).length;

  const status =
    typeof resolvedSearchParams?.status === "string"
      ? resolvedSearchParams.status
      : undefined;
  const q =
    typeof resolvedSearchParams?.q === "string"
      ? resolvedSearchParams.q.trim()
      : "";
  const planFilter =
    typeof resolvedSearchParams?.plan === "string"
      ? resolvedSearchParams.plan.trim()
      : "all";
  const messageRaw =
    typeof resolvedSearchParams?.message === "string"
      ? resolvedSearchParams.message
      : undefined;
  const message =
    typeof messageRaw === "string"
      ? decodeURIComponent(messageRaw.replaceAll("_", " "))
      : null;

  const filteredProfiles = profiles.filter((profile) => {
    const matchesQuery =
      !q ||
      [profile.full_name, profile.email].some((value) =>
        value?.toLowerCase().includes(q.toLowerCase()),
      );

    if (!matchesQuery) {
      return false;
    }

    const membership = membershipsByUserId.get(profile.id);
    const hasCurrentMembership = membership && !isExpiredMembership(membership);
    const membershipRecord = hasCurrentMembership
      ? getMembershipRecord(membership.membership)
      : null;
    const membershipPlan = getMembershipPlanKey(membershipRecord);

    return planFilter === "all" || membershipPlan === planFilter;
  });

  const visibleActiveMemberships = filteredProfiles.filter((profile) => {
    const membership = membershipsByUserId.get(profile.id);
    return Boolean(membership && !isExpiredMembership(membership));
  }).length;

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Memberships</h2>
        <p className="mt-1 text-white/70">
          Prehlad clenstiev napojenych na profily. Ak je clenstvo uz expirovane,
          zobrazime none.
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="q"
            className="mb-1.5 block text-xs uppercase tracking-wide text-white/60"
          >
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Meno alebo e-mail"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
        </div>

        <div>
          <label
            htmlFor="plan"
            className="mb-1.5 block text-xs uppercase tracking-wide text-white/60"
          >
            Membership plan
          </label>
          <select
            id="plan"
            name="plan"
            defaultValue={planFilter}
            className="admin-role-select w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="all">Vsetky</option>
            <option value="monthly">Mesačná</option>
            <option value="yearly">Ročná</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
          <button
            type="submit"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15"
          >
            Filtrovat
          </button>
          <Link
            href="/admin/memberships"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
          >
            Reset
          </Link>
        </div>
      </form>

      {status === "success" && message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {status === "error" && message && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm text-white/60">
          Aktivne clenstva:{" "}
          <span className="font-semibold text-white">
            {visibleActiveMemberships}
          </span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-white/70">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Membership plan</th>
              <th className="px-4 py-3 font-medium">start_date</th>
              <th className="px-4 py-3 font-medium">end_date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  Zatial tu nie su ziadne profily.
                </td>
              </tr>
            ) : (
              filteredProfiles.map((profile) => {
                const membership = membershipsByUserId.get(profile.id);
                const hasCurrentMembership =
                  membership && !isExpiredMembership(membership);
                const membershipRecord = hasCurrentMembership
                  ? getMembershipRecord(membership.membership)
                  : null;
                const currentMembershipPlan =
                  getMembershipPlanKey(membershipRecord);

                return (
                  <tr
                    key={profile.id}
                    className="border-b border-white/10 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-white">
                      {profile.full_name ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {profile.email ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {membershipRecord?.name ?? "none"}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {hasCurrentMembership
                        ? formatDate(membership.start_date)
                        : "none"}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {hasCurrentMembership && membership.end_date
                        ? formatDate(membership.end_date)
                        : "none"}
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={updateUserMembership}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="userId" value={profile.id} />
                        <select
                          name="membershipPlan"
                          defaultValue={currentMembershipPlan}
                          className="admin-role-select rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white"
                        >
                          <option
                            value="monthly"
                            disabled={currentMembershipPlan === "monthly"}
                          >
                            Mesačná
                          </option>
                          <option
                            value="yearly"
                            disabled={currentMembershipPlan === "yearly"}
                          >
                            Ročná
                          </option>
                          <option
                            value="none"
                            disabled={currentMembershipPlan === "none"}
                          >
                            None
                          </option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/10"
                        >
                          Ulozit
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
