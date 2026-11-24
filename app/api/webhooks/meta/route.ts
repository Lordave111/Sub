import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && process.env.META_WEBHOOK_VERIFY_TOKEN && token === process.env.META_WEBHOOK_VERIFY_TOKEN && challenge) return new NextResponse(challenge, { status: 200 });
  return NextResponse.json({ error: "Webhook verification failed." }, { status: 403 });
}
export async function POST(req: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return NextResponse.json({ error: "Meta webhook is not configured." }, { status: 503 });
  const signature = req.headers.get("x-hub-signature-256") || "";
  if (!/^sha256=[a-f0-9]{64}$/i.test(signature)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  const raw = await req.text();
  const expected = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a,b)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  // Acknowledge only. Provider-specific event processing is deliberately not enabled until
  // a business has completed OAuth consent and an account-to-organisation mapping exists.
  try { JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  return NextResponse.json({ received: true }, { status: 200 });
}
