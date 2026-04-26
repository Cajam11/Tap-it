import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.userId) {
    redirect("/admin/login");
  }

  if (!context.isAdmin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <header className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-400/80">Tap-it</p>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
            <nav className="mt-2 flex items-center gap-3 text-sm">
              <Link href="/admin" className="text-white/70 hover:text-white">
                Dashboard
              </Link>
              <Link href="/admin/users" className="text-white/70 hover:text-white">
                Users
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/70">
              rola: {context.role}
            </span>
            <Link href="/" className="text-white/70 hover:text-white">
              Spat na app
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}