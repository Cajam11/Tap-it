"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAdmin } from "../actions";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(signInAdmin, null);

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-red-400/90">Admin Access</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Prihlasenie do admin panelu</h1>
          <p className="mt-2 text-sm text-white/50">Pouzi svoj pracovny ucet (recepcny, manager alebo owner).</p>
        </div>

        {state?.error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {state.error}
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/70">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="meno@email.com"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-white/70">
                Heslo
              </label>
              <Link href="/forgot-password" className="text-sm text-red-400 hover:text-red-300">
                Zabudnute heslo?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={6}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-60"
          >
            {pending ? "Prihlasujem..." : "Prihlasit sa do admin panelu"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Bezny pouzivatel? <Link href="/login" className="text-red-400 hover:text-red-300">Prejdi na user login</Link>
        </p>
      </div>
    </div>
  );
}