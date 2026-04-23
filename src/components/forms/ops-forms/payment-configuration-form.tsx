"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Trash2, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  upsertPaymentPlan,
  getPaymentPlan,
  getApprovedTransactionsForPlan,
  getBookingsForPaymentPlan,
} from "@/data-access/ops-accounts";
import { calculatePaidAmount } from "@/lib/utils/payment-plan-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { PaymentPlanType, IPaymentInstallment } from "@/types/ops-accounts";

const installmentSchema = z.object({
  installment_number: z.number().int().positive(),
  installment_amount: z.coerce.number().positive("Amount must be greater than 0"),
  due_date: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

const paymentPlanSchema = z.object({
  total_amount: z.coerce.number().positive("Total amount must be greater than 0"),
  final_due_date: z.string().min(1, "Due date is required"),
  currency: z.string().min(1, "Currency is required"),
  notes: z.string().optional(),
  installments: z.array(installmentSchema).optional(),
});

type PaymentPlanFormValues = z.infer<typeof paymentPlanSchema>;

interface BookingDetails {
  id: string;
  name: string;
  cost_price: number;
  type: string;
}

interface LinkedBooking {
  booking_id: string;
  hotel_name?: string;
  tour_name?: string;
  transfer_name?: string;
  service_type?: string;
  cost_price?: number;
}

type Props = {
  queryId: string;
  planType: PaymentPlanType;
  supplierId?: string | null;
  supplierName?: string | null;
  existingPlanId?: string | null;
  bookingIds?: string[]; // Changed from bookingIds
  availableBookings?: BookingDetails[]; // Changed from availableBookings
  onSuccess?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PaymentConfigurationForm({
  queryId,
  planType,
  supplierId,
  supplierName,
  existingPlanId,
  bookingIds = [],
  availableBookings = [],
  onSuccess,
  open,
  onOpenChange,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasInstallments, setHasInstallments] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [installmentsPaidMap, setInstallmentsPaidMap] = useState<Record<number, number>>({});
  const [selectedBookings, setSelectedBookings] = useState<string[]>(bookingIds);
  const [linkedBookings, setLinkedBookings] = useState<LinkedBooking[]>([]);

  const isSupplierPlan = planType === "supplier_payable";
  const isAgentPlan = planType === "agent_receivable";

  const form = useForm<PaymentPlanFormValues>({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: {
      total_amount: 0,
      final_due_date: "",
      currency: "USD",
      notes: "",
      installments: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "installments",
  });

  // Watch only necessary fields to avoid unnecessary re-renders
  const totalAmount = form.watch("total_amount");
  const finalDueDate = form.watch("final_due_date");
  const watchedInstallments = form.watch("installments");

  // Calculate remaining amount
  const total = Number(totalAmount) || 0;
  const remainingAmount =
    !hasInstallments || !watchedInstallments?.length
      ? total
      : total - watchedInstallments.reduce((sum, inst) => sum + (Number(inst?.installment_amount) || 0), 0);

  // Calculate total service amount
  const totalServiceAmount = selectedBookings.reduce((sum, serviceId) => {
    const service = availableBookings.find((s) => s.id === serviceId);
    return sum + (service?.cost_price || 0);
  }, 0);

  // Helper function to reset form state
  const resetFormState = () => {
    form.reset({
      total_amount: 0,
      final_due_date: "",
      currency: "USD",
      notes: "",
      installments: [],
    });
    setHasInstallments(false);
    setPaidAmount(0);
    setInstallmentsPaidMap({});
    setIsEditMode(false);
    setSelectedBookings([]);
    setLinkedBookings([]);
  };

  // Load existing payment plan data
  useEffect(() => {
    if (!open) return;

    const loadPaymentPlanData = async () => {
      // Reset form on open
      resetFormState();

      // If editing existing plan
      if (existingPlanId) {
        setIsLoadingData(true);
        try {
          const [plan, transactions, bookings] = await Promise.all([
            getPaymentPlan(existingPlanId, { includeInstallments: true }),
            getApprovedTransactionsForPlan(existingPlanId),
            isSupplierPlan ? getBookingsForPaymentPlan(existingPlanId) : Promise.resolve([]),
          ]);

          if (!plan) {
            toast.error("Payment plan not found");
            setIsLoadingData(false);
            return;
          }

          setIsEditMode(true);

          // Calculate paid amount
          const totalPaid = calculatePaidAmount(transactions);
          setPaidAmount(totalPaid);

          // Set form values
          form.setValue("total_amount", plan.total_amount);
          form.setValue(
            "final_due_date",
            plan.final_due_date ? format(new Date(plan.final_due_date), "yyyy-MM-dd") : ""
          );
          form.setValue("currency", plan.currency || "USD");
          form.setValue("notes", plan.notes || "");

          // Set installments
          if (plan.installments && plan.installments.length > 0) {
            setHasInstallments(true);
            const mappedInstallments = plan.installments.map((inst: IPaymentInstallment) => ({
              installment_number: inst.installment_number,
              installment_amount: inst.installment_amount,
              due_date: inst.due_date ? format(new Date(inst.due_date), "yyyy-MM-dd") : "",
              notes: inst.notes || "",
            }));
            form.setValue("installments", mappedInstallments);

            // Calculate paid amounts per installment
            const instPaidMap: Record<number, number> = {};
            plan.installments.forEach((inst: IPaymentInstallment) => {
              const paid = inst.paid_amount || 0;
              if (paid > 0) {
                instPaidMap[inst.installment_number] = paid;
              }
            });
            setInstallmentsPaidMap(instPaidMap);
          }

          // Set linked bookings for supplier plans
          if (isSupplierPlan && bookings.length > 0) {
            setLinkedBookings(bookings);
          }
        } catch (error) {
          console.error("Error loading payment plan data:", error);
          toast.error("Failed to load payment plan data");
        } finally {
          setIsLoadingData(false);
        }
      } else {
        // New plan - suggest total from selected services
        setSelectedBookings(bookingIds);
        if (isSupplierPlan && bookingIds.length > 0) {
          const calculatedTotal = bookingIds.reduce((sum, serviceId) => {
            const service = availableBookings.find((s) => s.id === serviceId);
            return sum + (service?.cost_price || 0);
          }, 0);
          if (calculatedTotal > 0) {
            form.setValue("total_amount", calculatedTotal);
          }
        }
      }
    };

    loadPaymentPlanData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingPlanId]);

  const handleAddInstallment = () => {
    if (!totalAmount || totalAmount <= 0) {
      toast.error("Please enter a total amount first");
      return;
    }

    if (!finalDueDate) {
      toast.error("Please select a due date first");
      return;
    }

    setHasInstallments(true);
    const nextNumber = (watchedInstallments?.length || 0) + 1;
    append({
      installment_number: nextNumber,
      installment_amount: 0,
      due_date: "",
      notes: "",
    });
  };

  const handleRemoveInstallment = (index: number) => {
    const installment = watchedInstallments?.[index];
    const installmentNum = installment?.installment_number;

    // Check if installment has paid amount
    if (installmentNum && installmentsPaidMap[installmentNum]) {
      toast.error(
        `Cannot delete: $${installmentsPaidMap[installmentNum].toFixed(2)} already paid for this installment`
      );
      return;
    }

    remove(index);
    if (fields.length === 1) {
      setHasInstallments(false);
    }
  };

  const handleBookingToggle = (bookingId: string) => {
    if (isEditMode) {
      toast.error("Cannot change bookings for existing payment plan");
      return;
    }

    setSelectedBookings((prev) =>
      prev.includes(bookingId) ? prev.filter((id) => id !== bookingId) : [...prev, bookingId]
    );
  };

  const onSubmit = async (data: PaymentPlanFormValues) => {
    // Validate for supplier plans
    if (isSupplierPlan && !isEditMode && selectedBookings.length === 0) {
      toast.error("Please select at least one booking");
      return;
    }

    // Validate total amount against paid amount
    if (isEditMode && paidAmount > 0 && data.total_amount < paidAmount) {
      toast.error(
        `Total amount ($${data.total_amount.toFixed(2)}) cannot be less than already paid amount ($${paidAmount.toFixed(2)})`
      );
      return;
    }

    // Validate installments if they exist
    if (hasInstallments && data.installments && data.installments.length > 0) {
      const installmentSum = data.installments.reduce((sum, inst) => sum + Number(inst.installment_amount || 0), 0);

      if (installmentSum > data.total_amount) {
        toast.error(
          `Total installments ($${installmentSum.toFixed(2)}) cannot exceed total amount ($${data.total_amount.toFixed(2)})`
        );
        return;
      }

      // Validate each installment amount against paid amount
      for (const inst of data.installments) {
        const instNum = inst.installment_number;
        if (installmentsPaidMap[instNum]) {
          const paidForInst = installmentsPaidMap[instNum]!;
          if (inst.installment_amount < paidForInst) {
            toast.error(
              `Installment ${instNum} amount ($${inst.installment_amount.toFixed(2)}) cannot be less than already paid amount ($${paidForInst.toFixed(2)})`
            );
            return;
          }
        }
      }

      // Check if any installment has 0 or negative amount
      const invalidInstallment = data.installments.find(
        (inst) => !inst.installment_amount || Number(inst.installment_amount) <= 0
      );
      if (invalidInstallment) {
        toast.error("All installments must have a valid amount greater than 0");
        return;
      }

      // Validate installment dates
      let prevDueDate: string | null = null;
      for (const inst of data.installments) {
        if (new Date(inst.due_date) > new Date(data.final_due_date)) {
          toast.error(`Installment ${inst.installment_number} due date cannot be after final due date`);
          return;
        }

        // Check sequential order
        if (prevDueDate && new Date(inst.due_date) < new Date(prevDueDate)) {
          toast.error(`Installment ${inst.installment_number} due date cannot be before previous installment due date`);
          return;
        }
        prevDueDate = inst.due_date;
      }
    }

    setLoading(true);
    try {
      // Prepare payload
      const payload: any = {
        query_id: queryId,
        plan_type: planType,
        supplier_id: supplierId,
        total_amount: data.total_amount,
        final_due_date: data.final_due_date,
        currency: data.currency,
        notes: data.notes,
        installments:
          hasInstallments && data.installments && data.installments.length > 0
            ? [
                ...data.installments,
                // Add final balance if remaining amount > 0
                ...(remainingAmount > 0
                  ? [
                      {
                        installment_number: data.installments.length + 1,
                        installment_amount: remainingAmount,
                        due_date: data.final_due_date,
                        notes: "Final balance",
                      },
                    ]
                  : []),
              ]
            : undefined,
        booking_ids: isSupplierPlan && !isEditMode ? selectedBookings : undefined,
      };

      // Add plan_id for updates
      if (isEditMode && existingPlanId) {
        payload.plan_id = existingPlanId;
      }

      const result = await upsertPaymentPlan(payload);

      if (!result.success) {
        toast.error(result.error || "Failed to save payment plan");
        return;
      }

      toast.success(isEditMode ? "Payment plan updated successfully" : "Payment plan created successfully");

      resetFormState();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving payment plan:", error);
      toast.error("Failed to save payment plan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-4xl ">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? "Edit" : "Create"} {isAgentPlan ? "Agent Receivable" : "Supplier Payable"} Plan
          </SheetTitle>
          <SheetDescription>
            {isAgentPlan
              ? isEditMode
                ? "Update the payment plan for customer"
                : "Create payment plan for customer receivables"
              : isEditMode
                ? `Update payment plan for ${supplierName || "supplier"}`
                : `Create payment plan for ${supplierName || "supplier"}`}
          </SheetDescription>
        </SheetHeader>

        {isLoadingData ? (
          <div className="space-y-4 mx-4 py-4">
            {/* Linked Services Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-64" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-28 rounded-full" />
              </div>
            </div>

            <Separator />

            {/* Total Amount & Due Date Skeleton */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>

            {/* Notes Skeleton */}
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-full" />
            </div>

            <Separator />

            {/* Installments Skeleton */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-32" />
              </div>

              <div className="border rounded-lg bg-muted/30 overflow-hidden">
                <div className="bg-muted/50 border-b px-3 py-2">
                  <Skeleton className="h-3 w-full" />
                </div>
                <div className="p-3 space-y-3">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </div>
            </div>

            {/* Footer Skeleton */}
            <div className="flex justify-end gap-2 pt-4">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mx-4">
              {/* Service Selection (Supplier Only - Create Mode) */}
              {isSupplierPlan && !isEditMode && availableBookings.length > 0 && (
                <>
                  <div className="space-y-2">
                    <FormLabel className="text-xs">Select Bookings for Payment Plan</FormLabel>
                    <div className="border rounded-lg p-3 bg-muted/30 space-y-1.5 max-h-48 overflow-y-auto">
                      {availableBookings.map((service) => (
                        <div
                          key={service.id}
                          className="flex items-center space-x-2 py-1.5 px-2 hover:bg-muted/50 rounded"
                        >
                          <Checkbox
                            checked={selectedBookings.includes(service.id)}
                            onCheckedChange={() => handleBookingToggle(service.id)}
                          />
                          <div className="flex-1 flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{service.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                              <span className="capitalize">{service.type}</span>
                              <span>·</span>
                              <span className="font-semibold">${service.cost_price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {totalServiceAmount > 0 && (
                      <p className="text-xs text-muted-foreground text-right mr-4">
                        Total selected: ${totalServiceAmount.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Linked Services (Edit Mode) */}
              {isSupplierPlan && isEditMode && linkedBookings.length > 0 && (
                <>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      This plan is linked to {linkedBookings.length} booking(s). Booking mappings cannot be changed
                      after creation.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {linkedBookings.map((booking) => (
                        <Badge key={booking.booking_id} variant="secondary">
                          {booking.hotel_name || booking.tour_name || booking.transfer_name || "Unknown"}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Total Amount & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="total_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Total Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          disabled={loading}
                          className="h-9"
                          min={isEditMode && paidAmount > 0 ? paidAmount : 0}
                        />
                      </FormControl>
                      {isEditMode && paidAmount > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Paid: ${paidAmount.toFixed(2)} (minimum amount)
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="final_due_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs">Final Due Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          value={field.value ? new Date(field.value) : undefined}
                          onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          placeholder="Select due date"
                          minDate={new Date()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Currency hidden - defaults to USD */}
                <input type="hidden" {...form.register("currency")} value="USD" />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Add notes..." {...field} disabled={loading} className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Installments Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold">Installments (Optional)</h4>
                    {totalAmount > 0 && (
                      <p
                        className={cn(
                          "text-[10px] mt-0.5",
                          remainingAmount === 0
                            ? "text-green-600"
                            : remainingAmount < 0
                              ? "text-destructive"
                              : "text-blue-600"
                        )}
                      >
                        {remainingAmount === 0
                          ? "✓ All amounts allocated"
                          : remainingAmount < 0
                            ? `❌ Exceeds by $${Math.abs(remainingAmount).toFixed(2)}`
                            : hasInstallments && fields.length > 0
                              ? `Remaining: $${remainingAmount.toFixed(2)} (final balance)`
                              : `Total: $${remainingAmount.toFixed(2)}`}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddInstallment}
                    disabled={loading || !totalAmount || !finalDueDate || remainingAmount <= 0}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Installment
                  </Button>
                </div>

                {hasInstallments && fields.length > 0 && (
                  <div className="border rounded-lg bg-muted/30 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-muted/50 border-b px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-32 shrink-0">
                          <FormLabel className="text-xs font-semibold text-muted-foreground">Installments</FormLabel>
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <FormLabel className="text-xs font-semibold text-muted-foreground">Amount</FormLabel>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">Due Date</FormLabel>
                          <FormLabel className="text-xs font-semibold text-muted-foreground">Notes</FormLabel>
                        </div>
                        <div className="w-9 shrink-0" />
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y">
                      {fields.map((field, index) => {
                        const installment = watchedInstallments?.[index];
                        const instNum = installment?.installment_number;
                        const paidForInst = instNum ? installmentsPaidMap[instNum] || 0 : 0;

                        return (
                          <div key={field.id} className="p-3">
                            <div className="flex items-start gap-2">
                              {/* Installment Number */}
                              <div className="w-32 shrink-0 flex items-center h-9">
                                <span className="text-sm font-medium">{instNum || index + 1}</span>
                              </div>

                              <div className="flex-1 grid grid-cols-3 gap-2">
                                {/* Amount */}
                                <FormField
                                  control={form.control}
                                  name={`installments.${index}.installment_amount` as const}
                                  render={({ field: amountField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="0.00"
                                          {...amountField}
                                          disabled={loading}
                                          className="h-9"
                                          min={paidForInst > 0 ? paidForInst : 0}
                                        />
                                      </FormControl>
                                      {paidForInst > 0 && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          Paid: ${paidForInst.toFixed(2)} (min)
                                        </p>
                                      )}
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                {/* Due Date */}
                                <FormField
                                  control={form.control}
                                  name={`installments.${index}.due_date` as const}
                                  render={({ field: dateField }) => {
                                    const minDate =
                                      index > 0 && watchedInstallments?.[index - 1]?.due_date
                                        ? new Date(watchedInstallments[index - 1].due_date)
                                        : new Date();
                                    const maxDate = finalDueDate ? new Date(finalDueDate) : undefined;

                                    return (
                                      <FormItem>
                                        <FormControl>
                                          <DatePicker
                                            value={dateField.value ? new Date(dateField.value) : undefined}
                                            onChange={(date) =>
                                              dateField.onChange(date ? format(date, "yyyy-MM-dd") : "")
                                            }
                                            placeholder="Select"
                                            minDate={minDate}
                                            maxDate={maxDate}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }}
                                />

                                {/* Notes */}
                                <FormField
                                  control={form.control}
                                  name={`installments.${index}.notes` as const}
                                  render={({ field: notesField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          placeholder="Optional..."
                                          {...notesField}
                                          disabled={loading}
                                          className="h-9"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              {/* Delete Button */}
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleRemoveInstallment(index)}
                                disabled={loading || paidForInst > 0}
                                className="h-9 w-9 shrink-0"
                                title={
                                  paidForInst > 0
                                    ? `Cannot delete: $${paidForInst.toFixed(2)} already paid`
                                    : "Delete installment"
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Final Balance Row */}
                      {remainingAmount > 0 && (
                        <div className="p-3 bg-primary/5 border-t-2 border-dashed border-primary/40">
                          <div className="flex items-start gap-2">
                            {/* Final Balance Label */}
                            <div className="w-32 shrink-0 flex items-center h-9">
                              <span className="text-xs font-semibold text-primary whitespace-nowrap">
                                Final Balance ({fields.length + 1})
                              </span>
                            </div>

                            <div className="flex-1 grid grid-cols-3 gap-2">
                              {/* Amount */}
                              <div>
                                <Input
                                  type="number"
                                  value={remainingAmount.toFixed(2)}
                                  disabled
                                  className="h-9 bg-background/50 border-primary/30 font-semibold"
                                />
                              </div>

                              {/* Due Date */}
                              <div>
                                <Input
                                  type="text"
                                  value={finalDueDate ? format(new Date(finalDueDate), "PPP") : ""}
                                  disabled
                                  className="h-9 bg-background/50 border-primary/30"
                                />
                              </div>

                              {/* Notes */}
                              <div>
                                <Input
                                  type="text"
                                  value="Auto-calculated"
                                  disabled
                                  className="h-9 bg-background/50 border-primary/30 text-muted-foreground"
                                />
                              </div>
                            </div>
                            <div className="w-9 shrink-0" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {hasInstallments && fields.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-3">
                    No installments added. Click "Add Installment" to create one.
                  </p>
                )}
              </div>

              <SheetFooter className="gap-2 flex-row justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetFormState();
                    onOpenChange(false);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                  loadingText={isEditMode ? "Updating..." : "Creating..."}
                >
                  {isEditMode ? "Update Plan" : "Create Plan"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
