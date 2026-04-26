"use client";

// Two-column inclusions / exclusions textareas. Bound to RHF fields.

import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Control } from "react-hook-form";

interface InclusionsExclusionsSectionProps<TFieldValues extends object> {
  // Generic so the parent's RHF schema drives the field types.
  control: Control<TFieldValues>;
  inclusionsName: keyof TFieldValues & string;
  exclusionsName: keyof TFieldValues & string;
}

export default function InclusionsExclusionsSection<
  TFieldValues extends object,
>({
  control,
  inclusionsName,
  exclusionsName,
}: InclusionsExclusionsSectionProps<TFieldValues>) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        // Cast to any because RHF generics + dynamic field name reduce
        // to the same string union; the runtime path is identical.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={control as any}
        name={inclusionsName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Inclusions</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        control={control as any}
        name={exclusionsName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Exclusions</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
