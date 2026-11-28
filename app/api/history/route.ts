import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to view scan history." }, { status: 401 });
  const response = await supabase("fg_scans?user_id=eq." + encodeURIComponent(userId) + "&select=id,scan_type,risk_level,score,summary,signals,created_at&order=created_at.desc&limit=100");
  if (!response.ok) return NextResponse.json({ error: "Scan history is not ready. Apply the database migration." }, { status: 503 });
  return NextResponse.json({ scans: await response.json() }, { headers: { "Cache-Control": "no-store" } });
}
