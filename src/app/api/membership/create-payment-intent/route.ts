import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe/server";
import {
  bindPaymentIntentToMembershipAttempt,
  expireStaleMembershipPaymentAttempts,
  markMembershipPaymentAttempt,
  MembershipPaymentAttemptError,
  reserveMembershipPaymentAttempt,
} from "@/lib/membership-payments";

type DbMembership = { id: string; name: string };

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

async function getRequestUser(request: NextRequest) {
  const bearerToken = getBearerToken(request);

  if (bearerToken) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);
    return { supabase, user };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function isReusablePaymentIntentStatus(status: string) {
  return (
    status === "requires_payment_method" ||
    status === "requires_confirmation" ||
    status === "requires_action"
  );
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let planName = "";
  try {
    const body = await request.json();
    if (typeof body?.planName === "string") planName = body.planName;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!planName) {
    return NextResponse.json({ error: "missing_plan" }, { status: 400 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id, name")
    .eq("name", planName)
    .eq("is_active", true)
    .maybeSingle<DbMembership>();

  if (membershipError || !membership) {
    return NextResponse.json({ error: "unknown_plan" }, { status: 400 });
  }

  try {
    // The SQL function locks per user, snapshots the current plan and either
    // returns the same open attempt or atomically creates a new 30-minute one.
    let attempt = await reserveMembershipPaymentAttempt(user.id, membership.id);

    // A plan switch marks the old attempt cancelled in the same SQL transaction.
    // Cancel it now when possible; the periodic cron remains the reliable retry.
    await expireStaleMembershipPaymentAttempts({ userId: user.id, limit: 20 });

    const stripe = getStripeServerClient();
    if (attempt.payment_intent_id) {
      const existingIntent = await stripe.paymentIntents.retrieve(attempt.payment_intent_id);

      if (existingIntent.client_secret && isReusablePaymentIntentStatus(existingIntent.status)) {
        return NextResponse.json({
          clientSecret: existingIntent.client_secret,
          paymentIntentId: existingIntent.id,
          amount: Number(attempt.attempt_amount),
          currency: attempt.attempt_currency,
          expiresAt: attempt.attempt_expires_at,
          reused: true,
        });
      }

      if (existingIntent.status === "succeeded" || existingIntent.status === "processing") {
        return NextResponse.json(
          {
            error:
              "Platba sa už spracúva. Členstvo sa po potvrdení automaticky aktivuje.",
          },
          { status: 409 },
        );
      }

      // The old intent is terminal. Closing its local attempt releases the
      // unique pending-attempt guard before reserving a fresh checkout.
      await markMembershipPaymentAttempt(
        attempt.attempt_id,
        existingIntent.status === "canceled" ? "cancelled" : "failed",
        `stripe_intent_${existingIntent.status}`,
      );
      attempt = await reserveMembershipPaymentAttempt(user.id, membership.id);
    }

    const amountInCents = Math.round(Number(attempt.attempt_amount) * 100);
    if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
      throw new Error("invalid_membership_attempt_amount");
    }

    // This is deliberately stable per DB attempt. If the API response gets
    // lost after Stripe creates the intent, the next request receives this
    // exact same PaymentIntent instead of creating a second charge candidate.
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: attempt.attempt_currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          user_id: user.id,
          membership_id: membership.id,
          membership_payment_attempt_id: attempt.attempt_id,
          plan_name: attempt.attempt_membership_name,
          billing_cycle: attempt.attempt_billing_cycle,
          checkout_expires_at: attempt.attempt_expires_at,
        },
      },
      { idempotencyKey: `membership-payment-attempt:${attempt.attempt_id}` },
    );

    if (!paymentIntent.client_secret) {
      throw new Error("missing_client_secret");
    }

    await bindPaymentIntentToMembershipAttempt(attempt.attempt_id, paymentIntent.id);

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: Number(attempt.attempt_amount),
      currency: attempt.attempt_currency,
      expiresAt: attempt.attempt_expires_at,
    });
  } catch (error) {
    if (error instanceof MembershipPaymentAttemptError) {
      if (error.code === "membership_already_active") {
        return NextResponse.json({ error: "membership_already_active" }, { status: 409 });
      }
      console.error("[create-membership-payment-intent] reservation failed", error.message);
    } else {
      const details = error instanceof Error ? error.message : "unknown_error";
      console.error("[create-membership-payment-intent] failed", details);
    }

    return NextResponse.json(
      {
        error: "stripe_create_failed",
        details:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
