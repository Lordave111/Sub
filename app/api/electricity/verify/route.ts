import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/server";
const discos = new Set(["ibadan-electric","ikeja-electric","eko-electric","abuja-electric","jos-electric","kaduna-electric","kano-electric","portharcourt-electric","enugu-electric","benin-electric"]);
export async function POST(req: NextRequest) {
  try {
    const {disco,meterNumber} = await req.json();
    if (!discos.has(disco) || !/^\d{8,13}$/.test(meterNumber || "")) return NextResponse.json({error:"Enter a valid meter number and electricity provider."},{status:400});
    const base = process.env.VTU_SANDBOX === "false" ? "https://vtpass.com/api" : "https://sandbox.vtpass.com/api";
    const response = await fetch(base+"/merchant-verify",{method:"POST",headers:{"Content-Type":"application/json","api-key":env("VTPASS_API_KEY"),"secret-key":env("VTPASS_SECRET_KEY")},body:JSON.stringify({serviceID:disco,billersCode:meterNumber,type:"prepaid"}),cache:"no-store"});
    const data = await response.json();
    const meter = data?.content || {};
    if (!response.ok || String(data.code) !== "000" || meter.WrongBillersCode === true || String(meter.Meter_Type || "PREPAID").toLowerCase() !== "prepaid") return NextResponse.json({error:data.response_description || "We could not verify this prepaid meter. Check the provider and number."},{status:400});
    return NextResponse.json({customerName:meter.Customer_Name || "Prepaid customer",address:meter.Address || "",minimumAmount:Number(meter.Min_Purchase_Amount || meter.Minimum_Amount || 1000),serviceBand:meter.Service_Band || null});
  } catch(e) { return NextResponse.json({error:e instanceof Error?e.message:"Meter verification failed."},{status:500}); }
}