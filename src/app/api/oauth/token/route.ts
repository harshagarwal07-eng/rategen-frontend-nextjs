import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  verifyAuthCode,
  generateAccessToken,
  getOAuthClient,
} from "@/lib/oauth";

/**
 * OAuth 2.0 Token Endpoint
 * POST /api/oauth/token
 *
 * Exchanges authorization code for access token
 */
export async function POST(request: NextRequest) {
  let body: Record<string, string>;

  // Support both JSON and form-urlencoded
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await request.json();
  } else {
    const formData = await request.formData();
    body = Object.fromEntries(formData.entries()) as Record<string, string>;
  }

  const { grant_type, code, redirect_uri, client_id, code_verifier } = body;

  // Validate grant type
  if (grant_type !== "authorization_code") {
    return NextResponse.json(
      {
        error: "unsupported_grant_type",
        error_description: "Only authorization_code grant type is supported",
      },
      { status: 400 }
    );
  }

  // Validate required parameters
  if (!code || !redirect_uri || !client_id) {
    return NextResponse.json(
      {
        error: "invalid_request",
        error_description: "Missing required parameters: code, redirect_uri, client_id",
      },
      { status: 400 }
    );
  }

  // Validate client (client_id is dmc_id UUID)
  const client = await getOAuthClient(client_id);
  if (!client) {
    return NextResponse.json(
      {
        error: "invalid_client",
        error_description: "Unknown client_id (DMC not found)",
      },
      { status: 400 }
    );
  }

  // Verify authorization code
  const codeResult = verifyAuthCode(code);
  if (!codeResult.valid || !codeResult.payload) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: codeResult.error || "Invalid or expired authorization code",
      },
      { status: 400 }
    );
  }

  const { payload } = codeResult;

  // Verify client_id matches
  if (payload.client_id !== client_id) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: "client_id mismatch",
      },
      { status: 400 }
    );
  }

  // Verify redirect_uri matches
  if (payload.redirect_uri !== redirect_uri) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: "redirect_uri mismatch",
      },
      { status: 400 }
    );
  }

  // Verify PKCE if code_challenge was provided
  if (payload.code_challenge) {
    if (!code_verifier) {
      return NextResponse.json(
        {
          error: "invalid_grant",
          error_description: "code_verifier required for PKCE",
        },
        { status: 400 }
      );
    }
    // Note: In production, implement proper PKCE verification
  }

  // Generate access token
  const accessToken = generateAccessToken(payload.sub, payload.scope);

  // Return token response
  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: payload.scope,
  });
}
