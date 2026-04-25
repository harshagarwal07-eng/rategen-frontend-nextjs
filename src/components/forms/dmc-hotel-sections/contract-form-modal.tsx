"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { DateValidityPicker, type DateRangeValue } from "@/components/ui/date-validity-picker";
import { createContract, updateContract } from "@/data-access/dmc-contracts";
import { listMarkets } from "@/data-access/dmc-markets";
import { DmcContract } from "@/types/dmc-contracts";
import { toast } from "sonner";

const dateRangeSchema = z
  .object({ from: z.date(), to: z.date() })
  .refine((d) => d.to >= d.from, { message: "End date must be on or after start date" })
  .optional();

const ContractFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  market_id: z.string().optional(),
  stay_validity: dateRangeSchema,
  booking_validity: dateRangeSchema,
  rate_type: z.enum(["net", "bar"]),
  status: z.enum(["draft", "active"]),
});

export type ContractFormValues = z.infer<typeof ContractFormSchema>;

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hotelId: string;
  initialData?: DmcContract | null;
}

export default function ContractFormModal({
  isOpen,
  onClose,
  onSuccess,
  hotelId,
  initialData,
}: ContractFormModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(ContractFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: initialData?.name || "",
      market_id: initialData?.market_id || "",
      stay_validity:
        initialData?.stay_valid_from && initialData?.stay_valid_till
          ? {
              from: new Date(initialData.stay_valid_from),
              to: new Date(initialData.stay_valid_till),
            }
          : undefined,
      booking_validity:
        initialData?.booking_valid_from && initialData?.booking_valid_till
          ? {
              from: new Date(initialData.booking_valid_from),
              to: new Date(initialData.booking_valid_till),
            }
          : undefined,
      rate_type: (initialData?.rate_type as "net" | "bar") || "net",
      status: initialData?.status === "draft" ? "draft" : "active",
    },
  });

  const { data: marketsResult } = useQuery({
    queryKey: ["markets"],
    queryFn: listMarkets,
    enabled: isOpen,
  });

  const marketOptions = (marketsResult?.data || []).map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const onSubmit = async (data: ContractFormValues) => {
    setIsSaving(true);
    try {
      const toDateStr = (d?: Date) =>
        d ? d.toISOString().split("T")[0] : undefined;

      const payload = {
        name: data.name,
        market_id: data.market_id || undefined,
        stay_valid_from: toDateStr(data.stay_validity?.from),
        stay_valid_till: toDateStr(data.stay_validity?.to),
        booking_valid_from: toDateStr(data.booking_validity?.from),
        booking_valid_till: toDateStr(data.booking_validity?.to),
        rate_type: data.rate_type,
        status: data.status,
      };

      const result = initialData
        ? await updateContract(initialData.id, payload)
        : await createContract(hotelId, payload);

      if (result.error) {
        toast.error(result.error);
        setIsSaving(false);
        return;
      }

      toast.success(initialData ? "Contract updated" : "Contract created");
      onSuccess();
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Contract" : "Add Contract"}</DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the contract details below"
              : "Create a new contract for this hotel"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contract Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Q1 2024 Contract" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="market_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market</FormLabel>
                  <Autocomplete
                    mode="client"
                    options={marketOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select market (optional)"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stay_validity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stay Validity</FormLabel>
                  <FormControl>
                    <DateValidityPicker
                      value={field.value as DateRangeValue}
                      onChange={field.onChange}
                      placeholder="Select stay date range"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="booking_validity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking Validity</FormLabel>
                  <FormControl>
                    <DateValidityPicker
                      value={field.value as DateRangeValue}
                      onChange={field.onChange}
                      placeholder="Select booking date range"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Type *</FormLabel>
                    <FormControl>
                      <div className="flex h-10 rounded-md border border-input overflow-hidden">
                        <button
                          type="button"
                          onClick={() => field.onChange("net")}
                          className={`flex-1 text-sm font-medium transition-colors ${
                            field.value === "net"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          Net Rate
                        </button>
                        <button
                          type="button"
                          onClick={() => field.onChange("bar")}
                          className={`flex-1 text-sm font-medium border-l border-input transition-colors ${
                            field.value === "bar"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background text-foreground hover:bg-muted"
                          }`}
                        >
                          BAR Rate
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving…" : initialData ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
