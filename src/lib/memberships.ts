export type MembershipPlanMeta = {
  name: string;
  features: string[];
  highlight: boolean;
};

export type MembershipPlanRow = {
  name: string;
  price: number;
  billing_cycle: "entries" | "monthly" | "yearly";
  is_single_entry: boolean;
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

export function getMembershipPeriod(plan: Pick<MembershipPlanRow, "billing_cycle" | "is_single_entry">) {
  if (plan.is_single_entry || plan.billing_cycle === "entries") return "1 vstup";
  if (plan.billing_cycle === "monthly") return "/ mesiac";
  if (plan.billing_cycle === "yearly") return "/ rok";
  return "";
}

export function buildMembershipDisplayPlans(rows: MembershipPlanRow[]) {
  const rowsByName = new Map(rows.map((row) => [row.name, row]));

  return MEMBERSHIP_PLAN_META.flatMap((meta) => {
    const row = rowsByName.get(meta.name);
    if (!row) return [];

    return [
      {
        ...meta,
        price: formatMembershipPrice(Number(row.price)),
        period: getMembershipPeriod(row),
      },
    ];
  });
}
