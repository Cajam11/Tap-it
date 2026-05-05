"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Goal = "strength" | "fitness" | "fat_loss" | "mobility" | "mixed";
type Level = "beginner" | "intermediate" | "advanced";
type Equipment = "none" | "basic" | "full_gym";

type ProfileEditorProps = {
  initialProfile: {
    email: string;
    full_name: string;
    avatar_url: string | null;
    bio: string;
    goal: Goal;
    experience_level: Level;
    sessions_per_week: number;
    session_length_min: number;
    equipment_level: Equipment;
    height_cm?: number | null;
    weight_kg?: number | null;
    show_in_gym_list?: boolean;
    show_name_in_gym_list?: boolean;
    show_avatar_in_gym_list?: boolean;
  };
  hideFullName?: boolean;
  hideAvatar?: boolean;
  title?: string;
  subtitle?: string;
};

const GOAL_OPTIONS: Array<{ value: Goal; label: string }> = [
  { value: "strength", label: "Sila" },
  { value: "fitness", label: "Kondicia" },
  { value: "fat_loss", label: "Chudnutie" },
  { value: "mobility", label: "Mobilita" },
  { value: "mixed", label: "Mix" },
];

const LEVEL_OPTIONS: Array<{ value: Level; label: string }> = [
  { value: "beginner", label: "Zaciatocnik" },
  { value: "intermediate", label: "Mierne pokrocily" },
  { value: "advanced", label: "Pokrocily" },
];

const EQUIPMENT_OPTIONS: Array<{ value: Equipment; label: string }> = [
  { value: "none", label: "Bez vybavenia" },
  { value: "basic", label: "Zaklad" },
  { value: "full_gym", label: "Plna gym" },
];

export default function ProfileEditor({
  initialProfile,
  hideFullName = false,
  hideAvatar = false,
  title = "Nastavenia uctu",
  subtitle = "Uprav si meno, avatar a treningove preferencie.",
}: ProfileEditorProps) {
  const [fullName, setFullName] = useState(initialProfile.full_name);
  const [bio, setBio] = useState(initialProfile.bio);
  const [goal, setGoal] = useState<Goal>(initialProfile.goal);
  const [level, setLevel] = useState<Level>(initialProfile.experience_level);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(
    initialProfile.sessions_per_week,
  );
  const [sessionLengthMin, setSessionLengthMin] = useState(
    initialProfile.session_length_min,
  );
  const [equipmentLevel, setEquipmentLevel] = useState<Equipment>(
    initialProfile.equipment_level,
  );
  const [heightCm, setHeightCm] = useState(initialProfile.height_cm ?? 0);
  const [weightKg, setWeightKg] = useState(initialProfile.weight_kg ?? 0);
  const [showInGymList, setShowInGymList] = useState(
    initialProfile.show_in_gym_list ?? true,
  );
  const [showNameInGymList, setShowNameInGymList] = useState(
    initialProfile.show_name_in_gym_list ?? false,
  );
  const [showAvatarInGymList, setShowAvatarInGymList] = useState(
    initialProfile.show_avatar_in_gym_list ?? false,
  );

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialProfile.avatar_url,
  );
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(
    initialProfile.avatar_url,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initialLetter = useMemo(
    () => (fullName.trim().charAt(0) || "U").toUpperCase(),
    [fullName],
  );

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  async function handleAvatarChange(e: FormEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0] ?? null;

    if (!file) {
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
    setSuccess(null);
    setAvatarFile(file);
    setAvatarPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(null);

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
      const avatarFolder = user.id;
      const { data: existingAvatars, error: listError } = await supabase.storage
        .from("avatars")
        .list(avatarFolder, { limit: 100 });

      if (listError) {
        setSaving(false);
        setError("Nepodarilo sa nacitat existujuci avatar.");
        return;
      }

      const existingPaths = (existingAvatars ?? [])
        .filter((file) => typeof file.name === "string" && file.name.length > 0)
        .map((file) => `${avatarFolder}/${file.name}`);

      if (existingPaths.length > 0) {
        const { error: removeError } = await supabase.storage
          .from("avatars")
          .remove(existingPaths);
        if (removeError) {
          setSaving(false);
          setError("Nepodarilo sa odstranit stary avatar.");
          return;
        }
      }

      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;
      const upload = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, { upsert: true });

      if (upload.error) {
        setSaving(false);
        setError("Avatar sa nepodarilo nahrat. Skontroluj bucket a policies.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      nextAvatarUrl = data.publicUrl;
      setAvatarUrl(nextAvatarUrl);
      setAvatarPreviewUrl(nextAvatarUrl);
    }

    const updatePayload = {
      id: user.id,
      email: user.email ?? initialProfile.email,
      full_name: fullName.trim(),
      avatar_url: nextAvatarUrl,
      bio: bio.trim() || null,
      goal,
      experience_level: level,
      sessions_per_week: sessionsPerWeek,
      session_length_min: sessionLengthMin,
      equipment_level: equipmentLevel,
      height_cm: heightCm || null,
      weight_kg: weightKg || null,
      show_in_gym_list: showInGymList,
      show_name_in_gym_list: showNameInGymList,
      show_avatar_in_gym_list: showAvatarInGymList,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(updatePayload, { onConflict: "id" });

    if (profileError) {
      setSaving(false);
      setError("Nepodarilo sa ulozit profil: " + profileError.message);
      return;
    }

    // Insert weight change into weight_logs if weight changed
    if (
      Number.isFinite(weightKg) &&
      weightKg > 0 &&
      weightKg !== initialProfile.weight_kg
    ) {
      const { error: weightLogError } = await supabase
        .from("weight_logs")
        .insert({
          user_id: user.id,
          weight_kg: weightKg,
        });

      if (weightLogError) {
        console.warn("Warning: Failed to log weight change:", weightLogError);
      }
    }

    const metadata = {
      full_name: fullName.trim(),
      avatar_url: nextAvatarUrl,
      bio: bio.trim() || null,
    };

    const { error: metadataError } = await supabase.auth.updateUser({
      data: metadata,
    });

    if (metadataError) {
      setSaving(false);
      setError(
        "Profil ulozeny, ale metadata sa neaktualizovali: " +
          metadataError.message,
      );
      return;
    }

    setSaving(false);
    setAvatarFile(null);
    setSuccess("Zmeny boly ulozene");
    window.scrollTo({ top: 0, behavior: "smooth" });

    window.dispatchEvent(
      new CustomEvent("profile-updated", {
        detail: {
          full_name: fullName.trim(),
          avatar_url: nextAvatarUrl,
        },
      }),
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">
            Moj profil
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-2 text-sm text-white/55">{subtitle}</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Avatar Section */}
      {!hideAvatar && (
        <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
          <h2 className="mb-4 text-sm uppercase tracking-wider text-white/60">
            Profil
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                {avatarPreviewUrl ? (
                  <Image
                    src={avatarPreviewUrl}
                    alt="Profilovy avatar"
                    width={96}
                    height={96}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {initialLetter}
                  </span>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/15 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                Zmenit fotku
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            </div>

            <div className="flex-1 self-center -mt-8 space-y-2">
              <h1 className="text-3xl font-bold text-white">
                {initialProfile.full_name || "Anonymous"}
              </h1>
              <p className="text-base text-white/70 font-medium">
                {initialProfile.email}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Personal Info Section */}
      <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
        <h2 className="mb-5 text-sm uppercase tracking-wider text-white/60">
          Osobne udaje
        </h2>
        <div className="space-y-5">
          {!hideFullName && (
            <div className="space-y-2">
              <label
                htmlFor="full_name"
                className="block text-sm font-medium text-white/70"
              >
                Zobrazovane meno
              </label>
              <input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                maxLength={60}
              />
            </div>
          )}

          <div className="space-y-2">
            <label
              htmlFor="bio"
              className="block text-sm font-medium text-white/70"
            >
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
              rows={3}
              maxLength={160}
              placeholder="Napis par viet o sebe..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="height"
                className="block text-sm font-medium text-white/70"
              >
                Vyska (cm)
              </label>
              <input
                id="height"
                type="number"
                value={heightCm || ""}
                onChange={(e) =>
                  setHeightCm(e.target.value ? Number(e.target.value) : 0)
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="napr. 175"
                min={100}
                max={250}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="weight"
                className="block text-sm font-medium text-white/70"
              >
                Vaha (kg)
              </label>
              <input
                id="weight"
                type="number"
                value={weightKg || ""}
                onChange={(e) =>
                  setWeightKg(e.target.value ? Number(e.target.value) : 0)
                }
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                placeholder="napr. 75"
                min={30}
                max={250}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Fitness Goals Section */}
      <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
        <h2 className="mb-5 text-sm uppercase tracking-wider text-white/60">
          Fitness ciele
        </h2>
        <div className="space-y-5">
          <div>
            <p className="mb-3 text-sm font-medium text-white/70">
              Hlavny ciel
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGoal(option.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                    goal === option.value
                      ? "border-red-500 bg-red-500/20 text-white shadow-[0_0_16px_rgba(220,38,38,0.2)]"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-white/70">
              Uroven skusenosti
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLevel(option.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                    level === option.value
                      ? "border-red-500 bg-red-500/20 text-white shadow-[0_0_16px_rgba(220,38,38,0.2)]"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Training Preferences Section */}
      <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
        <h2 className="mb-5 text-sm uppercase tracking-wider text-white/60">
          Trening
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="sessions"
              className="mb-1.5 block text-sm text-white/70"
            >
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
            <p className="mt-1 text-sm text-white/70">
              {sessionsPerWeek}x za tyzden
            </p>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-white/70">
              Dlzka treningu
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[30, 45, 60, 75].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setSessionLengthMin(minutes)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                    sessionLengthMin === minutes
                      ? "border-red-500 bg-red-500/20 text-white shadow-[0_0_16px_rgba(220,38,38,0.2)]"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20"
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Equipment Section */}
      <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
        <h2 className="mb-5 text-sm uppercase tracking-wider text-white/60">
          Vybavenie
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {EQUIPMENT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setEquipmentLevel(option.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                equipmentLevel === option.value
                  ? "border-red-500 bg-red-500/20 text-white shadow-[0_0_16px_rgba(220,38,38,0.2)]"
                  : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:border-white/20"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Privacy Section */}
      <section className="rounded-2xl border border-white/10 bg-[#0f0f0f]/80 p-6 backdrop-blur-xl">
        <h2 className="mb-5 text-sm uppercase tracking-wider text-white/60">
          Sukromie vo fitku
        </h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showInGymList}
              onChange={(e) => setShowInGymList(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-red-500 focus:ring-red-500"
            />
            <span>
              <span className="block text-sm font-medium text-white">
                Zobrazit ma v zozname ludi vo fitku
              </span>
              <span className="block text-xs text-white/50 mt-0.5">
                Ked je vypnute, nebudes viditelny ani ako anonymous.
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${showInGymList ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"}`}
          >
            <input
              type="checkbox"
              checked={showNameInGymList}
              onChange={(e) => setShowNameInGymList(e.target.checked)}
              disabled={!showInGymList}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-red-500 focus:ring-red-500 disabled:cursor-not-allowed"
            />
            <span>
              <span className="block text-sm font-medium text-white">
                Zobrazit moje meno
              </span>
              <span className="block text-xs text-white/50 mt-0.5">
                Ak je vypnute, ostatni uvidia iba Anonymous.
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${showInGymList ? "border-white/10 bg-white/5" : "border-white/5 bg-white/[0.02] opacity-60"}`}
          >
            <input
              type="checkbox"
              checked={showAvatarInGymList}
              onChange={(e) => setShowAvatarInGymList(e.target.checked)}
              disabled={!showInGymList}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent text-red-500 focus:ring-red-500 disabled:cursor-not-allowed"
            />
            <span>
              <span className="block text-sm font-medium text-white">
                Zobrazit moj avatar
              </span>
              <span className="block text-xs text-white/50 mt-0.5">
                Ked je vypnute, zobrazi sa predvolena anonymous ikona.
              </span>
            </span>
          </label>

          {showInGymList && !showNameInGymList && !showAvatarInGymList ? (
            <p className="text-xs text-white/45">
              Aktualne budes vo fitku zobrazeny ako Anonymous.
            </p>
          ) : null}
        </div>
      </section>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-red-600 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? "Ukladam..." : "Ulozit zmeny"}
        </button>
      </div>
    </div>
  );
}
