import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";
import type { Membership } from "@/lib/types";

type DbMembership = Pick<
  Membership,
  "id" | "name" | "billing_cycle" | "entry_count" | "duration_days" | "price"
>;

const TX_INSERT_TIMEOUT_MS = 2500;

type PendingTransactionRow = {
  id: string;
  membership_id: string | null;
  amount: number;
  metadata: Record<string, unknown> | null;
};

type UpdatableTransactionsQuery = {
  update(values: Record<string, unknown>): UpdatableTransactionsQuery;
  eq(column: string, value: string): Promise<{ error: unknown }>;
};

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isReusablePaymentIntentStatus(status: string) {
  return (
    status === "requires_payment_method" ||
    status === "requires_confirmation" ||
    status === "requires_action"
  );
}

function isCancelablePaymentIntentStatus(status: string) {
  return (
    status === "requires_payment_method" ||
    status === "requires_confirmation" ||
    status === "requires_action" ||
    status === "requires_capture" ||
    status === "processing"
  );
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let planName = "";

  try {
    const body = await request.json();
    if (typeof body?.planName === "string") {
      planName = body.planName;
    }
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!planName) {
    return NextResponse.json({ error: "missing_plan" }, { status: 400 });
  }

  const { data: membershipRow, error: membershipError } = await supabase
    .from("memberships")
    .select("id, name, billing_cycle, entry_count, duration_days, price")
    .eq("name", planName)
    .maybeSingle<DbMembership>();

  if (membershipError || !membershipRow) {
    return NextResponse.json({ error: "unknown_plan" }, { status: 400 });
  }

  const { data: activeMembership } = await supabase
    .from("user_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (activeMembership) {
    return NextResponse.json({ error: "membership_already_active" }, { status: 409 });
  }

  const amountInEuros = Number(membershipRow.price);
  const amountInCents = Math.round(amountInEuros * 100);

  if (!Number.isFinite(amountInEuros) || amountInCents <= 0) {
    return NextResponse.json({ error: "invalid_price" }, { status: 500 });
  }

  try {
    const stripe = getStripeServerClient();
    const admin = createAdminClient();

    const { data: pendingTransactions } = await admin
      .from("transactions")
      .select("id, membership_id, amount, metadata")
      .eq("user_id", user.id)
      .eq("type", "purchase")
      .eq("status", "pending")
      .not("membership_id", "is", null)
      .order("created_at", { ascending: false });

    for (const transaction of (pendingTransactions ?? []) as PendingTransactionRow[]) {
      const paymentIntentId = asString(transaction.metadata?.stripe_payment_intent_id);
      const sameMembership = transaction.membership_id === membershipRow.id;
      const sameAmount = Math.round(Number(transaction.amount) * 100) === amountInCents;

      if (sameMembership && sameAmount && paymentIntentId) {
        try {
          const existingIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

          if (existingIntent.client_secret && isReusablePaymentIntentStatus(existingIntent.status)) {
            return NextResponse.json({
              clientSecret: existingIntent.client_secret,
              paymentIntentId: existingIntent.id,
              amount: amountInEuros,
              currency: "EUR",
              reused: true,
            });
          }
        } catch {
          // If Stripe no longer knows this intent, mark the local pending transaction as failed below.
        }
      }

      if (paymentIntentId) {
        try {
          const staleIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (isCancelablePaymentIntentStatus(staleIntent.status)) {
            await stripe.paymentIntents.cancel(paymentIntentId, {
              cancellation_reason: "abandoned",
            });
          }
        } catch {
          // Best effort cleanup only. The local transaction is still closed as failed.
        }
      }

      await (admin.from("transactions") as unknown as UpdatableTransactionsQuery)
        .update({
          status: "failed",
          metadata: {
            ...(transaction.metadata ?? {}),
            failed_reason:
              sameMembership && !sameAmount
                ? "membership_price_changed"
                : "replaced_by_new_membership_payment",
            replaced_at: new Date().toISOString(),
          },
        })
        .eq("id", transaction.id);
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        metadata: {
          user_id: user.id,
          membership_id: membershipRow.id,
          plan_name: membershipRow.name,
          billing_cycle: membershipRow.billing_cycle,
        },
      },
      {
        idempotencyKey: `${user.id}:${membershipRow.id}:${Date.now()}`,
      }
    );

    const insertPromise = admin.from("transactions").insert({
      user_id: user.id,
      membership_id: membershipRow.id,
      amount: amountInEuros,
      currency: "EUR",
      type: "purchase",
      status: "pending",
      metadata: {
        plan_name: membershipRow.name,
        billing_cycle: membershipRow.billing_cycle,
        stripe_payment_intent_id: paymentIntent.id,
      },
    });

    const insertResult = await Promise.race([
      insertPromise,
      new Promise<{ error: { message: string } }>((resolve) => {
        setTimeout(() => {
          resolve({ error: { message: "transaction_insert_timeout" } });
        }, TX_INSERT_TIMEOUT_MS);
      }),
    ]);

    if (insertResult?.error) {
      console.warn(
        "[create-payment-intent] pending transaction insert skipped",
        insertResult.error.message
      );
    }

    if (!paymentIntent.client_secret) {
      return NextResponse.json({ error: "missing_client_secret" }, { status: 500 });
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInEuros,
      currency: "EUR",
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "unknown_error";
    console.error("[create-payment-intent] failed", details);

    return NextResponse.json(
      {
        error: "stripe_create_failed",
        details: process.env.NODE_ENV === "development" ? details : undefined,
      },
      { status: 500 }
    );
  }
}
