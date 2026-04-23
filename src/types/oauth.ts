// OAuth types for RateGen SSO

export interface OAuthAuthorizeParams {
  client_id: string;
  redirect_uri: string;
  response_type: "code";
  state?: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: "S256" | "plain";
}

export interface OAuthTokenRequest {
  grant_type: "authorization_code";
  code: string;
  redirect_uri: string;
  client_id: string;
  code_verifier?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  sub: string; // user_id
  email: string;
  email_verified: boolean;
  name: string;
  phone?: string;
  picture?: string;
}

export interface OAuthError {
  error: string;
  error_description?: string;
}

// Registered OAuth clients (whitelabel portals)
export interface OAuthClient {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  name: string;
}

// Authorization code stored temporarily
export interface AuthorizationCode {
  code: string;
  user_id: string;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  expires_at: Date;
  created_at: Date;
}
