import { redirect } from "next/navigation";
import ProfileEditor from "@/components/profile/ProfileEditor";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";

const NAV_LINKS: [string, string][] = [];

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    redirect("/login");
  }

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
    },
  };

  const navProfile = {
    full_name: typeof profile.full_name === "string" ? profile.full_name : null,
    avatar_url: typeof profile.avatar_url === "string" ? profile.avatar_url : null,
  };

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 min-h-screen mt-20">
        <ProfileEditor
          initialProfile={{
            email: user.email ?? "",
            full_name: profile.full_name ?? "",
            avatar_url: profile.avatar_url,
            bio: profile.bio ?? "",
            goal: profile.goal ?? "mixed",
            experience_level: profile.experience_level ?? "beginner",
            sessions_per_week: profile.sessions_per_week ?? 3,
            session_length_min: profile.session_length_min ?? 60,
            equipment_level: profile.equipment_level ?? "basic",
            height_cm: profile.height_cm,
            weight_kg: profile.weight_kg,
          }}
          hideFullName={true}
          title="Nastavenia"
          subtitle="Uprav si svoj profil a preferencie treningu. Tvoje meno zmeniť nemôžeš."
        />
      </main>
    </>
  );
}
