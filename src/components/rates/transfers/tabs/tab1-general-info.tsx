"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { AlertTriangle } from "lucide-react";
import {
  TransferCountryOption,
  TransferCurrencyOption,
  TransferListRow,
} from "@/types/transfers";
import { useMemo } from "react";

const GeneralInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Transfer name is required"),
  mode_of_transport: z.enum(["vehicle_p2p", "vehicle_disposal"], {
    errorMap: () => ({ message: "Mode of Transport is required" }),
  }),
  country_id: z.string().optional(),
  currency_id: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "inactive", "published", "archived"]),
  is_preferred: z.boolean().optional(),
});

export type TransferGeneralInfoValues = z.infer<typeof GeneralInfoSchema>;

const STATUS_OPTIONS: { value: TransferGeneralInfoValues["status"]; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

interface TransferGeneralInfoFormProps {
  initialData?: (Partial<TransferListRow> & { description?: string | null }) | null;
  countries: TransferCountryOption[];
  currencies: TransferCurrencyOption[];
  lockModeOfTransport?: boolean;
  onNext: (data: TransferGeneralInfoValues) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onContextChange?: (name: string, countryName: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function TransferGeneralInfoForm({
  initialData,
  countries,
  currencies,
  lockModeOfTransport = false,
  onNext,
  setIsLoading,
  formRef,
  onContextChange,
  onDirtyChange,
}: TransferGeneralInfoFormProps) {
  const form = useForm<TransferGeneralInfoValues>({
    resolver: zodResolver(GeneralInfoSchema),
    mode: "onBlur",
    defaultValues: {
      id: initialData?.id || undefined,
      name: initialData?.name || "",
      mode_of_transport:
        (initialData?.mode_of_transport as "vehicle_p2p" | "vehicle_disposal") ||
        ("" as unknown as "vehicle_p2p"),
      country_id: initialData?.country_id || "",
      currency_id: initialData?.currency_id || "",
      description: initialData?.description ?? "",
      status: ((initialData?.status as TransferGeneralInfoValues["status"]) ?? "draft"),
      is_preferred: Boolean(initialData?.is_preferred),
    },
  });

  const watchName = form.watch("name");
  const watchCountryId = form.watch("country_id");

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.id, label: c.country_name })),
    [countries]
  );
  const currencyOptions = useMemo(
    () =>
      currencies.map((c) => ({
        value: c.id,
        label: `${c.symbol ? `${c.symbol} ` : ""}${c.code} — ${c.name}`,
      })),
    [currencies]
  );

  const { isDirty } = form.formState;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (lastReportedDirty.current !== isDirty) {
      lastReportedDirty.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onContextChangeRef = useRef(onContextChange);
  onContextChangeRef.current = onContextChange;
  const lastReportedContext = useRef<{ name: string; countryName: string } | null>(null);

  const countryName =
    countries.find((c) => c.id === watchCountryId)?.country_name || "";

  useEffect(() => {
    const name = watchName || "";
    if (
      lastReportedContext.current?.name === name &&
      lastReportedContext.current?.countryName === countryName
    ) {
      return;
    }
    lastReportedContext.current = { name, countryName };
    onContextChangeRef.current?.(name, countryName);
  }, [watchName, countryName]);

  useEffect(() => {
    if (initialData?.id) {
      form.reset({
        id: initialData.id,
        name: initialData.name || "",
        mode_of_transport:
          (initialData.mode_of_transport as "vehicle_p2p" | "vehicle_disposal") ||
          ("" as unknown as "vehicle_p2p"),
        country_id: initialData.country_id || "",
        currency_id: initialData.currency_id || "",
        description: initialData.description ?? "",
        status: (initialData.status as TransferGeneralInfoValues["status"]) ?? "draft",
        is_preferred: Boolean(initialData.is_preferred),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id, initialData?.description]);

  const onSubmit = (data: TransferGeneralInfoValues) => {
    setIsLoading?.(true);
    onNext({ ...data, id: initialData?.id });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">General Information</h2>
        <p className="text-muted-foreground">Enter the basic details about this transfer</p>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Airport Transfer Bali" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mode_of_transport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode of Transport *</FormLabel>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={lockModeOfTransport}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vehicle_p2p">Vehicle (Point to Point)</SelectItem>
                      <SelectItem value="vehicle_disposal">Vehicle on Disposal</SelectItem>
                    </SelectContent>
                  </Select>
                  {lockModeOfTransport && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 mt-1">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Locked — packages exist for this transfer
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="country_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Autocomplete
                    options={countryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search country..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Autocomplete
                    options={currencyOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Search currency..."
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_preferred"
              render={({ field }) => (
                <FormItem className="flex items-end gap-3 pb-2">
                  <div className="flex flex-col gap-1">
                    <FormLabel>Preferred</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Highlight this transfer with a star in the list.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
