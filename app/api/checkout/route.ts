import { NextRequest, NextResponse } from "next/server";
import { env, nairaToKobo, siteUrl, supabase } from "@/lib/server";
import { getAuthenticatedUserId } from "@/lib/auth";
const serviceIds: Record<string,string> = { mtn:"mtn", airtel:"airtel", glo:"glo", "9mobile":"etisalat" };
const dataIds: Record<string,string> = { mtn:"mtn-data", airtel:"airtel-data", glo:"glo-data", "9mobile":"etisalat-data" };
const discos: Record<string,string> = {"ibadan-electric":"IBEDC","ikeja-electric":"IKEDC","eko-electric":"EKEDC","abuja-electric":"AEDC","jos-electric":"JED","kaduna-electric":"KAEDCO","kano-electric":"KEDCO","portharcourt-electric":"PHED","enugu-electric":"EEDC","benin-electric":"BEDC"};
export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(req);
    if (!userId) return NextResponse.json({ error:"Sign in to make a purchase." }, { status:401 });
    const body = await req.json();
    const { kind, network, phone, email, amount, variationCode, disco, meterNumber } = body;
    if (!["data","airtime","electricity"].includes(kind) || (kind !== "electricity" && !serviceIds[network]) || !/^0[789][01]\d{8}$/.test(phone || "") || !/^\S+@\S+\.\S+$/.test(email || "")) return NextResponse.json({ error:"Invalid purchase details." }, { status:400 });
    let baseAmount = 0, verifiedPlanName: string | null = null;
    if (kind === "electricity") {
      if (!discos[disco] || !/^\d{8,13}$/.test(meterNumber || "")) return NextResponse.json({error:"Choose a valid electricity provider and meter number."},{status:400});
      const base = process.env.VTU_SANDBOX === "false" ? "https://vtpass.com/api" : "https://sandbox.vtpass.com/api";
      const check = await fetch(base + "/merchant-verify", {method:"POST",headers:{"Content-Type":"application/json","api-key":env("VTPASS_API_KEY"),"secret-key":env("VTPASS_SECRET_KEY")},body:JSON.stringify({serviceID:disco,billersCode:meterNumber,type:"prepaid"})});
      const result = await check.json();
      if (!check.ok || String(result.code) !== "000" || result.content?.WrongBillersCode === true || String(result.content?.Meter_Type || "PREPAID").toLowerCase() !== "prepaid") return NextResponse.json({error:result.response_description || "We could not verify this prepaid meter."},{status:400});
      const customerName = String(result.content?.Customer_Name || "Prepaid customer");
      baseAmount = Number(amount);
      const minimum = Math.max(1000, Number(result.content?.Min_Purchase_Amount || result.content?.Minimum_Amount || 1000));
      if (!Number.isFinite(baseAmount) || baseAmount < minimum || baseAmount > 50000) return NextResponse.json({error:"Enter an amount between the provider minimum of ₦"+minimum.toLocaleString("en-NG")+" and ₦50,000."},{status:400});
      verifiedPlanName = "Prepaid electricity · " + discos[disco] + " · " + customerName;
    } else if (kind === "airtime") {
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
    const commissionPercent = 10;
    const commission = Math.round(baseAmount * commissionPercent) / 100;
    const total = Math.round((baseAmount + commission) * 100) / 100;
    const reference = "SUB-" + crypto.randomUUID().replace(/-/g,"");
    const inserted = await supabase("orders", { method:"POST", body:JSON.stringify({ reference, user_id:userId, kind, network:kind === "electricity" ? disco : network, phone, billers_code:kind === "electricity" ? meterNumber : null, email, amount:baseAmount, commission, total, variation_code:kind === "data" ? variationCode : kind === "electricity" ? "prepaid" : null, plan_name:verifiedPlanName, status:"pending_payment" }) });
    if (!inserted.ok) throw new Error("Order storage is not ready. Apply the Supabase electricity migration and check your schema.");
    const pay = await fetch("https://api.paystack.co/transaction/initialize", { method:"POST", headers:{ Authorization:"Bearer " + env("PAYSTACK_SECRET_KEY"), "Content-Type":"application/json" }, body:JSON.stringify({ email, amount:String(nairaToKobo(total)), currency:"NGN", reference, callback_url:siteUrl()+"/payment/verify", metadata:{ order_reference:reference, kind, network:kind === "electricity" ? disco : network, phone, meter_number:kind === "electricity" ? meterNumber : undefined } }) });
    const result = await pay.json();
    if (!pay.ok || !result.status || !result.data?.authorization_url) throw new Error(result.message || "Could not initialize Paystack payment.");
    return NextResponse.json({ authorizationUrl:result.data.authorization_url });
  } catch(e) { return NextResponse.json({ error:e instanceof Error ? e.message : "Checkout failed." }, { status:500 }); }
}