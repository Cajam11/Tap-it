'use client';

import { useState, useCallback, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { searchUsers } from '../users/search.server';
import { updateUserVerifiedWithFeedback } from '../users/actions';
import { Search, ShieldCheck, X } from 'lucide-react';

type QueueUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  is_verified: boolean;
  onboarding_completed: boolean | null;
  created_at: string;
};

function formatDate(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleString('sk-SK');
  } catch {
    return dateIso;
  }
}

function roleLabel(role: string | null) {
  switch (role) {
    case 'owner':
      return 'Owner';
    case 'manager':
      return 'Manager';
    case 'recepcny':
      return 'Recepčný';
    default:
      return 'User';
  }
}

export function VerificationQueueClient() {
  const [rows, setRows] = useState<QueueUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchUsers({ q, verified: 'unverified' });
      if (result.error) {
        setRows([]);
        setError(result.error);
      } else {
        setRows(result.data as QueueUserRow[]);
      }
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const userId = String(formData.get('userId') ?? '');

    setSavingUserId(userId);
    try {
      const result = await updateUserVerifiedWithFeedback(formData);
      if (result.error) {
        setFlashMessage({ type: 'error', message: result.error });
        return;
      }

      setFlashMessage({ type: 'success', message: result.message || 'Verifikácia bola potvrdená' });
      await loadUsers();
    } catch (err) {
      setFlashMessage({ type: 'error', message: err instanceof Error ? err.message : 'Neznama chyba' });
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Admin panel</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Čakajúci na verifikáciu</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/60">
            Tu vidíš iba používateľov, ktorí ešte nemajú potvrdený účet. Po verifikácii zmiznú z tohto zoznamu.
          </p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-wide text-red-300/80">Neoverení</p>
          <p className="text-2xl font-black text-white">{rows.length}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="q" className="mb-1.5 block text-xs uppercase tracking-wide text-white/60">Hľadať</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              id="q"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Meno alebo e-mail"
              className="w-full rounded-lg border border-white/15 bg-black/40 pl-10 pr-10 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none transition-colors"
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

        <div className="sm:col-span-2 lg:col-span-2 flex items-end gap-2">
          <button
            type="button"
            onClick={loadUsers}
            disabled={loading}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            Len neoverení
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error: {error}
        </div>
      )}

      {flashMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            flashMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-red-500/30 bg-red-500/10 text-red-300'
          }`}
        >
          {flashMessage.message}
        </div>
      )}

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {loading && rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-white/50">
            Loading users...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-6 text-center text-white/50">
            Žiadni neoverení používatelia.
          </div>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/users/${row.id}`}
                    className="block truncate font-semibold text-white hover:underline underline-offset-4 transition-[text-decoration]"
                  >
                    {row.full_name ?? '-'}
                  </Link>
                  {row.email ? (
                    <Link
                      href={`mailto:${row.email}`}
                      className="block truncate text-sm text-white/60 hover:underline underline-offset-4 transition-[text-decoration]"
                    >
                      {row.email}
                    </Link>
                  ) : (
                    <p className="truncate text-sm text-white/60">-</p>
                  )}
                </div>
                <span className="shrink-0 inline-flex rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/70">
                  {roleLabel(row.role)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 font-medium ${row.onboarding_completed ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/40 bg-amber-500/10 text-amber-300'}`}
                >
                  {row.onboarding_completed ? 'Onboarding dokončený' : 'Onboarding nedokončený'}
                </span>
                <span className="text-white/45">{formatDate(row.created_at)}</span>
              </div>

              <form onSubmit={handleVerify} className="mt-auto">
                <input type="hidden" name="userId" value={row.id} />
                <input type="hidden" name="isVerified" value="true" />
                <button
                  type="submit"
                  disabled={savingUserId === row.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {savingUserId === row.id ? 'Ukladám...' : 'Potvrdiť verifikáciu'}
                </button>
              </form>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-white/70">
            <tr>
              <th className="px-4 py-3 font-medium">Meno</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Rola</th>
              <th className="px-4 py-3 font-medium">Onboarding</th>
              <th className="px-4 py-3 font-medium">Vytvorený</th>
              <th className="px-4 py-3 font-medium">Akcia</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">Loading users...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">Žiadni neoverení používatelia.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-white/10 last:border-b-0">
                  <td className="px-4 py-3 text-white">
                    <Link
                      href={`/admin/users/${row.id}`}
                      className="font-semibold text-white hover:underline underline-offset-4 transition-[text-decoration]"
                    >
                      {row.full_name ?? '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {row.email ? (
                      <Link
                        href={`mailto:${row.email}`}
                        className="text-white/80 hover:underline underline-offset-4 transition-[text-decoration]"
                      >
                        {row.email}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">{roleLabel(row.role)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${row.onboarding_completed ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' : 'border-amber-400/40 bg-amber-500/10 text-amber-300'}`}>
                      {row.onboarding_completed ? 'Dokončený' : 'Nedokončený'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <form onSubmit={handleVerify} className="inline-flex items-center">
                      <input type="hidden" name="userId" value={row.id} />
                      <input type="hidden" name="isVerified" value="true" />
                      <button
                        type="submit"
                        disabled={savingUserId === row.id}
                        className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                      >
                        {savingUserId === row.id ? 'Ukladam...' : 'Potvrdiť verifikáciu'}
                      </button>
                    </form>
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
