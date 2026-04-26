"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasServerAdminAccess } from "@/lib/admin-access";

export type AdminAuthState = {
  error?: string;
} | null;

export async function signInAdmin(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Vypln e-mail aj heslo." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");

  if (!hasAccess) {
    await supabase.auth.signOut();
    return { error: "Tento ucet nema pristup do admin panelu." };
  }

  redirect("/admin");
}