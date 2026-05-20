"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveAvailabilityRules } from "./actions";

type Rule = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active_until?: string | null;
};

const DAYS = [
  { id: 1, name: "Pondelok" },
  { id: 2, name: "Utorok" },
  { id: 3, name: "Streda" },
  { id: 4, name: "Stvrtok" },
  { id: 5, name: "Piatok" },
  { id: 6, name: "Sobota" },
  { id: 0, name: "Nedela" },
];

function normalizeTime(value: string) {
  return value ? value.substring(0, 5) : "08:00";
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("sk-SK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function TrainerAvailabilityForm({
  trainerId,
  serviceId,
  initialRules,
}: {
  trainerId: string;
  serviceId: string;
  initialRules: Rule[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(
    initialRules.map((rule) => ({
      ...rule,
      start_time: normalizeTime(rule.start_time),
      end_time: normalizeTime(rule.end_time),
    }))
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const activeUntil = formatDate(initialRules[0]?.active_until);

  const handleAddRule = () => {
    setRules([...rules, { day_of_week: 1, start_time: "08:00", end_time: "10:00" }]);
  };

  const handleUpdateRule = (index: number, field: keyof Rule, value: string | number) => {
    const updated = [...rules];
    updated[index] = { ...updated[index], [field]: value };
    setRules(updated);
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, ruleIndex) => ruleIndex !== index));
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await saveAvailabilityRules(trainerId, serviceId, rules);
      if (res.error) throw new Error(res.error);

      const savedUntil = formatDate(res.activeUntil);
      setMessage(
        `Dostupnost je ulozena${savedUntil ? ` do ${savedUntil}` : ""}. Vygenerovane terminy: ${res.generatedCount ?? 0}.`
      );
      router.refresh();
    } catch (error) {
      setMessage(`Chyba: ${error instanceof Error ? error.message : "Nepodarilo sa ulozit dostupnost."}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-5">
        <p className="text-sm font-medium text-white">Mesacne casy treningov</p>
        <p className="text-sm leading-6 text-white/55">
          Po ulozeni sa terminy predgeneruju na najblizsi mesiac. Ked cas odstranis,
          odstrania sa aj jeho buduce vygenerovane terminy.
        </p>
        {activeUntil && (
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            Aktualne platne do {activeUntil}
          </p>
        )}
      </div>

      {rules.length === 0 ? (
        <p className="text-white/50">Zatial nemas nastavene ziadne mesacne treningy.</p>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, idx) => (
            <div
              key={`${rule.day_of_week}-${rule.start_time}-${rule.end_time}-${idx}`}
              className="flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-white/[0.03] p-4"
            >
              <select
                value={rule.day_of_week}
                onChange={(event) => handleUpdateRule(idx, "day_of_week", parseInt(event.target.value, 10))}
                className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-red-500"
              >
                {DAYS.map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2">
                <span className="text-sm text-white/60">Od:</span>
                <input
                  type="time"
                  value={rule.start_time}
                  onChange={(event) => handleUpdateRule(idx, "start_time", event.target.value)}
                  className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-red-500"
                />
              </label>

              <label className="flex items-center gap-2">
                <span className="text-sm text-white/60">Do:</span>
                <input
                  type="time"
                  value={rule.end_time}
                  onChange={(event) => handleUpdateRule(idx, "end_time", event.target.value)}
                  className="rounded-lg border border-white/20 bg-black px-3 py-2 text-white outline-none focus:border-red-500"
                />
              </label>

              <button
                type="button"
                onClick={() => handleRemoveRule(idx)}
                className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300"
                title="Odstranit cas"
                aria-label="Odstranit cas"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={handleAddRule}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-white/30 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/[0.05]"
        >
          <Plus className="h-4 w-4" />
          Pridat cas
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={handleSave}
          className="rounded-lg bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Ukladam a generujem..." : "Ulozit mesacne terminy"}
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.startsWith("Chyba") ? "bg-red-900/40 text-red-200" : "bg-green-900/40 text-green-200"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
