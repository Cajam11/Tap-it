"use client";

import { Download } from "lucide-react";

export default function LegalPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white outline-none print:hidden"
      aria-label="Stiahnuť ako PDF"
      title="Stiahnuť ako PDF"
    >
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/75">
        <Download className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        Stiahnuť ako
        <br />
        PDF
      </span>
    </button>
  );
}
