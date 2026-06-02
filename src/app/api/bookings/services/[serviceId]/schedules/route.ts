import { NextRequest, NextResponse } from "next/server";
import { fetchServiceSchedulesForMonth, isScheduleMonthInRange } from "@/lib/booking-schedules";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const year = Number(request.nextUrl.searchParams.get("year"));
  const month = Number(request.nextUrl.searchParams.get("month"));

  if (!isScheduleMonthInRange(year, month)) {
    return NextResponse.json({ error: "invalid_month" }, { status: 400 });
  }

  const { data: service } = await supabase
    .from("bookable_services")
    .select("id, type, is_active")
    .eq("id", serviceId)
    .in("type", ["group", "trainer"])
    .eq("is_active", true)
    .maybeSingle<{ id: string; type: string; is_active: boolean }>();

  if (!service) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const schedules = await fetchServiceSchedulesForMonth(serviceId, year, month, user.id);

  return NextResponse.json({ schedules });
}
