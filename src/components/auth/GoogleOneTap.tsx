"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";

type CredentialResponse = {
  credential?: string;
};

type GoogleOneTapContext = "signin" | "signup" | "use";

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: CredentialResponse) => void;
    nonce: string;
    context?: GoogleOneTapContext;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

type GoogleOneTapProps = {
  context?: GoogleOneTapContext;
  onError?: (message: string) => void;
};

async function generateNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...bytes));
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return { nonce, hashedNonce };
}

export function GoogleOneTap({ context = "signin", onError }: GoogleOneTapProps) {
  const router = useRouter();
  const initializedRef = useRef(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  async function initializeGoogleOneTap() {
    if (initializedRef.current || !googleClientId || !window.google?.accounts?.id) {
      return;
    }

    initializedRef.current = true;

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      return;
    }

    const { nonce, hashedNonce } = await generateNonce();

    window.google.accounts.id.initialize({
      client_id: googleClientId,
      context,
      nonce: hashedNonce,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: true,
      callback: async (response) => {
        if (!response.credential) {
          onError?.("Google prihlásenie nevrátilo prihlasovací token.");
          return;
        }

        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.credential,
          nonce,
        });

        if (error) {
          onError?.(error.message);
          return;
        }

        router.replace("/");
        router.refresh();
      },
    });

    window.google.accounts.id.prompt();
  }

  if (!googleClientId) {
    return null;
  }

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onReady={() => {
        void initializeGoogleOneTap();
      }}
    />
  );
}
