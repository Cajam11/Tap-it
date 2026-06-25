import { notFound } from "next/navigation";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminFacilitiesManager from "@/components/admin/AdminFacilitiesManager";

export const metadata = {
  title: "Priestory | Tap-it Admin",
};

type FacilityService = {
  id: string;
  name: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
  metadata: Record<string, unknown> | null;
  is_active: boolean;
};

export default async function AdminFacilitiesPage() {
  const supabase = await createClient();
  const adminContext = await getCurrentAdminContext(supabase);

  if (!adminContext.isAdmin || !hasMinAdminRole(adminContext.role, "recepcny")) {
    return notFound();
  }

  const admin = createAdminClient();
  const { data: facilities } = await admin
    .from("bookable_services")
    .select("id, name, base_price, price_unit, metadata, is_active")
    .eq("type", "facility")
    .order("name", { ascending: true });

  return <AdminFacilitiesManager facilities={(facilities ?? []) as FacilityService[]} />;
}
