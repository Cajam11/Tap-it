import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import { getServiceCheckoutHref } from "@/lib/bookings/routes";
import BookingTimeline from "./BookingTimeline";
import BookingHistoryList, { type BookingHistoryItem } from "./BookingHistoryList";

type BookingStatus = "pending" | "paid" | "cancelled" | "refunded";

type BookingRow = {
  id: string;
  service_id: string;
  schedule_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  total_price: number;
  created_at: string;
  bookable_services: {
    name: string;
    type: string;
  } | null;
};

type ScheduleRow = {
  id: string;
  trainer_id: string | null;
};

type TrainerRow = {
  id: string;
  full_name: string | null;
};

const NAV_LINKS: [string, string][] = [];
const ACTIVITY_COLORS = [
  "border-orange-400 bg-orange-500/18 text-orange-100",
  "border-fuchsia-400 bg-fuchsia-500/18 text-fuchsia-100",
  "border-sky-400 bg-sky-500/18 text-sky-100",
  "border-emerald-400 bg-emerald-500/18 text-emerald-100",
  "border-amber-300 bg-amber-400/18 text-amber-100",
];

function normalizeService(rawService: BookingRow["bookable_services"] | BookingRow["bookable_services"][]) {
  return Array.isArray(rawService) ? rawService[0] ?? null : rawService ?? null;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("sk-SK", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: BookingStatus) {
  if (status === "paid") return "Zaplatene";
  if (status === "pending") return "Caka na platbu";
  if (status === "cancelled") return "Zrusene";
  return "Refundovane";
}

function getStatusClass(status: BookingStatus) {
  if (status === "paid") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (status === "pending") return "border-amber-300/30 bg-amber-400/10 text-amber-100";
  if (status === "cancelled") return "border-white/10 bg-white/[0.03] text-white/45";
  return "border-sky-300/30 bg-sky-400/10 text-sky-100";
}

export default async function MyBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, service_id, schedule_id, start_time, end_time, status, total_price, created_at, bookable_services(name, type)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (bookings ?? []).map((booking) => ({
    ...booking,
    bookable_services: normalizeService(booking.bookable_services),
  })) as BookingRow[];

  const scheduleIds = Array.from(
    new Set(items.map((booking) => booking.schedule_id).filter((id): id is string => Boolean(id)))
  );

  const { data: scheduleRows } = scheduleIds.length
    ? await supabase.from("service_schedules").select("id, trainer_id").in("id", scheduleIds)
    : { data: [] as ScheduleRow[] };

  const schedulesById = new Map(
    ((scheduleRows ?? []) as ScheduleRow[]).map((schedule) => [schedule.id, schedule])
  );
  const trainerIds = Array.from(
    new Set(
      Array.from(schedulesById.values())
        .map((schedule) => schedule.trainer_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const { data: trainerRows } = trainerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", trainerIds)
    : { data: [] as TrainerRow[] };

  const trainersById = new Map(((trainerRows ?? []) as TrainerRow[]).map((trainer) => [trainer.id, trainer]));
  const now = new Date();
  const historyItems: BookingHistoryItem[] = [...items].sort((a, b) => {
    const statusPriority = Number(b.status === "pending") - Number(a.status === "pending");
    if (statusPriority !== 0) {
      return statusPriority;
    }

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }).map((booking) => {
    const schedule = booking.schedule_id ? schedulesById.get(booking.schedule_id) : null;
    const trainerId = schedule?.trainer_id;
    const isTrainer = booking.bookable_services?.type === "trainer";

    const paymentHref = booking.status === "pending"
      ? booking.schedule_id
        ? `${getServiceCheckoutHref(
            booking.bookable_services?.type,
            booking.service_id,
            trainerId,
          )}?scheduleId=${booking.schedule_id}${isTrainer ? `&serviceId=${booking.service_id}` : ""}`
        : `${getServiceCheckoutHref(
            booking.bookable_services?.type,
            booking.service_id,
            trainerId,
          )}?start=${booking.start_time}&duration=${Math.round(
            (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) /
              (1000 * 60 * 60),
          )}`
      : null;

    return {
      id: booking.id,
      title: booking.bookable_services?.name ?? "Rezervacia",
      start_time: booking.start_time,
      end_time: booking.end_time,
      status: booking.status,
      total_price: booking.total_price,
      paymentHref,
    };
  });
  const activeBookings = items
    .filter((booking) => booking.status !== "cancelled" && booking.status !== "refunded")
    .filter((booking) => new Date(booking.end_time) >= now)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const timelineActivities = activeBookings
    .map((booking, index) => {
      const schedule = booking.schedule_id ? schedulesById.get(booking.schedule_id) : null;
      const trainerName = schedule?.trainer_id ? trainersById.get(schedule.trainer_id)?.full_name ?? null : null;
      const serviceName = booking.bookable_services?.name ?? "Rezervacia";
      const label = trainerName ? `${serviceName} s ${trainerName}` : serviceName;

      return {
        ...booking,
        trainerName,
        trainerId: schedule?.trainer_id ?? null,
        label,
        color: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
      };
    });

  const upcomingPreview = activeBookings.slice(0, 4).map((booking) => {
    const schedule = booking.schedule_id ? schedulesById.get(booking.schedule_id) : null;
    return {
      ...booking,
      trainerId: schedule?.trainer_id ?? null,
    };
  });
  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="relative min-h-screen overflow-hidden bg-[#080808] px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full bg-red-900/10 blur-[150px]" />

        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-8">
          <header className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/35">
              <Link
                href="/bookings"
                className="inline-flex items-center gap-2 transition hover:text-white/65"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Bookings
              </Link>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white">
              Moje rezervacie
            </h1>
            <p className="max-w-2xl text-white/60">
              Historia rezervacii nalavo, najblizsie aktivity a denny rozvrh napravo.
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(25rem,0.9fr)] lg:items-stretch">
            {/* Left Column: List of history bookings */}
            <div className="relative h-[500px] min-w-0 lg:h-auto">
              <div className="flex h-full flex-col lg:absolute lg:inset-0">
                <section className="flex flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
                  <div className="flex flex-none items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                  <h2 className="text-xl font-semibold text-white">Historia bookingov</h2>
                      <p className="text-sm text-white/45">Zobrazuje sa po 10 rezervacii</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-white/60">
                  {items.length} spolu
                </span>
              </div>

              <BookingHistoryList items={historyItems} />
            </section>
              </div>
            </div>

            <BookingTimeline activities={timelineActivities} upcomingPreview={upcomingPreview} />
          </div>
        </div>
      </main>
    </>
  );
}
