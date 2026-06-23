"use client";

import { useFormStatus } from "react-dom";

export default function MembershipCancelSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-live="polite"
      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/50 bg-red-500/20 px-6 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-500 hover:bg-red-500/30 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Ruším členstvo..." : "Zrušiť členstvo"}
    </button>
  );
}
