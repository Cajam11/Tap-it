import BookingCheckoutPage, { CheckoutSearchParams } from "./BookingCheckoutPage";

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceId: string }>;
  searchParams: Promise<CheckoutSearchParams>;
}) {
  const { serviceId } = await params;

  return <BookingCheckoutPage serviceId={serviceId} searchParams={searchParams} />;
}
