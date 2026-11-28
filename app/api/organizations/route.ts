import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to view workspaces." }, { status: 401 });
  const memberships = await supabase("fg_memberships?user_id=eq." + encodeURIComponent(userId) + "&select=organization_id,role,created_at");
  if (!memberships.ok) return NextResponse.json({ error: "Apply the FraudGuard database migration first." }, { status: 503 });
  const rows = await memberships.json();
  const ids = rows.map((row: { organization_id: string }) => row.organization_id);
  if (!ids.length) return NextResponse.json({ organizations: [] });
  const organizations = await supabase("fg_organizations?id=in.(" + ids.map(encodeURIComponent).join(",") + ")&select=id,name,created_at");
  if (!organizations.ok) return NextResponse.json({ error: "Could not load workspaces." }, { status: 500 });
  const orgs = await organizations.json();
  return NextResponse.json({ organizations: orgs.map((org: any) => ({ ...org, role: rows.find((m: any) => m.organization_id === org.id)?.role })) });
}

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign in to create a business workspace." }, { status: 401 });
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Workspace name must be 2–120 characters." }, { status: 400 });
    const created = await supabase("fg_organizations", { method: "POST", body: JSON.stringify({ name, created_by: userId }) });
    if (!created.ok) return NextResponse.json({ error: "Could not create workspace. Apply the database migration." }, { status: 503 });
    const org = (await created.json())[0];
    const membership = await supabase("fg_memberships", { method: "POST", body: JSON.stringify({ organization_id: org.id, user_id: userId, role: "owner" }) });
    if (!membership.ok) return NextResponse.json({ error: "Workspace created but owner membership failed. Contact support before using it." }, { status: 500 });
    await supabase("fg_audit_events", { method: "POST", body: JSON.stringify({ actor_id: userId, organization_id: org.id, event_type: "organization.created" }) });
    return NextResponse.json({ organization: { ...org, role: "owner" } }, { status: 201 });
  } catch { return NextResponse.json({ error: "Invalid workspace request." }, { status: 400 }); }
}
