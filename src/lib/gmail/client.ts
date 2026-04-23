import { createClient } from "@/utils/supabase/server";
import { getMissingScopes } from "./scopes";
import { env } from "@/lib/env";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface TokenInfo {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
}

export class GmailAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 403,
    public readonly reason: string = "insufficientPermissions"
  ) {
    super(message);
    this.name = "GmailAuthError";
  }
}

async function getTokensForUser(userId: string, dmcId: string): Promise<TokenInfo | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_gmail_connections")
    .select("access_token, refresh_token, token_expires_at, scope")
    .eq("user_id", userId)
    .eq("dmc_id", dmcId)
    .single();

  if (error || !data) return null;

  return {
    accessToken: data.access_token ?? "",
    refreshToken: data.refresh_token ?? null,
    expiresAt: data.token_expires_at ? new Date(data.token_expires_at) : null,
    scope: data.scope ?? null,
  };
}

function hasRequiredReadScope(scope: string | null): boolean {
  if (!scope) return true;
  const missing = getMissingScopes(scope, [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
  ]);
  return missing.length < 2;
}

type RefreshResult =
  | { accessToken: string; expiresIn: number }
  | { error: "revoked" }
  | { error: "failed" };

async function refreshAccessToken(refreshToken: string): Promise<RefreshResult | null> {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Gmail OAuth: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
    return null;
  }
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("Gmail token refresh failed:", body);
      try {
        const parsed = JSON.parse(body) as { error?: string };
        if (parsed.error === "invalid_grant" || parsed.error === "invalid_token") {
          return { error: "revoked" };
        }
      } catch {
        // not JSON — fall through
      }
      return { error: "failed" };
    }
    const data = (await response.json()) as { access_token: string; expires_in: number };
    return { accessToken: data.access_token, expiresIn: data.expires_in };
  } catch (err) {
    console.error("Gmail token refresh error:", err);
    return null;
  }
}

async function markConnectionRevoked(userId: string, dmcId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("user_gmail_connections")
    .update({ needs_reauth: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("dmc_id", dmcId);
}

async function updateTokens(
  userId: string,
  dmcId: string,
  accessToken: string,
  expiresIn: number
): Promise<void> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  await supabase
    .from("user_gmail_connections")
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("dmc_id", dmcId);
}

/**
 * Returns an authenticated Gmail API client for the user and DMC. Refreshes token if needed.
 */
export async function getGmailClient(userId: string, dmcId: string) {
  const tokens = await getTokensForUser(userId, dmcId);

  if (!tokens || !tokens.accessToken) {
    throw new GmailAuthError("No Gmail account connected for this DMC", 401, "notConnected");
  }
  if (!hasRequiredReadScope(tokens.scope)) {
    const missingScopes = getMissingScopes(tokens.scope);
    throw new GmailAuthError(
      `Insufficient Gmail permissions. Missing: ${missingScopes.join(", ")}. Reconnect with required scopes.`,
      403,
      "insufficientPermissions"
    );
  }

  const isExpired =
    !tokens.expiresAt ||
    tokens.expiresAt.getTime() < Date.now() + TOKEN_REFRESH_BUFFER_MS;
  let accessToken = tokens.accessToken;

  if (isExpired) {
    if (!tokens.refreshToken) {
      await markConnectionRevoked(userId, dmcId);
      throw new GmailAuthError(
        "Gmail connection was revoked. Please reconnect your account.",
        401,
        "tokenRevoked"
      );
    }
    const refreshResult = await refreshAccessToken(tokens.refreshToken);
    if (!refreshResult) {
      throw new Error("Failed to refresh Gmail access token");
    }
    if ("error" in refreshResult) {
      if (refreshResult.error === "revoked") {
        await markConnectionRevoked(userId, dmcId);
        throw new GmailAuthError(
          "Gmail connection was revoked. Please reconnect your account.",
          401,
          "tokenRevoked"
        );
      }
      throw new Error("Failed to refresh Gmail access token");
    }
    accessToken = refreshResult.accessToken;
    await updateTokens(userId, dmcId, accessToken, refreshResult.expiresIn);
  }

  const gmailFetch = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const url = endpoint.startsWith("http") ? endpoint : `${GMAIL_API_BASE}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    if (res.status === 401) {
      await markConnectionRevoked(userId, dmcId);
      throw new GmailAuthError(
        "Gmail session expired. Please reconnect your account.",
        401,
        "tokenRevoked"
      );
    }
    return res;
  };

  return { gmailFetch, accessToken };
}

/**
 * Same as getGmailClient but does not force JSON Content-Type (for raw/attachment requests).
 */
export async function getRawGmailClient(userId: string, dmcId: string) {
  const tokens = await getTokensForUser(userId, dmcId);
  if (!tokens || !tokens.accessToken) {
    throw new GmailAuthError("No Gmail account connected for this DMC", 401, "notConnected");
  }

  let accessToken = tokens.accessToken;
  const isExpired =
    !tokens.expiresAt ||
    tokens.expiresAt.getTime() < Date.now() + TOKEN_REFRESH_BUFFER_MS;
  if (isExpired) {
    if (!tokens.refreshToken) {
      await markConnectionRevoked(userId, dmcId);
      throw new GmailAuthError(
        "Gmail connection was revoked. Please reconnect your account.",
        401,
        "tokenRevoked"
      );
    }
    const refreshResult = await refreshAccessToken(tokens.refreshToken);
    if (!refreshResult) {
      throw new Error("Failed to refresh Gmail access token");
    }
    if ("error" in refreshResult) {
      if (refreshResult.error === "revoked") {
        await markConnectionRevoked(userId, dmcId);
        throw new GmailAuthError(
          "Gmail connection was revoked. Please reconnect your account.",
          401,
          "tokenRevoked"
        );
      }
      throw new Error("Failed to refresh Gmail access token");
    }
    accessToken = refreshResult.accessToken;
    await updateTokens(userId, dmcId, accessToken, refreshResult.expiresIn);
  }

  const gmailFetch = async (
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const url = endpoint.startsWith("http") ? endpoint : `${GMAIL_API_BASE}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (res.status === 401) {
      await markConnectionRevoked(userId, dmcId);
      throw new GmailAuthError(
        "Gmail session expired. Please reconnect your account.",
        401,
        "tokenRevoked"
      );
    }
    return res;
  };
  return { gmailFetch, accessToken };
}
