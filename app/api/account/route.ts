import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { supabase } from "@/lib/server";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return NextResponse.json({ error: "Sign in to view your account." }, { status: 401 });
    const [ordersResponse, walletResponse] = await Promise.all([
      supabase("orders?user_id=eq." + encodeURIComponent(userId) + "&select=reference,kind,network,phone,billers_code,amount,total,plan_name,status,created_at,delivered_at&order=created_at.desc&limit=30"),
      supabase("wallet_transactions?user_id=eq." + encodeURIComponent(userId) + "&select=amount,type")
    ]);
    if (!ordersResponse.ok) throw new Error("Could not load your purchase history.");
    const orders = await ordersResponse.json();
    const walletRows = walletResponse.ok ? await walletResponse.json() : [];
    const walletBalance = walletRows.reduce((sum: number, row: any) => sum + (row.type === "credit" ? 1 : -1) * Number(row.amount || 0), 0);
    return NextResponse.json({
      walletBalance,
      orders,
      stats: {
        totalOrders: orders.length,
        delivered: orders.filter((o: any) => o.status === "delivered").length,
        pending: orders.filter((o: any) => ["pending_payment", "processing", "pending_provider"].includes(o.status)).length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Account request failed." }, { status: 500 });
  }
}
