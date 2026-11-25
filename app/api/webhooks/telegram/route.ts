import { NextRequest, NextResponse } from "next/server";
import { fraudSafeReply } from "@/lib/chat-assistant";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret || !token) return NextResponse.json({ error: "Telegram bot is not configured." }, { status: 503 });
  if (req.headers.get("x-telegram-bot-api-secret-token") !== secret) return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  try {
    const update = await req.json();
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = typeof message?.text === "string" ? message.text.trim() : "";
    if (!chatId || message?.chat?.type !== "private" || !text) return NextResponse.json({ ok: true });
    const reply = await fraudSafeReply(text, "telegram");
    const sent = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply, disable_web_page_preview: true }),
      cache: "no-store"
    });
    if (!sent.ok) return NextResponse.json({ error: "Telegram could not deliver the reply." }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not process this Telegram update." }, { status: 400 });
  }
}
