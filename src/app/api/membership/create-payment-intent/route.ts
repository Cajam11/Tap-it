import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe/server";
import type { Membership } from "@/lib/types";

type DbMembership = Pick<
  Membership,
  "id" | "name" | "billing_cycle" | "entry_count" | "duration_days" | "price"
>;

const TX_INSERT_TIMEOUT_MS = 2500;

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

    const insertPromise = supabase.from("transactions").insert({
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
