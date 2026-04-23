import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { verifyAccessToken } from "@/lib/oauth";

/**
 * OAuth 2.0 UserInfo Endpoint
 * GET /api/oauth/userinfo
 *
 * Returns user information for valid access token
 */
export async function GET(request: NextRequest) {
  // Get access token from Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: "Missing or invalid Authorization header",
      },
      { status: 401 }
    );
  }

  const accessToken = authHeader.substring(7); // Remove "Bearer " prefix

  // Verify access token
  const tokenResult = verifyAccessToken(accessToken);
  if (!tokenResult.valid || !tokenResult.payload) {
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: tokenResult.error || "Invalid or expired access token",
      },
      { status: 401 }
    );
  }

  const userId = tokenResult.payload.sub;

  // Fetch user info from Supabase
  const supabase = await createClient(true); // Use admin client

  // Get user from auth
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

  if (userError || !userData.user) {
    return NextResponse.json(
      {
        error: "invalid_token",
        error_description: "User not found",
      },
      { status: 401 }
    );
  }

  const user = userData.user;

  // Get profile info
  const { data: profile } = await supabase
    .from("profile")
    .select("name, phone, avatar_url")
    .eq("user_id", userId)
    .single();

  // Return user info in OpenID Connect format
  return NextResponse.json({
    sub: user.id,
    email: user.email,
    email_verified: !!user.email_confirmed_at,
    name: profile?.name || user.user_metadata?.userName || user.user_metadata?.name,
    phone: profile?.phone || user.user_metadata?.phone,
    picture: profile?.avatar_url,
    updated_at: user.updated_at,
  });
}
