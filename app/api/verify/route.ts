import { NextRequest, NextResponse } from "next/server";
import { env, requestId, supabase } from "@/lib/server";
export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();
    if (typeof reference !== "string" || !reference.startsWith("SUB-")) return NextResponse.json({ error:"Invalid reference" }, { status:400 });
    const verified = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), { headers:{ Authorization:"Bearer " + env("PAYSTACK_SECRET_KEY") }, cache:"no-store" });
    const payment = await verified.json();
    if (!verified.ok || !payment.status || payment.data?.status !== "success") return NextResponse.json({ error:"Payment has not been confirmed." }, { status:402 });
    const rowsRes = await supabase("orders?reference=eq."+encodeURIComponent(reference)+"&select=*");
    const rows = await rowsRes.json();
    const order = rows?.[0];
    if (!order) return NextResponse.json({ error:"Order not found." }, { status:404 });
    if (Number(payment.data.amount) !== Math.round(Number(order.total)*100) || payment.data.currency !== "NGN") return NextResponse.json({ error:"Payment amount mismatch." }, { status:400 });
    if (order.status === "delivered") {
      const stored = order.provider_response || {};
      return NextResponse.json({status:"delivered",message:"Your purchase was delivered.",token:order.kind === "electricity" ? (stored.Token || stored.purchased_code || stored.token || null) : null,units:stored.Units || null});
    }
    if (order.status === "processing" || order.status === "pending_provider") return NextResponse.json({ status:order.status, message:"This order has already been submitted. Check again shortly." });
    const claim = await supabase("orders?reference=eq."+encodeURIComponent(reference)+"&status=eq.pending_payment", { method:"PATCH", body:JSON.stringify({ status:"processing", paystack_reference:reference }) });
    const claimed = await claim.json();
    if (!claimed?.length) return NextResponse.json({ status:"processing", message:"Order is already being processed." });
    const sandbox = process.env.VTU_SANDBOX !== "false";
    const serviceID = order.kind === "airtime" ? ({mtn:"mtn",airtel:"airtel",glo:"glo","9mobile":"etisalat"} as any)[order.network] : order.kind === "electricity" ? order.network : ({mtn:"mtn-data",airtel:"airtel-data",glo:"glo-data","9mobile":"etisalat-data"} as any)[order.network];
    const payload: Record<string,unknown> = { request_id:requestId(), serviceID, phone:order.phone, email:order.email };
    if (order.kind === "airtime") payload.amount = order.amount;
    else if (order.kind === "electricity") { payload.billersCode = order.billers_code; payload.variation_code = "prepaid"; payload.amount = order.amount; }
    else payload.variation_code = order.variation_code;
    const vend = await fetch((sandbox ? "https://sandbox.vtpass.com/api" : "https://vtpass.com/api")+"/pay", { method:"POST", headers:{ "Content-Type":"application/json", "api-key":env("VTPASS_API_KEY"), "secret-key":env("VTPASS_SECRET_KEY") }, body:JSON.stringify(payload) });
    const result = await vend.json();
    const code = String(result.code || "");
    const providerStatus = result?.content?.transactions?.status || "";
    const delivered = code === "000" || providerStatus.toLowerCase() === "delivered";
    const pending = code === "099" || providerStatus.toLowerCase() === "pending";
    await supabase("orders?reference=eq."+encodeURIComponent(reference), { method:"PATCH", body:JSON.stringify({ status:delivered ? "delivered" : pending ? "pending_provider" : "failed", provider_reference:result.requestId || result.content?.transactions?.transactionId || null, provider_response:result, delivered_at:delivered ? new Date().toISOString() : null }) });
    return NextResponse.json({ status:delivered ? "delivered" : pending ? "pending_provider" : "failed", message:delivered ? "Your purchase was delivered." : pending ? "Your provider is processing the order. Please check back shortly." : "The provider could not complete this order. Contact support with your reference.", token:order.kind === "electricity" ? (result.Token || result.purchased_code || result.token || null) : null, units:order.kind === "electricity" ? (result.Units || null) : null, customerName:order.kind === "electricity" ? (result.CustomerName || null) : null });
  } catch(e) { return NextResponse.json({ error:e instanceof Error ? e.message : "Verification failed." }, { status:500 }); }
}