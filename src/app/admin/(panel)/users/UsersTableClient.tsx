'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { searchUsers } from './search.server';
import { updateUserRole } from './actions';
import { Search, X } from 'lucide-react';

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

interface UsersTableClientProps {
  isOwner: boolean;
}

export function UsersTableClient({ isOwner }: UsersTableClientProps) {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [onboarding, setOnboarding] = useState('all');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchUsers({ q, role, onboarding });
      if (result.error) {
        setError(result.error);
        setRows([]);
      } else {
        setRows(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, role, onboarding]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleReset = () => {
    setQ('');
    setRole('all');
    setOnboarding('all');
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Users</h2>
        <p className="mt-1 text-white/70">
          Vsetky profily v databaze. Tuto sekciu vidi kazda admin rola (recepcny, manager, owner).
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="mb-1.5 block text-xs uppercase tracking-wide text-white/60">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              id="q"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Meno alebo e-mail"
              className="w-full rounded-lg border border-white/15 bg-black/40 pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none transition-colors"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="role" className="mb-1.5 block text-xs uppercase tracking-wide text-white/60">
            Rola
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="admin-role-select w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
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
            value={onboarding}
            onChange={(e) => setOnboarding(e.target.value)}
            className="admin-role-select w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
          >
            <option value="all">Vsetko</option>
            <option value="done">Dokonceny</option>
            <option value="pending">Nedokonceny</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error: {error}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm text-white/60">
          Pocet profilov: <span className="font-semibold text-white">{rows.length}</span>
          {loading && <span className="ml-2 text-white/40">Loading...</span>}
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
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  Loading users...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  Zatial tu nie su ziadne profily.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-4 py-3 text-white">
                    <Link href={`/admin/users/${row.id}`} className="hover:underline hover:text-white/80 transition-colors">
                      {row.full_name ?? "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    <Link href={`/admin/users/${row.id}`} className="hover:underline hover:text-white/60 transition-colors">
                      {row.email ?? "-"}
                    </Link>
                  </td>
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
                          className="admin-role-select rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-xs text-white focus:border-white/30 focus:outline-none"
                        >
                          {ALLOWED_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
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
