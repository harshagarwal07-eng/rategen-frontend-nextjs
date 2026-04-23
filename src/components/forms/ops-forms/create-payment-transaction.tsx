"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, Upload, FileText, Loader2, X, ExternalLink, Info } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { recordPaymentTransaction, recordRefundTransaction } from "@/data-access/ops-accounts";
import { toast } from "sonner";
import { IPaymentTransaction } from "@/types/ops-accounts";
import { uploadToS3, removeFromS3, openS3File } from "@/lib/s3-upload";
import useUser from "@/hooks/use-user";
import { Checkbox } from "@/components/ui/checkbox";

const paymentTransactionSchema = z
  .object({
    transaction_type: z.enum(["payment", "refund"] as const),
    refund_of_transaction_id: z.string().optional(),
    refund_reason: z.string().optional(),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    transaction_date: z.date({ required_error: "Transaction date is required" }),
    payment_method: z.enum(["bank_transfer", "credit_card", "cash", "cheque", "upi", "other"] as const, {
      required_error: "Payment method is required",
    }),
    transaction_reference: z.string().optional(),
    notes: z.string().optional(),
    auto_approve: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.transaction_type === "refund") {
        return !!data.refund_of_transaction_id;
      }
      return true;
    },
    {
      message: "Please select a payment to refund",
      path: ["refund_of_transaction_id"],
    }
  )
  .refine(
    (data) => {
      if (data.transaction_type === "refund") {
        return !!data.refund_reason && data.refund_reason.trim().length > 0;
      }
      return true;
    },
    {
      message: "Refund reason is required",
      path: ["refund_reason"],
    }
  );

type PaymentTransactionFormValues = {
  transaction_type: "payment" | "refund";
  refund_of_transaction_id?: string;
  refund_reason?: string;
  amount: number;
  transaction_date: Date;
  payment_method: "bank_transfer" | "credit_card" | "cash" | "cheque" | "upi" | "other";
  auto_approve: boolean;
  transaction_reference?: string;
  notes?: string;
};

type Props = {
  paymentPlanId: string;
  planType: "agent_receivable" | "supplier_payable";
  approvedPayments: IPaymentTransaction[];
  supplierName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export default function CreatePaymentTransaction({
  paymentPlanId,
  planType,
  approvedPayments,
  supplierName,
  open,
  onOpenChange,
  onSuccess,
}: Props) {
  const { user } = useUser();
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");

  const isSupplierPayment = planType === "supplier_payable";

  const form = useForm<PaymentTransactionFormValues>({
    resolver: zodResolver(paymentTransactionSchema),
    defaultValues: {
      transaction_type: "payment",
      refund_of_transaction_id: "",
      refund_reason: "",
      amount: 0,
      transaction_date: new Date(),
      payment_method: "bank_transfer",
      transaction_reference: "",
      notes: "",
      auto_approve: true,
    },
  });

  const transactionType = form.watch("transaction_type");
  const selectedPaymentId = form.watch("refund_of_transaction_id");
  const selectedPayment = approvedPayments.find((p) => p.id === selectedPaymentId);

  const dialogTitle =
    transactionType === "refund"
      ? isSupplierPayment
        ? "Add Supplier Refund"
        : "Add Agent Refund"
      : isSupplierPayment
        ? "Add Supplier Payment"
        : "Add Agent Payment";

  const dialogDescription =
    transactionType === "refund"
      ? isSupplierPayment
        ? `Record a refund transaction${supplierName ? ` for ${supplierName}` : ""}`
        : "Record a refund transaction to the agent"
      : isSupplierPayment
        ? `Record a payment transaction${supplierName ? ` for ${supplierName}` : ""}`
        : "Record a payment transaction from the agent";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !user?.id) return;

    const file = e.target.files[0];
    setUploadingFile(true);

    try {
      const result = await uploadToS3({
        file,
        userId: user.id,
        prefix: "payment-documents/",
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      form.setValue("transaction_reference", result.url);
      setUploadedFileName(file.name);
      toast.success("Document uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload document");
      console.error("Upload error:", error);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleRemoveFile = async () => {
    const docUrl = form.getValues("transaction_reference");
    if (!docUrl) return;

    try {
      await removeFromS3(docUrl);
      form.setValue("transaction_reference", "");
      setUploadedFileName("");
      toast.success("Document removed successfully");
    } catch (error) {
      console.error("Error removing file:", error);
      toast.error("Failed to remove document");
    }
  };

  const onSubmit = async (data: PaymentTransactionFormValues) => {
    let result;

    if (data.transaction_type === "refund") {
      // Validate refund amount
      if (selectedPayment && data.amount > selectedPayment.amount) {
        toast.error(`Refund amount cannot exceed payment amount of ${selectedPayment.amount.toFixed(2)}`);
        return;
      }

      result = await recordRefundTransaction({
        payment_plan_id: paymentPlanId,
        refund_of_transaction_id: data.refund_of_transaction_id!,
        amount: data.amount,
        transaction_date: data.transaction_date.toISOString().split("T")[0],
        payment_method: data.payment_method,
        refund_reason: data.refund_reason!,
        transaction_reference: data.transaction_reference || null,
        notes: data.notes || null,
        auto_approve: data.auto_approve,
        approved_by: user?.id || null,
      });
    } else {
      result = await recordPaymentTransaction({
        payment_plan_id: paymentPlanId,
        amount: data.amount,
        transaction_date: data.transaction_date.toISOString().split("T")[0],
        payment_method: data.payment_method,
        transaction_reference: data.transaction_reference || null,
        notes: data.notes || null,
        auto_approve: data.auto_approve,
        approved_by: user?.id || null,
      });
    }

    if (!result.success || result.error) {
      toast.error(result.error || `Failed to record ${data.transaction_type} transaction`);
      return;
    }

    const message = data.auto_approve
      ? `${data.transaction_type === "refund" ? "Refund" : "Payment"} transaction recorded and approved`
      : `${data.transaction_type === "refund" ? "Refund" : "Payment"} transaction recorded, pending approval`;
    toast.success(message);

    form.reset();
    setUploadedFileName("");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm md:max-w-md max-h-[90vh] overflow-hidden flex flex-col p-6 gap-0">
        <DialogHeader className="pb-4">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
            <div className="space-y-4 overflow-y-auto overflow-x-hidden pr-2 -mr-2" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {transactionType === "refund" && (
              <>
                <FormField
                  control={form.control}
                  name="refund_of_transaction_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Payment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment to refund" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {approvedPayments.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">No approved payments</div>
                          ) : (
                            approvedPayments.map((payment) => (
                              <SelectItem key={payment.id} value={payment.id}>
                                {payment.amount.toFixed(2)} -{" "}
                                {format(new Date(payment.transaction_date), "MMM d, yyyy")}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="refund_reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Refund Reason</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter reason for refund" className="resize-none" rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{transactionType === "refund" ? "Refund Amount" : "Amount"}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      max={transactionType === "refund" && selectedPayment ? selectedPayment.amount : undefined}
                    />
                  </FormControl>
                  {transactionType === "refund" && selectedPayment && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Max: {selectedPayment.amount.toFixed(2)}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="transaction_reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Reference / Document (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {/* Upload Button */}
                      {!field.value && (
                        <div className="space-y-2">
                          <label htmlFor="doc-upload" className="cursor-pointer">
                            <div
                              className={cn(
                                "flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed rounded-lg transition-colors",
                                uploadingFile
                                  ? "border-muted-foreground/50 bg-muted/30 cursor-not-allowed"
                                  : "border-muted-foreground/30 hover:border-primary hover:bg-muted/50 cursor-pointer"
                              )}
                              onClick={() => !uploadingFile && document.getElementById("doc-upload")?.click()}
                            >
                              {uploadingFile ? (
                                <>
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                  <span className="text-sm font-medium text-muted-foreground">Uploading...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-5 w-5 text-muted-foreground" />
                                  <span className="text-sm font-medium">Upload Document</span>
                                </>
                              )}
                            </div>
                          </label>
                          <Input
                            id="doc-upload"
                            type="file"
                            accept=".pdf,.doc,.jpg,.png,application/pdf,application/msword,image/jpeg,image/png"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploadingFile}
                          />
                          <p className="text-xs text-muted-foreground text-center">
                            Supported formats: PDF, DOC, JPG, PNG (Max 4MB)
                          </p>
                        </div>
                      )}

                      {/* Uploaded File Display */}
                      {field.value && (
                        <div className="flex items-center gap-3 p-3 border-2 rounded-lg bg-muted/30 border-primary/20">
                          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary/10">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{uploadedFileName || "Document"}</p>
                            <p className="text-xs text-muted-foreground">Click to view or remove</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={async () => {
                                if (!field.value) return;
                                try {
                                  await openS3File(field.value);
                                } catch (error) {
                                  toast.error("Failed to open document");
                                }
                              }}
                              title="View document"
                              className="hover:bg-primary/10"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={handleRemoveFile}
                              title="Remove document"
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any additional notes" className="resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="auto_approve"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Auto-approve transaction</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Automatically approve this transaction and update paid amounts
                    </p>
                  </div>
                </FormItem>
              )}
            />
            </div>

            <DialogFooter className="pt-4 mt-0 flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
