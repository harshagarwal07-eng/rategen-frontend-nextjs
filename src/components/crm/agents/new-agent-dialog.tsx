"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ArrowRight, Info, Loader2, Mail } from "lucide-react";
import { lookupAgencyByEmail, associateExistingAgency } from "@/data-access/crm-agency";
import { toast } from "sonner";
import useUser from "@/hooks/use-user";
import CreateAgencySheet from "./create-agency-sheet";

type Props = {
  children: React.ReactNode;
};

type DialogStep =
  | { type: "email-input" }
  | { type: "role-conflict" }
  | { type: "already-added"; agency_name: string }
  | { type: "ready-to-create"; email: string }
  | {
      type: "found";
      agencyData: {
        ta_id: string;
        admin_id: string;
        name: string;
        admin_name: string;
        admin_phone: string;
        admin_email: string;
        website?: string;
        city?: string;
        country?: string;
        is_admin: boolean;
        lookup_email: string;
      };
    };

export default function NewAgentDialog({ children }: Props) {
  const { user } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [associating, setAssociating] = useState(false);
  const [step, setStep] = useState<DialogStep>({ type: "email-input" });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefillEmail, setPrefillEmail] = useState("");

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setEmail("");
      setStep({ type: "email-input" });
    }
  };

  const handleProceed = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const result = await lookupAgencyByEmail(trimmed, user.dmc.id);

      if (result.status === "not_found") {
        setStep({ type: "ready-to-create", email: trimmed });
      } else if (result.status === "role_conflict") {
        setStep({ type: "role-conflict" });
      } else if (result.status === "already_added") {
        setStep({ type: "already-added", agency_name: result.agency_name });
      } else {
        setStep({ type: "found", agencyData: result.agencyData });
      }
    } catch {
      toast.error("Failed to verify email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEmail("");
    setStep({ type: "email-input" });
  };

  const handleAssociate = async () => {
    if (step.type !== "found" || !user) return;
    setAssociating(true);
    try {
      const result = await associateExistingAgency(step.agencyData.ta_id, step.agencyData.admin_id, user.dmc.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${step.agencyData.name} added to your agencies`);
      handleOpenChange(false);
      router.refresh();
    } finally {
      setAssociating(false);
    }
  };

  const handleOpenCreateSheet = () => {
    if (step.type !== "ready-to-create") return;
    setPrefillEmail(step.email);
    setOpen(false);
    setSheetOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Travel Agency</DialogTitle>
            <DialogDescription>Enter the agency admin email to get started.</DialogDescription>
          </DialogHeader>

          {step.type === "email-input" && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="agency-email">Agency Admin Email</Label>
                <div className="relative">
                  <Input
                    id="agency-email"
                    type="email"
                    placeholder="admin@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !loading && handleProceed()}
                    className="pr-10"
                    autoFocus
                  />
                  <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleProceed} disabled={loading || !email.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {loading ? "Verifying..." : "Proceed"}
                </Button>
              </div>
            </div>
          )}

          {step.type === "role-conflict" && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4">
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Cannot add this user</p>
                  <p className="text-sm text-muted-foreground">
                    This email address cannot be added as a travel agency. Please try a different email.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleReset}>
                  Try a different email
                </Button>
              </div>
            </div>
          )}

          {step.type === "already-added" && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                <Info className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Agency already added</p>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{step.agency_name}</span> is already associated with
                    your account. You can find them in your agencies list.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleReset}>
                  Try a different email
                </Button>
              </div>
            </div>
          )}

          {step.type === "ready-to-create" && (
            <div className="space-y-4 pt-2">
              <div className="rounded-md border border-border bg-muted/40 p-4 space-y-1">
                <p className="text-sm font-medium">No existing account found</p>
                <p className="text-sm text-muted-foreground">
                  No account exists for <span className="font-medium text-foreground">{step.email}</span>. You can
                  proceed to create a new travel agency.
                </p>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Back
                </Button>
                <Button onClick={handleOpenCreateSheet}>Create Agency</Button>
              </div>
            </div>
          )}

          {step.type === "found" && (
            <div className="space-y-4 pt-2">
              {!step.agencyData.is_admin && (
                <div className="flex gap-3 rounded-md border border-blue-500/30 bg-blue-500/10 p-3">
                  <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{step.agencyData.lookup_email}</span> is a team member
                    of this agency. The admin is{" "}
                    <span className="font-medium text-foreground">{step.agencyData.admin_email}</span>.
                  </p>
                </div>
              )}
              <div className="rounded-md border bg-muted/40 p-4 space-y-3">
                <p className="text-sm font-semibold">Agency Found</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Agency Name</span>
                  <span className="font-medium">{step.agencyData.name}</span>
                  <span className="text-muted-foreground">Admin</span>
                  <span className="font-medium">{step.agencyData.admin_name}</span>
                  <span className="text-muted-foreground">Admin Email</span>
                  <span className="font-medium break-all">{step.agencyData.admin_email}</span>
                  {step.agencyData.admin_phone && (
                    <>
                      <span className="text-muted-foreground">Phone</span>
                      <span className="font-medium">+{step.agencyData.admin_phone}</span>
                    </>
                  )}
                  {step.agencyData.website && (
                    <>
                      <span className="text-muted-foreground">Website</span>
                      <span className="font-medium break-all">{step.agencyData.website}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" size="sm" onClick={handleReset} disabled={associating}>
                  Back
                </Button>
                <Button loading={associating} loadingText="Adding..." onClick={handleAssociate}>
                  Add to My Agencies
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {user && (
        <CreateAgencySheet
          isOpen={sheetOpen}
          onClose={() => setSheetOpen(false)}
          dmc_id={user.dmc.id}
          mode="create"
          prefillEmail={prefillEmail}
        />
      )}
    </>
  );
}
