"use client";

import { ShieldCheck, FileCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FDPublicPackage } from "@/types/fd-search";

interface PackageVisaProps {
  pkg: FDPublicPackage;
}

function formatPrice(amount: number | null, currency: string | null): string | null {
  if (amount == null) return null;
  const code = currency || "INR";
  if (code === "INR") return `₹${amount.toLocaleString("en-IN")}`;
  return `${code} ${amount.toLocaleString()}`;
}

export function PackageVisa({ pkg }: PackageVisaProps) {
  const visa = pkg.fd_visa;
  if (!visa && !pkg.visa_inclusion) return null;

  return (
    <section id="visa" className="space-y-4 scroll-mt-32">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <FileCheck className="size-4 text-primary" />
        Visa & Insurance
      </h2>

      {pkg.visa_inclusion && (
        <p className="text-sm text-muted-foreground">{pkg.visa_inclusion}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visa && (
          <Card className="p-4 border-border/60 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <FileCheck className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Visa</h3>
              <Badge variant={visa.visa_included ? "default" : "outline"} className="text-xs ml-auto">
                {visa.visa_included ? "Included" : "Optional"}
              </Badge>
            </div>
            {visa.visa_type && (
              <div className="text-xs text-muted-foreground">Type: {visa.visa_type}</div>
            )}
            {visa.price_adult != null && (
              <div className="text-sm">
                <span className="font-medium">{formatPrice(visa.price_adult, pkg.currency)}</span>
                <span className="text-xs text-muted-foreground ml-1">/ adult</span>
              </div>
            )}
            {visa.notes && <p className="text-xs text-muted-foreground">{visa.notes}</p>}
          </Card>
        )}

        {visa && (visa.insurance_included || visa.insurance_price_adult != null) && (
          <Card className="p-4 border-border/60 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Insurance</h3>
              <Badge
                variant={visa.insurance_included ? "default" : "outline"}
                className="text-xs ml-auto"
              >
                {visa.insurance_included ? "Included" : "Optional"}
              </Badge>
            </div>
            {visa.insurance_price_adult != null && (
              <div className="text-sm">
                <span className="font-medium">
                  {formatPrice(visa.insurance_price_adult, pkg.currency)}
                </span>
                <span className="text-xs text-muted-foreground ml-1">/ adult</span>
              </div>
            )}
            {visa.insurance_notes && (
              <p className="text-xs text-muted-foreground">{visa.insurance_notes}</p>
            )}
          </Card>
        )}
      </div>
    </section>
  );
}
