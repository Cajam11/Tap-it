import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyQrToken } from "@/lib/qr-token";
import { getCurrentActiveMembership } from "@/lib/membership-access";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  let verification: ReturnType<typeof verifyQrToken>;
  try {
    verification = verifyQrToken(token);
  } catch {
    return NextResponse.json({ ok: false, error: "qr_secret_not_configured" }, { status: 500 });
  }

  if (!verification.ok) {
    return NextResponse.json({ ok: false, error: verification.reason }, { status: 400 });
  }

  if (verification.payload.sub !== user.id) {
    return NextResponse.json({ ok: false, error: "token_subject_mismatch" }, { status: 403 });
  }

  const { data: activeMembership } = await getCurrentActiveMembership<{ id: string }>(
    supabase,
    user.id,
    "id"
  );

  if (!activeMembership) {
    return NextResponse.json({ ok: false, error: "membership_not_active" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    userId: verification.payload.sub,
    jti: verification.payload.jti,
    exp: verification.payload.exp,
  });
}
