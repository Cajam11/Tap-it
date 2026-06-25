export type MembershipPlanMeta = {
  name: string;
  features: string[];
  highlight: boolean;
};

export type MembershipPlanRow = {
  id?: string;
  name: string;
  price: number;
  billing_cycle: "entries" | "monthly" | "yearly";
  entry_count?: number | null;
  duration_days?: number | null;
  is_single_entry: boolean;
  description?: string | null;
  benefits?: string[] | null;
  display_order?: number | null;
  is_highlighted?: boolean | null;
  is_active?: boolean | null;
};

export type MembershipDisplayPlan = MembershipPlanMeta & {
  price: string;
  period: string;
};

export const MEMBERSHIP_PLAN_META: MembershipPlanMeta[] = [
  {
    name: "Jednorazový vstup",
    features: ["Prístup do posilňovne", "Sauna", "Skupinovky zadarmo"],
    highlight: false,
  },
  {
    name: "Mesačná",
    features: ["Neobmedzený vstup", "Sauna", "Skupinovky zadarmo", "IONT nápoj"],
    highlight: true,
  },
  {
    name: "Ročná",
    features: ["Neobmedzený vstup", "Sauna", "Skupinovky zadarmo", "IONT nápoj", "Uterák"],
    highlight: false,
  },
];

export function getPlanDisplayName(name: string) {
  if (name === "Mesačná") return "Mesačné";
  if (name === "Ročná") return "Ročné";
  return name;
}

export function getFeaturesByMembershipName(name: string) {
  return MEMBERSHIP_PLAN_META.find((plan) => plan.name === name)?.features ?? [];
}

export function formatMembershipPrice(price: number) {
  return `${Number(price).toLocaleString("sk-SK", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
  })} €`;
}

function formatEntryCount(count: number) {
  if (count === 1) return "1 vstup";
  if (count > 1 && count < 5) return `${count} vstupy`;
  return `${count} vstupov`;
}

export function getMembershipPeriod(
  plan: Pick<
    MembershipPlanRow,
    "billing_cycle" | "entry_count" | "duration_days" | "is_single_entry"
  >,
) {
  if (plan.billing_cycle === "entries" && typeof plan.duration_days === "number" && plan.duration_days > 0) {
    return `${formatEntryCount(plan.entry_count ?? 1)} / ${plan.duration_days} dní`;
  }
  if (plan.billing_cycle === "entries") {
    return formatEntryCount(plan.entry_count ?? 1);
  }
  if (typeof plan.duration_days === "number" && plan.duration_days > 0) {
    return `${plan.duration_days} dní`;
  }
  if (plan.billing_cycle === "monthly") return "/ mesiac";
  if (plan.billing_cycle === "yearly") return "/ rok";
  return "";
}

export function buildMembershipDisplayPlans(rows: MembershipPlanRow[]) {
  return rows
    .slice()
    .sort((a, b) => {
      const orderA = typeof a.display_order === "number" ? a.display_order : 0;
      const orderB = typeof b.display_order === "number" ? b.display_order : 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name, "sk");
    })
    .map((row) => {
      const fallbackMeta = MEMBERSHIP_PLAN_META.find((plan) => plan.name === row.name);
      const benefits = Array.isArray(row.benefits)
        ? row.benefits.filter((benefit) => benefit.trim().length > 0)
        : [];

      return {
        name: row.name,
        features: benefits.length > 0 ? benefits : (fallbackMeta?.features ?? []),
        highlight: Boolean(row.is_highlighted ?? fallbackMeta?.highlight),
        description: row.description?.trim() || null,
        price: formatMembershipPrice(Number(row.price)),
        period: getMembershipPeriod(row),
      };
    });
}
