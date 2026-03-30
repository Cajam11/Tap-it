import Link from "next/link";
import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import { MEMBERSHIP_PLANS } from "@/lib/memberships";
import { getCurrentActiveMembership } from "@/lib/membership-access";
import { createClient } from "@/lib/supabase/server";
import type { Membership } from "@/lib/types";

const NAV_LINKS: [string, string][] = [];

type DbMembership = Pick<
  Membership,
  "id" | "name" | "billing_cycle" | "entry_count" | "duration_days"
>;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getPlanDisplayName(name: string) {
  if (name === "Mesačná") return "Mesačné";
  if (name === "Ročná") return "Ročné";
  return name;
}

export default async function MembershipPaymentPage({
  searchParams,
}: {
  searchParams?: Promise<{ plan?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: activeMembership } = await getCurrentActiveMembership<{ id: string }>(
    supabase,
    user.id,
    "id"
  );

  if (activeMembership) {
    redirect("/membership");
  }

  const profileRes = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const fullName =
    typeof profileRes.data?.full_name === "string"
      ? profileRes.data.full_name
      : typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : user.email?.split("@")[0] ?? "Pouzivatel";

  const avatarUrl =
    typeof profileRes.data?.avatar_url === "string"
      ? profileRes.data.avatar_url
      : typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
      avatar_url: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : undefined,
    },
  };

  const navProfile = {
    full_name: typeof profileRes.data?.full_name === "string" ? profileRes.data.full_name : null,
    avatar_url: typeof profileRes.data?.avatar_url === "string" ? profileRes.data.avatar_url : null,
  };

  const resolvedSearchParams = await searchParams;
  const selectedPlanName = resolvedSearchParams?.plan ?? "";
  const selectedPlan = MEMBERSHIP_PLANS.find((plan) => plan.name === selectedPlanName);

  if (!selectedPlan) {
    redirect("/membership?status=payment-failed");
  }

  async function confirmPayment(formData: FormData) {
    "use server";

    const planName = formData.get("planName");
    if (typeof planName !== "string") {
      redirect("/membership?status=payment-failed");
    }

    const plan = MEMBERSHIP_PLANS.find((item) => item.name === planName);
    if (!plan) {
      redirect("/membership?status=payment-failed");
    }

    const actionSupabase = await createClient();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    const { data: membershipRow, error: membershipError } = await actionSupabase
      .from("memberships")
      .select("id, name, billing_cycle, entry_count, duration_days")
      .eq("name", plan.name)
      .maybeSingle<DbMembership>();

    if (membershipError || !membershipRow) {
      redirect("/membership?status=payment-failed");
    }

    await actionSupabase
      .from("user_memberships")
      .update({ status: "cancelled", end_date: new Date().toISOString() })
      .eq("user_id", actionUser.id)
      .eq("status", "active");

    const now = new Date();
    const nextEndDate =
      typeof membershipRow.duration_days === "number" && membershipRow.duration_days > 0
        ? addDays(now, membershipRow.duration_days).toISOString()
        : null;

    const entriesRemaining =
      membershipRow.billing_cycle === "entries"
        ? typeof membershipRow.entry_count === "number" && membershipRow.entry_count > 0
          ? membershipRow.entry_count
          : 1
        : null;

    const { error: insertError } = await actionSupabase.from("user_memberships").insert({
      user_id: actionUser.id,
      membership_id: membershipRow.id,
      start_date: now.toISOString(),
      end_date: nextEndDate,
      entries_remaining: entriesRemaining,
      status: "active",
      activated_by_admin: false,
    });

    if (insertError) {
      redirect("/membership?status=payment-failed");
    }

    redirect("/membership?status=selected");
  }

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profilovy avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-white">{(fullName.trim().charAt(0) || "U").toUpperCase()}</span>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">PLATBA ČLENSTVA</p>
                <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{fullName}</h1>
                <p className="mt-1 text-sm text-white/60">{user.email ?? "Bez emailu"}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white">Potvrdenie platby</h2>
            <p className="mt-3 text-white/70">
              Vybraný plán: <span className="font-semibold text-white">{getPlanDisplayName(selectedPlan.name)}</span>
            </p>
            <p className="mt-1 text-white/70">
              Cena: <span className="font-semibold text-white">{selectedPlan.price} {selectedPlan.period}</span>
            </p>

            <ul className="mt-5 space-y-2 text-sm text-white/70">
              {selectedPlan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>

            <form action={confirmPayment} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="planName" value={selectedPlan.name} />
              <button
                type="submit"
                className="w-full rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-500 sm:w-auto"
              >
                Zaplatiť a aktivovať členstvo
              </button>

              <Link
                href="/membership"
                className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:w-auto"
              >
                Späť na členstvá
              </Link>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
