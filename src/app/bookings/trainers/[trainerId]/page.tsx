import { notFound, redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import Breadcrumb from "@/components/bookings/Breadcrumb";
import { createAdminClient } from "@/lib/supabase/admin";
import { expireStalePendingBookings } from "@/lib/bookings";
import { createClient } from "@/lib/supabase/server";
import TrainerBookingClient from "./TrainerBookingClient";
import type { BookableService, ServiceSchedule } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  if (trainerId === user.id) {
    redirect("/bookings/trainers");
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
  await expireStalePendingBookings(resolvedServiceId);
  const scheduleStart = new Date();
  const scheduleEnd = new Date(scheduleStart);
  scheduleEnd.setMonth(scheduleEnd.getMonth() + 1);
  scheduleEnd.setHours(23, 59, 59, 999);

  const { data: scheduleData } = await supabase
    .from("service_schedules")
    .select("*")
    .eq("service_id", resolvedServiceId)
    .eq("trainer_id", trainerId)
    .gte("start_time", scheduleStart.toISOString())
    .lte("start_time", scheduleEnd.toISOString())
    .order("start_time", { ascending: true });

  const schedules = (scheduleData ?? []) as ServiceSchedule[];
  const scheduleIds = schedules.map((schedule) => schedule.id);

  const admin = createAdminClient();
  const { data: bookedSchedules } = scheduleIds.length
    ? await admin
        .from("bookings")
        .select("schedule_id, status, user_id")
        .eq("service_id", resolvedServiceId)
        .in("status", ["pending", "paid"])
        .in("schedule_id", scheduleIds)
    : { data: [] as { schedule_id: string | null; status: string; user_id: string }[] };

  const scheduleBookingStatus = new Map(
    (bookedSchedules ?? [])
      .filter((booking): booking is { schedule_id: string; status: string; user_id: string } => Boolean(booking.schedule_id))
      .map((booking) => [booking.schedule_id, { status: booking.status, userId: booking.user_id }])
  );

  const visibleSchedules = schedules.map((schedule) =>
    scheduleBookingStatus.has(schedule.id)
      ? {
          ...schedule,
          current_capacity: 0,
          booking_status: scheduleBookingStatus.get(schedule.id)?.status as "pending" | "paid" | null,
          booking_user_id: scheduleBookingStatus.get(schedule.id)?.userId ?? null,
        }
      : schedule
  );

  return (
    <>
      <NavBarAuth navLinks={[]} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl pt-6">
          <div className="mb-8">
            <Breadcrumb
              items={[
                { label: "Bookings", href: "/bookings" },
                { label: "Tréneri", href: "/bookings/trainers" },
                { label: trainerProfile.full_name ?? "Tréner" },
              ]}
            />
          </div>

          <TrainerBookingClient
            trainerProfile={trainerProfile}
            service={typedService}
            schedules={visibleSchedules}
            currentUserId={user.id}
          />
        </div>
      </main>
    </>
  );
}
