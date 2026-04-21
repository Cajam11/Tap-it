import Link from "next/link";
import { redirect } from "next/navigation";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import NavBarAuth from "@/components/NavBarAuth";
import StripePaymentForm from "@/components/membership/StripePaymentForm";
import { MEMBERSHIP_PLANS } from "@/lib/memberships";
import { getCurrentActiveMembership } from "@/lib/membership-access";
import { createClient } from "@/lib/supabase/server";
import { setFlashMessage } from "@/lib/flash.server";

const NAV_LINKS: [string, string][] = [];

async function getStripePublishableKey() {
  const runtimeValue = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (runtimeValue && runtimeValue.length > 0) {
    return runtimeValue;
  }

  // Dev fallback: if Next runtime env is stale, read from .env.local directly.
  try {
    const envPath = join(process.cwd(), ".env.local");
    const raw = await readFile(envPath, "utf8");
    const match = raw.match(/^NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=(.*)$/m);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
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
  const stripePublishableKey = await getStripePublishableKey();

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
    await setFlashMessage({ kind: "error", text: "Platba zlyhala. Skús to znova." });
    redirect("/membership");
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

            <div className="mt-8">
              <StripePaymentForm
                planName={selectedPlan.name}
                publishableKey={stripePublishableKey}
              />
              <p className="mt-3 text-xs text-white/50">
                Členstvo sa aktivuje automaticky po Stripe webhook potvrdení platby.
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/membership"
                className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-semibold text-white/85 transition hover:bg-white/10 sm:w-auto"
              >
                Späť na členstvá
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
