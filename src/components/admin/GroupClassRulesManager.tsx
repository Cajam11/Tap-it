"use client";

import { useEffect, useMemo, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { CalendarClock, Check, Dumbbell, Save, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  saveGroupClassRecurringRule,
  saveGroupClassService,
} from "@/app/admin/(panel)/bookings/actions";
import type { GroupClassPanelMode } from "@/components/admin/AdminBookingsWorkspace";

type GroupService = {
  id: string;
  name: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
  capacity: number | null;
  metadata: Record<string, unknown> | null;
};

type TrainerOption = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type RuleRow = {
  id: string;
  service_id: string;
  trainer_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active_until: string | null;
};

type GroupClassRulesManagerProps = {
  mode: Extract<GroupClassPanelMode, "new" | "recurring">;
  newClassVersion: number;
  services: GroupService[];
  trainers: TrainerOption[];
  rules: RuleRow[];
  onModeChange: (mode: GroupClassPanelMode) => void;
};

type FormState = {
  serviceId: string | null;
  name: string;
  room: string;
  exerciseKind: string;
  basePrice: string;
  capacity: string;
  trainerId: string;
  days: number[];
  startTime: string;
  endTime: string;
  imageUrl: string;
  imageFile: File | null;
};

const EMPTY_FORM: FormState = {
  serviceId: null,
  name: "",
  room: "",
  exerciseKind: "",
  basePrice: "0",
  capacity: "",
  trainerId: "",
  days: [],
  startTime: "16:00",
  endTime: "17:00",
  imageUrl: "",
  imageFile: null,
};

const DAYS = [
  { id: 1, short: "Po", label: "Pondelok" },
  { id: 2, short: "Ut", label: "Utorok" },
  { id: 3, short: "St", label: "Streda" },
  { id: 4, short: "Stv", label: "Stvrtok" },
  { id: 5, short: "Pi", label: "Piatok" },
  { id: 6, short: "So", label: "Sobota" },
  { id: 0, short: "Ne", label: "Nedela" },
];

function normalizeTime(value?: string | null, fallback = "16:00") {
  return value ? value.substring(0, 5) : fallback;
}

function readMetadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formFromService(service: GroupService, serviceRules: RuleRow[]): FormState {
  const firstRule = serviceRules[0];

  return {
    serviceId: service.id,
    name: service.name,
    room: readMetadataText(service.metadata, "room") ?? "",
    exerciseKind: readMetadataText(service.metadata, "exercise_kind") ?? service.name,
    basePrice: String(service.base_price ?? 0),
    capacity: service.capacity === null || service.capacity === undefined ? "" : String(service.capacity),
    trainerId: firstRule?.trainer_id ?? "",
    days: serviceRules.map((rule) => rule.day_of_week),
    startTime: normalizeTime(firstRule?.start_time),
    endTime: normalizeTime(firstRule?.end_time, "17:00"),
    imageUrl: readMetadataText(service.metadata, "image_url") ?? "",
    imageFile: null,
  };
}

function formatRuleSummary(rules: RuleRow[], trainers: TrainerOption[]) {
  if (rules.length === 0) return "Bez rozvrhu";

  const trainerId = rules[0]?.trainer_id;
  const trainer = trainers.find((item) => item.id === trainerId);
  const days = rules
    .map((rule) => DAYS.find((day) => day.id === rule.day_of_week)?.short)
    .filter(Boolean)
    .join(", ");

  return `${days} ${normalizeTime(rules[0]?.start_time)} - ${normalizeTime(
    rules[0]?.end_time,
    "17:00",
  )}${trainer ? `, ${trainer.full_name || trainer.email || "Trener"}` : ""}`;
}

export default function GroupClassRulesManager({
  mode,
  newClassVersion,
  services,
  trainers,
  rules,
}: GroupClassRulesManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(services[0]?.id ?? null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const rulesByService = useMemo(() => {
    const map = new Map<string, RuleRow[]>();
    for (const rule of rules) {
      map.set(rule.service_id, [...(map.get(rule.service_id) ?? []), rule]);
    }
    return map;
  }, [rules]);

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;

  useEffect(() => {
    if (mode === "new") {
      setForm(EMPTY_FORM);
      setSelectedServiceId(null);
      setMessage("");
      return;
    }

    const service = selectedService ?? services[0] ?? null;
    if (service) {
      setSelectedServiceId(service.id);
      setForm(formFromService(service, rulesByService.get(service.id) ?? []));
    }
    setMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, newClassVersion, services.length]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadService = (service: GroupService) => {
    setSelectedServiceId(service.id);
    setForm(formFromService(service, rulesByService.get(service.id) ?? []));
    setMessage("");
  };

  const toggleDay = (day: number) => {
    setForm((current) => ({
      ...current,
      days: current.days.includes(day)
        ? current.days.filter((currentDay) => currentDay !== day)
        : [...current.days, day].sort((a, b) => a - b),
    }));
  };

  const handleSaveAll = () => {
    setMessage("");

    startTransition(async () => {
      let coverUrl = form.imageUrl;
      
      if (form.imageFile) {
        const supabase = createClient();
        const fileExt = form.imageFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { data, error } = await supabase.storage.from("service-covers").upload(fileName, form.imageFile);
        
        if (error) {
          setMessage(`Chyba pri nahrávani obrázka: ${error.message}`);
          return;
        }
        
        const { data: { publicUrl } } = supabase.storage.from("service-covers").getPublicUrl(data.path);
        
        // Vymazanie starého obrázka zo storage (ak nejaký bol)
        if (form.imageUrl && form.imageUrl !== publicUrl) {
          const oldPathMatch = form.imageUrl.match(/service-covers\/(.+)$/);
          if (oldPathMatch && oldPathMatch[1]) {
            await supabase.storage.from("service-covers").remove([oldPathMatch[1]]);
          }
        }
        
        coverUrl = publicUrl;
      }

      const serviceResult = await saveGroupClassService({
        serviceId: form.serviceId,
        name: form.name,
        room: form.room,
        exerciseKind: form.exerciseKind,
        basePrice: Number(form.basePrice),
        capacity: form.capacity.trim() ? Number(form.capacity) : null,
        imageUrl: coverUrl,
      });

      if (serviceResult.error || !serviceResult.serviceId) {
        setMessage(`Chyba: ${serviceResult.error ?? "Nepodarilo sa ulozit lekciu."}`);
        return;
      }

      const scheduleResult = await saveGroupClassRecurringRule({
        serviceId: serviceResult.serviceId,
        trainerId: form.trainerId,
        days: form.days,
        startTime: form.startTime,
        endTime: form.endTime,
      });

      if (scheduleResult.error) {
        setForm((current) => ({ ...current, serviceId: serviceResult.serviceId }));
        setSelectedServiceId(serviceResult.serviceId);
        setMessage(`Lekcia je ulozena, ale rozvrh nie: ${scheduleResult.error}`);
        router.refresh();
        return;
      }

      setForm((current) => ({ ...current, serviceId: serviceResult.serviceId }));
      setSelectedServiceId(serviceResult.serviceId);
      setMessage(
        `Ulozene. Vygenerovane terminy: ${scheduleResult.generatedCount ?? 0}.`,
      );
      router.refresh();
    });
  };

  return (
    <section className="min-h-full rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-col gap-2 border-b border-white/10 pb-5">
        <div className="flex items-center gap-2 text-white">
          {mode === "new" ? (
            <Dumbbell className="h-5 w-5 text-red-400" />
          ) : (
            <CalendarClock className="h-5 w-5 text-red-400" />
          )}
          <h2 className="text-lg font-semibold">
            {mode === "new" ? "Nova skupinova lekcia" : "Skupinove treningy"}
          </h2>
        </div>
        <p className="text-sm leading-6 text-white/55">
          {mode === "new"
            ? "Vypln udaje lekcie, vyber instruktora, dni a cas. Vsetko sa ulozi naraz."
            : "Vyber vytvoreny skupinovy trening a uprav jeho udaje, instruktora alebo opakovanie."}
        </p>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        {mode === "recurring" && (
          <div className="space-y-2">
            {services.length === 0 ? (
              <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/50">
                Zatial nie su vytvorene ziadne skupinove treningy.
              </p>
            ) : (
              services.map((service) => {
                const serviceRules = rulesByService.get(service.id) ?? [];
                const isSelected = selectedServiceId === service.id;

                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => loadService(service)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-red-500/50 bg-red-500/10 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{service.name}</span>
                      {serviceRules.length > 0 && <Check className="h-4 w-4 text-green-300" />}
                    </div>
                    <div className="mt-1 text-xs text-white/45">
                      {formatRuleSummary(serviceRules, trainers)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        <div className={mode === "new" ? "xl:col-span-2" : ""}>
          <ClassForm
            form={form}
            trainers={trainers}
            isPending={isPending}
            message={message}
            submitLabel={mode === "new" ? "Vytvorit lekciu a rozvrh" : "Ulozit zmeny"}
            onUpdate={updateForm}
            onToggleDay={toggleDay}
            onSave={handleSaveAll}
          />
        </div>
      </div>
    </section>
  );
}

function ClassForm({
  form,
  trainers,
  isPending,
  message,
  submitLabel,
  onUpdate,
  onToggleDay,
  onSave,
}: {
  form: FormState;
  trainers: TrainerOption[];
  isPending: boolean;
  message: string;
  submitLabel: string;
  onUpdate: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onToggleDay: (day: number) => void;
  onSave: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-5 rounded-lg border border-white/10 bg-black/20 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm text-white/60">Nazov</span>
          <input
            value={form.name}
            onChange={(event) => onUpdate("name", event.target.value)}
            placeholder="Body Forming"
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/60">Miestnost</span>
          <input
            value={form.room}
            onChange={(event) => onUpdate("room", event.target.value)}
            placeholder="Velka miestnost"
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/60">Druh cvicenia</span>
          <input
            value={form.exerciseKind}
            onChange={(event) => onUpdate("exerciseKind", event.target.value)}
            placeholder="Skupinove cvicenie"
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/60">Cena za vstup</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.basePrice}
            onChange={(event) => onUpdate("basePrice", event.target.value)}
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/60">Kapacita</span>
          <input
            type="number"
            min="1"
            step="1"
            value={form.capacity}
            onChange={(event) => onUpdate("capacity", event.target.value)}
            placeholder="Bez limitu"
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
          />
        </label>

        <div className="space-y-2 md:col-span-2">
          <span className="text-sm text-white/60">Cover obrázok</span>
          <div className="flex items-center gap-4">
            {(form.imageFile || form.imageUrl) ? (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                <NextImage
                  src={form.imageFile ? URL.createObjectURL(form.imageFile) : form.imageUrl!}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/10 bg-black/40 text-white/30">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpdate("imageFile", file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Vybrať obrázok
              </button>
              {form.imageFile && (
                <button
                  type="button"
                  onClick={() => onUpdate("imageFile", null)}
                  className="ml-3 text-xs text-red-400 hover:underline"
                >
                  Zrušiť výber
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="grid gap-4 lg:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm text-white/60">Instruktor</span>
          <select
            value={form.trainerId}
            onChange={(event) => onUpdate("trainerId", event.target.value)}
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
          >
            <option value="">Vyber instruktora</option>
            {trainers.map((trainer) => (
              <option key={trainer.id} value={trainer.id}>
                {trainer.full_name || trainer.email || "Trener"}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/60">Od</span>
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onUpdate("startTime", event.target.value)}
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/60">Do</span>
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onUpdate("endTime", event.target.value)}
            className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
          />
        </label>
      </div>

      <div className="space-y-2">
        <span className="text-sm text-white/60">Dni opakovania</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {DAYS.map((day) => {
            const isChecked = form.days.includes(day.id);
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => onToggleDay(day.id)}
                title={day.label}
                className={`h-11 rounded-lg border text-sm font-medium transition ${
                  isChecked
                    ? "border-red-500/60 bg-red-500/15 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white"
                }`}
              >
                {day.short}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Ukladam..." : submitLabel}
        </button>

        {message && (
          <p className={`text-sm ${message.startsWith("Chyba") ? "text-red-300" : "text-green-300"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
