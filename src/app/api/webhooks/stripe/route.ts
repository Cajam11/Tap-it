import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient, getStripeWebhookSecret } from "@/lib/stripe/server";
import {
  completeMembershipPaymentAttempt,
  findMembershipPaymentAttemptByPaymentIntent,
  markMembershipPaymentAttempt,
  type MembershipPaymentAttempt,
} from "@/lib/membership-payments";

type MembershipRow = {
  id: string;
  billing_cycle: "entries" | "monthly" | "yearly";
  entry_count: number | null;
  duration_days: number | null;
};

type TransactionRow = {
  id: string;
  status: "completed" | "pending" | "failed";
  metadata: Record<string, unknown> | null;
};

type UpdatableMembershipsQuery = {
  update(values: Record<string, unknown>): UpdatableMembershipsQuery;
  match(values: Record<string, unknown>): Promise<{ error: unknown }>;
};

type InsertableMembershipsQuery = {
  insert(values: Record<string, unknown>): Promise<{ error: unknown }>;
};

type UpdatableTransactionsQuery = {
  update(values: Record<string, unknown>): UpdatableTransactionsQuery;
  eq(column: string, value: string): Promise<{ error: unknown }>;
};

type InsertableTransactionsQuery = {
  insert(values: Record<string, unknown>): Promise<{ error: unknown }>;
};

type UpdatableBookingsQuery = {
  update(values: Record<string, unknown>): UpdatableBookingsQuery;
  eq(column: string, value: string): Promise<{ error: unknown }>;
};

type UpdatableSchedulesQuery = {
  update(values: Record<string, unknown>): UpdatableSchedulesQuery;
  eq(column: string, value: string): Promise<{ error: unknown }>;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function refundExpiredBookingPayment(
  paymentIntent: Stripe.PaymentIntent,
  bookingId: string,
  userId: string,
  paymentAmount: number,
) {
  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("stripe_refund_id")
    .eq("id", bookingId)
    .maybeSingle<{ stripe_refund_id: string | null }>();

  if (booking?.stripe_refund_id) return;

  try {
    const stripe = getStripeServerClient();
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntent.id,
        reason: "requested_by_customer",
      },
      { idempotencyKey: `expired-booking-refund-${bookingId}` },
    );

    await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
      .update({
        status: "refunded",
        stripe_pi_id: paymentIntent.id,
        stripe_refund_id: refund.id,
      })
      .eq("id", bookingId);

    const { data: existingRefund } = await admin
      .from("transactions")
      .select("id")
      .contains("metadata", { stripe_refund_id: refund.id })
      .maybeSingle<{ id: string }>();

    if (!existingRefund) {
      await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
        user_id: userId,
        booking_id: bookingId,
        amount: paymentAmount,
        currency: "EUR",
        type: "refund",
        status: "completed",
        metadata: {
          stripe_payment_intent_id: paymentIntent.id,
          stripe_refund_id: refund.id,
          reason: "expired_booking_hold",
        },
      });
    }
  } catch (error) {
    console.error("Webhook refund expired booking error:", error);
  }
}

async function finalizeLegacyMembershipFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const userId = asString(paymentIntent.metadata.user_id);
  const membershipId = asString(paymentIntent.metadata.membership_id);

  if (!userId || !membershipId) {
    return;
  }

  const admin = createAdminClient();

  const { data: membershipRow, error: membershipError } = await admin
    .from("memberships")
    .select("id, billing_cycle, entry_count, duration_days")
    .eq("id", membershipId)
    .maybeSingle<MembershipRow>();

  if (membershipError || !membershipRow) {
    return;
  }

  const { data: existingTx } = await admin
    .from("transactions")
    .select("id, status, metadata")
    .contains("metadata", { stripe_payment_intent_id: paymentIntent.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TransactionRow>();

  if (existingTx?.status === "completed") {
    return;
  }

  const now = new Date();
  const nextEndDate =
    typeof membershipRow.duration_days === "number" && membershipRow.duration_days > 0
      ? addDays(now, membershipRow.duration_days).toISOString()
      : null;

  const entriesRemaining =
    membershipRow.billing_cycle === "entries"
      ? typeof membershipRow.entry_count === "number" && membershipRow.entry_count > 0
        ? membershipRow.entry_count
        : 1
      : null;

  const { data: currentActiveMembership } = await admin
    .from("user_memberships")
    .select("id, membership_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; membership_id: string }>();

  const isAlreadyActivated = currentActiveMembership?.membership_id === membershipRow.id;

  if (!isAlreadyActivated) {
    await (admin.from("user_memberships") as unknown as UpdatableMembershipsQuery)
      .update({ status: "cancelled", end_date: now.toISOString() })
      .match({ user_id: userId, status: "active" });

    const { error: membershipInsertError } = await (
      admin.from("user_memberships") as unknown as InsertableMembershipsQuery
    ).insert({
      user_id: userId,
      membership_id: membershipRow.id,
      start_date: now.toISOString(),
      end_date: nextEndDate,
      entries_remaining: entriesRemaining,
      status: "active",
      activated_by_admin: false,
    });

    if (membershipInsertError) {
      return;
    }
  }

  const paymentAmount = Number(paymentIntent.amount_received || paymentIntent.amount) / 100;

  const nextMetadata = {
    ...(existingTx?.metadata ?? {}),
    plan_name: paymentIntent.metadata.plan_name,
    billing_cycle: paymentIntent.metadata.billing_cycle,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id:
      typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null,
  } as Record<string, unknown>;

  if (existingTx?.id) {
    await (admin.from("transactions") as unknown as UpdatableTransactionsQuery)
      .update({
        status: "completed",
        amount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
        metadata: nextMetadata,
      })
      .eq("id", existingTx.id);

    return;
  }

  await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
    user_id: userId,
    membership_id: membershipRow.id,
    amount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
    currency: "EUR",
    type: "purchase",
    status: "completed",
    metadata: nextMetadata,
  });
}

async function markLegacyMembershipPaymentAsFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = asString(paymentIntent.metadata.user_id);
  const membershipId = asString(paymentIntent.metadata.membership_id);

  if (!userId || !membershipId) {
    return;
  }

  const admin = createAdminClient();

  const { data: existingTx } = await admin
    .from("transactions")
    .select("id, metadata")
    .contains("metadata", { stripe_payment_intent_id: paymentIntent.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; metadata: Record<string, unknown> | null }>();

  const nextMetadata = {
    ...(existingTx?.metadata ?? {}),
    plan_name: paymentIntent.metadata.plan_name,
    billing_cycle: paymentIntent.metadata.billing_cycle,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_last_payment_error: paymentIntent.last_payment_error?.message ?? null,
  } as Record<string, unknown>;

  if (existingTx?.id) {
    await (admin.from("transactions") as unknown as UpdatableTransactionsQuery)
      .update({
        status: "failed",
        metadata: nextMetadata,
      })
      .eq("id", existingTx.id);

    return;
  }

  await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
    user_id: userId,
    membership_id: membershipId,
    amount: Number(paymentIntent.amount || 0) / 100,
    currency: "EUR",
    type: "purchase",
    status: "failed",
    metadata: nextMetadata,
  });
}

function membershipAttemptIdFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  return asString(paymentIntent.metadata.membership_payment_attempt_id);
}

function isAttemptOwnedByPaymentIntent(
  attempt: MembershipPaymentAttempt,
  paymentIntent: Stripe.PaymentIntent,
) {
  const userId = asString(paymentIntent.metadata.user_id);
  const membershipId = asString(paymentIntent.metadata.membership_id);

  return (
    userId === attempt.user_id &&
    membershipId === attempt.membership_id &&
    (!attempt.stripe_payment_intent_id || attempt.stripe_payment_intent_id === paymentIntent.id)
  );
}

async function annotateStripeMembershipPaymentFailure(paymentIntent: Stripe.PaymentIntent) {
  const failure = paymentIntent.last_payment_error;
  const reason = failure?.decline_code ?? failure?.code ?? "stripe_payment_failed";
  const message = failure?.message?.slice(0, 500) ?? "Payment failed";

  try {
    await getStripeServerClient().paymentIntents.update(paymentIntent.id, {
      metadata: {
        ...paymentIntent.metadata,
        tap_it_failure_reason: reason,
        tap_it_failure_message: message,
        tap_it_failure_recorded_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    // Stripe's own failure state is already authoritative. Metadata is useful
    // for dashboard diagnostics but must not prevent DB reconciliation.
    console.error("Failed to annotate Stripe membership payment failure", {
      paymentIntentId: paymentIntent.id,
      error,
    });
  }
}

async function recordCompletedMembershipTransaction(
  paymentIntent: Stripe.PaymentIntent,
  attempt: MembershipPaymentAttempt,
) {
  const admin = createAdminClient();
  const { data: existingTx } = await admin
    .from("transactions")
    .select("id, status, metadata")
    .contains("metadata", { stripe_payment_intent_id: paymentIntent.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TransactionRow>();

  const amount = Number(paymentIntent.amount_received || paymentIntent.amount) / 100;
  const metadata = {
    ...(existingTx?.metadata ?? {}),
    membership_payment_attempt_id: attempt.id,
    plan_name: attempt.membership_name,
    billing_cycle: attempt.billing_cycle,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_charge_id:
      typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null,
  } as Record<string, unknown>;

  if (existingTx?.id) {
    const { error } = await (admin.from("transactions") as unknown as UpdatableTransactionsQuery)
      .update({ status: "completed", amount, metadata })
      .eq("id", existingTx.id);
    if (error) throw new Error("membership_transaction_completion_update_failed");
    return;
  }

  const { error } = await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
    user_id: attempt.user_id,
    membership_id: attempt.membership_id,
    amount,
    currency: attempt.currency,
    type: "purchase",
    status: "completed",
    metadata,
  });
  if (error) throw new Error("membership_transaction_completion_insert_failed");
}

async function recordFailedMembershipTransaction(
  paymentIntent: Stripe.PaymentIntent,
  attempt: MembershipPaymentAttempt,
  reason: string,
) {
  const admin = createAdminClient();
  const { data: existingTx } = await admin
    .from("transactions")
    .select("id, status, metadata")
    .contains("metadata", { stripe_payment_intent_id: paymentIntent.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<TransactionRow>();

  // A completed charge must never be rewritten as a failed payment because a
  // late canceled/failed event was delivered out of order.
  if (existingTx?.status === "completed") return;

  const metadata = {
    ...(existingTx?.metadata ?? {}),
    membership_payment_attempt_id: attempt.id,
    plan_name: attempt.membership_name,
    billing_cycle: attempt.billing_cycle,
    stripe_payment_intent_id: paymentIntent.id,
    failure_reason: reason,
    stripe_last_payment_error: paymentIntent.last_payment_error?.message ?? null,
  } as Record<string, unknown>;

  if (existingTx?.id) {
    const { error } = await (admin.from("transactions") as unknown as UpdatableTransactionsQuery)
      .update({ status: "failed", metadata })
      .eq("id", existingTx.id);
    if (error) throw new Error("membership_transaction_failure_update_failed");
    return;
  }

  const { error } = await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
    user_id: attempt.user_id,
    membership_id: attempt.membership_id,
    amount: Number(paymentIntent.amount || 0) / 100,
    currency: attempt.currency,
    type: "purchase",
    status: "failed",
    metadata,
  });
  if (error) throw new Error("membership_transaction_failure_insert_failed");
}

async function refundInvalidMembershipPayment(
  paymentIntent: Stripe.PaymentIntent,
  attempt: MembershipPaymentAttempt,
  reason: string,
) {
  const admin = createAdminClient();

  // Keep the money ledger complete even when a charge wins a race with expiry.
  await recordCompletedMembershipTransaction(paymentIntent, attempt);

  let refundId = attempt.stripe_refund_id;
  if (!refundId) {
    const stripe = getStripeServerClient();
    const refund = await stripe.refunds.create(
      { payment_intent: paymentIntent.id, reason: "requested_by_customer" },
      { idempotencyKey: `invalid-membership-payment-refund:${attempt.id}` },
    );
    refundId = refund.id;

    const { error } = await admin
      .from("membership_payment_attempts")
      .update({
        status: "refunded",
        stripe_refund_id: refundId,
        failure_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);
    if (error) throw new Error("membership_attempt_refund_update_failed");
  }

  const { data: existingRefund } = await admin
    .from("transactions")
    .select("id")
    .contains("metadata", { stripe_refund_id: refundId })
    .maybeSingle<{ id: string }>();

  if (existingRefund) return;

  const { error } = await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
    user_id: attempt.user_id,
    membership_id: attempt.membership_id,
    amount: Number(paymentIntent.amount_received || paymentIntent.amount) / 100,
    currency: attempt.currency,
    type: "refund",
    status: "completed",
    metadata: {
      membership_payment_attempt_id: attempt.id,
      stripe_payment_intent_id: paymentIntent.id,
      stripe_refund_id: refundId,
      reason,
    },
  });
  if (error) throw new Error("membership_refund_transaction_insert_failed");
}

async function finalizeMembershipFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const attempt = await findMembershipPaymentAttemptByPaymentIntent(
    paymentIntent.id,
    membershipAttemptIdFromPaymentIntent(paymentIntent),
  );

  // PaymentIntents created before this rollout continue through the legacy
  // handler. Every new payment has an attempt id in both DB and Stripe metadata.
  if (!attempt) {
    await finalizeLegacyMembershipFromPaymentIntent(paymentIntent);
    return;
  }

  if (!isAttemptOwnedByPaymentIntent(attempt, paymentIntent)) {
    throw new Error("membership_payment_attempt_metadata_mismatch");
  }

  const completion = await completeMembershipPaymentAttempt(attempt.id);
  if (completion.activated) {
    await recordCompletedMembershipTransaction(paymentIntent, attempt);
    return;
  }

  // A checkout that expired, was replaced, or raced another successful plan
  // must never activate a second membership. Since Stripe already collected
  // money, refund it deterministically instead of silently losing the payment.
  await refundInvalidMembershipPayment(paymentIntent, attempt, completion.result);
}

async function markMembershipPaymentAsFailed(paymentIntent: Stripe.PaymentIntent) {
  await annotateStripeMembershipPaymentFailure(paymentIntent);

  const attempt = await findMembershipPaymentAttemptByPaymentIntent(
    paymentIntent.id,
    membershipAttemptIdFromPaymentIntent(paymentIntent),
  );

  if (!attempt) {
    await markLegacyMembershipPaymentAsFailed(paymentIntent);
    return;
  }

  if (!isAttemptOwnedByPaymentIntent(attempt, paymentIntent)) {
    throw new Error("membership_payment_attempt_metadata_mismatch");
  }

  if (attempt.status === "pending") {
    // A failed card attempt normally leaves Stripe in requires_payment_method.
    // Keep the checkout open until its normal expiry so the same PaymentElement
    // can accept a corrected card instead of manufacturing another intent.
    const { error } = await createAdminClient()
      .from("membership_payment_attempts")
      .update({
        failure_reason: paymentIntent.last_payment_error?.code ?? "stripe_payment_failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id)
      .eq("status", "pending");
    if (error) throw new Error("membership_attempt_failure_note_failed");
  }
  await recordFailedMembershipTransaction(
    paymentIntent,
    attempt,
    paymentIntent.last_payment_error?.code ?? "stripe_payment_failed",
  );
}

async function markMembershipPaymentAsCancelled(paymentIntent: Stripe.PaymentIntent) {
  const attempt = await findMembershipPaymentAttemptByPaymentIntent(
    paymentIntent.id,
    membershipAttemptIdFromPaymentIntent(paymentIntent),
  );

  if (!attempt) {
    await markLegacyMembershipPaymentAsFailed(paymentIntent);
    return;
  }

  if (!isAttemptOwnedByPaymentIntent(attempt, paymentIntent)) {
    throw new Error("membership_payment_attempt_metadata_mismatch");
  }

  if (attempt.status === "pending") {
    await markMembershipPaymentAttempt(attempt.id, "cancelled", "stripe_payment_intent_cancelled");
  }

  const { error } = await createAdminClient()
    .from("membership_payment_attempts")
    .update({
      stripe_pi_cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", attempt.id);
  if (error) throw new Error("membership_attempt_cancel_marker_failed");

  await recordFailedMembershipTransaction(paymentIntent, attempt, "stripe_payment_intent_cancelled");
}

async function finalizeBookingFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const userId = asString(paymentIntent.metadata.user_id);
  const bookingId = asString(paymentIntent.metadata.booking_id);

  if (!userId || !bookingId) return;

  const admin = createAdminClient();

  // Mark the transaction as completed
  const { data: existingTx } = await admin
    .from("transactions")
    .select("id")
    .contains("metadata", { stripe_payment_intent_id: paymentIntent.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  const paymentAmount = Number(paymentIntent.amount_received || paymentIntent.amount) / 100;
  const metadata = {
    stripe_payment_intent_id: paymentIntent.id,
    service_name: paymentIntent.metadata.service_name,
    stripe_charge_id: typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : null,
  };

  if (existingTx?.id) {
    const { error: updateTxErr } = await (admin.from("transactions") as unknown as UpdatableTransactionsQuery)
      .update({ status: "completed", amount: paymentAmount, metadata })
      .eq("id", existingTx.id);
    if (updateTxErr) console.error("Webhook update tx error:", updateTxErr);
  } else {
    const { error: insertTxErr } = await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
      user_id: userId,
      booking_id: bookingId,
      amount: paymentAmount,
      currency: "EUR",
      type: "purchase",
      status: "completed",
      metadata,
    });
    if (insertTxErr) console.error("Webhook insert tx error:", insertTxErr);
  }

  const { data: bookingRow } = await admin
    .from("bookings")
    .select("schedule_id, status, expires_at, stripe_refund_id")
    .eq("id", bookingId)
    .maybeSingle<{
      schedule_id: string | null;
      status: string;
      expires_at: string | null;
      stripe_refund_id: string | null;
    }>();

  if (!bookingRow) return;

  const isExpiredPendingBooking =
    bookingRow.status === "pending" &&
    (!bookingRow.expires_at || new Date(bookingRow.expires_at).getTime() <= Date.now());

  if (isExpiredPendingBooking) {
    await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
      .update({ status: "cancelled" })
      .eq("id", bookingId);
  }

  if (isExpiredPendingBooking || bookingRow.status === "cancelled" || bookingRow.status === "refunded") {
    await refundExpiredBookingPayment(paymentIntent, bookingId, userId, paymentAmount);
    return;
  }

  if (bookingRow.status !== "paid") {
    const { error: updateBookingErr } = await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
      .update({ status: "paid", stripe_pi_id: paymentIntent.id })
      .eq("id", bookingId);
    if (updateBookingErr) {
      console.error("Webhook update booking error:", updateBookingErr);
      await refundExpiredBookingPayment(paymentIntent, bookingId, userId, paymentAmount);
      return;
    }

    const { data: finalizedBooking } = await admin
      .from("bookings")
      .select("status")
      .eq("id", bookingId)
      .maybeSingle<{ status: string }>();

    if (finalizedBooking?.status !== "paid") {
      await refundExpiredBookingPayment(paymentIntent, bookingId, userId, paymentAmount);
    }
  }

}

async function markBookingPaymentAsFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = asString(paymentIntent.metadata.user_id);
  const bookingId = asString(paymentIntent.metadata.booking_id);

  if (!userId || !bookingId) return;

  const admin = createAdminClient();
  const paymentAmount = Number(paymentIntent.amount || 0) / 100;

  const { data: existingTx } = await admin
    .from("transactions")
    .select("id")
    .contains("metadata", { stripe_payment_intent_id: paymentIntent.id })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  const metadata = {
    stripe_payment_intent_id: paymentIntent.id,
    service_name: paymentIntent.metadata.service_name,
    stripe_last_payment_error: paymentIntent.last_payment_error?.message ?? null,
  };

  if (existingTx?.id) {
    await (admin.from("transactions") as unknown as UpdatableTransactionsQuery)
      .update({ status: "failed", metadata })
      .eq("id", existingTx.id);
  } else {
    await (admin.from("transactions") as unknown as InsertableTransactionsQuery).insert({
      user_id: userId,
      booking_id: bookingId,
      amount: paymentAmount,
      currency: "EUR",
      type: "purchase",
      status: "failed",
      metadata,
    });
  }

  // Release the held slot after a failed booking payment.
  await (admin.from("bookings") as unknown as UpdatableBookingsQuery)
    .update({ status: "cancelled" })
    .eq("id", bookingId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    const stripe = getStripeServerClient();
    event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata.booking_id) {
        await finalizeBookingFromPaymentIntent(intent);
      } else if (intent.metadata.membership_id) {
        await finalizeMembershipFromPaymentIntent(intent);
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata.booking_id) {
        await markBookingPaymentAsFailed(intent);
      } else if (intent.metadata.membership_id) {
        await markMembershipPaymentAsFailed(intent);
      }
    }

    if (event.type === "payment_intent.canceled") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata.membership_id) {
        await markMembershipPaymentAsCancelled(intent);
      }
    }
  } catch {
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
