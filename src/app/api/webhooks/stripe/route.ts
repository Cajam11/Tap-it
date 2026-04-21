import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient, getStripeWebhookSecret } from "@/lib/stripe/server";

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
  eq(column: string, value: string): UpdatableMembershipsQuery;
};

type InsertableMembershipsQuery = {
  insert(values: Record<string, unknown>): Promise<{ error: unknown }>;
};

type UpdatableTransactionsQuery = {
  update(values: Record<string, unknown>): UpdatableTransactionsQuery;
  eq(column: string, value: string): UpdatableTransactionsQuery;
};

type InsertableTransactionsQuery = {
  insert(values: Record<string, unknown>): Promise<{ error: unknown }>;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function finalizeMembershipFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
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
      .eq("user_id", userId)
      .eq("status", "active");

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

async function markPaymentAsFailed(paymentIntent: Stripe.PaymentIntent) {
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
      await finalizeMembershipFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
    }

    if (event.type === "payment_intent.payment_failed") {
      await markPaymentAsFailed(event.data.object as Stripe.PaymentIntent);
    }
  } catch {
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
