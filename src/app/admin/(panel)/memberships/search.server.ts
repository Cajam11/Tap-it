'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasServerAdminAccess } from "@/lib/admin-access";

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
  membership: { id: string; name: string } | { id: string; name: string }[] | null;
};

export type AdminAssignableMembershipPlan = {
  id: string;
  name: string;
};

type SearchMembershipsResult = {
  profiles: AdminProfileRow[];
  memberships: AdminMembershipRow[];
  plans: AdminAssignableMembershipPlan[];
  error: string | null;
};

function getMembershipRecord(membership: AdminMembershipRow["membership"]) {
  if (Array.isArray(membership)) {
    return membership[0] ?? null;
  }
  return membership;
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

export async function searchMemberships({
  q = "",
  plan = "all",
}: {
  q?: string;
  plan?: string;
}): Promise<SearchMembershipsResult> {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");

  if (!hasAccess) {
    return { profiles: [], memberships: [], plans: [], error: "Unauthorized" };
  }

  const admin = createAdminClient();

  const [profilesResult, membershipsResult, plansResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("user_memberships")
      .select(
        "user_id, start_date, end_date, status, membership:memberships(id, name)",
      )
      .eq("status", "active"),
    admin
      .from("memberships")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const profiles = Array.isArray(profilesResult.data)
    ? (profilesResult.data as AdminProfileRow[])
    : [];
  const memberships = Array.isArray(membershipsResult.data)
    ? (membershipsResult.data as AdminMembershipRow[])
    : [];
  const plans = Array.isArray(plansResult.data)
    ? (plansResult.data as AdminAssignableMembershipPlan[])
    : [];

  const membershipsByUserId = new Map<string, AdminMembershipRow>();
  for (const membership of memberships) {
    membershipsByUserId.set(membership.user_id, membership);
  }

  // Filter by query and plan
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
    const membershipPlan = membershipRecord?.id ?? "none";

    return plan === "all" || membershipPlan === plan;
  });

  return {
    profiles: filteredProfiles,
    memberships,
    plans,
    error: null,
  };
}
