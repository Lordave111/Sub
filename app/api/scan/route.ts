import { NextResponse } from "next/server";

type ScanType = "message" | "link" | "investment";
type Signal = { title: string; detail: string; severity: "high" | "medium" | "low"; points: number };

const patterns: { regex: RegExp; title: string; detail: string; severity: Signal["severity"]; points: number }[] = [
  { regex: /guarantee(?:d)?\s+(?:profit|return|income)|risk[- ]free\s+(?:profit|investment)/i, title: "Guaranteed returns", detail: "Promises of guaranteed profit or risk-free investment are a major warning sign.", severity: "high", points: 28 },
  { regex: /(?:\d{2,3}\s?%|double your money|10x your money).{0,45}(?:daily|weekly|monthly|return|profit)|(?:daily|weekly|monthly).{0,45}(?:\d{2,3}\s?%|double your money)/i, title: "Unusually high returns", detail: "The offer appears to promise unusually high or frequent returns.", severity: "high", points: 24 },
  { regex: /(?:pay|send|transfer).{0,35}(?:registration|activation|withdrawal|unlock|release)\s?(?:fee|charge)|upfront fee/i, title: "Upfront payment request", detail: "A fee is requested before a promised service, reward or withdrawal.", severity: "high", points: 20 },
  { regex: /(?:send|share|tell me|provide).{0,35}(?:otp|one[- ]time password|verification code|pin|password)/i, title: "Request for secret credentials", detail: "The content asks for an OTP, PIN, password or verification code. Never share these.", severity: "high", points: 30 },
  { regex: /(?:act now|immediately|last chance|limited time|within \d+ minutes|account.{0,20}(?:blocked|suspended|closed))/i, title: "Urgency or threat pressure", detail: "Pressure or threats are used to rush a decision before you can verify it.", severity: "medium", points: 13 },
  { regex: /(?:invite|refer|recruit).{0,50}(?:earn|commission|bonus|profit)|(?:earn|commission|bonus).{0,50}(?:invite|refer|recruit)/i, title: "Recruitment-based earnings", detail: "Rewards appear to depend on bringing more people into the scheme.", severity: "medium", points: 16 },
  { regex: /(?:won|winner|claim your prize|free gift|giveaway).{0,70}(?:pay|fee|transfer|bank|account)/i, title: "Prize or giveaway fee", detail: "A prize claim is linked to a payment or financial detail request.", severity: "high", points: 18 },
  { regex: /(?:whatsapp|bank|support|admin).{0,35}(?:send|share).{0,20}(?:code|otp|pin)/i, title: "Possible impersonation", detail: "A person claiming to represent a service asks for a security code.", severity: "high", points: 22 },
];

function inspectUrl(raw: string): Signal[] {
  const signals: Signal[] = [];
  const matches = raw.match(/https?:\/\/[^\s<>"']+|www\.[^\s<>"']+/gi) || [];
  for (const match of matches.slice(0, 8)) {
    const candidate = match.replace(/[),.!?]+$/, "");
    try {
      const url = new URL(candidate.startsWith("www.") ? "https://" + candidate : candidate);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== "https:") signals.push({ title: "No HTTPS encryption", detail: host + " uses HTTP. Do not enter personal or payment details unless you can verify the site independently.", severity: "medium", points: 12 });
      if (url.username || url.password) signals.push({ title: "Unusual URL credentials", detail: "The URL contains embedded login credentials, which can be used to disguise a destination.", severity: "high", points: 22 });
      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) signals.push({ title: "IP-address website", detail: "The link points directly to an IP address instead of a recognisable domain.", severity: "medium", points: 14 });
      if (host.startsWith("xn--") || host.split(".").some(part => part.startsWith("xn--"))) signals.push({ title: "Internationalised domain", detail: "The domain uses encoded characters. Check carefully for look-alike letters.", severity: "medium", points: 13 });
      if (host.split(".").length > 4) signals.push({ title: "Unusually nested subdomains", detail: "The address contains many subdomain levels. Check the registered domain carefully.", severity: "low", points: 7 });
      if (/(login|verify|secure|wallet|claim|gift|bonus|airdrop|update|account)/i.test(url.pathname + url.search)) signals.push({ title: "Sensitive-action URL wording", detail: "The URL contains words often used in account-verification or reward lures. This alone does not prove fraud.", severity: "low", points: 5 });
    } catch {
      signals.push({ title: "Malformed web address", detail: "At least one link could not be parsed as a standard web address.", severity: "medium", points: 10 });
    }
  }
  const shorteners = /(?:bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly|rb\.gy|shorturl\.at)/i;
  if (shorteners.test(raw)) signals.push({ title: "Shortened link", detail: "A shortened URL hides its final destination. Expand and verify it before opening.", severity: "medium", points: 10 });
  return signals;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const type: ScanType = body.type === "link" || body.type === "investment" ? body.type : "message";
    if (content.length < 8) return NextResponse.json({ error: "Please provide at least 8 characters to inspect." }, { status: 400 });
    if (content.length > 12000) return NextResponse.json({ error: "Please keep each scan under 12,000 characters." }, { status: 400 });

    const signals: Signal[] = [];
    for (const pattern of patterns) {
      if (pattern.regex.test(content)) signals.push({ title: pattern.title, detail: pattern.detail, severity: pattern.severity, points: pattern.points });
    }
    signals.push(...inspectUrl(content));
    if (type === "investment" && !signals.some((s) => /return|recruit|upfront/i.test(s.title))) {
      if (/\b(?:invest|investment|trading|forex|crypto|staking|roi|capital)\b/i.test(content)) {
        signals.push({ title: "Investment requires independent verification", detail: "No automated text check can establish that an investment is licensed, solvent or legitimate. Verify the operator and regulatory status independently.", severity: "medium", points: 8 });
      }
    }
    const unique = signals.filter((signal, index, all) => all.findIndex((other) => other.title === signal.title) === index);
    const score = Math.min(100, unique.reduce((sum, signal) => sum + signal.points, 0));
    const level = score >= 45 ? "high" : score >= 20 ? "medium" : "low";
    const verdict = level === "high" ? "Several strong warning signs were found" : level === "medium" ? "Some warning signs need your attention" : "Few obvious warning signs were detected";
    const summary = level === "high"
      ? "Do not send money, share codes or follow the instructions until you have independently verified the sender and the organisation."
      : level === "medium"
        ? "Pause and verify the sender, website and claims using a trusted channel you find yourself."
        : "The basic checks did not find many known warning signs. This does not mean the content, person or website is safe.";
    const recommendations = level === "high"
      ? ["Do not transfer money or pay an unlocking or registration fee.", "Never share OTPs, PINs, passwords or recovery codes.", "Contact the real organisation using its official app or website.", "If you already paid, contact your bank or payment provider immediately."]
      : level === "medium"
        ? ["Verify the sender using a separate, trusted contact method.", "Search for independent evidence and regulatory registration.", "Do not open shortened or unfamiliar links or download unexpected files."]
        : ["Check the exact domain and account identity before proceeding.", "Be cautious of any later request for money or confidential information.", "Ask someone you trust to review high-value decisions."];
    return NextResponse.json({
      score, level, verdict, summary,
      signals: unique.map(({ title, detail, severity }) => ({ title, detail, severity })),
      recommendations, checkedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Invalid scan request." }, { status: 400 });
  }
}
