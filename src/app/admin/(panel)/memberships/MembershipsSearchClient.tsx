'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { searchMemberships } from './search.server';
import { AdminMembershipChangeModal } from "@/components/admin/AdminMembershipChangeModal";
import { Search, X } from 'lucide-react';

type AdminProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

type AdminMembershipRow = {
  user_id: string;
  start_date: string;
  end_date: string | null;
  status: string | null;
  membership: { name: string } | { name: string }[] | null;
};

type MembershipRecord = {
  name: string;
} | null;

type MembershipRowType = {
  status: string | null;
  end_date: string | null;
};

function formatDate(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleDateString("sk-SK", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateIso;
  }
}

function getMembershipRecord(
  membership: { name: string } | { name: string }[] | null,
): MembershipRecord {
  if (Array.isArray(membership)) {
    return membership[0] ?? null;
  }
  return membership;
}

function getMembershipPlanKey(membershipRecord: MembershipRecord) {
  if (membershipRecord?.name === "Mesačná") {
    return "monthly";
  }
  if (membershipRecord?.name === "Ročná") {
    return "yearly";
  }
  return "none";
}

function isExpiredMembership(row: MembershipRowType | undefined) {
  if (!row || row.status !== "active") {
    return true;
  }
  if (!row.end_date) {
    return false;
  }
  return new Date(row.end_date).getTime() <= Date.now();
}

export function MembershipsSearchClient() {
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);
  const [memberships, setMemberships] = useState<AdminMembershipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const [flashMessage, setFlashMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchMemberships({ q, plan });
      if (result.error) {
        setError(result.error);
        setProfiles([]);
        setMemberships([]);
      } else {
        setProfiles(result.profiles);
        setMemberships(result.memberships);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setProfiles([]);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [q, plan]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMemberships();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadMemberships]);

  const membershipsByUserId = new Map<string, AdminMembershipRow>();
  for (const membership of memberships) {
    membershipsByUserId.set(membership.user_id, membership);
  }

  const visibleActiveMemberships = profiles.filter((profile) => {
    const membership = membershipsByUserId.get(profile.id);
    return Boolean(membership && !isExpiredMembership(membership));
  }).length;

  const handleOpenModal = (
    userId: string,
    userName: string,
    membershipPlan: string
  ) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName || "Neznámy užívateľ");
    setCurrentPlan(membershipPlan);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUserId(null);
    setSelectedUserName("");
    setCurrentPlan("");
    if (flashMessage) {
      setTimeout(() => setFlashMessage(null), 3000);
    }
  };

  const handleSuccess = (message: string) => {
    setFlashMessage({ type: "success", message });
    setTimeout(() => {
      setFlashMessage(null);
      loadMemberships(); // Reload after change
    }, 3000);
  };

  const handleError = (message: string) => {
    setFlashMessage({ type: "error", message });
  };

  const handleReset = () => {
    setQ('');
    setPlan('all');
  };

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">Memberships</h2>
        <p className="mt-1 text-white/70">
          Prehlad clenstiev napojenych na profily. Ak je clenstvo uz expirovane,
          zobrazime none.
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label
            htmlFor="q"
            className="mb-1.5 block text-xs uppercase tracking-wide text-white/60"
          >
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              id="q"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Meno alebo e-mail"
              className="w-full rounded-lg border border-white/15 bg-black/40 pl-10 pr-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none transition-colors"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="plan"
            className="mb-1.5 block text-xs uppercase tracking-wide text-white/60"
          >
            Membership plan
          </label>
          <select
            id="plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="admin-role-select w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
          >
            <option value="all">Vsetky</option>
            <option value="monthly">Mesačná</option>
            <option value="yearly">Ročná</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-2">
          <button
            type="button"
            onClick={loadMemberships}
            disabled={loading}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-white transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          Error: {error}
        </div>
      )}

      {flashMessage && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            flashMessage.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-300"
          }`}
        >
          {flashMessage.message}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm text-white/60">
          Aktivne clenstva:{" "}
          <span className="font-semibold text-white">
            {visibleActiveMemberships}
          </span>
          {loading && <span className="ml-2 text-white/40">Loading...</span>}
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-white/70">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Membership plan</th>
              <th className="px-4 py-3 font-medium">start_date</th>
              <th className="px-4 py-3 font-medium">end_date</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && profiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  Loading memberships...
                </td>
              </tr>
            ) : profiles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-white/50">
                  Zatial tu nie su ziadne profily.
                </td>
              </tr>
            ) : (
              profiles.map((profile) => {
                const membership = membershipsByUserId.get(profile.id);
                const hasCurrentMembership =
                  membership && !isExpiredMembership(membership);
                const membershipRecord = hasCurrentMembership
                  ? getMembershipRecord(membership?.membership)
                  : null;
                const currentMembershipPlan =
                  getMembershipPlanKey(membershipRecord);

                return (
                  <tr
                    key={profile.id}
                    className="border-b border-white/10 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-white">
                      <Link href={`/admin/users/${profile.id}`} className="hover:underline hover:text-white/80 transition-colors">
                        {profile.full_name ?? "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      <Link href={`/admin/users/${profile.id}`} className="hover:underline hover:text-white/60 transition-colors">
                        {profile.email ?? "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {membershipRecord?.name ?? "none"}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {hasCurrentMembership
                        ? formatDate(membership!.start_date)
                        : "none"}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {hasCurrentMembership && membership!.end_date
                        ? formatDate(membership!.end_date)
                        : "none"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          handleOpenModal(
                            profile.id,
                            profile.full_name || "",
                            currentMembershipPlan
                          )
                        }
                        className="rounded-lg border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
                      >
                        Change
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedUserId && (
        <AdminMembershipChangeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          userId={selectedUserId}
          userName={selectedUserName}
          currentPlan={currentPlan}
          onSuccess={handleSuccess}
          onError={handleError}
        />
      )}
    </section>
  );
}
