"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Save, Trash2 } from "lucide-react";
import {
  saveMembershipPlan,
  setMembershipPlanActive,
} from "@/app/admin/(panel)/membership-plans/actions";

type BillingCycle = "entries" | "monthly" | "yearly";
type LimitMode = "days" | "entries" | "days_and_entries";

export type AdminMembershipPlan = {
  id: string;
  name: string;
  price: number;
  billing_cycle: BillingCycle;
  entry_count: number | null;
  duration_days: number | null;
  is_single_entry: boolean;
  description: string | null;
  benefits: string[] | null;
  display_order: number | null;
  is_highlighted: boolean | null;
  is_active: boolean | null;
};

type FormState = {
  planId: string | null;
  name: string;
  price: string;
  billingCycle: BillingCycle;
  limitMode: LimitMode;
  entryCount: string;
  durationDays: string;
  description: string;
  benefitsText: string;
  displayOrder: string;
  isHighlighted: boolean;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  planId: null,
  name: "",
  price: "0",
  billingCycle: "monthly",
  limitMode: "days",
  entryCount: "",
  durationDays: "30",
  description: "",
  benefitsText: "",
  displayOrder: "100",
  isHighlighted: false,
  isActive: true,
};

function formFromPlan(plan: AdminMembershipPlan): FormState {
  const limitMode =
    plan.billing_cycle === "entries" && plan.duration_days
      ? "days_and_entries"
      : plan.billing_cycle === "entries"
        ? "entries"
        : "days";

  return {
    planId: plan.id,
    name: plan.name,
    price: String(plan.price ?? 0),
    billingCycle: plan.billing_cycle === "entries" ? "entries" : "monthly",
    limitMode,
    entryCount: plan.entry_count === null ? "" : String(plan.entry_count),
    durationDays: plan.duration_days === null ? "" : String(plan.duration_days),
    description: plan.description ?? "",
    benefitsText: (plan.benefits ?? []).join("\n"),
    displayOrder: String(plan.display_order ?? 0),
    isHighlighted: Boolean(plan.is_highlighted),
    isActive: plan.is_active !== false,
  };
}

function formatPlanPeriod(plan: AdminMembershipPlan) {
  if (plan.billing_cycle === "entries") {
    const count = plan.entry_count ?? 1;
    if (count === 1) return "1 vstup";
    if (count > 1 && count < 5) return `${count} vstupy`;
    return `${count} vstupov`;
  }
  if (plan.billing_cycle === "yearly") return `${plan.duration_days ?? 365} dni`;
  return `${plan.duration_days ?? 30} dni`;
}

export default function AdminMembershipPlansManager({
  plans,
}: {
  plans: AdminMembershipPlan[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(plans[0] ? formFromPlan(plans[0]) : EMPTY_FORM);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => {
      if (key === "limitMode") {
        const limitMode = value as LimitMode;

        if (limitMode === "entries") {
          return {
            ...current,
            limitMode,
            billingCycle: "entries",
            entryCount: current.entryCount || "10",
            durationDays: "",
          };
        }

        if (limitMode === "days_and_entries") {
          return {
            ...current,
            limitMode,
            billingCycle: "entries",
            entryCount: current.entryCount || "10",
            durationDays: current.durationDays || "60",
          };
        }

        return {
          ...current,
          limitMode,
          billingCycle: "monthly",
          entryCount: "",
          durationDays: current.durationDays || "30",
        };
      }

      return { ...current, [key]: value };
    });
  };

  const loadPlan = (plan: AdminMembershipPlan) => {
    setSelectedPlanId(plan.id);
    setForm(formFromPlan(plan));
    setMessage("");
  };

  const newPlan = () => {
    setSelectedPlanId(null);
    setForm(EMPTY_FORM);
    setMessage("");
  };

  const handleSave = () => {
    setMessage("");

    startTransition(async () => {
      const result = await saveMembershipPlan({
        planId: form.planId,
        name: form.name,
        price: Number(form.price),
        billingCycle: form.billingCycle,
        entryCount:
          form.limitMode === "days"
            ? null
            : form.entryCount.trim()
              ? Number(form.entryCount)
              : null,
        durationDays:
          form.limitMode === "entries"
            ? null
            : form.durationDays.trim()
              ? Number(form.durationDays)
              : null,
        description: form.description,
        benefitsText: form.benefitsText,
        displayOrder: Number(form.displayOrder),
        isHighlighted: form.isHighlighted,
        isActive: form.isActive,
      });

      if (result.error || !result.planId) {
        setMessage(`Chyba: ${result.error ?? "Nepodarilo sa ulozit plan."}`);
        return;
      }

      setSelectedPlanId(result.planId);
      setForm((current) => ({ ...current, planId: result.planId }));
      setMessage("Membership plan je ulozeny.");
      router.refresh();
    });
  };

  const handleToggleActive = () => {
    if (!form.planId) return;
    const nextActive = !form.isActive;
    const confirmed = window.confirm(
      nextActive ? "Aktivovat tento membership plan?" : "Deaktivovat tento membership plan?",
    );
    if (!confirmed) return;

    setMessage("");

    startTransition(async () => {
      const result = await setMembershipPlanActive(form.planId!, nextActive);

      if (result.error) {
        setMessage(`Chyba: ${result.error}`);
        return;
      }

      setForm((current) => ({ ...current, isActive: nextActive }));
      setMessage(nextActive ? "Membership plan je aktivny." : "Membership plan bol deaktivovany.");
      router.refresh();
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">Membership plány</h1>
          <p className="text-white/60">
            Správa cien, popisov a výhod, ktoré sa zobrazujú na landing page aj pri výbere členstva.
          </p>
        </div>
        <button
          type="button"
          onClick={newPlan}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <Plus className="h-4 w-4" />
          Nový plán
        </button>
      </div>

      <section className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          {plans.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/50">
              Zatiaľ nie sú vytvorené žiadne membership plány.
            </p>
          ) : (
            plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => loadPlan(plan)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-red-500/50 bg-red-500/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>{plan.name}</span>
                    {plan.is_active === false ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50">
                        skrytý
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    {Number(plan.price).toFixed(2)} EUR · {formatPlanPeriod(plan)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <MembershipPlanForm
          form={form}
          isPending={isPending}
          message={message}
          onUpdate={updateForm}
          onSave={handleSave}
          onToggleActive={handleToggleActive}
        />
      </section>
    </div>
  );
}

function MembershipPlanForm({
  form,
  isPending,
  message,
  onUpdate,
  onSave,
  onToggleActive,
}: {
  form: FormState;
  isPending: boolean;
  message: string;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onSave: () => void;
  onToggleActive: () => void;
}) {
  const usesEntries = form.limitMode === "entries" || form.limitMode === "days_and_entries";
  const usesDays = form.limitMode === "days" || form.limitMode === "days_and_entries";

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 border-b border-white/10 pb-5 text-white">
        <CreditCard className="h-5 w-5 text-red-400" />
        <h2 className="text-lg font-semibold">
          {form.planId ? "Upraviť plán" : "Nový plán"}
        </h2>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm text-white/60">Názov</span>
          <input
            value={form.name}
            onChange={(event) => onUpdate("name", event.target.value)}
            placeholder="Mesačná"
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/60">Cena v EUR</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) => onUpdate("price", event.target.value)}
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-white/60">Platnosť podľa</span>
          <select
            value={form.limitMode}
            onChange={(event) => onUpdate("limitMode", event.target.value as LimitMode)}
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
          >
            <option value="entries">Počet vstupov</option>
            <option value="days">Počet dní</option>
            <option value="days_and_entries">Počet dní aj vstupov</option>
          </select>
        </label>

        {usesEntries ? (
          <label className="block space-y-2">
            <span className="text-sm text-white/60">Počet vstupov</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.entryCount}
              onChange={(event) => onUpdate("entryCount", event.target.value)}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
            />
          </label>
        ) : null}

        {usesDays ? (
          <label className="block space-y-2">
            <span className="text-sm text-white/60">Trvanie v dňoch</span>
            <input
              type="number"
              min="1"
              step="1"
              value={form.durationDays}
              onChange={(event) => onUpdate("durationDays", event.target.value)}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm text-white/60">Poradie</span>
          <input
            type="number"
            step="1"
            value={form.displayOrder}
            onChange={(event) => onUpdate("displayOrder", event.target.value)}
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
          />
        </label>

        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm text-white/60">Popis</span>
          <textarea
            value={form.description}
            onChange={(event) => onUpdate("description", event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
          />
        </label>

        <label className="block space-y-2 md:col-span-2">
          <span className="text-sm text-white/60">Výhody, každá na nový riadok</span>
          <textarea
            value={form.benefitsText}
            onChange={(event) => onUpdate("benefitsText", event.target.value)}
            rows={6}
            className="w-full rounded-lg border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
          />
        </label>

        <div className="flex flex-wrap gap-4 md:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.isHighlighted}
              onChange={(event) => onUpdate("isHighlighted", event.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Zvýrazniť
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onUpdate("isActive", event.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Aktívny
          </label>
        </div>
      </div>

      {message ? <p className="mt-5 text-sm text-white/70">{message}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Ukladám..." : "Uložiť plán"}
        </button>
        {form.planId ? (
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {form.isActive ? "Deaktivovať" : "Aktivovať"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
