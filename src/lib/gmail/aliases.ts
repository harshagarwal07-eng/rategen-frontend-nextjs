import { getGmailClient } from "./client";
import { GmailApiError } from "./messages";

export interface GmailSendAsAlias {
  sendAsEmail: string;
  displayName: string | null;
  isPrimary: boolean;
  isDefault: boolean;
}

interface RawSendAs {
  sendAsEmail?: string;
  displayName?: string;
  isPrimary?: boolean;
  isDefault?: boolean;
  verificationStatus?: string;
}

function normaliseAlias(raw: RawSendAs): GmailSendAsAlias {
  return {
    sendAsEmail: raw.sendAsEmail ?? "",
    displayName: raw.displayName ?? null,
    isPrimary: raw.isPrimary ?? false,
    isDefault: raw.isDefault ?? false,
  };
}

/**
 * Returns all verified send-as aliases for the authenticated user.
 * Returns an empty array when the token lacks gmail.settings.basic scope (403)
 * rather than throwing — compose and sidebar degrade gracefully.
 */
export async function listVerifiedAliases(userId: string, dmcId: string): Promise<GmailSendAsAlias[]> {
  const { gmailFetch } = await getGmailClient(userId, dmcId);
  const res = await gmailFetch("/settings/sendAs");

  if (res.status === 403) {
    // Token predates gmail.settings.basic scope — degrade silently
    return [];
  }

  if (!res.ok) {
    const text = await res.text();
    throw new GmailApiError(`Failed to list send-as aliases: ${text}`, res.status);
  }

  const data = (await res.json()) as { sendAs?: RawSendAs[] };

  return (data.sendAs ?? [])
    .filter((a) => a.isPrimary === true || a.verificationStatus === "accepted")
    .map(normaliseAlias);
}
