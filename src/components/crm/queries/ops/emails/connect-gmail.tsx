"use client";

import { Mail, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

interface ConnectGmailProps {
  returnTo?: string;
}

/**
 * Premium empty state when Gmail is not connected.
 * Shows OAuth connect CTA with feature highlights.
 */
export function ConnectGmail({ returnTo = "/" }: ConnectGmailProps) {
  const authorizeUrl = `/api/gmail/oauth/authorize?return_to=${encodeURIComponent(returnTo)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center flex-1 p-8 text-center"
    >
      {/* Icon */}
      <div className="relative mb-6">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-transparent flex items-center justify-center shadow-sm">
          <Mail className="h-9 w-9 text-primary" />
        </div>
        <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-card border-2 border-card flex items-center justify-center shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>

      {/* Copy */}
      <h3 className="text-lg font-semibold mb-1.5 tracking-tight">Connect your Gmail</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">
        Link your Gmail account to send, receive, and manage emails directly from the CRM. Your data is encrypted and
        secure.
      </p>

      {/* Features */}
      <div className="flex flex-wrap justify-center gap-3 mb-6 text-xs text-muted-foreground">
        {["Send & receive", "Track conversations", "Attachments", "Search"].map((feature) => (
          <span key={feature} className="flex items-center gap-1 bg-muted/50 rounded-full px-3 py-1">
            <span className="h-1 w-1 rounded-full bg-primary" />
            {feature}
          </span>
        ))}
      </div>

      {/* CTA */}
      <a
        href={authorizeUrl}
        className={cn(buttonVariants({ size: "lg" }), "gap-2 rounded-xl px-6 font-semibold")}
      >
        Connect Gmail
        <ArrowRight className="h-4 w-4" />
      </a>
    </motion.div>
  );
}

interface ReconnectGmailProps {
  email?: string | null;
  returnTo?: string;
}

/**
 * Compact warning banner shown when a previously-connected Gmail token has been revoked.
 */
export function ReconnectGmail({ email, returnTo = "/" }: ReconnectGmailProps) {
  const authorizeUrl = `/api/gmail/oauth/authorize?return_to=${encodeURIComponent(returnTo)}`;
  const searchParams = useSearchParams();
  const mismatchError = searchParams.get("gmail_error");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center justify-center flex-1 p-8 text-center"
    >
      <div className="relative mb-5">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-amber-500" />
        </div>
      </div>

      <h3 className="text-base font-semibold mb-1.5 tracking-tight">Gmail disconnected</h3>

      {mismatchError === "account_mismatch" && email ? (
        <p className="text-sm text-destructive max-w-xs mb-5 leading-relaxed font-medium">
          Wrong account selected. Please reconnect with <span className="font-bold">{email}</span>.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground max-w-xs mb-5 leading-relaxed">
          Your Gmail connection{email ? (
            <> for <span className="font-medium text-foreground">{email}</span></>
          ) : null}{" "}
          was revoked or expired. Reconnect to continue sending and receiving emails.
        </p>
      )}

      <a
        href={authorizeUrl}
        className={cn(
          buttonVariants({ size: "default" }),
          "gap-2 rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 text-white border-0"
        )}
      >
        <Mail className="h-4 w-4" />
        {email ? `Reconnect ${email}` : "Reconnect Gmail"}
      </a>
    </motion.div>
  );
}
