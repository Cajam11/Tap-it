export type MembershipPlan = {
  name: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
};

// Shared marketing plans used on landing and membership selection screens.
export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    name: "Jednorazový vstup",
    price: "14 €",
    period: "1 vstup",
    features: ["Prístup do posilňovne", "Sauna", "Skupinovky zadarmo"],
    highlight: false,
  },
  {
    name: "Mesačná",
    price: "39 €",
    period: "/ mesiac",
    features: ["Neobmedzený vstup", "Sauna", "Skupinovky zadarmo", "IONT nápoj"],
    highlight: true,
  },
  {
    name: "Ročná",
    price: "29 €",
    period: "/ mesiac",
    features: ["Neobmedzený vstup", "Sauna", "Skupinovky zadarmo", "IONT nápoj", "Uterák"],
    highlight: false,
  },
];
