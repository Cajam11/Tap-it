import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";

type InsertableBookingsQuery = {
  insert(values: Record<string, unknown>): InsertableBookingsQuery;
  select(columns?: string): InsertableBookingsQuery;
  single<T>(): Promise<{ data: T | null; error: unknown }>;
};

type SelectableBookingsQuery = {
  select(columns: string): SelectableBookingsQuery;
  eq(column: string, value: string): SelectableBookingsQuery;
  single<T>(): Promise<{ data: T | null; error: unknown }>;
};

type UpdatableBookingsQuery = {
  update(values: Record<string, unknown>): UpdatableBookingsQuery;
  eq(column: string, value: string): Promise<{ error: unknown }>;
};

export async function createBookingIntent(
  userId: string,
  serviceId: string,
  scheduleId: string | null,
  startTime: Date,
  endTime: Date,
  totalPrice: number,
  serviceName: string
) {
  const admin = createAdminClient();

  const { data: serviceRow } = await admin
    .from("bookable_services")
    .select("id, type")
    .eq("id", serviceId)
    .maybeSingle<{ id: string; type: string }>();

  if (!serviceRow) {
    throw new Error("Service not found.");
  }

  if (scheduleId) {
    const { data: existingScheduleBooking } = await admin
      .from("bookings")
      .select("id")
      .eq("user_id", userId)
      .eq("schedule_id", scheduleId)
      .in("status", ["pending", "paid"])
      .maybeSingle<{ id: string }>();

    if (existingScheduleBooking?.id) {
      throw new Error("Tento termín už máte rezervovaný.");
    }
  }

  if (serviceRow.type === "trainer") {
    const { data: existingTrainerBooking } = await admin
      .from("bookings")
      .select("id, end_time, bookable_services(type)")
      .eq("user_id", userId)
      .in("status", ["pending", "paid"])
      .gt("end_time", new Date().toISOString())
      .eq("bookable_services.type", "trainer")
      .maybeSingle<{ id: string }>();

    if (existingTrainerBooking?.id) {
      throw new Error("Už máte aktívnu rezerváciu trénera.");
    }
  }

  // Create booking record as "pending"
  const { data: booking, error: bookingError } = await (admin.from("bookings") as unknown as InsertableBookingsQuery)
    .insert({
      user_id: userId,
      service_id: serviceId,
      schedule_id: scheduleId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      total_price: totalPrice,
      status: "pending",
    })
    .select()
    .single<{ id: string }>();

  if (bookingError || !booking) {
    throw new Error("Could not create local booking record.");
  }

  // Create Stripe intent
  const stripe = getStripeServerClient();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(totalPrice * 100), // convert to cents
    currency: "eur",
    metadata: {
      user_id: userId,
      booking_id: booking.id,
      service_name: serviceName,
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Could not create Stripe payment intent.");
  }

  return {
    clientSecret: paymentIntent.client_secret,
    bookingId: booking.id,
  };
}

export async function cancelBookingAndRefund(bookingId: string, userId: string) {
  const admin = createAdminClient();

  // 1. Fetch booking to verify ownership and time condition
  const { data: booking, error: bookingError } = await (admin.from("bookings") as unknown as SelectableBookingsQuery)
    .select("*")
    .eq("id", bookingId)
    .single<{
      user_id: string;
      status: string;
      stripe_pi_id: string | null;
      start_time: string;
      total_price: number;
    }>();

  if (bookingError || !booking) {
    throw new Error("Booking not found.");
  }

  // Security: only the owning user (or an admin conceptually, but we assume user invocation here)
  if (booking.user_id !== userId) {
    throw new Error("Unauthorized to cancel this booking.");
  }

  if (booking.status === "cancelled" || booking.status === "refunded") {
    throw new Error("Booking already cancelled.");
  }

  // Check 24h limit (example)
  const hoursUntilStart = (new Date(booking.start_time).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntilStart < 24) {
    throw new Error("Cannot cancel within 24 hours of Start Time.");
  }

  // If paid, issue stripe refund
  let stripeRefundId = null;
  if (booking.status === "paid" && booking.stripe_pi_id) {
    const stripe = getStripeServerClient();
    try {
      const refund = await stripe.refunds.create({
        payment_intent: booking.stripe_pi_id,
        reason: "requested_by_customer"
      });
      stripeRefundId = refund.id;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      throw new Error(`Stripe Refund failed: ${message}`);
    }
  }

  const nextStatus = booking.status === "paid" ? "refunded" : "cancelled";

  // Update booking status
  await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
    .update({
      status: nextStatus,
      stripe_refund_id: stripeRefundId,
    })
    .eq("id", bookingId);

  // If it was refunded, record the transaction type
  if (stripeRefundId) {
    await admin.from("transactions").insert({
      user_id: userId,
      booking_id: bookingId,
      amount: booking.total_price,
      currency: "EUR",
      type: "refund",
      status: "completed",
      metadata: { stripe_refund_id: stripeRefundId, original_pi_id: booking.stripe_pi_id }
    });
  }

  return { success: true, status: nextStatus };
}
