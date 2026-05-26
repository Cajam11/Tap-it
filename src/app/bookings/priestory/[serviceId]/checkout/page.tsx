import BookingCheckoutPage, { CheckoutSearchParams } from "@/components/bookings/BookingCheckoutPage";

export default async function FacilityCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<CheckoutSearchParams>;
}) {
  const { serviceId } = await params;

  return <BookingCheckoutPage serviceId={serviceId} searchParams={searchParams} />;
}
