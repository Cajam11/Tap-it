import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingCheckoutPage from "@/components/bookings/BookingCheckoutPage";

type TrainerCheckoutSearchParams = {
  scheduleId?: string;
  serviceId?: string;
};

export default async function TrainerCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ trainerId: string }>;
  searchParams: Promise<TrainerCheckoutSearchParams>;
}) {
  const { trainerId } = await params;
  const resolvedSearchParams = await searchParams;
  let serviceId = resolvedSearchParams.serviceId;

  if (!serviceId) {
    const supabase = await createClient();
    const { data: service } = await supabase
      .from("bookable_services")
      .select("id")
      .eq("type", "trainer")
      .eq("is_active", true)
      .maybeSingle<{ id: string }>();

    serviceId = service?.id;
  }

  if (!serviceId) {
    redirect(`/bookings/trainers/${trainerId}`);
  }

  return (
    <BookingCheckoutPage
      serviceId={serviceId}
      routeTrainerId={trainerId}
      searchParams={Promise.resolve(resolvedSearchParams)}
    />
  );
}
