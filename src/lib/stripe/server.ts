import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

function requireEnv(name: "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} env variable`);
  }

  return value;
}

export function getStripeServerClient() {
  if (!stripeInstance) {
    stripeInstance = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
      apiVersion: "2025-08-27.basil",
    });
  }

  return stripeInstance;
}

export function getStripeWebhookSecret() {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}
