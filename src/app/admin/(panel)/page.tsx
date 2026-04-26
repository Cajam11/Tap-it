import { createClient } from "@/lib/supabase/server";
import { hasServerAdminAccess } from "@/lib/admin-access";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const canManageMemberships = await hasServerAdminAccess(supabase, "manager");
  const canManageAdmins = await hasServerAdminAccess(supabase, "owner");

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <p className="text-white/70">
        Zakladny admin dashboard je pripraveny. Dalsi krok je pridat konkretne moduly podla role.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/users"
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:bg-white/[0.08]"
        >
          <p className="text-sm text-white/60">Sekcia</p>
          <p className="mt-1 text-lg font-semibold text-white">Users</p>
          <p className="mt-2 text-xs text-white/50">Prehlad vsetkych profilov v databaze</p>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-white/60">Recepcny pristup</p>
          <p className="mt-1 text-lg font-semibold text-emerald-300">Aktivny</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-white/60">Manager moduly</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              canManageMemberships ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {canManageMemberships ? "Povolene" : "Nepovolene"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-white/60">Owner moduly</p>
          <p
            className={`mt-1 text-lg font-semibold ${
              canManageAdmins ? "text-emerald-300" : "text-amber-300"
            }`}
          >
            {canManageAdmins ? "Povolene" : "Nepovolene"}
          </p>
        </div>
      </div>
    </section>
  );
}