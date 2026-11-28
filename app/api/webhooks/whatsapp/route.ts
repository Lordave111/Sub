import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { fraudSafeReply } from "@/lib/chat-assistant";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ error: "WhatsApp webhook verification failed." }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.META_APP_SECRET;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!appSecret || !accessToken) return NextResponse.json({ error: "WhatsApp Business messaging is not configured." }, { status: 503 });
  const signature = req.headers.get("x-hub-signature-256") || "";
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  const raw = await req.text();
  const expected = "sha256=" + createHmac("sha256", appSecret).update(raw).digest("hex");
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  try {
    const body = JSON.parse(raw);
    const messages = (body.entry || []).flatMap((entry: any) => (entry.changes || []).filter((change: any) => change.field === "messages").flatMap((change: any) => {
      const value = change.value || {};
      return (value.messages || []).map((message: any) => ({ message, phoneNumberId: value.metadata?.phone_number_id }));
    }));
    for (const item of messages.slice(0, 5)) {
      const message = item.message;
      if (!message?.from || message.type !== "text" || !message.text?.body) continue;
      const phoneNumberId = String(item.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || "");
      if (!phoneNumberId) continue;
      const reply = await fraudSafeReply(String(message.text.body), "whatsapp");
      const response = await fetch("https://graph.facebook.com/v21.0/" + encodeURIComponent(phoneNumberId) + "/messages", {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: String(message.from), type: "text", text: { preview_url: false, body: reply.replace(/\*/g, "") } }),
        cache: "no-store"
      });
      if (!response.ok) return NextResponse.json({ error: "WhatsApp could not deliver a reply. Check the Business Platform token and permissions." }, { status: 502 });
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Could not process this WhatsApp webhook." }, { status: 400 });
  }
}
