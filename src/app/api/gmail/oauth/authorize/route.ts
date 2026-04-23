import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { GMAIL_REQUIRED_SCOPES } from "@/lib/gmail/scopes";
import { env } from "@/lib/env";

const COOKIE_NAME = "gmail_oauth_return_to";
const COOKIE_MAX_AGE = 600; // 10 min

/**
 * GET /api/gmail/oauth/authorize
 * Redirects to Google OAuth consent with Gmail scopes. Caller should be authenticated.
 * Query: return_to (optional) — path to redirect after connect (e.g. /crm/...).
 */
export async function GET(request: NextRequest) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Gmail OAuth not configured (missing GOOGLE_CLIENT_ID)" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/signin", request.nextUrl.origin));
  }

  const returnTo = request.nextUrl.searchParams.get("return_to") ?? "/crm/mail";
  // Use canonical app URL so redirect_uri matches exactly what you register in Google Console.
  const baseUrl = env.META_URL.replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/gmail/oauth/callback`;
  const scope = GMAIL_REQUIRED_SCOPES.join(" ");
  const state = crypto.randomUUID();

 
  const { data: existingConnection } = await supabase
    .from("user_gmail_connections")
    .select("gmail_address")
    .eq("user_id", user.id)
    .maybeSingle();
  const loginHint = existingConnection?.gmail_address ?? null;

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", redirectUri);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", scope);
  googleUrl.searchParams.set("access_type", "offline");
  googleUrl.searchParams.set("prompt", "consent");
  googleUrl.searchParams.set("state", state);
  if (loginHint) {
    googleUrl.searchParams.set("login_hint", loginHint);
  }

  const res = NextResponse.redirect(googleUrl.toString());
  res.cookies.set(COOKIE_NAME, returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
