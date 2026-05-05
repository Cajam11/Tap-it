import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServerAdminAccess } from "@/lib/admin-access";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Activity,
  Clock,
  ArrowRightLeft,
} from "lucide-react";
import { manualCheckOutUser } from "./actions";

export default async function AdminUserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: userId } = await params;

  const supabase = await createClient();
  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");

  if (!hasAccess) {
    redirect("/");
  }

  const admin = createAdminClient();

  // Fetch Profile
  const { data: rawProfile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  type Profile = {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    onboarding_completed: boolean | null;
    created_at: string;
  };

  const profile = rawProfile as Profile | null;

  if (!profile || profileError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-red-400 mb-4">User not found.</p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Naspäť na používateľov
        </Link>
      </div>
    );
  }

  // Fetch Membership
  const { data: activeMemberships } = await admin
    .from("user_memberships")
    .select("start_date, end_date, status, membership:memberships(name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  type MembershipRecord = { name: string } | null;
  type ActiveMembership = {
    start_date: string;
    end_date: string | null;
    status: string | null;
    membership: MembershipRecord | MembershipRecord[] | null;
  };

  const activeMembership =
    (activeMemberships as ActiveMembership[] | null)?.[0] || null;

  function isExpiredMembership(row: typeof activeMembership) {
    if (!row) return true;
    if (row.status !== "active") return true;
    if (!row.end_date) return false;
    return new Date(row.end_date).getTime() <= Date.now();
  }

  const hasCurrentMembership =
    activeMembership && !isExpiredMembership(activeMembership);

  function getMembershipRecord(
    membership: ActiveMembership["membership"] | undefined,
  ) {
    if (Array.isArray(membership)) return membership[0] ?? null;
    return membership;
  }
  const membershipRecord = getMembershipRecord(activeMembership?.membership);

  // Fetch Entries (limit to 20 for UI cleanliness)
  const { data: rawEntries } = await admin
    .from("entries")
    .select("*")
    .eq("user_id", userId)
    .order("check_in", { ascending: false })
    .limit(20);

  type Entry = {
    id: string;
    user_id: string;
    check_in: string;
    check_out: string | null;
    duration_min: number | null;
    is_valid: boolean;
  };

  const entries = rawEntries as Entry[] | null;

  // Fetch Transactions with membership details
  const { data: rawTransactions } = await admin
    .from("transactions")
    .select("*, memberships(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  type Transaction = {
    id: string;
    amount: number | null;
    currency: string | null;
    type: string | null;
    status: string | null;
    metadata:
      | Record<string, unknown>
      | unknown[]
      | string
      | number
      | boolean
      | null;
    created_at: string;
    memberships: MembershipRecord | MembershipRecord[] | null;
  };

  const transactions = rawTransactions as Transaction[] | null;

  const formatDateShort = (dateIso: string) => {
    try {
      return new Date(dateIso).toLocaleDateString("sk-SK", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateIso;
    }
  };

  const formatTime = (dateIso: string) => {
    try {
      return new Date(dateIso).toLocaleTimeString("sk-SK", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateIso;
    }
  };

  const formatDateTime = (dateIso: string) => {
    try {
      return new Date(dateIso).toLocaleString("sk-SK", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateIso;
    }
  };

  const getMetadataObject = (metadata: Transaction["metadata"]) => {
    return metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? metadata
      : {};
  };

  const getTransactionLabel = (tx: Transaction) => {
    const membership = Array.isArray(tx.memberships)
      ? tx.memberships[0]
      : tx.memberships;
    const membershipName = membership?.name || null;
    const metadata = getMetadataObject(tx.metadata);
    const action =
      metadata.action === "cancel" ? "cancel" : (tx.type ?? "unknown");

    const actionLabel: Record<string, string> = {
      cancel: "Zrušenie",
      purchase: "Nákup",
      refund: "Vrátenie",
      manual: "Manuálne",
    };

    if (membershipName) {
      return `${membershipName} - ${actionLabel[action] || action}`;
    }

    return actionLabel[action] || action;
  };

  const getTransactionReason = (tx: Transaction) => {
    const metadata = getMetadataObject(tx.metadata);
    return typeof metadata.reason === "string" ? metadata.reason : null;
  };

  const activeOpenEntry = entries?.find((e) => !e.check_out && e.is_valid);

  return (
    <section className="space-y-8 pb-20 max-w-6xl mx-auto relative">
      {/* Background Blurs to match Profile/Settings Page */}
      <div className="pointer-events-none absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-red-600/15 blur-[120px] -z-10" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[520px] w-[520px] rounded-full bg-red-900/10 blur-[150px] -z-10" />

      <div className="pt-2">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Späť na zoznam používateľov
        </Link>
      </div>

      {/* Main Profile Card */}
      <article className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-xl mt-4">
        <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
          <div className="flex flex-col items-center gap-4 lg:items-start">
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5 ring-4 ring-red-500/20">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt="Avatar"
                  width={128}
                  height={128}
                  unoptimized
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl font-black text-white">
                  {(profile.full_name || "U").trim().charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-white/40">
              Zaregistrovaný {formatDateShort(profile.created_at)}
            </p>
            <div className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1 text-xs text-white/70">
              Rola: {profile.role || "user"}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">
              Profil Používateľa
            </p>
            <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-white">
              {profile.full_name || "Neznámy Užívateľ"}
            </h1>
            <p className="mt-2 text-sm text-white/55">
              {profile.email || "Bez e-mailu"}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/45">
                  Onboarding
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {profile.onboarding_completed ? "Dokončený" : "Čakajúci"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-white/45">
                  Členstvo
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {hasCurrentMembership
                    ? membershipRecord?.name || "Aktívne"
                    : "Neaktívne"}
                </p>
              </div>
              {hasCurrentMembership && activeMembership?.start_date ? (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Platí Od
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatDateShort(activeMembership.start_date)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Platí Do
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {activeMembership?.end_date
                        ? formatDateShort(activeMembership.end_date)
                        : "Trvalé"}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 opacity-50">
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Platí Od
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">-</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 opacity-50">
                    <p className="text-xs uppercase tracking-wide text-white/45">
                      Platí Do
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">-</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col h-[400px]">
          <div className="mb-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-bold">História Vstupov</h3>
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
                {entries?.length || 0}
              </span>
            </div>
            {activeOpenEntry && (
              <form action={manualCheckOutUser}>
                <input
                  type="hidden"
                  name="entryId"
                  value={activeOpenEntry.id}
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300 hover:bg-amber-500/20 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  Zavrieť vstup
                </button>
              </form>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 transition-colors">
            {entries && entries.length > 0 ? (
              <ul className="space-y-4">
                {entries.map((entry) => {
                  const isOpen = !entry.check_out && entry.is_valid;
                  return (
                    <li
                      key={entry.id}
                      className={`flex items-center justify-between rounded-xl border p-4 ${isOpen ? "border-amber-500/20 bg-amber-500/5 text-amber-50" : "border-white/10 bg-white/[0.02] text-white"}`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${isOpen ? "bg-amber-500/20 text-amber-400" : "bg-white/5 text-white/50"}`}
                        >
                          {isOpen ? (
                            <Activity className="h-4 w-4" />
                          ) : (
                            <ArrowRightLeft className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {formatDateShort(entry.check_in)}
                          </p>
                          <p
                            className={`flex items-center gap-1.5 text-xs mt-0.5 ${isOpen ? "text-amber-200/70" : "text-white/55"}`}
                          >
                            <span>IN: {formatTime(entry.check_in)}</span>
                            <span className="w-1 h-1 rounded-full bg-current opacity-30" />
                            <span>
                              OUT:{" "}
                              {entry.check_out
                                ? formatTime(entry.check_out)
                                : "Čakajúci"}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div>
                        {isOpen ? (
                          <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                            OPEN
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-white/40">
                            CLOSED
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/40">
                Zatiaľ žiadne záznamy o vstupoch
              </div>
            )}
          </div>
        </article>

        {/* Transactions Panel */}
        <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex flex-col h-[400px]">
          <div className="mb-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-bold">Posledné Transakcie</h3>
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60">
                {transactions?.length || 0}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20 transition-colors">
            {transactions && transactions.length > 0 ? (
              <ul className="space-y-4">
                {transactions.map((tx) => {
                  const reason = getTransactionReason(tx);
                  return (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-4 text-white"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/50">
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">
                            {tx.amount}{" "}
                            {tx.currency === "EUR" ? "€" : tx.currency}
                            <span className="ml-2 text-[10px] uppercase font-bold text-white/45 tracking-wider">
                              {getTransactionLabel(tx)}
                            </span>
                          </p>
                          <p className="text-xs text-white/55 mt-0.5">
                            {formatDateTime(tx.created_at)}
                          </p>
                          {reason && (
                            <p className="text-xs text-white/40 mt-1 italic">
                              Dôvod: {reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        {tx.status === "completed" && (
                          <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                            COMPLETED
                          </span>
                        )}
                        {tx.status === "pending" && (
                          <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                            PENDING
                          </span>
                        )}
                        {tx.status === "failed" && (
                          <span className="inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-semibold text-red-400">
                            FAILED
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/40">
                Zatiaľ žiadne transakcie
              </div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
