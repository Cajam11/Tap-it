'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasServerAdminAccess } from "@/lib/admin-access";

const ALLOWED_ROLES = ["user", "recepcny", "manager", "owner"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  onboarding_completed: boolean | null;
  created_at: string;
};

export async function searchUsers({
  q = "",
  role = "all",
  onboarding = "all",
}: {
  q?: string;
  role?: string;
  onboarding?: string;
}): Promise<{ data: AdminUserRow[]; error: string | null }> {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");

  if (!hasAccess) {
    return { data: [], error: "Unauthorized" };
  }

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, full_name, role, onboarding_completed, created_at")
    .order("created_at", { ascending: false });

  if (q && q.trim()) {
    const escaped = q.replace(/,/g, " ");
    query = query.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  if (role !== "all" && ALLOWED_ROLES.includes(role as AllowedRole)) {
    query = query.eq("role", role);
  }

  if (onboarding === "done") {
    query = query.eq("onboarding_completed", true);
  }

  if (onboarding === "pending") {
    query = query.or("onboarding_completed.is.null,onboarding_completed.eq.false");
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  const rows: AdminUserRow[] = Array.isArray(data) ? (data as AdminUserRow[]) : [];
  return { data: rows, error: null };
}
