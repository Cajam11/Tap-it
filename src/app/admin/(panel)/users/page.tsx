import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminContext, hasServerAdminAccess } from "@/lib/admin-access";
import { updateUserRole } from "./actions";

const ALLOWED_ROLES = ["user", "recepcny", "manager", "owner"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];
const ROLE_LABELS: Record<AllowedRole, string> = {
  user: "User",
  recepcny: "Recepcny",
  manager: "Manager",
  owner: "Owner",
};

type AdminUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  onboarding_completed: boolean | null;
  created_at: string;
};

function normalizeRole(role: string | null | undefined): AllowedRole {
  return role && ALLOWED_ROLES.includes(role as AllowedRole) ? (role as AllowedRole) : "user";
}

function roleBadgeClass(role: string | null) {
  switch (role) {
    case "owner":
      return "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-300";
    case "manager":
      return "border-sky-400/40 bg-sky-500/10 text-sky-300";
    case "recepcny":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
    default:
      return "border-white/20 bg-white/5 text-white/70";
  }
}

function formatDate(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleString();
  } catch {
    return dateIso;
  }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    message?: string;
    q?: string;
    role?: string;
    onboarding?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");
  const context = await getCurrentAdminContext(supabase);
  const isOwner = context.role === "owner";

  const status =
    typeof resolvedSearchParams?.status === "string" ? resolvedSearchParams.status : undefined;
  const messageRaw =
    typeof resolvedSearchParams?.message === "string" ? resolvedSearchParams.message : undefined;
  const message = typeof messageRaw === "string" ? decodeURIComponent(messageRaw.replaceAll("_", " ")) : null;
  const q = typeof resolvedSearchParams?.q === "string" ? resolvedSearchParams.q.trim() : "";
  const roleFilter =
    typeof resolvedSearchParams?.role === "string" ? resolvedSearchParams.role.trim() : "all";
  const onboardingFilter =
    typeof resolvedSearchParams?.onboarding === "string"
      ? resolvedSearchParams.onboarding.trim()
      : "all";

  if (!hasAccess) {
    redirect("/");
  }

  const admin = createAdminClient();
  let query = admin
    .from("profiles")
    .select("id, email, full_name, role, onboarding_completed, created_at")
    .order("created_at", { ascending: false });

  if (q) {
    const escaped = q.replace(/,/g, " ");
    query = query.or(`full_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
  }

  if (roleFilter !== "all" && ALLOWED_ROLES.includes(roleFilter as AllowedRole)) {
    query = query.eq("role", roleFilter);
  }

  if (onboardingFilter === "done") {
    query = query.eq("onboarding_completed", true);
  }

  if (onboardingFilter === "pending") {
    query = query.or("onboarding_completed.is.null,onboarding_completed.eq.false");
  }

  const { data, error } = await query;

  const rows: AdminUserRow[] = Array.isArray(data) ? (data as AdminUserRow[]) : [];

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Users</h2>
        <p className="mt-1 text-white/70">
          Vsetky profily v databaze. Tuto sekciu vidi kazda admin rola (recepcny, manager, owner).
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="mb-1.5 block text-xs uppercase tracking-wide text-white/60">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Meno alebo e-mail"
            className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35"
          />
        </div>

        <div>
          <label htmlFor="role" className="mb-1.5 block text-xs uppercase tracking-wide text-white/60">
            Rola
          </label>
          <select
            id="role"
            name="role"
            defaultValue={roleFilter}
            className="admin-role-select w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="all">Vsetky</option>
            <option value="user">User</option>
            <option value="recepcny">Recepcny</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <div>
          <label htmlFor="onboarding" className="mb-1.5 block text-xs uppercase tracking-wide text-white/60">
            Onboarding
          </label>
          <select
            id="onboarding"
            name="onboarding"
            defaultValue={onboardingFilter}
            className="admin-role-select w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
          >
            <option value="all">Vsetko</option>
            <option value="done">Dokonceny</option>
            <option value="pending">Nedokonceny</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
          <button
            type="submit"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15"
          >
            Filtrovat
          </button>
          <Link
            href="/admin/users"
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white"
          >
            Reset
          </Link>
        </div>
      </form>

      {status === "success" && message && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {status === "error" && message && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Nepodarilo sa nacitat userov: {error.message}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm text-white/60">
          Pocet profilov: <span className="font-semibold text-white">{rows.length}</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-white/70">
            <tr>
              <th className="px-4 py-3 font-medium">Meno</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Rola</th>
              <th className="px-4 py-3 font-medium">Onboarding</th>
              <th className="px-4 py-3 font-medium">Vytvoreny</th>
              <th className="px-4 py-3 font-medium">Akcie</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  Zatial tu nie su ziadne profily.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-4 py-3 text-white">{row.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-white/80">{row.email ?? "-"}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const safeRole = normalizeRole(row.role);
                      return (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleBadgeClass(
                            safeRole
                          )}`}
                        >
                          {safeRole}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                        row.onboarding_completed
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300"
                          : "border-amber-400/40 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      {row.onboarding_completed ? "Dokonceny" : "Nedokonceny"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    {isOwner ? (
                      <form action={updateUserRole} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={row.id} />
                        <select
                          name="role"
                          defaultValue={normalizeRole(row.role)}
                          className="admin-role-select rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white"
                        >
                          {ALLOWED_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/10"
                        >
                          Ulozit
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-white/45">Len citanie</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
