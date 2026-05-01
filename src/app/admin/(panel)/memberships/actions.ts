"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasServerAdminAccess } from "@/lib/admin-access";

const ALLOWED_PLANS = new Set(["monthly", "yearly", "none"]);

type MembershipPlanRow = {
  id: string;
  name: string;
  duration_days: number | null;
  price: number;
};

type ActiveMembershipRow = {
  id: string;
  membership_id: string;
  membership:
    | {
        name: string;
        price: number;
      }
    | { name: string; price: number }[]
    | null;
};

function getMembershipRecord(
  membership: ActiveMembershipRow["membership"],
): { name: string; price: number } | null {
  if (Array.isArray(membership)) {
    return membership[0] ?? null;
  }

  return membership;
}

function getTransactionAmount(membershipPrice: number | null | undefined) {
  return typeof membershipPrice === "number" && Number.isFinite(membershipPrice)
    ? membershipPrice
    : 0;
}

function getPlanDurationEndDate(durationDays: number | null) {
  if (!durationDays || durationDays <= 0) {
    return null;
  }

  const nextEnd = new Date();
  nextEnd.setDate(nextEnd.getDate() + durationDays);
  return nextEnd.toISOString();
}

export async function updateUserMembership(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const membershipPlan = String(formData.get("membershipPlan") ?? "").trim();

  if (!userId || !ALLOWED_PLANS.has(membershipPlan)) {
    redirect("/admin/memberships?status=error&message=Neplatny_vstup");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");
  if (!hasAccess) {
    redirect("/admin/memberships?status=error&message=Nedostatocne_prava");
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: activeMembership } = await admin
    .from("user_memberships")
    .select("id, membership_id, membership:memberships(name, price)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveMembershipRow>();

  const activeMembershipRecord = getMembershipRecord(
    activeMembership?.membership ?? null,
  );

  if (membershipPlan === "none") {
    if (activeMembership) {
      const { error } = await admin
        .from("user_memberships")
        .update({ status: "cancelled", end_date: nowIso })
        .eq("id", activeMembership.id);

      if (error) {
        redirect(
          "/admin/memberships?status=error&message=Zmena_clenstva_zlyhala",
        );
      }

      const { error: transactionError } = await admin
        .from("transactions")
        .insert({
          user_id: userId,
          membership_id: activeMembership.membership_id,
          amount: getTransactionAmount(activeMembershipRecord?.price),
          currency: "EUR",
          type: "refund",
          status: "completed",
          metadata: {
            source: "admin_membership_change",
            action: "none",
            previous_membership_id: activeMembership.membership_id,
            changed_by_admin_id: user.id,
          },
        });

      if (transactionError) {
        redirect(
          "/admin/memberships?status=error&message=Zaznam_transakcie_sa_nepodarilo_ulozit",
        );
      }
    }

    revalidatePath("/admin/memberships");
    redirect("/admin/memberships?status=success&message=Clenstvo_bolo_zrusene");
  }

  const { data: planRow, error: planError } = await admin
    .from("memberships")
    .select("id, name, duration_days, price")
    .eq("name", membershipPlan === "monthly" ? "Mesačná" : "Ročná")
    .maybeSingle<MembershipPlanRow>();

  if (planError || !planRow) {
    redirect("/admin/memberships?status=error&message=Plan_sa_nenasiel");
  }

  if (activeMembership?.membership_id === planRow.id) {
    revalidatePath("/admin/memberships");
    redirect(
      "/admin/memberships?status=success&message=Clenstvo_uz_je_aktualne",
    );
  }

  if (activeMembership) {
    const { error } = await admin
      .from("user_memberships")
      .update({ status: "cancelled", end_date: nowIso })
      .eq("id", activeMembership.id);

    if (error) {
      redirect(
        "/admin/memberships?status=error&message=Zmena_clenstva_zlyhala",
      );
    }

    const { error: transactionError } = await admin
      .from("transactions")
      .insert({
        user_id: userId,
        membership_id: activeMembership.membership_id,
        amount: getTransactionAmount(activeMembershipRecord?.price),
        currency: "EUR",
        type: "refund",
        status: "completed",
        metadata: {
          source: "admin_membership_change",
          action: "replace",
          previous_membership_id: activeMembership.membership_id,
          changed_by_admin_id: user.id,
          next_membership_id: planRow.id,
        },
      });

    if (transactionError) {
      redirect(
        "/admin/memberships?status=error&message=Zaznam_transakcie_sa_nepodarilo_ulozit",
      );
    }
  }

  const { error: insertError } = await admin.from("user_memberships").insert({
    user_id: userId,
    membership_id: planRow.id,
    start_date: nowIso,
    end_date: getPlanDurationEndDate(planRow.duration_days),
    entries_remaining: null,
    status: "active",
    activated_by_admin: true,
  });

  if (insertError) {
    redirect("/admin/memberships?status=error&message=Zmena_clenstva_zlyhala");
  }

  const { error: purchaseTransactionError } = await admin
    .from("transactions")
    .insert({
      user_id: userId,
      membership_id: planRow.id,
      amount: getTransactionAmount(planRow.price),
      currency: "EUR",
      type: "purchase",
      status: "completed",
      metadata: {
        source: "admin_membership_change",
        action: membershipPlan,
        changed_by_admin_id: user.id,
        old_membership_id: activeMembership?.membership_id ?? null,
      },
    });

  if (purchaseTransactionError) {
    redirect(
      "/admin/memberships?status=error&message=Zaznam_transakcie_sa_nepodarilo_ulozit",
    );
  }

  revalidatePath("/admin/memberships");
  redirect(
    "/admin/memberships?status=success&message=Clenstvo_bolo_aktualizovane",
  );
}
