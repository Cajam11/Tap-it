import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";

type ActiveMembershipForRefund = {
  id: string;
  user_id: string;
  membership_id: string;
  start_date: string;
  activated_by_admin: boolean;
  stripe_payment_intent_id: string | null;
  stripe_refund_id: string | null;
};

type PurchaseTransaction = {
  metadata: Record<string, unknown> | null;
};

type FinalizeRefundRpc = {
  rpc(
    name: "finalize_membership_refund",
    args: {
      p_user_membership_id: string;
      p_user_id: string;
      p_payment_intent_id: string;
      p_refund_id: string;
      p_amount: number;
      p_currency: string;
      p_refund_status: string;
    },
  ): Promise<{
    data: Array<{ transaction_status: string }> | null;
    error: { message?: string } | null;
  }>;
};

export class MembershipRefundError extends Error {
  constructor(
    public readonly code:
      | "no_active_membership"
      | "refund_not_available"
      | "payment_not_refundable"
      | "payment_source_mismatch"
      | "refund_finalization_failed",
    message: string,
  ) {
    super(message);
  }
}

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function findLegacyPaymentIntentId(membership: ActiveMembershipForRefund) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("transactions")
    .select("metadata")
    .eq("user_id", membership.user_id)
    .eq("membership_id", membership.membership_id)
    .eq("type", "purchase")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(10);

  for (const transaction of (data ?? []) as PurchaseTransaction[]) {
    const paymentIntentId = asString(transaction.metadata?.stripe_payment_intent_id);
    if (paymentIntentId) return paymentIntentId;
  }

  return null;
}

/**
 * Refunds the exact charge that activated the current membership, then commits
 * the membership cancellation and refund ledger entry in one DB transaction.
 */
export async function cancelMembershipAndRefund(userId: string) {
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("user_memberships")
    .select(
      "id, user_id, membership_id, start_date, activated_by_admin, stripe_payment_intent_id, stripe_refund_id",
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveMembershipForRefund>();

  if (!membership) {
    throw new MembershipRefundError("no_active_membership", "Aktívne členstvo nebolo nájdené.");
  }

  const paymentIntentId =
    membership.stripe_payment_intent_id ??
    (membership.activated_by_admin ? null : await findLegacyPaymentIntentId(membership));

  if (!paymentIntentId) {
    throw new MembershipRefundError(
      "refund_not_available",
      membership.activated_by_admin
        ? "Toto členstvo bolo vytvorené administrátorom a nemá online platbu na automatický refund."
        : "K tomuto členstvu sa nepodarilo nájsť pôvodnú Stripe platbu.",
    );
  }

  const stripe = getStripeServerClient();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const paymentUserId = asString(paymentIntent.metadata.user_id);
  const paymentMembershipId = asString(paymentIntent.metadata.membership_id);

  if (paymentUserId !== userId || paymentMembershipId !== membership.membership_id) {
    throw new MembershipRefundError(
      "payment_source_mismatch",
      "Pôvodná platba nepatrí k tomuto členstvu.",
    );
  }

  if (paymentIntent.status !== "succeeded" || paymentIntent.amount_received <= 0) {
    throw new MembershipRefundError(
      "payment_not_refundable",
      "Pôvodná platba ešte nie je dostupná na refund.",
    );
  }

  // Stable idempotency makes a retry safe if Stripe succeeds but the browser or
  // database response is interrupted before the membership row is updated.
  const refund = await stripe.refunds.create(
    {
      payment_intent: paymentIntent.id,
      reason: "requested_by_customer",
      metadata: {
        tap_it_user_membership_id: membership.id,
        tap_it_user_id: userId,
        tap_it_reason: "membership_cancelled_by_customer",
      },
    },
    { idempotencyKey: `membership-cancellation-refund:${membership.id}` },
  );

  const { data: finalized, error: finalizeError } = await (
    admin as unknown as FinalizeRefundRpc
  ).rpc("finalize_membership_refund", {
    p_user_membership_id: membership.id,
    p_user_id: userId,
    p_payment_intent_id: paymentIntent.id,
    p_refund_id: refund.id,
    p_amount: refund.amount / 100,
    p_currency: refund.currency,
    p_refund_status: refund.status ?? "pending",
  });

  if (finalizeError || !finalized?.[0]) {
    throw new MembershipRefundError(
      "refund_finalization_failed",
      finalizeError?.message ?? "Refund bol vytvorený, ale nepodarilo sa dokončiť zrušenie členstva.",
    );
  }

  return {
    membershipId: membership.id,
    paymentIntentId: paymentIntent.id,
    refundId: refund.id,
    refundStatus: refund.status ?? "pending",
    transactionStatus: finalized[0].transaction_status,
  };
}
