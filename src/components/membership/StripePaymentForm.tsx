"use client";

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

const CREATE_INTENT_TIMEOUT_MS = 15000;

type CreateIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
};

type StripePaymentFormProps = {
  planName: string;
  publishableKey: string;
};

function PaymentInnerForm({ disabled }: { disabled: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpressSubmitting, setIsExpressSubmitting] = useState(false);
  const [hasExpressCheckout, setHasExpressCheckout] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);

  async function confirmPayment() {
    if (!stripe || !elements) {
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

    if (result.paymentIntent?.status === "succeeded" || result.paymentIntent?.status === "processing") {
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
        <p>Po potvrdení sa členstvo automaticky aktivuje. Môže to trvať pár sekúnd.</p>
        <a
          href="/membership"
          className="inline-flex rounded-full bg-emerald-500 px-4 py-2 font-semibold text-black transition hover:bg-emerald-400"
        >
          Prejsť na členstvá
        </a>
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
          disabled={disabled || isSubmitting || isExpressSubmitting || !stripe || !elements}
          className="w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting || isExpressSubmitting ? "Spracovávam platbu..." : "Zaplatiť a aktivovať členstvo"}
        </button>
      </form>
    </div>
  );
}

export default function StripePaymentForm({ planName, publishableKey }: StripePaymentFormProps) {
  const [isLoadingIntent, setIsLoadingIntent] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [resolvedPublishableKey, setResolvedPublishableKey] = useState(
    publishableKey.trim()
  );

  const stripePromise = useMemo(() => {
    if (!resolvedPublishableKey) {
      return null;
    }

    return loadStripe(resolvedPublishableKey);
  }, [resolvedPublishableKey]);

  useEffect(() => {
    if (resolvedPublishableKey) {
      return;
    }

    let isMounted = true;

    async function loadPublishableKey() {
      try {
        const response = await fetch("/api/stripe/publishable-key", {
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          publishableKey?: string;
          error?: string;
        };

        if (!response.ok || typeof payload.publishableKey !== "string") {
          throw new Error(payload.error ?? "missing_publishable_key");
        }

        if (isMounted) {
          setResolvedPublishableKey(payload.publishableKey.trim());
        }
      } catch {
        if (isMounted) {
          setErrorText("Chýba Stripe publishable key v prostredí.");
          setIsLoadingIntent(false);
        }
      }
    }

    loadPublishableKey();

    return () => {
      isMounted = false;
    };
  }, [resolvedPublishableKey]);

  useEffect(() => {
    if (!resolvedPublishableKey) {
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CREATE_INTENT_TIMEOUT_MS);

    async function createPaymentIntent() {
      setIsLoadingIntent(true);
      setErrorText(null);

      try {
        const response = await fetch("/api/membership/create-payment-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ planName }),
          signal: controller.signal,
        });

        const payload = (await response.json()) as Partial<CreateIntentResponse> & {
          error?: string;
        };

        if (!response.ok || typeof payload.clientSecret !== "string") {
          throw new Error(payload.error ?? "Nepodarilo sa pripraviť platbu.");
        }

        if (isMounted) {
          setClientSecret(payload.clientSecret);
        }
      } catch (error) {
        if (isMounted) {
          if (error instanceof DOMException && error.name === "AbortError") {
            setErrorText("Platobná brána neodpovedala včas. Skús obnoviť stránku.");
            return;
          }

          setErrorText(
            error instanceof Error ? error.message : "Nepodarilo sa pripraviť platbu."
          );
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setIsLoadingIntent(false);
        }
      }
    }

    createPaymentIntent();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [planName, resolvedPublishableKey]);

  if (!resolvedPublishableKey || !stripePromise) {
    return <p className="text-sm text-red-300">Chýba Stripe publishable key v prostredí.</p>;
  }

  if (isLoadingIntent) {
    return <p className="text-sm text-white/70">Pripravujem bezpečnú platbu cez Stripe...</p>;
  }

  if (errorText || !clientSecret) {
    return <p className="text-sm text-red-300">{errorText ?? "Nepodarilo sa pripraviť platbu."}</p>;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentInnerForm disabled={isLoadingIntent} />
    </Elements>
  );
}
