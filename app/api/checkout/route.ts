import { NextRequest, NextResponse } from "next/server";
import { env, nairaToKobo, siteUrl, supabase } from "@/lib/server";
const serviceIds: Record<string,string> = { mtn:"mtn", airtel:"airtel", glo:"glo", "9mobile":"etisalat" };
const dataIds: Record<string,string> = { mtn:"mtn-data", airtel:"airtel-data", glo:"glo-data", "9mobile":"etisalat-data" };
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { kind, network, phone, email, amount, variationCode, planName, markup } = body;
    if (!["data","airtime"].includes(kind) || !serviceIds[network] || !/^0[789][01]\d{8}$/.test(phone || "") || !/^\S+@\S+\.\S+$/.test(email || "")) return NextResponse.json({ error:"Invalid purchase details." }, { status:400 });
    const baseAmount = Number(amount), commission = Number(markup);
    if (!Number.isFinite(baseAmount) || baseAmount < 50 || baseAmount > 50000 || !Number.isFinite(commission) || commission < 0 || commission > 5000) return NextResponse.json({ error:"Invalid amount." }, { status:400 });
    if (kind === "data" && (!variationCode || !dataIds[network])) return NextResponse.json({ error:"Choose a valid data plan." }, { status:400 });
    const total = Math.round((baseAmount + commission) * 100) / 100;
    const reference = "SUB-" + crypto.randomUUID().replace(/-/g,"");
    const inserted = await supabase("orders", { method:"POST", body:JSON.stringify({ reference, kind, network, phone, email, amount:baseAmount, commission, total, variation_code:variationCode || null, plan_name:planName || null, status:"pending_payment" }) });
    if (!inserted.ok) throw new Error("Order storage is not ready. Configure Supabase using the included SQL schema.");
    const pay = await fetch("https://api.paystack.co/transaction/initialize", { method:"POST", headers:{ Authorization:"Bearer " + env("PAYSTACK_SECRET_KEY"), "Content-Type":"application/json" }, body:JSON.stringify({ email, amount:String(nairaToKobo(total)), currency:"NGN", reference, callback_url:siteUrl()+"/payment/verify", metadata:{ order_reference:reference, kind, network, phone } }) });
    const result = await pay.json();
    if (!pay.ok || !result.status || !result.data?.authorization_url) throw new Error(result.message || "Could not initialize Paystack payment.");
    return NextResponse.json({ authorizationUrl:result.data.authorization_url });
  } catch(e) { return NextResponse.json({ error:e instanceof Error ? e.message : "Checkout failed." }, { status:500 }); }
}
