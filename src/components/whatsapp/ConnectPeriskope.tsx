"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  Plug,
  Unplug,
  CheckCircle,
  Phone,
  Pencil,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  savePeriskopeConnection,
  disconnectPeriskope,
} from "@/data-access/whatsapp-queries";
import type { PeriskopeConnectionRow } from "@/types/whatsapp";
import { cn } from "@/lib/utils";

interface ConnectPeriskopeProps {
  existingConnection: PeriskopeConnectionRow | null;
  onConnectionChanged?: () => void;
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateApiKey(value: string): string | null {
  if (!value.trim()) return "API key is required";
  if (value.trim().length < 20) return "API key appears too short";
  return null;
}

function validatePhoneId(value: string): string | null {
  if (!value.trim()) return "Phone ID is required";
  if (value.trim().length < 5) return "Phone ID appears too short";
  return null;
}

// ─── Form ────────────────────────────────────────────────────────────────────

function ConnectionForm({
  initialPhoneId = "",
  isEdit = false,
  onSaved,
  onCancel,
}: {
  initialPhoneId?: string;
  isEdit?: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [phoneId, setPhoneId] = useState(initialPhoneId);
  const [showKey, setShowKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handlePhoneChange = (v: string) => {
    setPhoneId(v);
    setPhoneError(null);
  };

  const handleSave = useCallback(async () => {
    const keyErr = validateApiKey(apiKey);
    const phoneErr = validatePhoneId(phoneId);
    setApiKeyError(keyErr);
    setPhoneError(phoneErr);
    if (keyErr || phoneErr) return;

    setSaving(true);
    setServerError(null);

    // First verify the credentials actually work
    setVerifying(true);
    try {
      const testRes = await fetch("/api/whatsapp/connection-status");
      // We can't test with the new creds before saving — so we save first, then verify
    } catch { /* ignore */ }
    setVerifying(false);

    const result = await savePeriskopeConnection(apiKey.trim(), phoneId.trim());
    setSaving(false);

    if ("error" in result) {
      setServerError(result.error);
      return;
    }

    // After saving, verify the connection actually works
    setVerifying(true);
    try {
      const check = await fetch("/api/whatsapp/connection-status");
      const data = await check.json();
      if (!data.connected) {
        setServerError(
          data.detail ?? "Credentials saved but WhatsApp is not responding. Check your API key and phone ID."
        );
        setVerifying(false);
        return;
      }
    } catch {
      // verification failed but creds were saved — non-fatal
    }
    setVerifying(false);

    onSaved();
  }, [apiKey, phoneId, onSaved]);

  const isLoading = saving || verifying;
  const buttonLabel = verifying ? "Verifying…" : saving ? "Saving…" : isEdit ? "Update" : "Connect";

  return (
    <div className="space-y-4">
      {/* API Key */}
      <div className="space-y-1.5">
        <Label htmlFor="periskope-api-key" className="text-xs font-medium">
          API Key
        </Label>
        <div className="relative">
          <Input
            id="periskope-api-key"
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setApiKeyError(null); }}
            placeholder="eyJhbGc..."
            className={cn(
              "h-9 text-xs font-mono pr-9",
              apiKeyError && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        {apiKeyError && (
          <p className="text-[11px] text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" /> {apiKeyError}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Found in your{" "}
          <a
            href="https://app.periskope.app/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground inline-flex items-center gap-0.5"
          >
            WhatsApp dashboard <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </p>
      </div>

      {/* Phone ID */}
      <div className="space-y-1.5">
        <Label htmlFor="periskope-phone-id" className="text-xs font-medium">
          Phone ID
        </Label>
        <div className="relative">
          <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            id="periskope-phone-id"
            value={phoneId}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="phone-tiahpurednnbspra"
            className={cn(
              "h-9 text-xs font-mono pl-7",
              phoneError && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={isLoading}
          />
        </div>
        {phoneError ? (
          <p className="text-[11px] text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" /> {phoneError}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Your WhatsApp phone identifier (e.g. phone-tiahpurednnbspra)
          </p>
        )}
      </div>

      {serverError && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{serverError}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          className="flex-1 h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plug className="h-3.5 w-3.5" />
          )}
          {buttonLabel}
        </Button>
        {onCancel && (
          <Button variant="outline" className="h-9 text-xs" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ConnectPeriskope({
  existingConnection,
  onConnectionChanged,
}: ConnectPeriskopeProps) {
  const [editing, setEditing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);
    const result = await disconnectPeriskope();
    setDisconnecting(false);
    setConfirmDisconnect(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    onConnectionChanged?.();
  }, [onConnectionChanged]);

  // ── Connected state ───────────────────────────────────────────────────────
  if (existingConnection && !editing) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Connected</p>
            <p className="text-xs text-muted-foreground font-mono truncate">
              +{existingConnection.phone_id}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Since {new Date(existingConnection.connected_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 flex items-start gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { setEditing(true); setError(null); }}
          >
            <Pencil className="h-3 w-3" />
            Edit credentials
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setConfirmDisconnect(true)}
            disabled={disconnecting}
          >
            {disconnecting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Unplug className="h-3 w-3" />
            )}
            Disconnect
          </Button>
        </div>

        <AlertDialog open={confirmDisconnect} onOpenChange={setConfirmDisconnect}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the WhatsApp integration for your organization.
                Existing groups will remain but sending and receiving messages will stop.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDisconnect}
              >
                {disconnecting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── Connect / Edit form ───────────────────────────────────────────────────
  return (
    <div className="p-6">
      {!existingConnection && (
        <div className="flex items-center gap-3 mb-5">
          <div className="rounded-xl bg-muted p-2.5">
            <Plug className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{editing ? "Update credentials" : "Connect WhatsApp"}</p>
            <p className="text-xs text-muted-foreground">
              Enter your WhatsApp API key and connected phone ID
            </p>
          </div>
        </div>
      )}
      {editing && (
        <p className="text-xs text-muted-foreground mb-4">
          Enter a new API key to update. Leave unchanged if rotating only the phone number.
        </p>
      )}
      <ConnectionForm
        initialPhoneId={editing ? existingConnection?.phone_id ?? "" : ""}
        isEdit={editing}
        onSaved={() => {
          setEditing(false);
          onConnectionChanged?.();
        }}
        onCancel={editing ? () => setEditing(false) : undefined}
      />
    </div>
  );
}
