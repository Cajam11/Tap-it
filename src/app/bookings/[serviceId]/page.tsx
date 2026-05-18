import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";
import BookingSelector from "./BookingSelector";
import { BookableService, ServiceSchedule } from "@/lib/types";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

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

  // Fetch the service
  const { data: service, error } = await supabase
    .from("bookable_services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error || !service) {
    notFound();
  }

  const typedService = service as BookableService;
  const isScheduled = typedService.type === "group" || typedService.type === "trainer";

  let schedules: ServiceSchedule[] = [];

  if (isScheduled) {
    const { data: scheduleData } = await supabase
      .from("service_schedules")
      .select("*")
      .eq("service_id", serviceId)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(20);
    
    if (scheduleData) {
      schedules = scheduleData as ServiceSchedule[];
    }
  }

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-4xl space-y-12">
          <div className="mb-8 border-b border-white/10 pb-8">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">{typedService.name}</h1>
            <p className="text-lg text-white/60">
              Základná cena: {typedService.base_price}€ / {
                typedService.price_unit === 'session' ? 'vstup' : 
                typedService.price_unit === 'minute' ? 'minúta' : 'hodina'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8">
            <BookingSelector service={typedService} schedules={schedules} />
          </div>
        </div>
      </main>
    </>
  );
}
