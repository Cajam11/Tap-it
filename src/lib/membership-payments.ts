import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";

export const MEMBERSHIP_PAYMENT_ATTEMPT_MINUTES = 30;

export type MembershipPaymentAttempt = {
  id: string;
  user_id: string;
  membership_id: string;
  membership_name: string;
  billing_cycle: "entries" | "monthly" | "yearly";
  entry_count: number | null;
  duration_days: number | null;
  amount: number;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_pi_cancelled_at: string | null;
  stripe_refund_id: string | null;
  status: "pending" | "completed" | "failed" | "cancelled" | "refunded";
  failure_reason: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

type AttemptReservation = {
  attempt_id: string;
  payment_intent_id: string | null;
  attempt_amount: number;
  attempt_currency: string;
  attempt_expires_at: string;
  attempt_membership_name: string;
  attempt_billing_cycle: MembershipPaymentAttempt["billing_cycle"];
};

type AttemptCompletion = { activated: boolean; result: string };

type MembershipAttemptRpc = {
  rpc(
    name: "reserve_membership_payment_attempt",
    args: { p_user_id: string; p_membership_id: string; p_ttl_minutes: number },
  ): Promise<{ data: AttemptReservation[] | null; error: { message?: string } | null }>;
  rpc(
    name: "complete_membership_payment_attempt",
    args: { p_attempt_id: string },
  ): Promise<{ data: AttemptCompletion[] | null; error: { message?: string } | null }>;
};

export class MembershipPaymentAttemptError extends Error {
  constructor(
    public readonly code: "membership_already_active" | "reservation_failed",
    message: string,
  ) {
    super(message);
  }
}

export async function reserveMembershipPaymentAttempt(userId: string, membershipId: string) {
  const admin = createAdminClient();
  const { data, error } = await (admin as unknown as MembershipAttemptRpc).rpc(
    "reserve_membership_payment_attempt",
    {
      p_user_id: userId,
      p_membership_id: membershipId,
      p_ttl_minutes: MEMBERSHIP_PAYMENT_ATTEMPT_MINUTES,
    },
  );
  const reservation = data?.[0];

  if (error || !reservation) {
    const message = error?.message ?? "Nepodarilo sa pripraviť platbu.";
    if (message.includes("membership_already_active")) {
      throw new MembershipPaymentAttemptError("membership_already_active", message);
    }
    throw new MembershipPaymentAttemptError("reservation_failed", message);
  }

  return reservation;
}

export async function bindPaymentIntentToMembershipAttempt(
  attemptId: string,
  paymentIntentId: string,
) {
  const { data, error } = await createAdminClient()
    .from("membership_payment_attempts")
    .update({ stripe_payment_intent_id: paymentIntentId, updated_at: new Date().toISOString() })
    .eq("id", attemptId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) throw new Error(`membership_attempt_bind_failed: ${error.message}`);
  if (!data) throw new Error("membership_attempt_no_longer_pending");
}

export async function markMembershipPaymentAttempt(
  attemptId: string,
  status: "failed" | "cancelled",
  failureReason: string,
) {
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("membership_payment_attempts")
    .update({
      status,
      failure_reason: failureReason,
      cancelled_at: status === "cancelled" ? now : null,
      updated_at: now,
    })
    .eq("id", attemptId)
    .eq("status", "pending");
  if (error) throw new Error(`membership_attempt_${status}_failed: ${error.message}`);
}

export async function findMembershipPaymentAttemptByPaymentIntent(
  paymentIntentId: string,
  metadataAttemptId?: string | null,
) {
  const admin = createAdminClient();
  const columns = "id, user_id, membership_id, membership_name, billing_cycle, entry_count, duration_days, amount, currency, stripe_payment_intent_id, stripe_pi_cancelled_at, stripe_refund_id, status, failure_reason, expires_at, created_at, updated_at";
  const { data: byIntent } = await admin
    .from("membership_payment_attempts")
    .select(columns)
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle<MembershipPaymentAttempt>();
  if (byIntent || !metadataAttemptId) return byIntent;

  const { data: byMetadata } = await admin
    .from("membership_payment_attempts")
    .select(columns)
    .eq("id", metadataAttemptId)
    .maybeSingle<MembershipPaymentAttempt>();
  return byMetadata;
}

export async function completeMembershipPaymentAttempt(attemptId: string) {
  const admin = createAdminClient();
  const { data, error } = await (admin as unknown as MembershipAttemptRpc).rpc(
    "complete_membership_payment_attempt",
    { p_attempt_id: attemptId },
  );
  const completion = data?.[0];
  if (error || !completion) {
    throw new Error(error?.message ?? "membership_attempt_completion_failed");
  }
  return completion;
}

async function markStripeIntentCancelled(attemptId: string) {
  const now = new Date().toISOString();
  const { error } = await createAdminClient()
    .from("membership_payment_attempts")
    .update({ stripe_pi_cancelled_at: now, updated_at: now })
    .eq("id", attemptId)
    .eq("status", "cancelled");
  if (error) throw new Error(`membership_attempt_cancel_marker_failed: ${error.message}`);
}

/**
 * Expires old DB attempts and keeps cancelled intents in a retry queue until
 * Stripe confirms they can no longer be paid. Safe for overlapping cron calls.
 */
export async function expireStaleMembershipPaymentAttempts(options?: {
  userId?: string;
  limit?: number;
}) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const limit = options?.limit ?? 100;
  let expiredQuery = admin
    .from("membership_payment_attempts")
    .select("id")
    .eq("status", "pending")
    .lt("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(limit);
  if (options?.userId) expiredQuery = expiredQuery.eq("user_id", options.userId);

  const { data: candidates, error: loadError } = await expiredQuery;
  if (loadError) throw new Error(`membership_attempt_expiry_load_failed: ${loadError.message}`);

  let expired = 0;
  for (const candidate of (candidates ?? []) as Array<{ id: string }>) {
    const { data: cancelled, error } = await admin
      .from("membership_payment_attempts")
      .update({
        status: "cancelled",
        failure_reason: "checkout_expired",
        cancelled_at: now,
        updated_at: now,
      })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .lt("expires_at", now)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (error) {
      console.error("Failed to expire membership payment attempt", error);
      continue;
    }
    if (cancelled) expired += 1;
  }

  let retryQuery = admin
    .from("membership_payment_attempts")
    .select("id, stripe_payment_intent_id")
    .eq("status", "cancelled")
    .not("stripe_payment_intent_id", "is", null)
    .is("stripe_pi_cancelled_at", null)
    .order("updated_at", { ascending: true })
    .limit(limit);
  if (options?.userId) retryQuery = retryQuery.eq("user_id", options.userId);

  const { data: intentsToCancel, error: retryLoadError } = await retryQuery;
  if (retryLoadError) {
    throw new Error(`membership_attempt_cancel_retry_load_failed: ${retryLoadError.message}`);
  }

  const stripe = getStripeServerClient();
  let stripeCancelled = 0;
  for (const attempt of (intentsToCancel ?? []) as Array<{ id: string; stripe_payment_intent_id: string }>) {
    try {
      await stripe.paymentIntents.cancel(attempt.stripe_payment_intent_id, {
        cancellation_reason: "abandoned",
      });
      await markStripeIntentCancelled(attempt.id);
      stripeCancelled += 1;
    } catch (error) {
      // It may have completed or been cancelled immediately before this call.
      // Both states are no longer payable, and a late success is refunded by
      // the webhook because this attempt is already cancelled in DB.
      try {
        const latestIntent = await stripe.paymentIntents.retrieve(attempt.stripe_payment_intent_id);
        if (["canceled", "succeeded", "processing"].includes(latestIntent.status)) {
          await markStripeIntentCancelled(attempt.id);
          continue;
        }
      } catch (retrieveError) {
        console.error("Failed to inspect membership PaymentIntent after cancellation error", {
          attemptId: attempt.id,
          paymentIntentId: attempt.stripe_payment_intent_id,
          error: retrieveError,
        });
      }
      console.error("Failed to cancel expired membership PaymentIntent", {
        attemptId: attempt.id,
        paymentIntentId: attempt.stripe_payment_intent_id,
        error,
      });
    }
  }
  return { expired, stripeCancelled };
}
