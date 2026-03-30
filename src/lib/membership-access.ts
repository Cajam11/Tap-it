export async function expireOverdueMembershipsForUser(supabase: any, userId: string) {
  const nowIso = new Date().toISOString();

  await supabase
    .from("user_memberships")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "active")
    .not("end_date", "is", null)
    .lte("end_date", nowIso);
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
