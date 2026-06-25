import { notFound } from "next/navigation";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminMembershipPlansManager, {
  type AdminMembershipPlan,
} from "@/components/admin/AdminMembershipPlansManager";

export const metadata = {
  title: "Membership plány | Tap-it Admin",
};

export default async function AdminMembershipPlansPage() {
  const supabase = await createClient();
  const adminContext = await getCurrentAdminContext(supabase);

  if (!adminContext.isAdmin || !hasMinAdminRole(adminContext.role, "owner")) {
    return notFound();
  }

  const { data: plans } = await createAdminClient()
    .from("memberships")
    .select(
      "id, name, price, billing_cycle, entry_count, duration_days, is_single_entry, description, benefits, display_order, is_highlighted, is_active",
    )
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return <AdminMembershipPlansManager plans={(plans ?? []) as AdminMembershipPlan[]} />;
}
