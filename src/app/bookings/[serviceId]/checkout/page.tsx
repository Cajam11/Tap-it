import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";
import StripePaymentForm from "@/components/bookings/StripePaymentForm";
import { createBookingIntent } from "@/lib/bookings";
import { BookableService, ServiceSchedule } from "@/lib/types";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<{ scheduleId?: string; duration?: string }>;
}) {
  const { serviceId } = await params;
  const { scheduleId, duration: durationParam } = await searchParams;
  
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

  // 1. Fetch Service
  const { data: service, error } = await supabase
    .from("bookable_services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error || !service) redirect("/bookings");
  const typedService = service as BookableService;
  
  let schedule: ServiceSchedule | null = null;
  let totalPrice = typedService.base_price;
  let startTime = new Date();
  let endTime = new Date();
  
  // 2. Compute pricing & times
  if (typedService.type === "group" || typedService.type === "trainer") {
    if (!scheduleId) redirect(`/bookings/${serviceId}`);
    
    const { data: sched } = await supabase
      .from("service_schedules")
      .select("*")
      .eq("id", scheduleId)
      .single();
      
    if (!sched) redirect(`/bookings/${serviceId}`);
    schedule = sched as ServiceSchedule;
    
    startTime = new Date(schedule.start_time);
    endTime = new Date(schedule.end_time);
    totalPrice = typedService.base_price; // Groups/Trainers usually have a flat session rate mapping from base_price

  } else {
    // Facility dynamically priced by duration
    const duration = parseInt(durationParam || "1", 10);
    // Rough calc: if hourly, multiply by hours. If minutes, multiply by minutes. 
    // Metadata can hold specific overrides (like Jacuzzi: 20 per 1st hr, 10 next)
    if (typedService.metadata && typeof typedService.metadata === 'object' && typedService.metadata.first_hour_price) {
        const firstHour = Number(typedService.metadata.first_hour_price);
        const nextHour = Number(typedService.metadata.next_hour_price);
        totalPrice = firstHour + (Math.max(0, duration - 1) * nextHour);
    } else {
        totalPrice = typedService.base_price * duration;
    }
    
    if (typedService.price_unit === 'minute') {
       endTime.setMinutes(endTime.getMinutes() + duration);
    } else {
       endTime.setHours(endTime.getHours() + duration);
    }
  }

  // 3. Initiate Payment Intent via server action
  let clientSecret: string | null = null;
  let errorMsg: string | null = null;

  try {
    const intent = await createBookingIntent(
      user.id,
      serviceId,
      schedule?.id || null,
      startTime,
      endTime,
      totalPrice,
      typedService.name
    );
    clientSecret = intent.clientSecret;
  } catch (err: unknown) {
    errorMsg = err instanceof Error ? err.message : "Failed to create payment.";
  }

  // Find Stripe publishable key securely
  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-xl space-y-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-8">Dokončenie rezervácie</h1>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl mb-8 space-y-2 text-white">
            <p className="text-white/60">Služba:</p>
            <p className="text-xl font-semibold">{typedService.name}</p>
            
            <div className="pt-6 mt-6 border-t border-white/10">
               <div className="flex justify-between font-bold text-xl items-center">
                 <span>K úhrade:</span>
                 <span className="text-red-500">{totalPrice.toFixed(2)}€</span>
               </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          {clientSecret && stripeKey && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl">
              <StripePaymentForm 
                 clientSecret={clientSecret} 
                 publishableKey={stripeKey} 
              />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
