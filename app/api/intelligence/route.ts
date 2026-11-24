import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export async function GET() {
  try {
    const response = await supabase("fg_reports?status=eq.verified_pattern&visibility=eq.moderated_public&select=category,channel,description,created_at&order=created_at.desc&limit=50");
    if (!response.ok) return NextResponse.json({ patterns: [], configured: false, message: "Community intelligence will appear after the database migration and moderator review are enabled." });
    return NextResponse.json({ patterns: await response.json(), configured: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ patterns: [], configured: false, message: "Community intelligence is not configured." });
  }
}
