"use client";

// Three-column logistics inputs (meeting / pickup / dropoff) bound
// to react-hook-form fields.

import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Control } from "react-hook-form";

interface PackageLogisticsSectionProps<TFieldValues extends object> {
  control: Control<TFieldValues>;
  meetingName: keyof TFieldValues & string;
  pickupName: keyof TFieldValues & string;
  dropoffName: keyof TFieldValues & string;
}

export default function PackageLogisticsSection<TFieldValues extends object>({
  control,
  meetingName,
  pickupName,
  dropoffName,
}: PackageLogisticsSectionProps<TFieldValues>) {
  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Logistics
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={control as any}
          name={meetingName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Point</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className="h-9"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={control as any}
          name={pickupName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pickup Point</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className="h-9"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={control as any}
          name={dropoffName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dropoff Point</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  className="h-9"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
