"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeExpressCheckoutElementConfirmEvent } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";

type StripePaymentFormProps = {
  clientSecret: string;
  publishableKey: string;
  expiresAt?: string | null;
};

function PaymentInnerForm({ expiresAt }: { expiresAt?: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpressSubmitting, setIsExpressSubmitting] = useState(false);
  const [hasExpressCheckout, setHasExpressCheckout] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [isExpired, setIsExpired] = useState(() =>
    Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now()),
  );

  useEffect(() => {
    if (!expiresAt) return;

    const millisecondsUntilExpiry = new Date(expiresAt).getTime() - Date.now();
    if (millisecondsUntilExpiry <= 0) {
      setIsExpired(true);
      return;
    }

    const timeout = window.setTimeout(() => setIsExpired(true), millisecondsUntilExpiry);
    return () => window.clearTimeout(timeout);
  }, [expiresAt]);

  async function confirmPayment() {
    if (!stripe || !elements || isExpired) {
      return;
    }

    setErrorText(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (result.error) {
      const message = result.error.message ?? "Platbu sa nepodarilo dokončiť.";
      setErrorText(message);
      return message;
    }

    if (
      result.paymentIntent?.status === "succeeded" ||
      result.paymentIntent?.status === "processing"
    ) {
      setIsProcessingComplete(true);
      return null;
    }

    const message = "Platba zatiaľ nebola potvrdená. Skús to znova o chvíľu.";
    setErrorText(message);
    return message;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    await confirmPayment();
    setIsSubmitting(false);
  }

  async function onExpressConfirm(event: StripeExpressCheckoutElementConfirmEvent) {
    setIsExpressSubmitting(true);
    const errorMessage = await confirmPayment();
    setIsExpressSubmitting(false);

    if (errorMessage) {
      event.paymentFailed({ message: errorMessage });
    }
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

  if (isExpired) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
        Čas na dokončenie platby vypršal. Vyber si termín a vytvor nový checkout.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ExpressCheckoutElement
        onConfirm={onExpressConfirm}
        onReady={(event) => {
          setHasExpressCheckout(Boolean(event.availablePaymentMethods));
        }}
        options={{
          buttonHeight: 48,
          buttonTheme: { googlePay: "black", applePay: "black" },
          buttonType: { googlePay: "pay", applePay: "plain" },
          layout: { maxColumns: 1, maxRows: 2 },
          paymentMethods: { googlePay: "auto", applePay: "auto", link: "auto" },
        }}
      />

      {hasExpressCheckout ? (
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/35">
          <span className="h-px flex-1 bg-white/10" />
          <span>Alebo kartou</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never", link: "never" },
          }}
        />

        {errorText ? <p className="text-sm text-red-300">{errorText}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting || isExpressSubmitting || !stripe || !elements}
          className="w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting || isExpressSubmitting ? "Spracovávam platbu..." : "Zaplatiť rezerváciu"}
        </button>
      </form>
    </div>
  );
}

export default function StripePaymentForm({
  clientSecret,
  publishableKey,
  expiresAt,
}: StripePaymentFormProps) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  if (!stripePromise) {
    return (
      <p className="text-sm text-red-300">Chýba Stripe publishable key v prostredí.</p>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentInnerForm expiresAt={expiresAt} />
    </Elements>
  );
}
