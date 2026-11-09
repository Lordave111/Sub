import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/server";
const services: Record<string,string> = { mtn:"mtn-data", airtel:"airtel-data", glo:"glo-data", "9mobile":"etisalat-data" };
export async function GET(req: NextRequest) {
  const network = req.nextUrl.searchParams.get("network") || "";
  const serviceID = services[network];
  if (!serviceID) return NextResponse.json({ error:"Unsupported network" }, { status:400 });
  try {
    const base = process.env.VTU_SANDBOX === "false" ? "https://vtpass.com/api" : "https://sandbox.vtpass.com/api";
    const response = await fetch(base + "/service-variations?serviceID=" + serviceID, { headers: { "api-key": env("VTPASS_API_KEY"), "public-key": env("VTPASS_PUBLIC_KEY") }, cache:"no-store" });
    const data = await response.json();
    const variations = data?.content?.varations || data?.content?.variations || [];
    const plans = variations.map((v: any) => ({ variation_code:String(v.variation_code), name:String(v.name), variation_amount:String(v.variation_amount), fixedPrice:String(v.fixedPrice ?? "Yes") }));
    return NextResponse.json({ plans });
  } catch (e) { return NextResponse.json({ error:e instanceof Error ? e.message : "Could not load data plans" }, { status:500 }); }
}
