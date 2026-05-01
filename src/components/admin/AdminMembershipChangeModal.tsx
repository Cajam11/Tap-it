"use client";

import { useState } from "react";
import { adminChangeMembershipWithReason } from "@/app/admin/(panel)/memberships/actions";

interface AdminMembershipChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentPlan: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function AdminMembershipChangeModal({
  isOpen,
  onClose,
  userId,
  userName,
  currentPlan,
  onSuccess,
  onError,
}: AdminMembershipChangeModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string>(currentPlan);
  const [reason, setReason] = useState<string>("");

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("membershipPlan", selectedPlan);
      formData.append("reason", reason);

      const result = await adminChangeMembershipWithReason(formData);

      if (result.error) {
        setFormError(result.error);
        onError(result.error);
      } else if (result.success) {
        setReason("");
        setSelectedPlan(currentPlan);
        onSuccess(result.message || "Členstvo bolo úspešne zmenené");
        onClose();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Neznáma chyba";
      setFormError(message);
      onError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason("");
    setSelectedPlan(currentPlan);
    setFormError(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 transform rounded-2xl border border-white/10 bg-black/95 p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white">Zmena členstva</h2>
            <p className="mt-1 text-sm text-white/60">{userName}</p>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Plan Display */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/60">
                Súčasné členstvo
              </label>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                {currentPlan === "monthly"
                  ? "Mesačná"
                  : currentPlan === "yearly"
                    ? "Ročná"
                    : "Žiadne"}
              </div>
            </div>

            {/* New Plan Select */}
            <div>
              <label
                htmlFor="new-plan"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/60"
              >
                Nové členstvo
              </label>
              <select
                id="new-plan"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="monthly">Mesačná</option>
                <option value="yearly">Ročná</option>
                <option value="none">Bez členstva (zrušenie)</option>
              </select>
            </div>

            {/* Reason Textarea */}
            <div>
              <label
                htmlFor="reason"
                className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/60"
              >
                Dôvod zmeny <span className="text-red-400">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Napríklad: Upgrade na žiadost užívateľa, vrátenie, chyba..."
                className="min-h-24 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none resize-none"
                disabled={isSubmitting}
              />
              <p className="mt-1 text-xs text-white/50">
                {reason.length}/500 znakov
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-medium text-white/70 hover:text-white disabled:opacity-50"
              >
                Zrušiť
              </button>
              <button
                type="submit"
                disabled={isSubmitting || reason.length < 5 || reason.length > 500}
                className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Ukladám...
                  </span>
                ) : (
                  "Uložiť"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
