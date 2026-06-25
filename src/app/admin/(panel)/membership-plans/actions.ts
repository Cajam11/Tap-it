"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";

type BillingCycle = "entries" | "monthly" | "yearly";

type MembershipPlanInput = {
  planId?: string | null;
  name: string;
  price: number;
  billingCycle: BillingCycle;
  entryCount?: number | null;
  durationDays?: number | null;
  description: string;
  benefitsText: string;
  displayOrder: number;
  isHighlighted: boolean;
  isActive: boolean;
};

async function assertCanManageMembershipPlans() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.isAdmin || !hasMinAdminRole(context.role, "owner")) {
    throw new Error("Nemate opravnenie upravovat membership plany.");
  }
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function parseBenefits(value: string) {
  return value
    .split(/\r?\n/)
    .map((benefit) => normalizeText(benefit))
    .filter(Boolean);
}

export async function saveMembershipPlan(input: MembershipPlanInput) {
  try {
    await assertCanManageMembershipPlans();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }

  const name = normalizeText(input.name);
  const price = Number(input.price);
  const displayOrder = Number(input.displayOrder);
  const billingCycle: BillingCycle =
    input.billingCycle === "entries" || input.billingCycle === "yearly"
      ? input.billingCycle
      : "monthly";
  const entryCount =
    input.entryCount === null || input.entryCount === undefined
      ? null
      : Number(input.entryCount);
  const durationDays =
    input.durationDays === null || input.durationDays === undefined
      ? null
      : Number(input.durationDays);
  const benefits = parseBenefits(input.benefitsText);

  if (!name) return { error: "Nazov planu je povinny." };
  if (!Number.isFinite(price) || price < 0) return { error: "Cena musi byt nezaporne cislo." };
  if (!Number.isInteger(displayOrder)) return { error: "Poradie musi byt cele cislo." };
  if (benefits.length === 0) return { error: "Pridaj aspon jednu vyhodu planu." };
  if (
    billingCycle === "entries" &&
    (entryCount === null || !Number.isInteger(entryCount) || entryCount <= 0)
  ) {
    return { error: "Pri vstupovom plane zadaj platny pocet vstupov." };
  }
  if (
    billingCycle !== "entries" &&
    (durationDays === null || !Number.isInteger(durationDays) || durationDays <= 0)
  ) {
    return { error: "Pri casovom plane zadaj platne trvanie v dnoch." };
  }

  const payload = {
    name,
    price,
    billing_cycle: billingCycle,
    entry_count: billingCycle === "entries" ? entryCount : null,
    duration_days: durationDays,
    is_single_entry: billingCycle === "entries" && entryCount === 1,
    description: input.description.trim(),
    benefits,
    display_order: displayOrder,
    is_highlighted: input.isHighlighted,
    is_active: input.isActive,
  };

  const admin = createAdminClient();

  if (input.planId) {
    const { data: existingPlan } = await admin
      .from("memberships")
      .select("id")
      .eq("id", input.planId)
      .maybeSingle<{ id: string }>();

    if (!existingPlan) return { error: "Membership plan neexistuje." };

    const { error } = await admin
      .from("memberships")
      .update(payload)
      .eq("id", input.planId);

    if (error) {
      return { error: `Nepodarilo sa upravit plan: ${error.message}` };
    }

    revalidateMembershipPlanPaths();
    return { success: true, planId: input.planId };
  }

  const { data, error } = await admin
    .from("memberships")
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return { error: `Nepodarilo sa vytvorit plan: ${error?.message ?? "neznamy problem"}` };
  }

  revalidateMembershipPlanPaths();
  return { success: true, planId: data.id };
}

export async function deactivateMembershipPlan(planId: string) {
  try {
    await assertCanManageMembershipPlans();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }

  if (!planId) return { error: "Chyba ID planu." };

  const { error } = await createAdminClient()
    .from("memberships")
    .update({ is_active: false })
    .eq("id", planId);

  if (error) {
    return { error: `Nepodarilo sa deaktivovat plan: ${error.message}` };
  }

  revalidateMembershipPlanPaths();
  return { success: true };
}

function revalidateMembershipPlanPaths() {
  revalidatePath("/");
  revalidatePath("/membership");
  revalidatePath("/membership/payment");
  revalidatePath("/admin/membership-plans");
}
