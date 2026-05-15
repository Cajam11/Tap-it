import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasServerAdminAccess } from "@/lib/admin-access";
import { VerificationQueueClient } from "./VerificationQueueClient";

export default async function AdminVerificationPage() {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");

  if (!hasAccess) {
    redirect("/");
  }

  return <VerificationQueueClient />;
}
