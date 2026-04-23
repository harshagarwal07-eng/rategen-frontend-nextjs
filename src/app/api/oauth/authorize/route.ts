import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  getOAuthClient,
  validateRedirectUri,
  generateAuthCode,
} from "@/lib/oauth";

/**
 * OAuth 2.0 Authorization Endpoint
 * GET /api/oauth/authorize
 *
 * If user is logged in: generates auth code and redirects back
 * If user is not logged in: redirects to SSO login page
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Extract OAuth parameters
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const responseType = searchParams.get("response_type");
  const state = searchParams.get("state");
  const scope = searchParams.get("scope") || "openid profile email";
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");

  // Validate required parameters
  if (!clientId || !redirectUri || responseType !== "code") {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Missing required parameters: client_id, redirect_uri, response_type=code",
      },
      { status: 400 }
    );
  }

  // Validate client (client_id is dmc_id UUID)
  const client = await getOAuthClient(clientId);
  if (!client) {
    return NextResponse.json(
      {
        error: "invalid_client",
        error_description: "Unknown client_id (DMC not found)",
      },
      { status: 400 }
    );
  }

  // Validate redirect URI against whitelabel_site_settings
  const isValidRedirect = await validateRedirectUri(clientId, redirectUri);
  if (!isValidRedirect) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Invalid redirect_uri for this client",
      },
      { status: 400 }
    );
  }

  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // User not logged in - redirect to SSO login page
    const ssoLoginUrl = new URL("/sso", request.nextUrl.origin);
    ssoLoginUrl.searchParams.set("client_id", clientId);
    ssoLoginUrl.searchParams.set("redirect_uri", redirectUri);
    ssoLoginUrl.searchParams.set("response_type", responseType);
    if (state) ssoLoginUrl.searchParams.set("state", state);
    if (scope) ssoLoginUrl.searchParams.set("scope", scope);
    if (codeChallenge) ssoLoginUrl.searchParams.set("code_challenge", codeChallenge);
    if (codeChallengeMethod) ssoLoginUrl.searchParams.set("code_challenge_method", codeChallengeMethod);

    return NextResponse.redirect(ssoLoginUrl);
  }

  // User is authenticated - generate auth code and redirect
  const code = generateAuthCode({
    userId: user.id,
    clientId,
    redirectUri,
    scope,
    state,
    codeChallenge: codeChallenge || undefined,
    codeChallengeMethod: codeChallengeMethod || undefined,
  });

  // Build redirect URL with code
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set("code", code);
  if (state) callbackUrl.searchParams.set("state", state);

  return NextResponse.redirect(callbackUrl);
}
