import "server-only";
export function env(name: string) { const value = process.env[name]; if (!value) throw new Error(name + " is not configured."); return value; }
export function siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; }
export function nairaToKobo(amount: number) { return Math.round(amount * 100); }
export function requestId() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  return get("year") + get("month") + get("day") + get("hour") + get("minute") + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}
export async function supabase(path: string, init: RequestInit = {}) {
  const url = env("SUPABASE_URL"), key = process.env.SUPABASE_SECRET_KEY || env("SUPABASE_SERVICE_ROLE_KEY");
  return fetch(url + "/rest/v1/" + path, { ...init, headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}) }, cache: "no-store" });
}
