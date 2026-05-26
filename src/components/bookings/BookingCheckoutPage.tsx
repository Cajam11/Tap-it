import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import NavBarAuth from "@/components/NavBarAuth";
import StripePaymentForm from "@/components/bookings/StripePaymentForm";
import { createBookingIntent } from "@/lib/bookings";
import { getServiceDetailHref } from "@/lib/bookings/routes";
import { BookableService, ServiceSchedule } from "@/lib/types";

const FACILITY_OPEN_HOUR = 6;
const FACILITY_CLOSE_HOUR = 22;

export type CheckoutSearchParams = {
  scheduleId?: string;
  duration?: string;
  start?: string;
  trainerId?: string;
  serviceId?: string;
};

function isValidFacilityStart(date: Date) {
  return (
    !Number.isNaN(date.getTime()) &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getHours() >= FACILITY_OPEN_HOUR &&
    date.getHours() < FACILITY_CLOSE_HOUR
  );
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
    start: startParam,
    trainerId: queryTrainerId,
  } = await searchParams;
  const trainerId = routeTrainerId ?? queryTrainerId ?? null;

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
      .select("*")
      .eq("id", scheduleId)
      .single();

    if (!sched) redirect(detailHref);
    schedule = sched as ServiceSchedule;

    startTime = new Date(schedule.start_time);
    endTime = new Date(schedule.end_time);
    totalPrice = typedService.base_price;
  } else {
    if (!startParam) redirect(detailHref);

    const safeStartParam = startParam.replace(" ", "+");
    const duration = Math.max(1, Math.min(16, parseInt(durationParam || "1", 10)));
    startTime = new Date(safeStartParam);
    endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + duration);

    const now = new Date();
    const minValidStart = new Date(now.getTime() - 20 * 60 * 1000);

    if (
      !isValidFacilityStart(startTime) ||
      endTime <= startTime ||
      endTime.getHours() > FACILITY_CLOSE_HOUR ||
      startTime < minValidStart
    ) {
      redirect(detailHref);
    }

    const firstHour = Number(typedService.metadata?.first_hour_price);
    const nextHour = Number(typedService.metadata?.next_hour_price);

    if (Number.isFinite(firstHour) && Number.isFinite(nextHour)) {
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

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-xl space-y-8">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.38em] text-white/35">
              <Link
                href={detailHref}
                className="inline-flex items-center gap-2 transition hover:text-white/65"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Spat
              </Link>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">Dokoncenie rezervacie</h1>
          </div>

          <div className="mb-8 space-y-2 rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-white backdrop-blur-xl sm:p-8">
            <p className="text-white/60">Sluzba:</p>
            <p className="text-xl font-semibold">{typedService.name}</p>
            <p className="text-sm text-white/55">
              {startTime.toLocaleDateString("sk-SK")} {startTime.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })} -{" "}
              {endTime.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" })}
            </p>

            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between text-xl font-bold">
                <span>K uhrade:</span>
                <span className="text-red-500">{totalPrice.toFixed(2)} EUR</span>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          {clientSecret && stripeKey && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
              <StripePaymentForm clientSecret={clientSecret} publishableKey={stripeKey} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
