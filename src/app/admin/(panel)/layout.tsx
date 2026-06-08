import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId) {
    redirect("/admin/login");
  }

  if (!context.isAdmin) {
    redirect("/");
  }

  // Fetch user profile for sidebar
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", context.userId)
    .maybeSingle();

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808] text-white">
      <AdminSidebar userRole={context.role || "user"} userName={profile?.full_name} />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto md:overflow-hidden">
        <div className="p-6 pt-20 md:pt-6 md:h-full md:overflow-x-hidden md:overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}