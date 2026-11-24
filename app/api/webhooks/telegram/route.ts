import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected) return NextResponse.json({ error: "Telegram webhook is not configured." }, { status: 503 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== expected) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  // Updates are acknowledged without processing until a workspace has explicitly connected a bot.
  try { await req.json(); } catch { return NextResponse.json({ error: "Invalid update." }, { status: 400 }); }
  return NextResponse.json({ ok: true });
}
