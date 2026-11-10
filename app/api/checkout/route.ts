import { NextRequest, NextResponse } from "next/server";
import { env, nairaToKobo, siteUrl, supabase } from "@/lib/server";
import { getAuthenticatedUserId } from "@/lib/auth";
const serviceIds: Record<string,string> = { mtn:"mtn", airtel:"airtel", glo:"glo", "9mobile":"etisalat" };
const dataIds: Record<string,string> = { mtn:"mtn-data", airtel:"airtel-data", glo:"glo-data", "9mobile":"etisalat-data" };
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return NextResponse.json({ error:"Sign in to make a purchase." }, { status:401 });
    const body = await req.json();
    const { kind, network, phone, email, amount, variationCode } = body;
    if (!["data","airtime"].includes(kind) || !serviceIds[network] || !/^0[789][01]\d{8}$/.test(phone || "") || !/^\S+@\S+\.\S+$/.test(email || "")) return NextResponse.json({ error:"Invalid purchase details." }, { status:400 });
    let baseAmount = 0, verifiedPlanName: string | null = null;
    if (kind === "airtime") {
      baseAmount = Number(amount);
      if (!Number.isFinite(baseAmount) || baseAmount < 50 || baseAmount > 50000) return NextResponse.json({ error:"Airtime must be between ₦50 and ₦50,000." }, { status:400 });
    } else {
      if (!variationCode || !dataIds[network]) return NextResponse.json({ error:"Choose a valid data plan." }, { status:400 });
      const base = process.env.VTU_SANDBOX === "false" ? "https://vtpass.com/api" : "https://sandbox.vtpass.com/api";
      const response = await fetch(base + "/service-variations?serviceID=" + dataIds[network], { headers:{ "api-key":env("VTPASS_API_KEY"), "public-key":env("VTPASS_PUBLIC_KEY") }, cache:"no-store" });
      const catalog = await response.json();
      const variations = catalog?.content?.varations || catalog?.content?.variations || [];
      const chosen = variations.find((v: any) => String(v.variation_code) === String(variationCode));
      if (!response.ok || !chosen) return NextResponse.json({ error:"That data plan is no longer available. Refresh the plans and try again." }, { status:400 });
      baseAmount = Number(chosen.variation_amount);
      verifiedPlanName = String(chosen.name || "Data bundle");
      if (!Number.isFinite(baseAmount) || baseAmount <= 0) throw new Error("Provider returned an invalid plan price.");
    }
    const commissionPercent = Number(process.env.COMMISSION_PERCENT ?? "20");
    if (!Number.isFinite(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) throw new Error("Invalid server commission percentage.");
    const commission = Math.round(baseAmount * commissionPercent) / 100;
    const total = Math.round((baseAmount + commission) * 100) / 100;
    const reference = "SUB-" + crypto.randomUUID().replace(/-/g,"");
    const inserted = await supabase("orders", { method:"POST", body:JSON.stringify({ reference, user_id:userId, kind, network, phone, email, amount:baseAmount, commission, total, variation_code:kind === "data" ? variationCode : null, plan_name:verifiedPlanName, status:"pending_payment" }) });
    if (!inserted.ok) throw new Error("Order storage is not ready. Configure Supabase using the included SQL schema.");
    const pay = await fetch("https://api.paystack.co/transaction/initialize", { method:"POST", headers:{ Authorization:"Bearer " + env("PAYSTACK_SECRET_KEY"), "Content-Type":"application/json" }, body:JSON.stringify({ email, amount:String(nairaToKobo(total)), currency:"NGN", reference, callback_url:siteUrl()+"/payment/verify", metadata:{ order_reference:reference, kind, network, phone } }) });
    const result = await pay.json();
    if (!pay.ok || !result.status || !result.data?.authorization_url) throw new Error(result.message || "Could not initialize Paystack payment.");
    return NextResponse.json({ authorizationUrl:result.data.authorization_url });
  } catch(e) { return NextResponse.json({ error:e instanceof Error ? e.message : "Checkout failed." }, { status:500 }); }
}
