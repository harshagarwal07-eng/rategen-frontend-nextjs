import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/data-access/auth";
import { env } from "@/lib/env";

const COOKIE_NAME = "gmail_oauth_return_to";
const DEFAULT_RETURN_TO = "/crm/mail";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const PROFILE_URL = "https://gmail.googleapis.com/gmail/v1/users/me/profile";

function getReturnTo(request: NextRequest): string {
  const raw = request.cookies.get(COOKIE_NAME)?.value?.trim();
  if (!raw || raw === "/") return DEFAULT_RETURN_TO;
  return raw;
}

/**
 * GET /api/gmail/oauth/callback
 * Exchanges Google OAuth code for tokens, stores in user_gmail_connections, redirects back.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = getReturnTo(request);

  const clearCookie = () => {
    const res = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
    res.cookies.delete(COOKIE_NAME);
    return res;
  };

  if (!code) {
    return clearCookie();
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return clearCookie();
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/gmail/oauth/callback`;

  const tokenRes = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    return clearCookie();
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  const user = await getCurrentUser();
  if (!user?.id || !user?.dmc?.id) {
    return clearCookie();
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  let gmailAddress: string | null = null;
  try {
    const profileRes = await fetch(PROFILE_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (profileRes.ok) {
      const profile = (await profileRes.json()) as { emailAddress?: string };
      gmailAddress = profile.emailAddress ?? null;
    }
  } catch {
    // optional
  }

  const supabase = await createClient();

  // If there's already a connected account, enforce the same email on reconnect
  const { data: existing } = await supabase
    .from("user_gmail_connections")
    .select("gmail_address")
    .eq("user_id", user.id)
    .eq("dmc_id", user.dmc.id)
    .maybeSingle();

  if (existing?.gmail_address && gmailAddress && existing.gmail_address !== gmailAddress) {
    const mismatchUrl = new URL(returnTo, request.nextUrl.origin);
    mismatchUrl.searchParams.set("gmail_error", "account_mismatch");
    const res = NextResponse.redirect(mismatchUrl.toString());
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  await supabase.from("user_gmail_connections").upsert(
    {
      user_id: user.id,
      dmc_id: user.dmc.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt.toISOString(),
      scope: tokens.scope ?? null,
      gmail_address: gmailAddress,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,dmc_id" }
  );

 
  await supabase
    .from("user_gmail_connections")
    .update({ needs_reauth: false })
    .eq("user_id", user.id)
    .eq("dmc_id", user.dmc.id)
    .then(() => {}, () => {});

  const res = NextResponse.redirect(new URL(returnTo, request.nextUrl.origin));
  res.cookies.delete(COOKIE_NAME);
  return res;
}
