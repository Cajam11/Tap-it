import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";

export const PENDING_BOOKING_HOLD_MINUTES = 15;

type SelectableBookingsQuery = {
  select(columns: string): SelectableBookingsQuery;
  eq(column: string, value: string): SelectableBookingsQuery;
  single<T>(): Promise<{ data: T | null; error: unknown }>;
};

type UpdatableBookingsQuery = {
  update(values: Record<string, unknown>): UpdatableBookingsQuery;
  eq(column: string, value: string): Promise<{ error: unknown }>;
};

type BookingCheckout = {
  id: string;
  user_id: string;
  service_id: string;
  schedule_id: string | null;
  start_time: string;
  end_time: string;
  total_price: number;
  status: "pending" | "paid" | "cancelled" | "refunded";
  expires_at: string | null;
  stripe_pi_id: string | null;
};

type BookingCheckoutRpc = {
  rpc(
    name: "reserve_booking_checkout",
    args: {
      p_user_id: string;
      p_service_id: string;
      p_schedule_id: string | null;
      p_start_time: string;
      p_end_time: string;
      p_total_price: number;
    },
  ): Promise<{
    data: Array<{ booking_id: string; booking_expires_at: string }> | null;
    error: { message?: string } | null;
  }>;
};

export async function expireStalePendingBookings(
  serviceId?: string,
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  let expiredQuery = admin
    .from("bookings")
    .select("id")
    .eq("status", "pending")
    .order("expires_at", { ascending: true })
    .limit(100);

  if (serviceId) {
    expiredQuery = expiredQuery.eq("service_id", serviceId);
  }

  const { data: staleBookings, error: staleBookingsError } = await expiredQuery.lt("expires_at", now);
  if (staleBookingsError) {
    console.error("Failed to find stale pending bookings:", staleBookingsError);
  }

  let expiredCount = 0;

  for (const staleBooking of (staleBookings ?? []) as Array<{ id: string }>) {
    const { data: cancelledBooking, error: expireError } = await admin
      .from("bookings")
      .update({ status: "cancelled", updated_at: now })
      .eq("id", staleBooking.id)
      .eq("status", "pending")
      .lt("expires_at", now)
      .select("id")
      .maybeSingle<{ id: string }>();

    if (expireError || !cancelledBooking) {
      if (expireError) console.error("Failed to expire stale pending booking:", expireError);
      continue;
    }

    expiredCount += 1;
  }

  // A lazy cleanup can cancel a booking between cron ticks. Keep every
  // unconfirmed Stripe cancellation in this retry queue until it succeeds.
  let intentRetryQuery = admin
    .from("bookings")
    .select("id, stripe_pi_id")
    .eq("status", "cancelled")
    .not("stripe_pi_id", "is", null)
    .is("stripe_pi_cancelled_at", null)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (serviceId) {
    intentRetryQuery = intentRetryQuery.eq("service_id", serviceId);
  }

  const { data: intentsToCancel, error: intentsToCancelError } = await intentRetryQuery;
  if (intentsToCancelError) {
    console.error("Failed to load Stripe cancellation retry queue:", intentsToCancelError);
    return expiredCount;
  }

  const stripe = getStripeServerClient();

  for (const booking of (intentsToCancel ?? []) as Array<{ id: string; stripe_pi_id: string }>) {
    try {
      await stripe.paymentIntents.cancel(booking.stripe_pi_id);

      const { error: markCancelledError } = await admin
        .from("bookings")
        .update({ stripe_pi_cancelled_at: new Date().toISOString() })
        .eq("id", booking.id)
        .eq("status", "cancelled");

      if (markCancelledError) {
        console.error("Failed to mark Stripe payment intent as cancelled:", markCancelledError);
      }
    } catch (error) {
      // Stripe returns payment_intent_unexpected_state when another process
      // already cancelled or completed the intent. Those states are terminal;
      // retrying cancel every minute would only create an API-error loop.
      try {
        const latestIntent = await stripe.paymentIntents.retrieve(booking.stripe_pi_id);
        if (
          latestIntent.status === "canceled" ||
          latestIntent.status === "succeeded" ||
          latestIntent.status === "processing"
        ) {
          const { error: markTerminalError } = await admin
            .from("bookings")
            .update({ stripe_pi_cancelled_at: new Date().toISOString() })
            .eq("id", booking.id)
            .eq("status", "cancelled");

          if (markTerminalError) {
            console.error("Failed to mark terminal Stripe payment intent:", markTerminalError);
          }
          continue;
        }
      } catch (retrieveError) {
        console.error("Failed to inspect Stripe payment intent after cancellation error:", {
          bookingId: booking.id,
          paymentIntentId: booking.stripe_pi_id,
          error: retrieveError,
        });
      }

      // Keep genuinely retryable errors in the queue. A concurrent successful
      // payment is still handled by the webhook and refunded because the
      // booking is already cancelled.
      console.error("Failed to cancel expired Stripe payment intent:", {
        bookingId: booking.id,
        paymentIntentId: booking.stripe_pi_id,
        error,
      });
    }
  }

  return expiredCount;
}

export async function createBookingCheckout(
  userId: string,
  serviceId: string,
  scheduleId: string | null,
  startTime: Date,
  endTime: Date,
  totalPrice: number,
) {
  await expireStalePendingBookings();

  const admin = createAdminClient();
  const { data, error } = await (admin as unknown as BookingCheckoutRpc).rpc(
    "reserve_booking_checkout",
    {
      p_user_id: userId,
      p_service_id: serviceId,
      p_schedule_id: scheduleId,
      p_start_time: startTime.toISOString(),
      p_end_time: endTime.toISOString(),
      p_total_price: totalPrice,
    },
  );

  const checkout = data?.[0];
  if (error || !checkout) {
    throw new Error(error?.message || "Rezerváciu sa nepodarilo vytvoriť.");
  }

  return {
    bookingId: checkout.booking_id,
    expiresAt: checkout.booking_expires_at,
  };
}

export async function getBookingCheckout(bookingId: string, userId: string) {
  await expireStalePendingBookings();

  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id, user_id, service_id, schedule_id, start_time, end_time, total_price, status, expires_at, stripe_pi_id")
    .eq("id", bookingId)
    .eq("user_id", userId)
    .maybeSingle<BookingCheckout>();

  if (!data) {
    throw new Error("Checkout nebol nájdený.");
  }

  if (data.status !== "pending" || !data.expires_at || new Date(data.expires_at) <= new Date()) {
    throw new Error("Tento checkout už vypršal. Vyberte si termín znova.");
  }

  return data;
}

export async function createBookingPaymentIntentForCheckout(
  bookingId: string,
  userId: string,
  serviceName: string,
) {
  const booking = await getBookingCheckout(bookingId, userId);
  const stripe = getStripeServerClient();

  if (booking.stripe_pi_id) {
    const existingIntent = await stripe.paymentIntents.retrieve(booking.stripe_pi_id);

    if (
      existingIntent.client_secret &&
      existingIntent.status !== "canceled" &&
      existingIntent.status !== "succeeded"
    ) {
      return {
        clientSecret: existingIntent.client_secret,
        bookingId: booking.id,
      };
    }
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(Number(booking.total_price) * 100),
    currency: "eur",
    automatic_payment_methods: { enabled: true },
    metadata: {
      user_id: userId,
      booking_id: booking.id,
      service_name: serviceName,
      booking_expires_at: booking.expires_at,
    },
  });

  if (!paymentIntent.client_secret) {
    throw new Error("Platbu sa nepodarilo pripraviť.");
  }

  const admin = createAdminClient();
  await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
    .update({ stripe_pi_id: paymentIntent.id, stripe_pi_cancelled_at: null })
    .eq("id", booking.id);

  return {
    clientSecret: paymentIntent.client_secret,
    bookingId: booking.id,
  };
}

export async function createBookingIntent(
  userId: string,
  serviceId: string,
  scheduleId: string | null,
  startTime: Date,
  endTime: Date,
  totalPrice: number,
  serviceName: string
) {
  const checkout = await createBookingCheckout(
    userId,
    serviceId,
    scheduleId,
    startTime,
    endTime,
    totalPrice,
  );

  return createBookingPaymentIntentForCheckout(checkout.bookingId, userId, serviceName);
}

export async function cancelBookingAndRefund(bookingId: string, userId: string) {
  const admin = createAdminClient();

  // 1. Fetch booking to verify ownership and time condition
  const { data: booking, error: bookingError } = await (admin.from("bookings") as unknown as SelectableBookingsQuery)
    .select("*")
    .eq("id", bookingId)
    .single<{
      user_id: string;
      schedule_id: string | null;
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
