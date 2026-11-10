import { env } from "@/lib/server";

export async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return null;
  const response = await fetch(env("SUPABASE_URL") + "/auth/v1/user", {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      Authorization: "Bearer " + token,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const user = await response.json();
  return typeof user.id === "string" ? user.id : null;
}
