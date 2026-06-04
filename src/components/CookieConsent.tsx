"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "tapit-cookie-consent";

export default function CookieConsent() {
  const [ready, setReady] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let accepted: string | null = null;
    try {
      accepted = localStorage.getItem(STORAGE_KEY);
    } catch {
      // Storage may be unavailable (e.g. private mode) — treat as not accepted.
    }
    // Wait for the intro splash animation to finish before anything appears.
    const timer = setTimeout(() => {
      setReady(true);
      if (!accepted) setShowBanner(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Ignore — banner will reappear next visit if we couldn't persist.
    }
    setShowBanner(false);
  };

  return (
    <>
      {/* Reopen button — bottom right */}
      <AnimatePresence>
        {ready && !showBanner && (
          <motion.button
            type="button"
            onClick={() => setShowBanner(true)}
            aria-label="Nastavenia cookies"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-black/40 text-white/60 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl transition-colors hover:text-white"
          >
            <Cookie className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Banner — bottom centered */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-end px-5">
        <AnimatePresence>
          {showBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 24 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="pointer-events-auto w-full max-w-md rounded-2xl border border-white/[0.08] bg-black/40 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
            >
              <div className="mb-4 flex items-center gap-2.5">
              <Cookie className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">
                Vážime si vaše súkromie
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Používame iba funkčné cookies, ktoré sú nevyhnutné pre správne
              fungovanie stránky. Nepoužívame ich na reklamu ani sledovanie.
              Viac v{" "}
              <Link
                href="/cookies"
                className="text-foreground underline underline-offset-2 hover:text-primary"
              >
                Zásadách používania cookies
              </Link>
              .
            </p>
            <button
              type="button"
              onClick={accept}
              className="btn-wipe-fill mt-6 w-full rounded-xl bg-red-600 py-3 text-sm font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Rozumiem
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
