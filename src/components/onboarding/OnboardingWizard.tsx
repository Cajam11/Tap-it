"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialFullName: string;
  initialAvatarUrl: string | null;
};

const TOTAL_STEPS = 5;

type Goal = "strength" | "fitness" | "fat_loss" | "mobility" | "mixed";
type Level = "beginner" | "intermediate" | "advanced";
type Equipment = "none" | "basic" | "full_gym";

export default function OnboardingWizard({ initialFullName, initialAvatarUrl }: Props) {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialAvatarUrl);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);

  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sessionLengthMin, setSessionLengthMin] = useState(45);
  const [equipmentLevel, setEquipmentLevel] = useState<Equipment>("basic");

  const progressPct = useMemo(() => Math.round((step / TOTAL_STEPS) * 100), [step]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  function nextStep() {
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }

  function prevStep() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  function skipStep() {
    if (step === 2) {
      if (!fullName.trim()) {
        setFullName(initialFullName || "Pouzivatel");
      }
    }
    if (step === 3) {
      setGoal((current) => current ?? "mixed");
      setLevel((current) => current ?? "beginner");
    }
    nextStep();
  }

  function canContinueCurrentStep() {
    if (step === 2) {
      return fullName.trim().length >= 2;
    }
    if (step === 3) {
      return Boolean(goal && level);
    }
    return true;
  }

  async function handleAvatarChange(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0] ?? null;

    if (!file) {
      setAvatarFile(null);
      setAvatarPreviewUrl(initialAvatarUrl);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Nahraj prosim obrazok (PNG/JPG/WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Maximalna velkost profilovej fotky je 5 MB.");
      return;
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function handleFinish() {
    setSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSaving(false);
      setError("Relacia vyprsala. Prihlas sa prosim znova.");
      return;
    }

    let nextAvatarUrl = avatarUrl;

    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;
      const upload = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (upload.error) {
        // Non-blocking: allow completing onboarding without avatar upload
        nextAvatarUrl = avatarUrl;
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        nextAvatarUrl = data.publicUrl;
      }
    }

    const metadata = {
      full_name: fullName.trim(),
      avatar_url: nextAvatarUrl,
      bio: bio.trim() || null,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding: {
        goal: goal ?? "mixed",
        level: level ?? "beginner",
        sessions_per_week: sessionsPerWeek,
        session_length_min: sessionLengthMin,
        equipment_level: equipmentLevel,
      },
    };

    const updateResult = await supabase.auth.updateUser({ data: metadata });

    if (updateResult.error) {
      setSaving(false);
      setError(updateResult.error.message);
      return;
    }

    // 2. Uloženie všetkých dát do zjednotenej `profiles` tabuľky
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: fullName.trim(),
        avatar_url: nextAvatarUrl,
        bio: bio.trim() || null,
        goal: goal ?? "mixed",
        experience_level: level ?? "beginner",
        sessions_per_week: sessionsPerWeek,
        session_length_min: sessionLengthMin,
        equipment_level: equipmentLevel,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Chyba pri ukladani do profiles:", profileError);
      setSaving(false);
      setError("Nepodarilo sa uložiť dáta do databázy. Skontroluj RLS pravidlá a tabuľku: " + profileError.message);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <section className="mx-auto w-full max-w-xl rounded-3xl border border-white/10 bg-[#0f0f0f]/80 backdrop-blur-xl p-6 sm:p-10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm font-medium text-white/50">
          <span>Krok {step} z {TOTAL_STEPS}</span>
          <span className="text-white/80">{progressPct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Rýchly setup profilu</h1>
            <p className="text-white/50 leading-relaxed">
              Všetko hotové do 1 minúty. Nastavíme profil, ciel a preferencie tréningu, 
              aby sme ti mohli priniesť čo najlepší zážitok.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-5 border border-white/5 flex items-center gap-4">
             <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
               <span className="text-2xl">⚡</span>
             </div>
             <div>
               <h3 className="text-white font-medium">Bleskový proces</h3>
               <p className="text-sm text-white/50">Len 4 jednoduché otázky.</p>
             </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold text-white">Zaklad profilu</h2>

          <div className="flex items-center gap-4">
            {avatarPreviewUrl ? (
              <img
                src={avatarPreviewUrl}
                alt="Profilova fotka"
                className="h-16 w-16 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white">
                {(fullName.trim().charAt(0) || "U").toUpperCase()}
              </div>
            )}

            <label className="cursor-pointer rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5">
              Nahrat fotku
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm text-white/70">
              Zobrazovane meno
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Tvoje meno"
              minLength={2}
              maxLength={60}
            />
          </div>

          <div>
            <label htmlFor="bio" className="mb-1.5 block text-sm text-white/70">
              Kratke bio (volitelne)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Co ta najviac motivuje?"
              maxLength={120}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold text-white">Ciel a uroven</h2>

          <div className="space-y-3">
            <p className="text-sm text-white/70">Tvoj hlavny ciel</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["strength", "Sila"],
                ["fitness", "Kondicia"],
                ["fat_loss", "Chudnutie"],
                ["mobility", "Mobilita"],
                ["mixed", "Mix"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setGoal(value as Goal)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    goal === value
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-white/70">Skusenosti</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                ["beginner", "Zaciatocnik"],
                ["intermediate", "Mierne pokrocily"],
                ["advanced", "Pokrocily"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLevel(value as Level)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    level === value
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold text-white">Treningove preferencie</h2>

          <div>
            <label htmlFor="sessions" className="mb-1.5 block text-sm text-white/70">
              Treningy tyzdenne
            </label>
            <input
              id="sessions"
              type="range"
              min={1}
              max={7}
              value={sessionsPerWeek}
              onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
              className="w-full"
            />
            <p className="mt-1 text-sm text-white/70">{sessionsPerWeek}x za tyzden</p>
          </div>

          <div>
            <p className="mb-2 text-sm text-white/70">Dlzka treningu</p>
            <div className="grid grid-cols-4 gap-2">
              {[30, 45, 60, 75].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setSessionLengthMin(min)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    sessionLengthMin === min
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm text-white/70">Vybavenie</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                ["none", "Bez vybavenia"],
                ["basic", "Zaklad"],
                ["full_gym", "Plna gym"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEquipmentLevel(value as Equipment)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    equipmentLevel === value
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <h2 className="text-2xl font-semibold text-white">Hotovo, skontroluj setup</h2>
          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
            <p><span className="text-white/50">Meno:</span> {fullName.trim()}</p>
            <p><span className="text-white/50">Ciel:</span> {goal ?? "Mix"}</p>
            <p><span className="text-white/50">Uroven:</span> {level ?? "Zaciatocnik"}</p>
            <p><span className="text-white/50">Treningy:</span> {sessionsPerWeek}x tyzdenne / {sessionLengthMin} min</p>
          </div>
          <p className="text-white/60">
            Po dokonceni ta presmerujeme na hlavnu stranku.
          </p>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={prevStep}
          disabled={step === 1 || saving}
          className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/80 disabled:opacity-40"
        >
          Spat
        </button>

        <div className="flex items-center gap-2">
          {step < TOTAL_STEPS && (
            <button
              type="button"
              onClick={skipStep}
              disabled={saving}
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 hover:text-white"
            >
              Preskocit
            </button>
          )}

          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canContinueCurrentStep() || saving}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Pokracovat
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? "Ukladam..." : "Dokoncit setup"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
