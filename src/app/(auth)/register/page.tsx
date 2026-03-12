"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, signInWithGoogle } from "../actions";

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function RegisterPage() {
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, null);
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, null);

  const error = signUpState?.error || googleState?.error;
  const success = signUpState?.success;

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Vytvor si účet</h1>
        <p className="text-white/50 mt-2">Začni trénovať s Tap-it</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Google */}
      <form action={googleAction}>
        <button
          type="submit"
          disabled={googlePending}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-60"
        >
          <GoogleIcon />
          {googlePending ? "Presmerovávam..." : "Pokračovať s Google"}
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[#080808] px-4 text-white/40">alebo</span>
        </div>
      </div>

      {/* Email + Password */}
      <form action={signUpAction} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-white/70 mb-1.5">
            Celé meno
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            autoComplete="name"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            placeholder="Ján Novák"
          />
        </div>

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

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
            Heslo
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={6}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            placeholder="Minimálne 6 znakov"
          />
        </div>

        <button
          type="submit"
          disabled={signUpPending}
          className="w-full rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 px-4 py-3 text-sm font-semibold text-white transition-colors"
        >
          {signUpPending ? "Vytváram účet..." : "Vytvoriť účet"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Už máš účet?{" "}
        <Link href="/login" className="text-red-400 hover:text-red-300 font-medium transition-colors">
          Prihlás sa
        </Link>
      </p>
    </div>
  );
}
