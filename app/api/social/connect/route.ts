import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";

export const runtime = "nodejs";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(name + " is not configured in Vercel.");
  return value;
}
function b64url(value: string) {
  return Buffer.from(value).toString("base64url");
}
async function signState(payload: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(required("SOCIAL_OAUTH_STATE_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return payload + "." + Buffer.from(signature).toString("base64url");
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in before connecting a social account." }, { status: 401 });
  try {
    const body = await request.json();
    const provider = body.provider;
    if (provider !== "meta" && provider !== "google") return NextResponse.json({ error: "This provider is not enabled yet." }, { status: 400 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const redirectUri = origin + "/api/social/callback";
    const statePayload = b64url(JSON.stringify({ userId, provider, exp: Date.now() + 10 * 60 * 1000 }));
    const state = await signState(statePayload);
    let authorizationUrl: URL;
    if (provider === "meta") {
      authorizationUrl = new URL("https://www.facebook.com/v21.0/dialog/oauth");
      authorizationUrl.searchParams.set("client_id", required("META_APP_ID"));
      authorizationUrl.searchParams.set("redirect_uri", redirectUri);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,instagram_basic");
      authorizationUrl.searchParams.set("state", state);
    } else {
      authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizationUrl.searchParams.set("client_id", required("GOOGLE_CLIENT_ID"));
      authorizationUrl.searchParams.set("redirect_uri", redirectUri);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", "openid email profile https://www.googleapis.com/auth/youtube.readonly");
      authorizationUrl.searchParams.set("access_type", "offline");
      authorizationUrl.searchParams.set("prompt", "consent");
      authorizationUrl.searchParams.set("state", state);
    }
    return NextResponse.json({ authorization_url: authorizationUrl.toString() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Social connection is not configured." }, { status: 503 });
  }
}
