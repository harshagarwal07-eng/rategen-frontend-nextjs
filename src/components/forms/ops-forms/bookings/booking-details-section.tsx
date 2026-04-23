import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Autocomplete } from "@/components/ui/autocomplete";
import { CURRENCY_OPTIONS } from "@/constants/data";
import { format } from "date-fns";
import type { UseFormReturn } from "react-hook-form";
import type { BookingStatus } from "@/types/ops-bookings";

interface BookingDetailsProps {
  form: UseFormReturn<any>;
  showReconfirmedBy?: boolean;
  paymentLocked?: boolean;
  hideTitle?: boolean;
}

export function BookingDetailsSection({
  form,
  showReconfirmedBy = false,
  paymentLocked = false,
  hideTitle = false,
}: BookingDetailsProps) {
  return (
    <BorderedCard title="Booking Details" collapsible defaultOpen>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {!hideTitle && (
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="lg:col-span-3">
              <FormLabel>Booking Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter booking title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        )}

        <FormField
          control={form.control}
          name="confirmation_no"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmation Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter confirmation number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showReconfirmedBy && (
          <FormField
            control={form.control}
            name="reconfirmed_by"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reconfirmed By</FormLabel>
                <FormControl>
                  <Input placeholder="Enter name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="booking_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Booking Status</FormLabel>
              <Select onValueChange={(value) => field.onChange(value as BookingStatus)} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="free_cancellation_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Free Cancellation Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ? new Date(field.value) : undefined}
                  onChange={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                  placeholder="Select cancellation date"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="free_cancellation_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Free Cancellation Time</FormLabel>
              <FormControl>
                <TimePicker value={field.value} onChange={field.onChange} placeholder="Select cancellation time" />
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
                <Autocomplete
                  options={CURRENCY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select currency"
                  searchPlaceholder="Search currencies..."
                  maxResults={20}
                  disabled={paymentLocked}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cost_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter cost price"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                  disabled={paymentLocked}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="lg:col-span-3">
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Add any additional notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </BorderedCard>
  );
}

/** Common default values for all booking forms */
export const BOOKING_DEFAULTS = {
  title: "",
  booking_status: "pending" as const,
  voucher_status: "pending" as const,
  confirmation_no: "",
  supplier_id: "",
  reconfirmed_by: "",
  free_cancellation_date: "",
  free_cancellation_time: "",
  notes: "",
  currency: "",
  cost_price: undefined,
};
