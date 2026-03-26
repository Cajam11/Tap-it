"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  error?: string;
  success?: string;
} | null;

async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = formData.get("fullName") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Skontroluj svoj e-mail a potvrď registráciu." };
}

export async function forgotPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const origin = await getOrigin();

  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: "Odkaz na resetovanie hesla bol odoslaný na tvoj e-mail." };
}

export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  const password = formData.get("password") as string;

  if (password.length < 6) {
    return { error: "Heslo musí mať aspoň 6 znakov." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  redirect("/login");
}

export async function completeOnboarding(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Relacia vyprsala. Prihlas sa prosim znova." };
  }

  const fullName = formData.get("full_name") as string;
  const avatarUrl = formData.get("avatar_url") as string;
  const bio = formData.get("bio") as string;
  const heightCm = Number(formData.get("height_cm"));
  const weightKg = Number(formData.get("weight_kg"));
  const goal = formData.get("goal") as string;
  const level = formData.get("level") as string;
  const sessionsPerWeek = Number(formData.get("sessions_per_week"));
  const sessionLengthMin = Number(formData.get("session_length_min"));
  const equipmentLevel = formData.get("equipment_level") as string;

  const metadata = {
    full_name: fullName,
    avatar_url: avatarUrl,
    bio: bio || null,
    height_cm: heightCm,
    weight_kg: weightKg,
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

  // Step 1: Update auth metadata
  const { error: updateError } = await supabase.auth.updateUser({ data: metadata });

  if (updateError) {
    return { error: updateError.message };
  }

  // Step 2: Upsert to profiles table
  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      avatar_url: avatarUrl || null,
      bio: bio || null,
      height_cm: heightCm,
      weight_kg: weightKg,
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
    return { error: "Chyba pri ukladani profilu: " + profileError.message };
  }

  redirect("/");
}

