import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to view your reports." }, { status: 401 });
  const response = await supabase("fg_reports?reporter_id=eq." + encodeURIComponent(userId) + "&select=id,category,channel,description,suspicious_url,amount_lost,currency,status,visibility,created_at&order=created_at.desc&limit=100");
  if (!response.ok) return NextResponse.json({ error: "Could not load reports. Apply the FraudGuard database migration first." }, { status: 503 });
  return NextResponse.json({ reports: await response.json() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in before submitting a report." }, { status: 401 });
  try {
    const body = await req.json();
    const category = ["phishing","impersonation","investment","payment","romance","job","other"].includes(body.category) ? body.category : "other";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const channel = typeof body.channel === "string" ? body.channel.slice(0,40) : "other";
    const suspiciousUrl = typeof body.suspicious_url === "string" ? body.suspicious_url.trim().slice(0,2048) : null;
    const amountLost = body.amount_lost === null || body.amount_lost === undefined || body.amount_lost === "" ? null : Number(body.amount_lost);
    if (description.length < 12 || description.length > 8000) return NextResponse.json({ error: "Description must be between 12 and 8,000 characters." }, { status: 400 });
    if (amountLost !== null && (!Number.isFinite(amountLost) || amountLost < 0 || amountLost > 100000000000)) return NextResponse.json({ error: "Enter a valid amount lost." }, { status: 400 });
    if (suspiciousUrl) { try { const parsed = new URL(suspiciousUrl); if (!["http:","https:"].includes(parsed.protocol)) throw new Error(); } catch { return NextResponse.json({ error: "Enter a valid HTTP or HTTPS URL." }, { status: 400 }); } }
    const response = await supabase("fg_reports", { method: "POST", body: JSON.stringify({ reporter_id: userId, category, channel, description, suspicious_url: suspiciousUrl, amount_lost: amountLost, visibility: "private", status: "pending_review" }) });
    if (!response.ok) return NextResponse.json({ error: "Report storage is not ready. Apply supabase/fraudguard.sql first." }, { status: 503 });
    const rows = await response.json();
    return NextResponse.json({ report: rows[0], message: "Report submitted privately for review." }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid report request." }, { status: 400 });
  }
}
