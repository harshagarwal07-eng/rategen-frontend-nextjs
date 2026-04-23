"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Baby, CheckCircle, XCircle } from "lucide-react";
import type { TransferSheetContextValue } from "./types";
import RategenMarkdown from "@/components/ui/rategen-markdown";

interface TransferPoliciesTabProps {
  ctx: TransferSheetContextValue;
}

export function TransferPoliciesTab({ ctx }: TransferPoliciesTabProps) {
  const { transferDetails, formData } = ctx;

  const details = transferDetails || formData;

  return (
    <div className="space-y-4 p-3">
      {/* Inclusions */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <CheckCircle className="h-3 w-3 text-green-600" /> Inclusions
        </h3>
        {details?.inclusions ? (
          <RategenMarkdown content={details.inclusions} className="text-xs" />
        ) : (
          <p className="text-xs text-muted-foreground">Not specified</p>
        )}
      </section>

      <Separator />

      {/* Exclusions */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <XCircle className="h-3 w-3 text-red-600" /> Exclusions
        </h3>
        {details?.exclusions ? (
          <RategenMarkdown content={details.exclusions} className="text-xs" />
        ) : (
          <p className="text-xs text-muted-foreground">Not specified</p>
        )}
      </section>

      <Separator />

      {/* DMC Cancellation Policy */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> DMC Cancellation Policy
        </h3>
        {details?.cancellation_policy ? (
          <p className="text-xs whitespace-pre-wrap">{details.cancellation_policy}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Not specified</p>
        )}
      </section>

      {/* Agency Cancellation Policy */}
      {details?.agency_cancellation_policy && (
        <>
          <Separator />
          <section className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Agency Cancellation Policy
            </h3>
            <p className="text-xs whitespace-pre-wrap">{details.agency_cancellation_policy}</p>
          </section>
        </>
      )}

      <Separator />

      {/* Age Policy */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Baby className="h-3 w-3" /> Age Policy
        </h3>
        {details?.age_policy && typeof details.age_policy === "object" ? (
          <div className="flex gap-2 flex-wrap">
            {details.age_policy.infant && (
              <Badge variant="outline" className="text-xs">
                Infant: {details.age_policy.infant.min_age || 0}-{details.age_policy.infant.max_age || 2}
              </Badge>
            )}
            {details.age_policy.child && (
              <Badge variant="outline" className="text-xs">
                Child: {details.age_policy.child.min_age || 2}-{details.age_policy.child.max_age || 12}
              </Badge>
            )}
            {details.age_policy.teenager && (
              <Badge variant="outline" className="text-xs">
                Teen: {details.age_policy.teenager.min_age || 12}-{details.age_policy.teenager.max_age || 18}
              </Badge>
            )}
            {details.age_policy.adult && (
              <Badge variant="outline" className="text-xs">
                Adult: {details.age_policy.adult.min_age || 18}+
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Not specified</p>
        )}
      </section>

      {/* Notes/Remarks */}
      {(details?.notes || details?.remarks) && (
        <>
          <Separator />
          <section className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground">Notes</h3>
            <p className="text-xs whitespace-pre-wrap">{details.notes || details.remarks}</p>
          </section>
        </>
      )}
    </div>
  );
}
