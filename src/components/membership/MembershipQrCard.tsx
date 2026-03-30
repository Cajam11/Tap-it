"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const TOKEN_TTL_MS = 15000;

type MembershipQrCardProps = {
  fullName: string;
  email: string | null;
  membershipName: string;
};

export default function MembershipQrCard({
  fullName,
  email,
  membershipName,
}: MembershipQrCardProps) {
  const [qrValue, setQrValue] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string>("");
  const [nowMs, setNowMs] = useState<number>(Date.now());

  useEffect(() => {
    let cancelled = false;

    const refreshToken = async () => {
      try {
        const response = await fetch("/api/membership/qr-token", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Nepodarilo sa vygenerovať QR token.");
        }

        const data = (await response.json()) as {
          token?: string;
          expiresAt?: string;
        };

        if (!cancelled && data.token) {
          setQrValue(data.token);
          setExpiresAt(typeof data.expiresAt === "string" ? data.expiresAt : null);
          setErrorText("");
        }
      } catch {
        if (!cancelled) {
          setErrorText("QR kód sa nepodarilo načítať. Obnov stránku.");
        }
      }
    };

    refreshToken();
    const interval = window.setInterval(refreshToken, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : null;
  const remainingMs = expiresAtMs ? Math.max(0, expiresAtMs - nowMs) : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressPercent = expiresAtMs ? Math.max(0, Math.min(100, (remainingMs / TOKEN_TTL_MS) * 100)) : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Tvoj vstupný QR kód</h2>
          <p className="mt-3 max-w-xl text-white/70">
            Máš aktívne členstvo <span className="font-semibold text-white">{membershipName}</span>. Tento QR
            kód ukáž na recepcii pri vstupe.
          </p>
          <p className="mt-2 text-sm text-white/50">{fullName}{email ? ` • ${email}` : ""}</p>
          <p className="mt-2 text-xs text-white/40">
            QR kód sa automaticky mení každých 15 sekúnd{expiresAt ? ` (platný do ${new Date(expiresAt).toLocaleTimeString()})` : ""}.
          </p>
          <div className="mt-3 w-full max-w-md">
            <div className="mb-1 flex items-center justify-between text-xs text-white/45">
              <span>Nový kód za</span>
              <span>{remainingSeconds}s</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-red-500 transition-[width] duration-200 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          {errorText ? <p className="mt-2 text-sm text-red-300">{errorText}</p> : null}
        </div>

        <div className="self-start rounded-2xl border border-white/15 bg-white p-4">
          <QRCodeSVG
            value={qrValue || "loading"}
            size={192}
            level="M"
            includeMargin
            bgColor="#FFFFFF"
            fgColor="#111111"
          />
        </div>
      </div>
    </section>
  );
}
