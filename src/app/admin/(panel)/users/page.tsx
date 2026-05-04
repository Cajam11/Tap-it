import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext, hasServerAdminAccess } from "@/lib/admin-access";
import { UsersTableClient } from "./UsersTableClient";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");
  const context = await getCurrentAdminContext(supabase);
  const isOwner = context.role === "owner";

  if (!hasAccess) {
    redirect("/");
  }

  return <UsersTableClient isOwner={isOwner} />;
}
