import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import { cleanupExpiredTrainerSchedules } from "@/lib/schedules.server";
import { createClient } from "@/lib/supabase/server";
import TrainerAvailabilityForm from "./TrainerAvailabilityForm";

export default async function TrainerAvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "trainer") {
    redirect("/profile");
  }

  const { data: trainerService } = await supabase
    .from("bookable_services")
    .select("id")
    .eq("type", "trainer")
    .eq("is_active", true)
    .maybeSingle();

  if (!trainerService) {
    return <div className="p-8 text-white">Chyba konfiguracia trenerskej sluzby v systeme.</div>;
  }

  await cleanupExpiredTrainerSchedules(user.id, trainerService.id);

  const { data: recurringRules } = await supabase
    .from("recurring_rules")
    .select("*")
    .eq("trainer_id", user.id)
    .eq("service_id", trainerService.id)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

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
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />

        <div className="relative z-10 mx-auto w-full max-w-4xl space-y-12">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
              Nastavenie treningov
            </h1>
            <p className="text-white/60">
              Nastav si casy treningov na najblizsi mesiac. Po uplynuti mesiaca sa pravidla
              vycistia a zadas nove.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md lg:p-8">
            <TrainerAvailabilityForm
              trainerId={user.id}
              serviceId={trainerService.id}
              initialRules={recurringRules || []}
            />
          </div>
        </div>
      </main>
    </>
  );
}
