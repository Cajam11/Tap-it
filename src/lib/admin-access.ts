import type { SupabaseClient } from "@supabase/supabase-js";
import { hasMinAdminRole, isAdminRole, type AdminRole } from "@/lib/admin-authz";
import type { UserRole } from "@/lib/types";

export type CurrentAdminContext = {
  userId: string | null;
  role: UserRole | null;
  isAdmin: boolean;
};

export async function getCurrentAdminContext(
  supabase: SupabaseClient
): Promise<CurrentAdminContext> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: null, role: null, isAdmin: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  const normalizedRole: UserRole | null =
    role === "user" || role === "recepcny" || role === "manager" || role === "owner"
      ? role
      : null;

  return {
    userId: user.id,
    role: normalizedRole,
    isAdmin: isAdminRole(normalizedRole),
  };
}

export async function hasServerAdminAccess(
  supabase: SupabaseClient,
  requiredRole: AdminRole = "recepcny"
): Promise<boolean> {
  const context = await getCurrentAdminContext(supabase);
  return hasMinAdminRole(context.role, requiredRole);
}