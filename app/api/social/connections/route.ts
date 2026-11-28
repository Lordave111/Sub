import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to view connected accounts." }, { status: 401 });
  const response = await supabase("fg_social_connections?select=id,provider,account_name,scopes,status,connected_at,token_expires_at&order=connected_at.desc&user_id=eq." + encodeURIComponent(userId));
  if (!response.ok) return NextResponse.json({ error: "Connected-account storage is not ready. In Supabase → SQL Editor, run the repository file supabase/social-connections.sql, then reload this page." }, { status: 503 });
  return NextResponse.json({ connections: await response.json() });
}

export async function DELETE(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to manage connected accounts." }, { status: 401 });
  const body = await request.json();
  if (typeof body.id !== "string") return NextResponse.json({ error: "Connection ID is required." }, { status: 400 });
  const response = await supabase("fg_social_connections?id=eq." + encodeURIComponent(body.id) + "&user_id=eq." + encodeURIComponent(userId), { method: "DELETE", headers: { Prefer: "return=minimal" } });
  if (!response.ok) return NextResponse.json({ error: "Could not remove this connection." }, { status: 500 });
  return NextResponse.json({ success: true });
}
