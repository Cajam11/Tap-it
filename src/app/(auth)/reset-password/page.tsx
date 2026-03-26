"use client";

import { useState } from "react";
import Link from "next/link";
import { updatePassword } from "../actions";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Heslo musí mať aspoň 6 znakov.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append("password", password);

    const result = await updatePassword(null, formData);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white">Nastaviť nové heslo</h1>
        <p className="text-white/50 mt-2">Zadaj nové heslo pre svoj účet</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white/70 mb-1.5">
            Nové heslo
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            placeholder="Minimálne 6 znakov"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/70 mb-1.5">
            Potvrdiť heslo
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
            placeholder="Zopakuj nové heslo"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {password && confirmPassword && password !== confirmPassword && (
          <p className="text-sm text-red-400">Heslá sa nezhodujú.</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white transition-colors"
        >
          {loading ? "Ukladam..." : "Uložiť nové heslo"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        <Link href="/login" className="text-red-400 hover:text-red-300 font-medium transition-colors">
          Späť na prihlásenie
        </Link>
      </p>
    </div>
  );
}
