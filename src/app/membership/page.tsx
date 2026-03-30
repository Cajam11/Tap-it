import { redirect } from "next/navigation";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import { MEMBERSHIP_PLANS } from "@/lib/memberships";
import { CheckCircle2 } from "lucide-react";
import type { Membership } from "@/lib/types";

const NAV_LINKS: [string, string][] = [];

type DbMembership = Pick<
  Membership,
  "id" | "name" | "billing_cycle" | "entry_count" | "duration_days"
>;

type Status = "selected" | "missing-plan" | "invalid-plan" | "error";

function getStatusLabel(status: Status) {
  if (status === "selected") return "Členstvo bolo úspešne zmenené.";
  if (status === "missing-plan") return "Vybraný plán nebol nájdený v databáze.";
  if (status === "invalid-plan") return "Vybraný plán nie je validný.";
  return "Pri zmene členstva nastala chyba.";
}

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

export default async function MembershipPage({
  searchParams,
}: {
  searchParams?: { status?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function selectMembership(formData: FormData) {
    "use server";

    const selectedPlanName = formData.get("planName");
    if (typeof selectedPlanName !== "string") {
      redirect("/membership?status=invalid-plan");
    }

    const selectedPlan = MEMBERSHIP_PLANS.find((plan) => plan.name === selectedPlanName);
    if (!selectedPlan) {
      redirect("/membership?status=invalid-plan");
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
      .eq("name", selectedPlan.name)
      .maybeSingle<DbMembership>();

    if (membershipError) {
      redirect("/membership?status=error");
    }

    if (!membershipRow) {
      redirect("/membership?status=missing-plan");
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
      redirect("/membership?status=error");
    }

    redirect("/membership?status=selected");
  }

  const [profileRes, activeMembershipRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_memberships")
      .select("membership_id, status, membership:memberships(name)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

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

  const activeMembershipName =
    activeMembershipRes.data &&
    typeof activeMembershipRes.data.membership === "object" &&
    activeMembershipRes.data.membership !== null &&
    "name" in activeMembershipRes.data.membership &&
    typeof activeMembershipRes.data.membership.name === "string"
      ? activeMembershipRes.data.membership.name
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

  const status = searchParams?.status;
  const showStatus =
    status === "selected" ||
    status === "missing-plan" ||
    status === "invalid-plan" ||
    status === "error";

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profilovy avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-white">
                    {(fullName.trim().charAt(0) || "U").toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">ČLENSTVO</p>
                <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{fullName}</h1>
                <p className="mt-1 text-sm text-white/60">{user.email ?? "Bez emailu"}</p>
              </div>
            </div>
          </section>

          {!activeMembershipName && (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white">Aktívne členstvo</h2>
              <p className="mt-3 text-white/70">Momentálne nemáš aktívne členstvo. Vyber si jedno nižšie.</p>

              {showStatus && (
                <div className="mt-4 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white/80">
                  {getStatusLabel(status)}
                </div>
              )}

              <div className="mt-8 grid gap-4 md:grid-cols-3 md:items-stretch">
                {MEMBERSHIP_PLANS.map((plan) => {
                  const isActive = plan.name === activeMembershipName;

                  return (
                    <article
                      key={plan.name}
                      className={`flex h-full flex-col rounded-2xl border p-5 transition duration-300 hover:scale-[1.02] hover:border-red-500/80 ${
                        isActive
                          ? "border-red-500/70 bg-red-500/10"
                          : "border-white/10 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-semibold text-white">{getPlanDisplayName(plan.name)}</h3>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-1 text-xs text-red-300">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aktívna
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-3xl font-black text-white">{plan.price}</p>
                      <p className="text-sm text-white/50">{plan.period}</p>

                      <ul className="mt-4 space-y-2 text-sm text-white/70">
                        {plan.features.map((feature) => (
                          <li key={feature}>• {feature}</li>
                        ))}
                      </ul>

                      <form action={selectMembership} className="mt-auto pt-6">
                        <input type="hidden" name="planName" value={plan.name} />
                        <button
                          type="submit"
                          disabled={isActive}
                          className="w-full rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50"
                        >
                          {isActive ? "Aktuálne členské" : "Vybrať členské"}
                        </button>
                      </form>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
