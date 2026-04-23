export const GMAIL_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.settings.basic", // send-as aliases
] as const;

export function parseGrantedScopes(scope: string | null | undefined): Set<string> {
  if (!scope) return new Set();
  return new Set(
    scope
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function getMissingScopes(
  grantedScope: string | null | undefined,
  requiredScopes: readonly string[] = GMAIL_REQUIRED_SCOPES
): string[] {
  const granted = parseGrantedScopes(grantedScope);
  return requiredScopes.filter((scope) => !granted.has(scope));
}
