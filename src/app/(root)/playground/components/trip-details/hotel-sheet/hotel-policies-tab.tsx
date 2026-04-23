"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CreditCard, Users, Baby, UtensilsCrossed } from "lucide-react";
import type { HotelSheetContextValue } from "./types";

interface HotelPoliciesTabProps {
  ctx: HotelSheetContextValue;
}

export function HotelPoliciesTab({ ctx }: HotelPoliciesTabProps) {
  const { hotelDetails } = ctx;

  return (
    <div className="space-y-4 p-3">
      {/* Cancellation Policy */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> Cancellation Policy
        </h3>
        <p className="text-xs whitespace-pre-wrap">
          {hotelDetails?.cancellation_policy || "Not specified"}
        </p>
      </section>

      <Separator />

      {/* Payment Policy */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <CreditCard className="h-3 w-3" /> Payment Policy
        </h3>
        <p className="text-xs whitespace-pre-wrap">
          {hotelDetails?.payment_policy || "Not specified"}
        </p>
      </section>

      <Separator />

      {/* Group Policy */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" /> Group Policy
        </h3>
        <p className="text-xs whitespace-pre-wrap">
          {hotelDetails?.group_policy || "Not specified"}
        </p>
      </section>

      <Separator />

      {/* Age Policy */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Baby className="h-3 w-3" /> Age Policy
        </h3>
        {hotelDetails?.age_policy && typeof hotelDetails.age_policy === "object" ? (
          <div className="flex gap-2 flex-wrap">
            {hotelDetails.age_policy.infant && (
              <Badge variant="outline" className="text-xs">
                Infant: {hotelDetails.age_policy.infant.min_age || 0}-{hotelDetails.age_policy.infant.max_age || 2}
              </Badge>
            )}
            {hotelDetails.age_policy.child && (
              <Badge variant="outline" className="text-xs">
                Child: {hotelDetails.age_policy.child.min_age || 2}-{hotelDetails.age_policy.child.max_age || 12}
              </Badge>
            )}
            {hotelDetails.age_policy.teenager && (
              <Badge variant="outline" className="text-xs">
                Teen: {hotelDetails.age_policy.teenager.min_age || 12}-{hotelDetails.age_policy.teenager.max_age || 18}
              </Badge>
            )}
            {hotelDetails.age_policy.adult && (
              <Badge variant="outline" className="text-xs">
                Adult: {hotelDetails.age_policy.adult.min_age || 18}+
              </Badge>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Not specified</p>
        )}
      </section>

      <Separator />

      {/* Meal Plan Rates */}
      <section className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <UtensilsCrossed className="h-3 w-3" /> Meal Plan Rates
        </h3>
        {hotelDetails?.meal_plan_rates?.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-1 px-2 text-left font-medium text-muted-foreground">Meal</th>
                <th className="py-1 px-2 text-center font-medium text-muted-foreground">
                  Adult ({hotelDetails?.age_policy?.adult?.min_age || 12}+)
                </th>
                <th className="py-1 px-2 text-center font-medium text-muted-foreground">
                  Child ({hotelDetails?.age_policy?.child?.min_age || 2}-{hotelDetails?.age_policy?.child?.max_age || 11})
                </th>
                <th className="py-1 px-2 text-center font-medium text-muted-foreground">
                  Infant ({hotelDetails?.age_policy?.infant?.min_age || 0}-{hotelDetails?.age_policy?.infant?.max_age || 1})
                </th>
              </tr>
            </thead>
            <tbody>
              {hotelDetails.meal_plan_rates.map((item: any, idx: number) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-1 px-2 font-medium">{item.meal_type}</td>
                  <td className="py-1 px-2 text-center">{item.rates?.adult ?? "-"}</td>
                  <td className="py-1 px-2 text-center">{item.rates?.child ?? "-"}</td>
                  <td className="py-1 px-2 text-center">{item.rates?.infant ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-muted-foreground">No rates available</p>
        )}
      </section>
    </div>
  );
}
