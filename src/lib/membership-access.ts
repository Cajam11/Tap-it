export async function expireOverdueMembershipsForUser(supabase: any, userId: string) {
  const nowIso = new Date().toISOString();

  await supabase
    .from("user_memberships")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "active")
    .not("end_date", "is", null)
    .lte("end_date", nowIso);

  const { data: entriesMemberships } = await supabase
    .from("user_memberships")
    .select("id, entries_remaining, membership:memberships(billing_cycle)")
    .eq("user_id", userId)
    .eq("status", "active");

  const depletedIds: string[] =
    Array.isArray(entriesMemberships)
      ? entriesMemberships
          .filter((row: any) => {
            const billingCycle =
              row &&
              typeof row.membership === "object" &&
              row.membership !== null &&
              typeof row.membership.billing_cycle === "string"
                ? row.membership.billing_cycle
                : null;

            const remaining = typeof row?.entries_remaining === "number" ? row.entries_remaining : null;

            return billingCycle === "entries" && remaining !== null && remaining <= 0;
          })
          .map((row: any) => String(row.id))
      : [];

  if (depletedIds.length > 0) {
    await supabase
      .from("user_memberships")
      .update({ status: "expired", end_date: nowIso })
      .in("id", depletedIds);
  }
}

export async function getCurrentActiveMembership<T>(
  supabase: any,
  userId: string,
  columns: string
) {
  await expireOverdueMembershipsForUser(supabase, userId);

  const result = await supabase
    .from("user_memberships")
    .select(columns)
    .eq("user_id", userId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return result as { data: T | null; error: unknown };
}
