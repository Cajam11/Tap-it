import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Breadcrumb from "./Breadcrumb";
import { createAdminClient } from "@/lib/supabase/admin";
import { expireStalePendingBookings } from "@/lib/bookings";
import NavBarAuth from "@/components/NavBarAuth";
import BookingSelector from "./BookingSelector";
import FacilityBookingClient from "./FacilityBookingClient";
import { BookableService, ServiceSchedule } from "@/lib/types";
import {
  fetchServiceSchedulesForMonth,
  getInitialScheduleMonth,
} from "@/lib/booking-schedules";

type FacilityBooking = {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
};

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ serviceId: string }>;
}) {
  const { serviceId } = await params;
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

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
      avatar_url:
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : undefined,
    },
  };

  const navProfile = {
    full_name:
      typeof profile?.full_name === "string" ? profile.full_name : null,
    avatar_url:
      typeof profile?.avatar_url === "string" ? profile.avatar_url : null,
  };

  const { data: service, error } = await supabase
    .from("bookable_services")
    .select("*")
    .eq("id", serviceId)
    .single();

  if (error || !service) {
    notFound();
  }

  const typedService = service as BookableService;

  const backHref =
    typedService.type === "facility"
      ? "/bookings/priestory"
      : typedService.type === "group"
        ? "/bookings/skupinove-lekcie"
        : "/bookings/trainers";

  const backLabel =
    typedService.type === "facility"
      ? "Priestory"
      : typedService.type === "group"
        ? "Skupinové lekcie"
        : "Tréneri";

  const isScheduled =
    typedService.type === "group" || typedService.type === "trainer";
  let schedules: ServiceSchedule[] = [];
  let facilityBookings: FacilityBooking[] = [];

  if (isScheduled) {
    const initialMonth = getInitialScheduleMonth();
    schedules = await fetchServiceSchedulesForMonth(
      serviceId,
      initialMonth.year,
      initialMonth.month,
      user.id,
    );
  }

  if (typedService.type === "facility") {
    await expireStalePendingBookings(serviceId);

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setHours(23, 59, 59, 999);
    const admin = createAdminClient();

    const { data: bookingData } = await admin
      .from("bookings")
      .select("id, start_time, end_time, status, user_id")
      .eq("service_id", serviceId)
      .in("status", ["pending", "paid"])
      .gte("end_time", start.toISOString())
      .lte("start_time", end.toISOString())
      .order("start_time", { ascending: true });

    facilityBookings = (bookingData ?? []) as FacilityBooking[];
  }

  return (
    <>
      <NavBarAuth
        navLinks={[]}
        initialUser={navUser}
        initialProfile={navProfile}
      />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl pt-6">
          {typedService.type === "facility" ? (
            <FacilityBookingClient
              service={typedService}
              bookings={facilityBookings}
              backHref={backHref}
              backLabel={backLabel}
              currentUserId={user.id}
            />
          ) : (
            <>
              <div className="mb-8">
                <Breadcrumb
                  items={[
                    { label: "Bookings", href: "/bookings" },
                    { label: backLabel, href: backHref },
                    { label: typedService.name },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-8">
                <BookingSelector
                  service={typedService}
                  schedules={schedules}
                  currentUserId={user.id}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
