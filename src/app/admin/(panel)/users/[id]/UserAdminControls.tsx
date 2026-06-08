"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  updateUserRoleWithFeedback,
  updateUserVerifiedWithFeedback,
} from "../actions";

const ALLOWED_ROLES = [
  "user",
  "recepcny",
  "manager",
  "owner",
  "trainer",
] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

const ROLE_LABELS: Record<AllowedRole, string> = {
  user: "User",
  recepcny: "Recepcny",
  manager: "Manager",
  owner: "Owner",
  trainer: "Trainer",
};

interface UserAdminControlsProps {
  userId: string;
  currentRole: AllowedRole;
  isVerified: boolean;
}

export function UserAdminControls({
  userId,
  currentRole,
  isVerified,
}: UserAdminControlsProps) {
  const router = useRouter();
  const [role, setRole] = useState<AllowedRole>(currentRole);
  const [savingRole, setSavingRole] = useState(false);
  const [savingVerified, setSavingVerified] = useState(false);
  const [flash, setFlash] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  const handleRoleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingRole(true);
    try {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("role", role);
      const result = await updateUserRoleWithFeedback(formData);
      if (result.error) {
        setFlash({ type: "error", message: result.error });
        return;
      }
      setFlash({
        type: "success",
        message: result.message || "Rola bola aktualizovana",
      });
      router.refresh();
    } catch (err) {
      setFlash({
        type: "error",
        message: err instanceof Error ? err.message : "Neznama chyba",
      });
    } finally {
      setSavingRole(false);
    }
  };

  const handleVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingVerified(true);
    try {
      const formData = new FormData();
      formData.set("userId", userId);
      formData.set("isVerified", isVerified ? "false" : "true");
      const result = await updateUserVerifiedWithFeedback(formData);
      if (result.error) {
        setFlash({ type: "error", message: result.error });
        return;
      }
      setFlash({
        type: "success",
        message: result.message || "Stav overenia aktualizovany",
      });
      router.refresh();
    } catch (err) {
      setFlash({
        type: "error",
        message: err instanceof Error ? err.message : "Neznama chyba",
      });
    } finally {
      setSavingVerified(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <form onSubmit={handleRoleSubmit} className="flex-1">
        <label
          htmlFor="admin-role"
          className="mb-1.5 block text-xs uppercase tracking-wide text-white/60"
        >
          Rola
        </label>
        <div className="flex gap-2">
          <select
            id="admin-role"
            value={role}
            onChange={(e) => setRole(e.target.value as AllowedRole)}
            disabled={savingRole}
            className="admin-role-select w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition-colors disabled:opacity-50"
          >
            {ALLOWED_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={savingRole}
            className="shrink-0 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingRole ? "Ukladam..." : "Ulozit"}
          </button>
        </div>
      </form>

      <form onSubmit={handleVerifySubmit} className="shrink-0">
        <button
          type="submit"
          disabled={savingVerified}
          className="w-full rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors sm:w-auto"
        >
          {savingVerified
            ? "Ukladam..."
            : isVerified
              ? "Odobrat overenie"
              : "Overit"}
        </button>
      </form>

      {flash && (
        <p
          className={`text-sm sm:order-last sm:basis-full ${
            flash.type === "success" ? "text-emerald-300" : "text-red-300"
          }`}
        >
          {flash.message}
        </p>
      )}
    </div>
  );
}
