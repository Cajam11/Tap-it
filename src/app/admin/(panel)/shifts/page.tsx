import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import AdminShiftsWorkspace from "@/components/admin/AdminShiftsWorkspace";
import type { StaffShift, StaffShiftCoverageRule, UserRole } from "@/lib/types";

export const metadata = {
  title: "Smeny | Tap-it Admin",
};

type StaffOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
};

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default async function AdminShiftsPage() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.isAdmin || !hasMinAdminRole(context.role, "recepcny")) {
    return notFound();
  }

  const admin = createAdminClient();
  const now = new Date();
  const startRange = new Date(now);
  startRange.setMonth(startRange.getMonth() - 1);
  startRange.setDate(1);

  const endRange = new Date(now);
  endRange.setFullYear(endRange.getFullYear() + 1);
  endRange.setMonth(endRange.getMonth() + 1);
  endRange.setDate(0);

  const [staffResult, shiftsResult, coverageResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["recepcny", "manager", "owner"])
      .order("role", { ascending: true })
      .order("full_name", { ascending: true }),
    admin
      .from("staff_shifts")
      .select("*")
      .gte("work_date", toDateKey(startRange))
      .lte("work_date", toDateKey(endRange))
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true }),
    admin
      .from("staff_shift_coverage_rules")
      .select("*")
      .eq("is_active", true)
      .order("day_of_week", { ascending: true }),
  ]);

  return (
    <AdminShiftsWorkspace
      currentUserId={context.userId!}
      currentRole={context.role!}
      staff={(staffResult.data ?? []) as StaffOption[]}
      shifts={(shiftsResult.data ?? []) as StaffShift[]}
      coverageRules={(coverageResult.data ?? []) as StaffShiftCoverageRule[]}
    />
  );
}
