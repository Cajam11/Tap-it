import { notFound, redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import BookingSelector from "../../[serviceId]/BookingSelector";
import type { BookableService, ServiceSchedule } from "@/lib/types";

export default async function TrainerBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ trainerId: string }>;
  searchParams: Promise<{ serviceId?: string }>;
}) {
  const { trainerId } = await params;
  const { serviceId } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
    },
  };

  const navProfile = {
    full_name: typeof profile?.full_name === "string" ? profile.full_name : null,
    avatar_url: typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
  };

  const { data: trainerProfile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio")
    .eq("id", trainerId)
    .eq("role", "trainer")
    .single();

  if (!trainerProfile) {
    notFound();
  }

  const { data: trainerService } = await supabase
    .from("bookable_services")
    .select("*")
    .eq("type", "trainer")
    .eq("is_active", true)
    .maybeSingle();

  if (!trainerService) {
    notFound();
  }

  const typedService = trainerService as BookableService;

  const resolvedServiceId = serviceId || typedService.id;

  const { data: scheduleData } = await supabase
    .from("service_schedules")
    .select("*")
    .eq("service_id", resolvedServiceId)
    .eq("trainer_id", trainerId)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(30);

  const schedules = (scheduleData ?? []) as ServiceSchedule[];

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-4xl space-y-10">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/10">
                {trainerProfile.avatar_url ? (
                  <img
                    src={trainerProfile.avatar_url}
                    alt={trainerProfile.full_name ?? "Tréner"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-semibold text-white">
                    {(trainerProfile.full_name ?? "T").trim().charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {trainerProfile.full_name ?? "Tréner"}
                </h1>
                <p className="text-white/60">
                  Cena: {typedService.base_price}€ / {typedService.price_unit === "session" ? "trén.": typedService.price_unit}
                </p>
                {trainerProfile.bio ? (
                  <p className="mt-2 text-white/60">{trainerProfile.bio}</p>
                ) : null}
              </div>
            </div>
          </div>

          <BookingSelector service={typedService} schedules={schedules} />
        </div>
      </main>
    </>
  );
}
