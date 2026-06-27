import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";
import { getAdminMusicSuggestions, getCurrentMusic } from "@/lib/spotify";
import AdminMusicWorkspace from "@/components/admin/AdminMusicWorkspace";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Music | Tap-it Admin",
};

export default async function AdminMusicPage() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.isAdmin || !hasMinAdminRole(context.role, "recepcny")) {
    return notFound();
  }

  const [music, suggestions] = await Promise.all([
    getCurrentMusic(null),
    getAdminMusicSuggestions(),
  ]);

  return (
    <AdminMusicWorkspace
      currentRole={context.role!}
      music={music}
      suggestions={suggestions}
    />
  );
}
