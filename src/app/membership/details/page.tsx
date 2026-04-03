import { redirect } from "next/navigation";
import Link from "next/link";
import NavBarAuth from "@/components/NavBarAuth";
import { createClient } from "@/lib/supabase/server";
import { MEMBERSHIP_PLANS } from "@/lib/memberships";
import { getCurrentActiveMembership } from "@/lib/membership-access";
import FlashMessageBanner from "@/components/FlashMessageBanner";
import { parseFlashCookieValue } from "@/lib/flash";
import { setFlashMessage } from "@/lib/flash.server";
import { ChevronLeft } from "lucide-react";
import { cookies } from "next/headers";

const NAV_LINKS: [string, string][] = [];

function getPlanDisplayName(name: string) {
  if (name === "Mesačná") return "Mesačné";
  if (name === "Ročná") return "Ročné";
  return name;
}

function getFeaturesByMembershipName(name: string) {
  const plan = MEMBERSHIP_PLANS.find((p) => p.name === name);
  return plan?.features || [];
}

export default async function MembershipDetailsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileRes, activeMembershipRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    getCurrentActiveMembership<{
      id: string;
      membership_id: string;
      start_date: string;
      status: string;
      membership: { name: string; price: number } | null;
    }>(
      supabase,
      user.id,
      "id, membership_id, start_date, status, membership:memberships(name, price)"
    ),
  ]);

  if (!activeMembershipRes.data) {
    redirect("/membership");
  }

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

  const membershipName =
    activeMembershipRes.data &&
    typeof activeMembershipRes.data.membership === "object" &&
    activeMembershipRes.data.membership !== null &&
    "name" in activeMembershipRes.data.membership &&
    typeof activeMembershipRes.data.membership.name === "string"
      ? activeMembershipRes.data.membership.name
      : null;

  const startDate = activeMembershipRes.data.start_date
    ? new Date(activeMembershipRes.data.start_date).toLocaleDateString("sk-SK", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const features = membershipName ? getFeaturesByMembershipName(membershipName) : [];

  async function cancelMembership() {
    "use server";

    const actionSupabase = await createClient();
    const {
      data: { user: actionUser },
    } = await actionSupabase.auth.getUser();

    if (!actionUser) {
      redirect("/login");
    }

    const { data: currentMembership } = await getCurrentActiveMembership<{
      id: string;
      membership_id: string;
      membership: { name: string; price: number } | null;
    }>(
      actionSupabase,
      actionUser.id,
      "id, membership_id, membership:memberships(name, price)"
    );

    if (!currentMembership) {
      await setFlashMessage({ kind: "error", text: "Zrušenie členstva zlyhalo. Skús to znova." });
      redirect("/membership/details");
    }

    const { error: transactionError } = await actionSupabase.from("transactions").insert({
      user_id: actionUser.id,
      membership_id: currentMembership.membership_id,
      amount:
        currentMembership.membership && typeof currentMembership.membership.price === "number"
          ? currentMembership.membership.price
          : 0,
      currency: "EUR",
      type: "refund",
      status: "completed",
      metadata: {
        source_membership_row_id: currentMembership.id,
        membership_name:
          currentMembership.membership && typeof currentMembership.membership.name === "string"
            ? currentMembership.membership.name
            : null,
      },
    });

    if (transactionError) {
      await setFlashMessage({ kind: "error", text: "Zrušenie členstva zlyhalo. Skús to znova." });
      redirect("/membership/details");
    }

    const { error: deleteError } = await actionSupabase
      .from("user_memberships")
      .delete()
      .eq("id", currentMembership.id)
      .eq("user_id", actionUser.id);

    if (deleteError) {
      await setFlashMessage({ kind: "error", text: "Zrušenie členstva zlyhalo. Skús to znova." });
      redirect("/membership/details");
    }

    await setFlashMessage({ kind: "success", text: "Členstvo bolo zrušené a refund bol zaevidovaný." });
    redirect("/membership");
  }

  const flashMessage = parseFlashCookieValue((await cookies()).get("tapit_flash")?.value);

  const navUser = {
    id: user.id,
    email: user.email ?? null,
    user_metadata: {
      full_name:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
      avatar_url:
        typeof user.user_metadata?.avatar_url === "string"
          ? user.user_metadata.avatar_url
          : undefined,
    },
  };

  const navProfile = {
    full_name: typeof profileRes.data?.full_name === "string" ? profileRes.data.full_name : null,
    avatar_url: typeof profileRes.data?.avatar_url === "string" ? profileRes.data.avatar_url : null,
  };

  return (
    <>
      <NavBarAuth navLinks={NAV_LINKS} initialUser={navUser} initialProfile={navProfile} />

      <main className="min-h-screen bg-[#080808] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-8">
          {/* Back Button */}
          <Link
            href="/membership"
            className="inline-flex items-center gap-2 text-white/70 transition hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
            Späť na členstvo
          </Link>

          {/* Profile Section */}
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
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">DETAILY ČLENSTVA</p>
                <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">{fullName}</h1>
                <p className="mt-1 text-sm text-white/60">{user.email ?? "Bez emailu"}</p>
              </div>
            </div>
          </section>

          {/* Membership Info */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white">Informácie o členstve</h2>

            {flashMessage && <div className="mt-4"><FlashMessageBanner message={flashMessage} /></div>}

            {/* Registration Date */}
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Dátum registrácie</p>
                <p className="mt-2 text-lg font-semibold text-white">{startDate}</p>
              </div>

              {/* Membership Type */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">Typ členstva</p>
                <p className="mt-2 text-lg font-semibold text-white">{getPlanDisplayName(membershipName || "")}</p>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-white">Čo ti členstvo dáva</h2>

            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-white/80">
                  <span className="mt-1 inline-block h-2 w-2 rounded-full bg-red-500"></span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Cancel Membership Button */}
          <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-red-300">Zrušiť členstvo</h2>
            <p className="mt-2 text-sm text-white/60">
              Kliknutím na tlačidlo nižšie zrušíš svoje členstvo. Túto akciu nie je možné vrátiť.
            </p>

            <form action={cancelMembership}>
              <button
                type="submit"
                className="mt-4 rounded-full border border-red-500/50 bg-red-500/20 px-6 py-2.5 text-sm font-semibold text-red-300 transition hover:border-red-500 hover:bg-red-500/30"
              >
                Zrušiť členstvo
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
