"use client";

import { useRouter } from "next/navigation";
import ConnectPeriskope from "@/components/whatsapp/ConnectPeriskope";
import type { PeriskopeConnectionRow } from "@/types/whatsapp";
import type { GmailSendAsAlias } from "@/data-access/gmail";
import { CheckCircle, Mail, ArrowRight, AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GmailConnectionState {
  connected: boolean;
  gmail_address?: string | null;
}

interface IntegrationsClientProps {
  existingConnection: PeriskopeConnectionRow | null;
  gmailConnection: GmailConnectionState;
  gmailAliases: GmailSendAsAlias[];
  missingAliasScope: boolean;
}

const AVATAR_COLOURS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-amber-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
];

function avatarColour(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

function getInitials(alias: GmailSendAsAlias): string {
  const name = alias.displayName ?? alias.sendAsEmail;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function AliasRow({ alias }: { alias: GmailSendAsAlias }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
      <span
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0",
          avatarColour(alias.sendAsEmail)
        )}
      >
        {getInitials(alias)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{alias.displayName ?? alias.sendAsEmail}</p>
        {alias.displayName && (
          <p className="text-xs text-muted-foreground truncate">{alias.sendAsEmail}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {(alias.isPrimary || alias.isDefault) && (
          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5">
            Default
          </span>
        )}
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
          Verified
        </span>
      </div>
    </div>
  );
}

function GmailCard({
  connection,
  aliases,
  missingAliasScope,
}: {
  connection: GmailConnectionState;
  aliases: GmailSendAsAlias[];
  missingAliasScope: boolean;
}) {
  const authorizeUrl = `/api/gmail/oauth/authorize?return_to=${encodeURIComponent("/settings/integrations")}`;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.910 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
                fill="#EA4335"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Gmail</p>
            <p className="text-xs text-muted-foreground">Connect your account to enable CRM email actions</p>
          </div>
          {connection.connected && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
              <CheckCircle className="h-3 w-3" />
              Connected
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {connection.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Connected</p>
                {connection.gmail_address && (
                  <p className="text-xs text-muted-foreground truncate">{connection.gmail_address}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your Gmail account is connected. Emails are read and sent via the Gmail API — nothing is stored on our
              servers.
            </p>
            <div className="flex flex-col gap-1">
              <a
                href={authorizeUrl}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-xs gap-1.5 self-start")}
              >
                <Mail className="h-3.5 w-3.5" />
                Reconnect account
              </a>
              {missingAliasScope && (
                <p className="text-[10px] text-muted-foreground">Updating will enable alias sending</p>
              )}
            </div>

            {/* Missing scope banner */}
            {missingAliasScope && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-snug">
                  Alias sending is disabled.{" "}
                  <a href={authorizeUrl} className="underline font-medium">
                    Update access
                  </a>{" "}
                  to enable send-as addresses.
                </p>
              </div>
            )}

            {/* Send-as Aliases section */}
            <div className="pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">Send-as Aliases</p>
                <span className="text-[10px] text-muted-foreground">{aliases.length} configured</span>
              </div>
              {aliases.length > 0 ? (
                aliases.map((a) => <AliasRow key={a.sendAsEmail} alias={a} />)
              ) : (
                <p className="text-xs text-muted-foreground py-1">
                  {missingAliasScope ? (
                    <>
                      <a href={authorizeUrl} className="text-primary hover:underline">
                        Update access
                      </a>{" "}
                      to load aliases.
                    </>
                  ) : (
                    <>
                      No aliases configured.{" "}
                      <a
                        href="https://mail.google.com/mail/u/0/#settings/accounts"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Add in Gmail settings.
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Link your Gmail account to read, send, and manage emails directly from CRM queries. Your data is encrypted
              and secure.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Send & receive", "Track conversations", "Labels & filters", "Attachments"].map((f) => (
                <span
                  key={f}
                  className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-0.5 flex items-center gap-1"
                >
                  <span className="h-1 w-1 rounded-full bg-primary/60" />
                  {f}
                </span>
              ))}
            </div>
            <a href={authorizeUrl} className={cn(buttonVariants({ size: "sm" }), "gap-1.5 text-xs")}>
              Connect Gmail
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function WhatsAppCard({
  existingConnection,
  onConnectionChanged,
}: {
  existingConnection: PeriskopeConnectionRow | null;
  onConnectionChanged: () => void;
}) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-emerald-500" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">WhatsApp</p>
            <p className="text-xs text-muted-foreground">Connect your account to enable WhatsApp group messaging</p>
          </div>
          {existingConnection && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
              <CheckCircle className="h-3 w-3" />
              Connected
            </span>
          )}
        </div>
      </div>

      <ConnectPeriskope existingConnection={existingConnection} onConnectionChanged={onConnectionChanged} />
    </div>
  );
}

export default function IntegrationsClient({
  existingConnection,
  gmailConnection,
  gmailAliases,
  missingAliasScope,
}: IntegrationsClientProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-1">Connect third-party services to your organization.</p>
      </div>

      <div className="flex flex-col gap-4">
        <GmailCard connection={gmailConnection} aliases={gmailAliases} missingAliasScope={missingAliasScope} />
        <WhatsAppCard existingConnection={existingConnection} onConnectionChanged={() => router.refresh()} />
      </div>
    </div>
  );
}
