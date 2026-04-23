import { getPeriskopeConnection } from "@/data-access/whatsapp-queries";
import { getGmailConnection, listGmailAliases } from "@/data-access/gmail";
import type { GmailSendAsAlias } from "@/data-access/gmail";
import IntegrationsClient from "./client";

export default async function IntegrationsPage() {
  const [periskopeResult, gmailResult, aliasResult] = await Promise.all([
    getPeriskopeConnection(),
    getGmailConnection(),
    listGmailAliases(),
  ]);

  const existingConnection = "data" in periskopeResult ? periskopeResult.data : null;
  const gmailConnection = gmailResult.data;
  const gmailAliases: GmailSendAsAlias[] = "data" in aliasResult ? aliasResult.data : [];
  const missingAliasScope =
    gmailConnection.connected
      ? (gmailConnection as { missing_alias_scope?: boolean }).missing_alias_scope ?? false
      : false;

  return (
    <IntegrationsClient
      existingConnection={existingConnection}
      gmailConnection={gmailConnection}
      gmailAliases={gmailAliases}
      missingAliasScope={missingAliasScope}
    />
  );
}
