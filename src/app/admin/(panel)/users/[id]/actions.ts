"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServerAdminAccess } from "@/lib/admin-access";

export async function manualCheckOutUser(formData: FormData) {
  const entryId = formData.get("entryId");

  if (!entryId || typeof entryId !== "string") {
    return;
  }

  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");

  if (!hasAccess) {
    throw new Error("Unauthorized");
  }

  const admin = createAdminClient();

  // Call the database check_out logic or simply update the entry
  // Note: we can just update public.entries where id = entryId setting check_out = now()
  const { data, error } = await admin
    .from("entries")
    .update({ 
      check_out: new Date().toISOString() 
    })
    .eq("id", entryId)
    .select("user_id")
    .single();

  if (error) {
    console.error("Failed to check out user manually", error);
    throw new Error("Failed to check out");
  }

  if (data?.user_id) {
    revalidatePath(`/admin/users/${data.user_id}`);
    revalidatePath(`/admin/users`);
  }
}