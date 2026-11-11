import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return NextResponse.json({ error: "Sign in to manage subscriptions." }, { status: 401 });

    const [catalogResponse, subscriptionsResponse, ordersResponse] = await Promise.all([
      supabase("subscription_catalog?select=id,provider,category,description,plans,enabled&enabled=eq.true&order=provider.asc"),
      supabase("user_subscriptions?user_id=eq." + encodeURIComponent(userId) + "&select=id,catalog_id,provider,plan_name,account_identifier,status,auto_renew,started_at,expires_at,created_at&order=created_at.desc"),
      supabase("subscription_orders?user_id=eq." + encodeURIComponent(userId) + "&select=reference,provider,plan_name,amount,status,created_at&order=created_at.desc&limit=20")
    ]);
    if (!catalogResponse.ok || !subscriptionsResponse.ok || !ordersResponse.ok) {
      throw new Error("Subscription storage is not ready. Run supabase/subscriptions-migration.sql.");
    }
    return NextResponse.json({
      catalog: await catalogResponse.json(),
      subscriptions: await subscriptionsResponse.json(),
      orders: await ordersResponse.json()
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load subscriptions." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return NextResponse.json({ error: "Sign in to manage subscriptions." }, { status: 401 });
    const body = await req.json();
    if (typeof body.id !== "string" || typeof body.autoRenew !== "boolean") {
      return NextResponse.json({ error: "Choose a subscription and a valid renewal setting." }, { status: 400 });
    }
    const response = await supabase(
      "user_subscriptions?id=eq." + encodeURIComponent(body.id) +
      "&user_id=eq." + encodeURIComponent(userId) +
      "&status=eq.active",
      { method: "PATCH", body: JSON.stringify({ auto_renew: body.autoRenew, updated_at: new Date().toISOString() }) }
    );
    if (!response.ok) throw new Error("Could not update this subscription.");
    const rows = await response.json();
    if (!rows.length) return NextResponse.json({ error: "Active subscription not found." }, { status: 404 });
    return NextResponse.json({ subscription: rows[0] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Subscription update failed." }, { status: 500 });
  }
}
