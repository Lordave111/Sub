import { NextResponse } from "next/server";
import { supabase } from "@/lib/server";

export const runtime = "nodejs";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(name + " is not configured.");
  return value;
}
async function verifyState(state: string) {
  const parts = state.split(".");
  if (parts.length !== 2) throw new Error("Invalid authorization state.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env("SOCIAL_OAUTH_STATE_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const signature = Buffer.from(parts[1], "base64url");
  const valid = await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(parts[0]));
  if (!valid) throw new Error("Authorization state could not be verified.");
  const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  if (!payload.userId || !["meta", "google"].includes(payload.provider) || payload.exp < Date.now()) throw new Error("Authorization expired. Please try again.");
  return payload as { userId: string; provider: "meta" | "google"; exp: number };
}
async function encryptToken(value: string) {
  const raw = Buffer.from(env("SOCIAL_TOKEN_ENCRYPTION_KEY"), "base64");
  if (raw.length !== 32) throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(value));
  return Buffer.from(iv).toString("base64") + "." + Buffer.from(encrypted).toString("base64");
}
async function exchange(provider: "meta" | "google", code: string, redirectUri: string) {
  if (provider === "meta") {
    const params = new URLSearchParams({ client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), redirect_uri: redirectUri, code });
    const response = await fetch("https://graph.facebook.com/v21.0/oauth/access_token?" + params.toString(), { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.access_token) throw new Error(data.error?.message || "Meta authorization failed.");
    const profileResponse = await fetch("https://graph.facebook.com/me?fields=id,name&access_token=" + encodeURIComponent(data.access_token), { cache: "no-store" });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.id) throw new Error("Could not verify the connected Meta account.");
    return { accessToken: data.access_token as string, refreshToken: "", expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null, accountId: String(profile.id), accountName: String(profile.name || "Meta account"), scopes: ["pages_show_list", "pages_read_engagement", "instagram_basic"] };
  }
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env("GOOGLE_CLIENT_ID"), client_secret: env("GOOGLE_CLIENT_SECRET"), redirect_uri: redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Google authorization failed.");
  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: "Bearer " + data.access_token }, cache: "no-store" });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.id) throw new Error("Could not verify the connected Google account.");
  return { accessToken: data.access_token as string, refreshToken: String(data.refresh_token || ""), expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null, accountId: String(profile.id), accountName: String(profile.name || profile.email || "Google account"), scopes: ["youtube.readonly", "openid", "email", "profile"] };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const fail = (message: string) => NextResponse.redirect(new URL("/?social_error=" + encodeURIComponent(message), origin));
  if (url.searchParams.get("error")) return fail("Authorization was cancelled or denied by the provider.");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("The provider did not return a valid authorization response.");
  try {
    const session = await verifyState(state);
    const tokens = await exchange(session.provider, code, origin + "/api/social/callback");
    const accessTokenEnc = await encryptToken(tokens.accessToken);
    const refreshTokenEnc = tokens.refreshToken ? await encryptToken(tokens.refreshToken) : null;
    const response = await supabase("fg_social_connections?on_conflict=user_id,provider,external_account_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: session.userId, provider: session.provider, external_account_id: tokens.accountId, account_name: tokens.accountName, access_token_enc: accessTokenEnc, refresh_token_enc: refreshTokenEnc, token_expires_at: tokens.expiresAt, scopes: tokens.scopes, status: "connected", updated_at: new Date().toISOString() })
    });
    if (!response.ok) throw new Error("Account authorization succeeded, but secure storage failed. Please retry.");
    return NextResponse.redirect(new URL("/?social_connected=" + session.provider, origin));
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not complete social account connection.");
  }
}
