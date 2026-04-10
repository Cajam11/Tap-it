"use client";

import { FormEvent, useState } from "react";

export default function HelpContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [issue, setIssue] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !issue.trim()) {
      setInfoMessage("Vyplň prosím všetky polia pred odoslaním.");
      return;
    }

    setInfoMessage("Odosielanie správ ešte nie je aktívne. Skús to, prosím, neskôr.");
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <h2 className="text-2xl font-bold text-white">Kontaktujte nás</h2>
      <p className="mt-2 text-white/65">
        Potrebuješ pomoc? Napíš nám svoje meno, e-mail a otázku alebo problém.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label htmlFor="help-name" className="block text-sm font-medium text-white/80">
            Meno
          </label>
          <input
            id="help-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30"
            placeholder="Tvoje meno"
            autoComplete="name"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="help-email" className="block text-sm font-medium text-white/80">
            E-mail
          </label>
          <input
            id="help-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30"
            placeholder="tvoj@email.sk"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="help-issue" className="block text-sm font-medium text-white/80">
            Otázka / Problém
          </label>
          <textarea
            id="help-issue"
            name="issue"
            rows={5}
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30"
            placeholder="Popíš svoj problém alebo otázku"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/45">
            Poznámka: formulár je zatiaľ iba informatívny a správy sa neodosielajú.
          </p>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Odoslať
          </button>
        </div>

        {infoMessage ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/80">
            {infoMessage}
          </div>
        ) : null}
      </form>
    </section>
  );
}
