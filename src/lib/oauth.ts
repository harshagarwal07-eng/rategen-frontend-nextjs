import { createHmac, randomBytes } from "crypto";
import type { OAuthClient } from "@/types/oauth";
import { createClient } from "@/utils/supabase/server";

// Secret for signing auth codes (should be in env in production)
const OAUTH_SECRET = process.env.OAUTH_SECRET || "rategen-oauth-secret-key-change-in-production";

// Local development redirect URIs (always allowed)
const LOCAL_DEV_REDIRECT_URIS = [
  "http://localhost:3000/auth/callback",
  "http://localhost:3001/auth/callback",
  "http://localhost:3002/auth/callback",
];

// In-memory store for used codes (use Redis in production)
const usedCodes = new Set<string>();

// Code expiry time (5 minutes)
const CODE_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Get OAuth client info
 * For whitelabel portals, client_id is the dmc_id (UUID)
 */
export async function getOAuthClient(clientId: string): Promise<OAuthClient | null> {
  // Check if it's a valid UUID (dmc_id)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(clientId)) {
    // Fetch DMC info from database
    const supabase = await createClient(true);
    const { data: dmc } = await supabase.from("dmcs").select("id, name").eq("id", clientId).single();

    if (dmc) {
      return {
        client_id: dmc.id,
        name: dmc.name,
        redirect_uris: [],
      };
    }
  }

  return null;
}

/**
 * Validate redirect URI against whitelabel_site_settings for the DMC
 * @param clientId - The dmc_id (UUID)
 * @param redirectUri - The redirect URI to validate
 */
export async function validateRedirectUri(clientId: string, redirectUri: string): Promise<boolean> {
  // Always allow local development URIs
  if (LOCAL_DEV_REDIRECT_URIS.includes(redirectUri)) return true;

  // Parse the redirect URI to get the host
  let redirectHost: string;
  try {
    const url = new URL(redirectUri);
    redirectHost = url.host; // includes port if present
  } catch {
    return false;
  }

  // Check if it's a valid UUID (dmc_id)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(clientId)) return false;

  // Fetch allowed domains for this DMC from whitelabel_site_settings
  const supabase = await createClient();
  const { data: settings } = await supabase.from("whitelabel_site_settings").select("domain").eq("dmc_id", clientId);
  console.log("🚀 ~ validateRedirectUri ~ settings:", settings);

  if (!settings || settings.length === 0) {
    return false;
  }

  // Check if redirect host matches any configured domain
  return settings.some((setting) => {
    const configuredDomain = setting.domain.toLowerCase();
    const redirectHostLower = redirectHost.toLowerCase();

    // Exact match
    if (redirectHostLower === configuredDomain) {
      return true;
    }

    // Match with or without port (e.g., "example.com" matches "example.com:443")
    if (redirectHostLower.split(":")[0] === configuredDomain) {
      return true;
    }

    // Subdomain match (e.g., "portal.example.com" matches "example.com")
    if (redirectHostLower.endsWith(`.${configuredDomain}`)) {
      return true;
    }

    return false;
  });
}

/**
 * Generate authorization code
 * Code format: base64(payload).signature
 */
export function generateAuthCode(params: {
  userId: string;
  clientId: string;
  redirectUri: string;
  scope?: string;
  state?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}): string {
  const jti = randomBytes(16).toString("hex"); // unique code ID
  const payload = {
    jti,
    sub: params.userId,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: params.scope || "openid profile email",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    exp: Date.now() + CODE_EXPIRY_MS,
    iat: Date.now(),
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", OAUTH_SECRET).update(payloadStr).digest("base64url");

  return `${payloadStr}.${signature}`;
}

/**
 * Verify and decode authorization code
 */
export function verifyAuthCode(code: string): {
  valid: boolean;
  payload?: {
    jti: string;
    sub: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    state?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    exp: number;
    iat: number;
  };
  error?: string;
} {
  try {
    const [payloadStr, signature] = code.split(".");
    if (!payloadStr || !signature) {
      return { valid: false, error: "Invalid code format" };
    }

    // Verify signature
    const expectedSignature = createHmac("sha256", OAUTH_SECRET).update(payloadStr).digest("base64url");

    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid signature" };
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString());

    // Check expiry
    if (Date.now() > payload.exp) {
      return { valid: false, error: "Code expired" };
    }

    // Check if already used
    if (usedCodes.has(payload.jti)) {
      return { valid: false, error: "Code already used" };
    }

    // Mark as used
    usedCodes.add(payload.jti);

    // Cleanup old codes periodically (simple approach)
    if (usedCodes.size > 10000) {
      usedCodes.clear();
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: "Failed to verify code" };
  }
}

/**
 * Verify PKCE code_verifier against code_challenge
 */
export function verifyPKCE(codeVerifier: string, codeChallenge: string, method: string = "S256"): boolean {
  if (method === "plain") {
    return codeVerifier === codeChallenge;
  }

  // S256: BASE64URL(SHA256(code_verifier))
  const hash = createHmac("sha256", codeVerifier).digest("base64url");
  return hash === codeChallenge;
}

/**
 * Generate access token for user
 */
export function generateAccessToken(userId: string, scope: string): string {
  const payload = {
    sub: userId,
    scope,
    exp: Date.now() + 3600 * 1000, // 1 hour
    iat: Date.now(),
    type: "access_token",
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", OAUTH_SECRET).update(payloadStr).digest("base64url");

  return `${payloadStr}.${signature}`;
}

/**
 * Verify access token
 */
export function verifyAccessToken(token: string): {
  valid: boolean;
  payload?: { sub: string; scope: string; exp: number };
  error?: string;
} {
  try {
    const [payloadStr, signature] = token.split(".");
    if (!payloadStr || !signature) {
      return { valid: false, error: "Invalid token format" };
    }

    const expectedSignature = createHmac("sha256", OAUTH_SECRET).update(payloadStr).digest("base64url");

    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid signature" };
    }

    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString());

    if (Date.now() > payload.exp) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "Failed to verify token" };
  }
}
