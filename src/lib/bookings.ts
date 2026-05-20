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

type UpdatableSchedulesQuery = {
  update(values: Record<string, unknown>): UpdatableSchedulesQuery;
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
    const { data: scheduleRow } = await admin
      .from("service_schedules")
      .select("id, current_capacity")
      .eq("id", scheduleId)
      .maybeSingle<{ id: string; current_capacity: number | null }>();

    if (!scheduleRow) {
      throw new Error("Termín nebol nájdený.");
    }

    if (scheduleRow.current_capacity !== null && scheduleRow.current_capacity <= 0) {
      throw new Error("Tento termín je už obsadený.");
    }

    const { data: existingPaidBooking } = await admin
      .from("bookings")
      .select("id")
      .eq("schedule_id", scheduleId)
      .eq("status", "paid")
      .maybeSingle<{ id: string }>();

    if (existingPaidBooking?.id) {
      throw new Error("Tento termín je už obsadený.");
    }

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

    const { data: existingPendingBooking } = await admin
      .from("bookings")
      .select("id, stripe_pi_id")
      .eq("user_id", userId)
      .eq("schedule_id", scheduleId)
      .eq("status", "pending")
      .maybeSingle<{ id: string; stripe_pi_id: string | null }>();

    if (existingPendingBooking?.id) {
      const stripe = getStripeServerClient();

      if (existingPendingBooking.stripe_pi_id) {
        const existingIntent = await stripe.paymentIntents.retrieve(existingPendingBooking.stripe_pi_id);
        if (existingIntent.client_secret) {
          return {
            clientSecret: existingIntent.client_secret,
            bookingId: existingPendingBooking.id,
          };
        }
      }

      const newIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalPrice * 100),
        currency: "eur",
        metadata: {
          user_id: userId,
          booking_id: existingPendingBooking.id,
          service_name: serviceName,
        },
      });

      if (!newIntent.client_secret) {
        throw new Error("Could not create Stripe payment intent.");
      }

      await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
        .update({ stripe_pi_id: newIntent.id })
        .eq("id", existingPendingBooking.id);

      return {
        clientSecret: newIntent.client_secret,
        bookingId: existingPendingBooking.id,
      };
    }

    const { data: existingTimeBooking } = await admin
      .from("bookings")
      .select("id")
      .eq("service_id", serviceId)
      .eq("start_time", startTime.toISOString())
      .eq("end_time", endTime.toISOString())
      .in("status", ["pending", "paid"])
      .maybeSingle<{ id: string }>();

    if (existingTimeBooking?.id) {
      throw new Error("Tento termín je už obsadený.");
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

  if (serviceRow.type === "facility") {
    const { data: overlappingBooking } = await admin
      .from("bookings")
      .select("id")
      .eq("service_id", serviceId)
      .in("status", ["pending", "paid"])
      .lt("start_time", endTime.toISOString())
      .gt("end_time", startTime.toISOString())
      .maybeSingle<{ id: string }>();

    if (overlappingBooking?.id) {
      throw new Error("Tento cas je uz obsadeny.");
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
    if (scheduleId) {
      const { data: pendingFallback } = await admin
        .from("bookings")
        .select("id, stripe_pi_id")
        .eq("user_id", userId)
        .eq("schedule_id", scheduleId)
        .eq("status", "pending")
        .maybeSingle<{ id: string; stripe_pi_id: string | null }>();

      if (pendingFallback?.id) {
        const stripe = getStripeServerClient();

        if (pendingFallback.stripe_pi_id) {
          const existingIntent = await stripe.paymentIntents.retrieve(pendingFallback.stripe_pi_id);
          if (existingIntent.client_secret) {
            return {
              clientSecret: existingIntent.client_secret,
              bookingId: pendingFallback.id,
            };
          }
        }

        const newIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalPrice * 100),
          currency: "eur",
          metadata: {
            user_id: userId,
            booking_id: pendingFallback.id,
            service_name: serviceName,
          },
        });

        if (!newIntent.client_secret) {
          throw new Error("Could not create Stripe payment intent.");
        }

        await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
          .update({ stripe_pi_id: newIntent.id })
          .eq("id", pendingFallback.id);

        return {
          clientSecret: newIntent.client_secret,
          bookingId: pendingFallback.id,
        };
      }
    }

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

  await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
    .update({ stripe_pi_id: paymentIntent.id })
    .eq("id", booking.id);

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

  if (booking.schedule_id) {
    const { data: scheduleRow } = await admin
      .from("service_schedules")
      .select("id, current_capacity")
      .eq("id", booking.schedule_id)
      .maybeSingle<{ id: string; current_capacity: number | null }>();

    if (scheduleRow && scheduleRow.current_capacity !== null) {
      await (admin.from("service_schedules") as unknown as UpdatableSchedulesQuery)
        .update({ current_capacity: scheduleRow.current_capacity + 1 })
        .eq("id", scheduleRow.id);
    }
  }

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
