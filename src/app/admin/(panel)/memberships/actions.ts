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

export async function adminChangeMembershipWithReason(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const membershipPlan = String(formData.get("membershipPlan") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  // Validate inputs
  if (!userId || !ALLOWED_PLANS.has(membershipPlan)) {
    return { error: "Neplatný vstup" };
  }

  if (reason.length < 5 || reason.length > 500) {
    return { error: "Dôvod musí mať 5-500 znakov" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Nie ste prihlásení" };
  }

  const hasAccess = await hasServerAdminAccess(supabase, "recepcny");
  if (!hasAccess) {
    return { error: "Nedostatočné práva" };
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Get current active membership
  const { data: activeMembership } = await admin
    .from("user_memberships")
    .select("id, membership_id, membership:memberships(name, price)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<ActiveMembershipRow>();

  // If same plan is selected, return early
  if (membershipPlan === "none") {
    if (!activeMembership) {
      return { error: "Používateľ nemá aktívne členstvo" };
    }

    // Cancel the active membership
    const { error: cancelError } = await admin
      .from("user_memberships")
      .update({ status: "cancelled", end_date: nowIso })
      .eq("id", activeMembership.id);

    if (cancelError) {
      return { error: "Chyba pri zrušení členstva" };
    }

    // Record manual transaction for cancellation
    const { error: transactionError } = await admin
      .from("transactions")
      .insert({
        user_id: userId,
        membership_id: activeMembership.membership_id,
        amount: 0,
        currency: "EUR",
        type: "manual",
        status: "completed",
        metadata: {
          admin_id: user.id,
          reason: reason,
          previous_membership_id: activeMembership.membership_id,
          action: "cancel",
          source: "admin_manual_change",
        },
      });

    revalidatePath("/admin/memberships");

    if (transactionError) {
      console.error("Transaction error on cancel:", transactionError);
      return { error: "Chyba pri zázname transakcie - stránka sa refreshla, skúste znovu" };
    }

    return { success: true, message: "Členstvo bolo zrušené" };
  }

  // Get the new membership plan
  const { data: planRow, error: planError } = await admin
    .from("memberships")
    .select("id, name, duration_days, price")
    .eq("name", membershipPlan === "monthly" ? "Mesačná" : "Ročná")
    .maybeSingle<MembershipPlanRow>();

  if (planError || !planRow) {
    return { error: "Plán sa nenašiel" };
  }

  // Check if plan is already active
  if (activeMembership?.membership_id === planRow.id) {
    return { error: "Používateľ má už toto členstvo" };
  }

  // Cancel old membership if it exists
  if (activeMembership) {
    const { error: cancelError } = await admin
      .from("user_memberships")
      .update({ status: "cancelled", end_date: nowIso })
      .eq("id", activeMembership.id);

    if (cancelError) {
      return { error: "Chyba pri zrušení starého členstva" };
    }
  }

  // Create new membership
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
    return { error: "Chyba pri vytvorení nového členstva" };
  }

  // Record single manual transaction
  const { error: transactionError } = await admin
    .from("transactions")
    .insert({
      user_id: userId,
      membership_id: planRow.id,
      amount: 0,
      currency: "EUR",
      type: "manual",
      status: "completed",
      metadata: {
        admin_id: user.id,
        reason: reason,
        previous_membership_id: activeMembership?.membership_id ?? null,
        new_membership_id: planRow.id,
        action: membershipPlan,
        source: "admin_manual_change",
      },
    });

  revalidatePath("/admin/memberships");

  if (transactionError) {
    console.error("Transaction error:", transactionError);
    return { error: "Chyba pri zázname transakcie - stránka sa refreshla, skúste znovu" };
  }

  return { success: true, message: "Členstvo bolo úspešne zmenené" };
}
