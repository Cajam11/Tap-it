"use client";

import { useRef, useState, useTransition } from "react";
import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Plus, Save, Trash2, Warehouse } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  saveFacilityService,
  setFacilityServiceActive,
} from "@/app/admin/(panel)/priestory/actions";

type FacilityService = {
  id: string;
  name: string;
  base_price: number;
  price_unit: "hour" | "minute" | "session";
  metadata: Record<string, unknown> | null;
  is_active: boolean;
};

type FormState = {
  serviceId: string | null;
  name: string;
  basePrice: string;
  priceUnit: "hour" | "minute";
  firstHourPrice: string;
  nextHourPrice: string;
  isActive: boolean;
  imageUrl: string;
  imageFile: File | null;
};

const EMPTY_FORM: FormState = {
  serviceId: null,
  name: "",
  basePrice: "0",
  priceUnit: "hour",
  firstHourPrice: "",
  nextHourPrice: "",
  isActive: true,
  imageUrl: "",
  imageFile: null,
};

function readMetadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formFromFacility(facility: FacilityService): FormState {
  return {
    serviceId: facility.id,
    name: facility.name,
    basePrice: String(facility.base_price ?? 0),
    priceUnit: facility.price_unit === "minute" ? "minute" : "hour",
    firstHourPrice: readMetadataText(facility.metadata, "first_hour_price") ?? "",
    nextHourPrice: readMetadataText(facility.metadata, "next_hour_price") ?? "",
    isActive: facility.is_active,
    imageUrl: readMetadataText(facility.metadata, "image_url") ?? "",
    imageFile: null,
  };
}

function formatUnit(unit: FacilityService["price_unit"] | FormState["priceUnit"]) {
  return unit === "minute" ? "min." : "hod.";
}

export default function AdminFacilitiesManager({ facilities }: { facilities: FacilityService[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(facilities[0] ? formFromFacility(facilities[0]) : EMPTY_FORM);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(facilities[0]?.id ?? null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadFacility = (facility: FacilityService) => {
    setSelectedFacilityId(facility.id);
    setForm(formFromFacility(facility));
    setMessage("");
  };

  const newFacility = () => {
    setSelectedFacilityId(null);
    setForm(EMPTY_FORM);
    setMessage("");
  };

  const handleSave = () => {
    setMessage("");

    startTransition(async () => {
      let coverUrl = form.imageUrl;

      if (form.imageFile) {
        const supabase = createClient();
        const fileExt = form.imageFile.name.split(".").pop();
        const fileName = `facilities/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { data, error } = await supabase.storage.from("service-covers").upload(fileName, form.imageFile);

        if (error) {
          setMessage(`Chyba pri nahravani obrazka: ${error.message}`);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("service-covers").getPublicUrl(data.path);

        if (form.imageUrl && form.imageUrl !== publicUrl) {
          const oldPathMatch = form.imageUrl.match(/service-covers\/(.+)$/);
          if (oldPathMatch?.[1]) {
            await supabase.storage.from("service-covers").remove([oldPathMatch[1]]);
          }
        }

        coverUrl = publicUrl;
      }

      const result = await saveFacilityService({
        serviceId: form.serviceId,
        name: form.name,
        basePrice: Number(form.basePrice),
        priceUnit: form.priceUnit,
        isActive: form.isActive,
        imageUrl: coverUrl,
        firstHourPrice: form.firstHourPrice.trim() ? Number(form.firstHourPrice) : null,
        nextHourPrice: form.nextHourPrice.trim() ? Number(form.nextHourPrice) : null,
      });

      if (result.error || !result.serviceId) {
        setMessage(`Chyba: ${result.error ?? "Nepodarilo sa ulozit priestor."}`);
        return;
      }

      setSelectedFacilityId(result.serviceId);
      setForm((current) => ({
        ...current,
        serviceId: result.serviceId,
        imageUrl: coverUrl,
        imageFile: null,
      }));
      setMessage("Priestor je ulozeny.");
      router.refresh();
    });
  };

  const handleToggleActive = () => {
    if (!form.serviceId) return;
    const nextActive = !form.isActive;
    const confirmed = window.confirm(
      nextActive ? "Aktivovat tento priestor?" : "Deaktivovat tento priestor?",
    );
    if (!confirmed) return;

    setMessage("");

    startTransition(async () => {
      const result = await setFacilityServiceActive(form.serviceId!, nextActive);

      if (result.error) {
        setMessage(`Chyba: ${result.error}`);
        return;
      }

      setForm((current) => ({ ...current, isActive: nextActive }));
      setMessage(nextActive ? "Priestor je aktivny." : "Priestor je skryty.");
      router.refresh();
    });
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-white">Priestory</h1>
          <p className="text-white/60">
            Sprava rezervovatelnych priestorov. Dostupnost je pevne 6:00 - 21:00 kazdy den.
          </p>
        </div>
        <button
          type="button"
          onClick={newFacility}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <Plus className="h-4 w-4" />
          Novy priestor
        </button>
      </div>

      <section className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          {facilities.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-white/50">
              Zatial nie su vytvorene ziadne priestory.
            </p>
          ) : (
            facilities.map((facility) => {
              const isSelected = selectedFacilityId === facility.id;
              return (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => loadFacility(facility)}
                  className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-red-500/50 bg-red-500/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/20 hover:text-white"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span>{facility.name}</span>
                    {!facility.is_active ? (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/50">
                        skryte
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-white/45">
                    {Number(facility.base_price).toFixed(2)} EUR / {formatUnit(facility.price_unit)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <FacilityForm
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

function FacilityForm({
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = form.imageFile ? URL.createObjectURL(form.imageFile) : form.imageUrl;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 border-b border-white/10 pb-5 text-white">
        <Warehouse className="h-5 w-5 text-red-400" />
        <h2 className="text-lg font-semibold">
          {form.serviceId ? "Upravit priestor" : "Novy priestor"}
        </h2>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4">
          <label className="space-y-2 block">
            <span className="text-sm text-white/60">Nazov</span>
            <input
              value={form.name}
              onChange={(event) => onUpdate("name", event.target.value)}
              placeholder="Multifunkcna hala"
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm text-white/60">Cena</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.basePrice}
              onChange={(event) => onUpdate("basePrice", event.target.value)}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
            />
          </label>

          <label className="space-y-2 block">
            <span className="text-sm text-white/60">Rate</span>
            <select
              value={form.priceUnit}
              onChange={(event) => onUpdate("priceUnit", event.target.value as FormState["priceUnit"])}
              className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-red-500"
            >
              <option value="hour">Za hodinu</option>
              <option value="minute">Za minutu</option>
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onUpdate("isActive", event.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Aktivny
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 block">
              <span className="text-sm text-white/60">Prva hodina</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.firstHourPrice}
                onChange={(event) => onUpdate("firstHourPrice", event.target.value)}
                placeholder="Volitelne"
                className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-sm text-white/60">Kazda dalsia hodina</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.nextHourPrice}
                onChange={(event) => onUpdate("nextHourPrice", event.target.value)}
                placeholder="Volitelne"
                className="h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500"
              />
            </label>
          </div>

          <div className="space-y-2">
            <span className="text-sm text-white/60">Cover obrazok</span>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpdate("imageFile", file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Vybrat obrazok
              </button>
              {form.imageFile && (
                <button
                  type="button"
                  onClick={() => onUpdate("imageFile", null)}
                  className="text-xs text-red-300 hover:underline"
                >
                  Zrusit vyber
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="relative min-h-56 overflow-hidden rounded-lg border border-white/10 bg-black/30">
          {previewUrl ? (
            <NextImage src={previewUrl} alt="Cover preview" fill className="object-cover" />
          ) : (
            <div className="flex h-full min-h-56 items-center justify-center text-white/30">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? "Ukladam..." : "Ulozit priestor"}
        </button>

        {message && (
          <p className={`text-sm ${message.startsWith("Chyba") ? "text-red-300" : "text-green-300"}`}>
            {message}
          </p>
        )}

        {form.serviceId && (
          <button
            type="button"
            onClick={onToggleActive}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {form.isActive ? "Deaktivovat priestor" : "Aktivovat priestor"}
          </button>
        )}
      </div>
    </div>
  );
}
