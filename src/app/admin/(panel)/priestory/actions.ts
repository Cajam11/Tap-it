"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentAdminContext } from "@/lib/admin-access";
import { hasMinAdminRole } from "@/lib/admin-authz";

type FacilityInput = {
  serviceId?: string | null;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
};

type InsertableSelectQuery = {
  insert(values: Record<string, unknown>): InsertableSelectQuery;
  select(columns: string): InsertableSelectQuery;
  single<T>(): Promise<{ data: T | null; error: { message?: string } | null }>;
};

type UpdatableQuery = {
  update(values: Record<string, unknown>): UpdatableQuery;
  eq(column: string, value: string): Promise<{ error: { message?: string } | null }>;
};

async function assertCanManageFacilities() {
  const supabase = await createClient();
  const context = await getCurrentAdminContext(supabase);

  if (!context.isAdmin || !hasMinAdminRole(context.role, "recepcny")) {
    throw new Error("Nemate opravnenie upravovat priestory.");
  }
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export async function saveFacilityService(input: FacilityInput) {
  try {
    await assertCanManageFacilities();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Neautorizovany pristup." };
  }

  const name = normalizeText(input.name);
  const basePrice = Number(input.basePrice);
  const imageUrl = input.imageUrl?.trim() || null;

  if (!name) {
    return { error: "Nazov priestoru je povinny." };
  }

  if (!Number.isFinite(basePrice) || basePrice < 0) {
    return { error: "Cena musi byt nezaporne cislo." };
  }

  const admin = createAdminClient();
  const payload = {
    name,
    type: "facility",
    base_price: basePrice,
    price_unit: "hour",
    capacity: null,
    is_active: true,
    metadata: {
      image_url: imageUrl,
    },
  };

  if (input.serviceId) {
    const { data: existingService } = await admin
      .from("bookable_services")
      .select("id")
      .eq("id", input.serviceId)
      .eq("type", "facility")
      .maybeSingle<{ id: string }>();

    if (!existingService) {
      return { error: "Priestor neexistuje." };
    }

    const { error } = await (admin.from("bookable_services") as unknown as UpdatableQuery)
      .update(payload)
      .eq("id", input.serviceId);

    if (error) {
      return { error: `Nepodarilo sa upravit priestor: ${error.message}` };
    }

    revalidatePath("/admin/priestory");
    revalidatePath("/bookings/priestory");
    revalidatePath(`/bookings/priestory/${input.serviceId}`);

    return { success: true, serviceId: input.serviceId };
  }

  const { data, error } = await (admin.from("bookable_services") as unknown as InsertableSelectQuery)
    .insert(payload)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return { error: `Nepodarilo sa vytvorit priestor: ${error?.message ?? "neznamy problem"}` };
  }

  revalidatePath("/admin/priestory");
  revalidatePath("/bookings/priestory");

  return { success: true, serviceId: data.id };
}
