import type { UserRole } from "@/lib/types";

// Role hierarchy used by admin capabilities: owner > manager > recepcny.
export const ADMIN_ROLE_RANK = {
  recepcny: 1,
  manager: 2,
  owner: 3,
} as const;

export type AdminRole = keyof typeof ADMIN_ROLE_RANK;

// Capability gate: only explicit admin roles are treated as privileged.
export function isAdminRole(role: unknown): role is AdminRole {
  return role === "recepcny" || role === "manager" || role === "owner";
}

// Minimum-role check for admin actions. Missing roles always deny access.
export function hasMinAdminRole(
  role: UserRole | null | undefined,
  required: AdminRole | null | undefined
): boolean {
  if (!required || !isAdminRole(role)) {
    return false;
  }

  return ADMIN_ROLE_RANK[role] >= ADMIN_ROLE_RANK[required];
}
