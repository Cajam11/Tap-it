import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";
import StripePaymentForm from "@/components/bookings/StripePaymentForm";
import { createBookingIntent } from "@/lib/bookings";
import { getServiceDetailHref } from "@/lib/bookings/routes";
import { BookableService, ServiceSchedule } from "@/lib/types";

const FACILITY_OPEN_HOUR = 6;
const FACILITY_CLOSE_HOUR = 21;
const FACILITY_MINUTE_STEP = 5;

export type CheckoutSearchParams = {
  scheduleId?: string;
  duration?: string;
  durationMinutes?: string;
  start?: string;
  trainerId?: string;
  serviceId?: string;
};

function getFacilityCloseDate(date: Date) {
  const close = new Date(date);
  close.setHours(FACILITY_CLOSE_HOUR, 0, 0, 0);
  return close;
}

function isValidFacilityStart(date: Date, isMinuteRate: boolean) {
  return (
    !Number.isNaN(date.getTime()) &&
    (isMinuteRate ? date.getMinutes() % FACILITY_MINUTE_STEP === 0 : date.getMinutes() === 0) &&
    date.getSeconds() === 0 &&
    date.getHours() >= FACILITY_OPEN_HOUR &&
    date.getHours() < FACILITY_CLOSE_HOUR
  );
}

function getMetadataNumber(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  return null;
}

export default async function BookingCheckoutPage({
  serviceId,
  searchParams,
  routeTrainerId,
}: {
  serviceId: string;
  searchParams: Promise<CheckoutSearchParams>;
  routeTrainerId?: string | null;
}) {
  const {
    scheduleId,
    duration: durationParam,
    durationMinutes: durationMinutesParam,
    start: startParam,
    trainerId: queryTrainerId,
  } = await searchParams;
  let trainerId = routeTrainerId ?? queryTrainerId ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: service, error } = await supabase
    .from("bookable_services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error || !service) redirect("/bookings");
  const typedService = service as BookableService;
  const detailHref = getServiceDetailHref(typedService.type, serviceId, trainerId);

  let schedule: ServiceSchedule | null = null;
  let totalPrice = typedService.base_price;
  let startTime = new Date();
  let endTime = new Date();

  if (typedService.type === "group" || typedService.type === "trainer") {
    if (!scheduleId) redirect(detailHref);

    const { data: sched } = await supabase
      .from("service_schedules")
      .select("*, profiles:trainer_id(full_name, avatar_url, bio)")
      .eq("id", scheduleId)
      .single();

    if (!sched) redirect(detailHref);
    schedule = sched as ServiceSchedule;
    if (!trainerId && schedule.trainer_id) {
      trainerId = schedule.trainer_id;
    }

    startTime = new Date(schedule.start_time);
    endTime = new Date(schedule.end_time);
    totalPrice = typedService.base_price;
  } else {
    if (!startParam) redirect(detailHref);

    const safeStartParam = startParam.replace(" ", "+");
    const isMinuteRate = typedService.price_unit === "minute";
    const duration = Math.max(1, Math.min(16, parseInt(durationParam || "1", 10)));
    const durationMinutes = Math.max(
      FACILITY_MINUTE_STEP,
      Math.min(30, parseInt(durationMinutesParam || "10", 10)),
    );
    startTime = new Date(safeStartParam);
    endTime = new Date(startTime);

    if (isMinuteRate) {
      endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
    } else {
      endTime.setHours(endTime.getHours() + duration);
    }

    const now = new Date();
    const minValidStart = new Date(now.getTime() - 20 * 60 * 1000);
    const closeTime = getFacilityCloseDate(startTime);

    if (
      !isValidFacilityStart(startTime, isMinuteRate) ||
      (isMinuteRate && durationMinutes % FACILITY_MINUTE_STEP !== 0) ||
      endTime <= startTime ||
      endTime > closeTime ||
      startTime < minValidStart
    ) {
      redirect(detailHref);
    }

    const firstHour = getMetadataNumber(typedService.metadata, "first_hour_price");
    const nextHour = getMetadataNumber(typedService.metadata, "next_hour_price");

    if (isMinuteRate) {
      totalPrice = typedService.base_price * durationMinutes;
    } else if (firstHour !== null && nextHour !== null) {
      totalPrice = firstHour + Math.max(0, duration - 1) * nextHour;
    } else {
      totalPrice = typedService.base_price * duration;
    }
  }

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

  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

  let trainerProfile: { full_name: string | null; avatar_url: string | null; bio: string | null } | null = null;
  if (trainerId) {
    const { data: routeTrainerProfile } = await supabase.from("profiles").select("full_name, avatar_url, bio").eq("id", trainerId).single();
    trainerProfile = routeTrainerProfile;
  }

  const isFacility = typedService.type === "facility";
  const coverImage = trainerProfile?.avatar_url || (isFacility ? "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80" : "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80");

  const displayName = trainerProfile?.full_name || typedService.name;
  const avatarFallback = displayName.trim().charAt(0).toUpperCase();

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl pt-6">
          <div className="mb-8 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.38em] text-white/35">
            <Link
              href={detailHref}
              className="inline-flex items-center gap-2 transition hover:text-white/65"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Spat
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.5fr] lg:gap-16 items-stretch">
            
            {/* Lavy stlpec - Zhrnutie */}
            <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] text-white">
              <div className="relative min-h-[24rem] flex-grow">
                <div className="absolute inset-0">
                  {coverImage ? (
                    <Image
                      src={coverImage}
                      alt={displayName}
                      fill
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/[0.04]">
                      <span className="text-6xl font-semibold text-white/70">
                        {avatarFallback}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-[80%] bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 z-10 sm:p-8">
                  <h2 className="text-3xl font-bold text-white">{displayName}</h2>
                  {!isFacility && trainerProfile?.bio && (
                    <p className="mt-3 text-sm leading-relaxed text-white/65 line-clamp-3">
                      {trainerProfile.bio}
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 border-t border-white/5 bg-[#0d0d0d]/80 p-6 backdrop-blur-xl sm:p-8">
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
                  Tvoja rezervacia
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Sluzba</span>
                    <span className="font-medium text-white">{typedService.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Termin</span>
                    <span className="font-medium text-white text-right">
                      {startTime.toLocaleDateString("sk-SK")} <br className="sm:hidden" />
                      {startTime.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })} -{" "}
                      {endTime.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="h-px w-full bg-white/10" />
                  <div className="flex items-center justify-between text-base">
                    <span className="text-white/80">K uhrade</span>
                    <span className="font-bold text-red-500">
                      {totalPrice.toFixed(2)} EUR
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pravy stlpec - Checkout formulare */}
            <div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md sm:p-8">
              <div className="mb-8">
                  <h2 className="text-2xl font-bold text-white">
                    Dokoncenie rezervacie
                  </h2>
                  <p className="text-white/50 mt-1">
                    Skontrolujte si udaje a vyberte platobnu metodu pre potvrdenie.
                  </p>
                </div>

                {errorMsg && (
                  <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
                    {errorMsg}
                  </div>
                )}

                {clientSecret && stripeKey ? (
                  <StripePaymentForm clientSecret={clientSecret} publishableKey={stripeKey} />
                ) : (
                  !errorMsg && (
                    <div className="text-white/50 animate-pulse text-sm">
                      Nacitavam platobnu branu...
                    </div>
                  )
                )}
              </div>

          </div>
        </div>
      </main>
    </>
  );
}
