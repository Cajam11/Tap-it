"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

type StripePaymentFormProps = {
  clientSecret: string;
  publishableKey: string;
};

function PaymentInnerForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    setIsSubmitting(false);

    if (result.error) {
      setErrorText(result.error.message ?? "Platbu sa nepodarilo dokončiť.");
      return;
    }

    if (
      result.paymentIntent?.status === "succeeded" ||
      result.paymentIntent?.status === "processing"
    ) {
      setIsProcessingComplete(true);
      return;
    }

    setErrorText("Platba zatiaľ nebola potvrdená. Skús to znova o chvíľu.");
  }

  if (isProcessingComplete) {
    return (
      <div className="space-y-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
        <p className="font-semibold">Platba bola prijatá. Potvrdzujeme ju cez Stripe webhook.</p>
        <p>Rezervácia sa potvrdí do pár sekúnd.</p>
          <Link
            href="/bookings"
            className="inline-flex rounded-full bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400"
          >
            Prejsť na rezervácie
          </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {errorText ? <p className="text-sm text-red-300">{errorText}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting || !stripe || !elements}
        className="w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? "Spracovávam platbu..." : "Zaplatiť rezerváciu"}
      </button>
    </form>
  );
}

export default function StripePaymentForm({ clientSecret, publishableKey }: StripePaymentFormProps) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-300">Chýba Stripe publishable key v prostredí.</p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentInnerForm />
    </Elements>
  );
}
