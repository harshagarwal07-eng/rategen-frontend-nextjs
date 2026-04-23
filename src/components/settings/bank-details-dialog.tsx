"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BankDetail } from "@/types/dmc-settings";
import { Loader2 } from "lucide-react";

const bankDetailsSchema = z.object({
  bank_name: z.string().min(1, "Bank name is required"),
  account_holder_name: z.string().min(1, "Account holder name is required"),
  account_number: z.string().min(1, "Account number is required"),
  ifsc_code: z.string().optional(),
  swift_code: z.string().optional(),
  iban: z.string().optional(),
  routing_number: z.string().optional(),
  branch_name: z.string().optional(),
  branch_address: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  is_primary: z.boolean(),
});

type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

interface BankDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankDetail: BankDetail | null;
  onSave: (bankDetail: BankDetail) => Promise<void>;
  isUpdating: boolean;
}

export function BankDetailsDialog({
  open,
  onOpenChange,
  bankDetail,
  onSave,
  isUpdating,
}: BankDetailsDialogProps) {
  const form = useForm<BankDetailsFormValues>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bank_name: "",
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
      swift_code: "",
      iban: "",
      routing_number: "",
      branch_name: "",
      branch_address: "",
      currency: "USD",
      is_primary: false,
    },
  });

  // Reset form when bankDetail changes (for editing)
  useEffect(() => {
    if (open) {
      if (bankDetail) {
        form.reset({
          bank_name: bankDetail.bank_name,
          account_holder_name: bankDetail.account_holder_name,
          account_number: bankDetail.account_number,
          ifsc_code: bankDetail.ifsc_code || "",
          swift_code: bankDetail.swift_code || "",
          iban: bankDetail.iban || "",
          routing_number: bankDetail.routing_number || "",
          branch_name: bankDetail.branch_name || "",
          branch_address: bankDetail.branch_address || "",
          currency: bankDetail.currency,
          is_primary: bankDetail.is_primary,
        });
      } else {
        form.reset({
          bank_name: "",
          account_holder_name: "",
          account_number: "",
          ifsc_code: "",
          swift_code: "",
          iban: "",
          routing_number: "",
          branch_name: "",
          branch_address: "",
          currency: "USD",
          is_primary: false,
        });
      }
    }
  }, [bankDetail, open, form]);

  const onSubmit = async (values: BankDetailsFormValues) => {
    const bankDetailToSave: BankDetail = {
      id: bankDetail?.id || crypto.randomUUID(),
      ...values,
    };
    await onSave(bankDetailToSave);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {bankDetail ? "Edit Bank Details" : "Add Bank Details"}
          </DialogTitle>
          <DialogDescription>
            {bankDetail
              ? "Update your bank account information"
              : "Add a new bank account for receiving payments"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Basic Information</h3>

              <FormField
                control={form.control}
                name="bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., State Bank of India"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_holder_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Holder Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter account holder name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter account number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., USD, INR, EUR" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Bank Codes */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Bank Codes</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ifsc_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IFSC Code (India)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SBIN0001234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="swift_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SWIFT Code (International)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., SBININBB123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN (Europe)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., GB29NWBK60161331926819"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="routing_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Routing Number (US)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Branch Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">
                Branch Details (Optional)
              </h3>

              <FormField
                control={form.control}
                name="branch_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter branch name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="branch_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter branch address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Primary Account */}
            <FormField
              control={form.control}
              name="is_primary"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Primary Account</FormLabel>
                    <FormDescription>
                      Set as primary account for receiving payments
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {bankDetail ? "Update" : "Add"} Bank Details
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
