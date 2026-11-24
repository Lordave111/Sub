import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to manage alerts." }, { status: 401 });
  const response = await supabase("fg_alert_preferences?user_id=eq." + encodeURIComponent(userId) + "&select=email_alerts,high_risk_only,digest");
  if (!response.ok) return NextResponse.json({ error: "Apply the FraudGuard database migration first." }, { status: 503 });
  const rows = await response.json();
  return NextResponse.json({ preferences: rows[0] || { email_alerts: true, high_risk_only: true, digest: "instant" } });
}
export async function PUT(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to manage alerts." }, { status: 401 });
  try {
    const body = await req.json();
    const digest = ["instant","daily","weekly","off"].includes(body.digest) ? body.digest : "instant";
    const preferences = { user_id: userId, email_alerts: body.email_alerts !== false, high_risk_only: body.high_risk_only !== false, digest, updated_at: new Date().toISOString() };
    const response = await supabase("fg_alert_preferences?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(preferences) });
    if (!response.ok) return NextResponse.json({ error: "Could not save alert preferences." }, { status: 503 });
    return NextResponse.json({ preferences: (await response.json())[0] });
  } catch { return NextResponse.json({ error: "Invalid alert preferences." }, { status: 400 }); }
}
