import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Plus, Repeat } from "lucide-react";
import AdminCalendarView from "@/components/admin/AdminCalendarView";

export const metadata = {
  title: "Bookings Management | Tap-it Admin",
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

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Bookings & Calendar</h1>
          <p className="text-white/60">
            Manage all bookings, classes, and schedules across the gym.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium border border-white/10">
            <Repeat className="w-4 h-4" />
            Recurring Class
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Class
          </button>
        </div>
      </div>

      <AdminCalendarView initialBookings={bookings || []} />
    </div>
  );
}
