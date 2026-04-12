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
    <section className="border-t border-white/10 pt-8 sm:pt-10">
      <h2 className="text-3xl font-bold text-white">Kontaktujte nás</h2>
      <p className="mt-3 text-base text-white/65 sm:text-lg">
        Potrebuješ pomoc? Napíš nám svoje meno, e-mail a otázku alebo problém.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div className="space-y-2.5">
          <label htmlFor="help-name" className="block text-base font-medium text-white/85">
            Meno
          </label>
          <input
            id="help-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-white/12 bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30"
            placeholder="Tvoje meno"
            autoComplete="name"
          />
        </div>

        <div className="space-y-2.5">
          <label htmlFor="help-email" className="block text-base font-medium text-white/85">
            E-mail
          </label>
          <input
            id="help-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-white/12 bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30"
            placeholder="tvoj@email.sk"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2.5">
          <label htmlFor="help-issue" className="block text-base font-medium text-white/85">
            Otázka / Problém
          </label>
          <textarea
            id="help-issue"
            name="issue"
            rows={5}
            value={issue}
            onChange={(event) => setIssue(event.target.value)}
            className="w-full rounded-xl border border-white/12 bg-transparent px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/30"
            placeholder="Popíš svoj problém alebo otázku"
          />
        </div>

        <div className="flex justify-start sm:justify-end">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-red-600 px-7 py-3 text-base font-semibold text-white transition hover:bg-red-500"
          >
            Odoslať
          </button>
        </div>

        {infoMessage ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white/80">
            {infoMessage}
          </div>
        ) : null}
      </form>
    </section>
  );
}
