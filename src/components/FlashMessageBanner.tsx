"use client";

import { useEffect } from "react";
import type { FlashMessage } from "@/lib/flash";
import { FLASH_COOKIE_NAME } from "@/lib/flash";

type FlashMessageBannerProps = {
  message: FlashMessage;
};

export default function FlashMessageBanner({ message }: FlashMessageBannerProps) {
  useEffect(() => {
    document.cookie = `${FLASH_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  }, []);

  const isSuccess = message.kind === "success";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        isSuccess
          ? "border-green-500/30 bg-green-500/10 text-green-200"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
    >
      {message.text}
    </div>
  );
}
