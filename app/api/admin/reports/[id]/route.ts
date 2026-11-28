import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";
const allowed = new Set(["pending_review","in_review","verified_pattern","rejected","resolved"]);
export async function PATCH(req: NextRequest, context: { params: { id: string } }) {
  const userId = await getAuthenticatedUserId(req);
  const admins = (process.env.FRAUDGUARD_ADMIN_USER_IDS || "").split(",").map(v => v.trim()).filter(Boolean);
  if (!userId || !admins.includes(userId)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    const body = await req.json();
    if (!allowed.has(body.status)) return NextResponse.json({ error: "Invalid moderation status." }, { status: 400 });
    const response = await supabase("fg_reports?id=eq." + encodeURIComponent(context.params.id), { method: "PATCH", body: JSON.stringify({ status: body.status, updated_at: new Date().toISOString(), visibility: body.status === "verified_pattern" && body.publish === true ? "moderated_public" : "private" }) });
    if (!response.ok) return NextResponse.json({ error: "Moderation update failed." }, { status: 503 });
    const rows = await response.json();
    if (!rows.length) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    await supabase("fg_audit_events", { method: "POST", body: JSON.stringify({ actor_id: userId, event_type: "report.moderated", target_id: context.params.id, metadata: { status: body.status } }) });
    return NextResponse.json({ report: rows[0] });
  } catch { return NextResponse.json({ error: "Invalid moderation request." }, { status: 400 }); }
}
