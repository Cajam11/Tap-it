"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServerAdminAccess } from "@/lib/admin-access";

const ALLOWED_ROLES = new Set(["user", "recepcny", "manager", "owner"]);

export async function updateUserRole(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const nextRole = String(formData.get("role") ?? "").trim();

  if (!userId || !ALLOWED_ROLES.has(nextRole)) {
    redirect("/admin/users?status=error&message=Neplatny_vstup");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const isOwner = await hasServerAdminAccess(supabase, "owner");
  if (!isOwner) {
    redirect("/admin/users?status=error&message=Nedostatocne_prava");
  }

  if (user.id === userId && nextRole !== "owner") {
    redirect("/admin/users?status=error&message=Owner_si_nemoze_odobrat_owner_rolu");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: nextRole })
    .eq("id", userId);

  if (error) {
    redirect("/admin/users?status=error&message=Zmena_roly_zlyhala");
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?status=success&message=Rola_bola_aktualizovana");
}
