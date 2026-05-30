import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import AdminBookingsWorkspace from "@/components/admin/AdminBookingsWorkspace";

export const metadata = {
  title: "Bookings Management | Tap-it Admin",
};

type GroupService = {
  id: string;
  name: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
  capacity: number | null;
  metadata: Record<string, unknown> | null;
};

type TrainerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type RecurringRule = {
  id: string;
  service_id: string;
  trainer_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active_until: string | null;
};

export default async function AdminBookingsPage() {
  const supabase = await createClient();
  const adminContext = await getCurrentAdminContext(supabase);
  
  if (!adminContext.isAdmin || !hasMinAdminRole(adminContext.role, "recepcny")) {
    return notFound();
  }

  // Pre načítanie všetkých dát ignorujúcich RLS politiky (užívateľ = vidí len svoje) 
  // použijeme Admin SSR klienta, ktorý prepisuje RLS.
  const supabaseAdmin = createAdminClient();

  // Fetch current upcoming schedules to display in the initial calendar view
  // We fetch last month + next 2 months to cover the default view range well
  const startRange = new Date();
  startRange.setMonth(startRange.getMonth() - 1);
  const endRange = new Date();
  endRange.setMonth(endRange.getMonth() + 2);

  const { data: bookings } = await supabaseAdmin
    .from("bookings")
    .select(`
      id,
      start_time,
      end_time,
      status,
      bookable_services ( name ),
      profiles:user_id (full_name, email)
    `)
    .gte("start_time", startRange.toISOString())
    .lte("start_time", endRange.toISOString())
    .order("start_time", { ascending: true });

  const { data: groupServices } = await supabaseAdmin
    .from("bookable_services")
    .select("id, name, base_price, price_unit, capacity, metadata")
    .eq("type", "group")
    .eq("is_active", true)
    .order("name", { ascending: true });

  const { data: trainers } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "trainer")
    .order("full_name", { ascending: true });

  const typedGroupServices = (groupServices ?? []) as GroupService[];
  const typedTrainers = (trainers ?? []) as TrainerOption[];
  const serviceIds = typedGroupServices.map((service) => service.id);
  const { data: recurringRules } = serviceIds.length
    ? await supabaseAdmin
        .from("recurring_rules")
        .select("id, service_id, trainer_id, day_of_week, start_time, end_time, active_until")
        .in("service_id", serviceIds)
        .order("day_of_week", { ascending: true })
    : { data: [] };
  const typedRecurringRules = (recurringRules ?? []) as RecurringRule[];

  return (
    <AdminBookingsWorkspace
      bookings={bookings || []}
      services={typedGroupServices}
      trainers={typedTrainers}
      rules={typedRecurringRules}
    />
  );
}
