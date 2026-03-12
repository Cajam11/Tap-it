"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "../actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, null);

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Zabudnuté heslo</h1>
        <p className="text-white/50 mt-2">
          Zadaj svoj e-mail a pošleme ti odkaz na resetovanie hesla
        </p>
      </div>

      {state?.error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {state.success}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-1.5">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            placeholder="meno@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white transition-colors"
        >
          {pending ? "Odosielam..." : "Odoslať odkaz"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Spomínaš si na heslo?{" "}
        <Link href="/login" className="text-red-400 hover:text-red-300 font-medium transition-colors">
          Prihlás sa
        </Link>
      </p>
    </div>
  );
}
