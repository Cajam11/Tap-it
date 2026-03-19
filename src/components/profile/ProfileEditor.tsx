"use client";

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
  };
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

export default function ProfileEditor({ initialProfile }: ProfileEditorProps) {
  const [fullName, setFullName] = useState(initialProfile.full_name);
  const [bio, setBio] = useState(initialProfile.bio);
  const [goal, setGoal] = useState<Goal>(initialProfile.goal);
  const [level, setLevel] = useState<Level>(initialProfile.experience_level);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initialProfile.sessions_per_week);
  const [sessionLengthMin, setSessionLengthMin] = useState(initialProfile.session_length_min);
  const [equipmentLevel, setEquipmentLevel] = useState<Equipment>(initialProfile.equipment_level);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatar_url);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(initialProfile.avatar_url);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initialLetter = useMemo(() => (fullName.trim().charAt(0) || "U").toUpperCase(), [fullName]);

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

    const metadata = {
      full_name: fullName.trim(),
      avatar_url: nextAvatarUrl,
      bio: bio.trim() || null,
    };

    const { error: metadataError } = await supabase.auth.updateUser({ data: metadata });

    if (metadataError) {
      setSaving(false);
      setError("Profil ulozeny, ale metadata sa neaktualizovali: " + metadataError.message);
      return;
    }

    setSaving(false);
    setAvatarFile(null);
    setSuccess("Profil bol uspesne aktualizovany.");
  }

  return (
    <section className="w-full rounded-3xl border border-white/10 bg-[#0f0f0f]/80 p-6 sm:p-8 backdrop-blur-xl shadow-[0_0_40px_rgba(0,0,0,0.45)]">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Moj profil</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white">Nastavenia uctu</h1>
          <p className="mt-2 text-sm text-white/55">Uprav si meno, avatar a treningove preferencie.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Ukladam..." : "Ulozit"}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
            {avatarPreviewUrl ? (
              <img src={avatarPreviewUrl} alt="Profilovy avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white">{initialLetter}</span>
            )}
          </div>

          <label className="inline-flex cursor-pointer items-center rounded-xl border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5">
            Nahrat fotku
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-wide text-white/40">Email</p>
            <p className="mt-1 truncate text-sm text-white/85">{initialProfile.email}</p>
          </div>
        </div>

        <div className="space-y-7">
          <div className="space-y-2">
            <label htmlFor="full_name" className="block text-sm text-white/70">Zobrazovane meno</label>
            <input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm text-white/70">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-24 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-red-500"
              maxLength={160}
              placeholder="Napis par viet o sebe"
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm text-white/70">Hlavny ciel</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GOAL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGoal(option.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    goal === option.value
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-white/70">Skusenosti</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLevel(option.value)}
                  className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
                    level === option.value
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="sessions" className="mb-2 block text-sm text-white/70">Treningy tyzdenne</label>
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
              <div className="grid grid-cols-2 gap-2">
                {[30, 45, 60, 75].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setSessionLengthMin(minutes)}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      sessionLengthMin === minutes
                        ? "border-red-500 bg-red-500/20 text-white"
                        : "border-white/10 bg-white/5 text-white/70"
                    }`}
                  >
                    {minutes} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-white/70">Vybavenie</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {EQUIPMENT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setEquipmentLevel(option.value)}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    equipmentLevel === option.value
                      ? "border-red-500 bg-red-500/20 text-white"
                      : "border-white/10 bg-white/5 text-white/70"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </p>
      )}
    </section>
  );
}
