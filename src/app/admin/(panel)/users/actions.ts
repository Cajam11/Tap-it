"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServerAdminAccess } from "@/lib/admin-access";

const ALLOWED_ROLES = new Set(["user", "recepcny", "manager", "owner"]);

type UpdateUserRoleResult = {
  success?: true;
  message?: string;
  error?: string;
};

export async function updateUserRoleWithFeedback(
  formData: FormData,
): Promise<UpdateUserRoleResult> {
  const userId = String(formData.get("userId") ?? "").trim();
  const nextRole = String(formData.get("role") ?? "").trim();

  if (!userId || !ALLOWED_ROLES.has(nextRole)) {
    return { error: "Neplatny vstup" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nie ste prihlaseni" };
  }

  const canVerify = await hasServerAdminAccess(supabase, "recepcny");
  if (!canVerify) {
    return { error: "Nedostatocne prava" };
  }

  if (user.id === userId && nextRole !== "owner") {
    return { error: "Owner si nemoze odobrat owner rolu" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", userId);

  if (error) {
    return { error: "Zmena roly zlyhala" };
  }

  revalidatePath("/admin/users");
  return { success: true, message: "Rola bola aktualizovana" };
}

export async function updateUserRole(formData: FormData) {
  const result = await updateUserRoleWithFeedback(formData);

  if (result.error) {
    if (result.error === "Neplatny vstup") {
      redirect("/admin/users?status=error&message=Neplatny_vstup");
    }
    if (result.error === "Nedostatocne prava") {
      redirect("/admin/users?status=error&message=Nedostatocne_prava");
    }
    if (result.error === "Owner si nemoze odobrat owner rolu") {
      redirect("/admin/users?status=error&message=Owner_si_nemoze_odobrat_owner_rolu");
    }
    redirect("/admin/users?status=error&message=Zmena_roly_zlyhala");
  }

  redirect("/admin/users?status=success&message=Rola_bola_aktualizovana");
}

export async function updateUserVerifiedWithFeedback(
  formData: FormData,
): Promise<UpdateUserRoleResult> {
  const userId = String(formData.get("userId") ?? "").trim();
  const nextVerified = String(formData.get("isVerified") ?? "").trim();

  if (!userId || !/^(true|false)$/.test(nextVerified)) {
    return { error: "Neplatny vstup" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nie ste prihlaseni" };
  }

  const isOwner = await hasServerAdminAccess(supabase, "owner");
  if (!isOwner) {
    return { error: "Nedostatocne prava" };
  }

  const admin = createAdminClient();
  const updatePayload = { is_verified: nextVerified === "true" };
  const { error } = await admin
    .from("profiles")
    .update(updatePayload as never)
    .eq("id", userId);

  if (error) {
    return { error: "Zmena verifikacie zlyhala" };
  }

  revalidatePath("/admin/users");
  return { success: true, message: "Stav overenia bol aktualizovany" };
}

export async function updateUserVerified(formData: FormData) {
  const result = await updateUserVerifiedWithFeedback(formData);

  if (result.error) {
    redirect("/admin/users?status=error&message=Zmena_verifikacie_zlyhala");
  }

  redirect("/admin/users?status=success&message=Stav_overenia_bol_aktualizovany");
}
