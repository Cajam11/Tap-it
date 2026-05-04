import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentAdminContext,
  hasServerAdminAccess,
} from "@/lib/admin-access";
import { MembershipsSearchClient } from "./MembershipsSearchClient";

export default async function AdminMembershipsPage() {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");
  const context = await getCurrentAdminContext(supabase);

  if (!hasAccess || !context.userId) {
    redirect("/");
  }

  return <MembershipsSearchClient />;
}
