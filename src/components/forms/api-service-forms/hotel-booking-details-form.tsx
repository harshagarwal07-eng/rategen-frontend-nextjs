"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { IHotelBookingForm, HotelBookingSchema } from "../schemas/api-booking-guest-details-schema";
import NoBorderTable from "@/components/api-services/shared/no-border-table";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import GuestFormSection from "./guest-form-section";
import FormSection from "@/components/api-services/shared/form-section";
import { Users, Plane, CreditCard, FileText, MessageSquare, AlertCircle, Hotel } from "lucide-react";
// Sample date will be deleted later and given as a prop
const cancellationTableData: { [key: string]: string }[] = [
  {
    cancelled_on_or_after: "13 Jul 2025",
    cancelled_on_or_before: "15 Jul 2025",
    cancellation_charges: "₹ 3,999.00",
  },
  {
    cancelled_on_or_after: "13 Jul 2025",
    cancelled_on_or_before: "15 Jul 2025",
    cancellation_charges: "₹ 3,999.00",
  },
  {
    cancelled_on_or_after: "13 Jul 2025",
    cancelled_on_or_before: "15 Jul 2025",
    cancellation_charges: "₹ 3,999.00",
  },
];

type Props = {
  guestCount: {
    adults: number;
    children?: number;
  };
  nextFun: () => void;
};

export default function HotelBookingForm({ guestCount, nextFun }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const childrenCount = guestCount.children ?? 0;

  const defaultGuests = [
    ...Array.from({ length: guestCount.adults }, () => ({
      type: "adult" as const,
      pan: "",
      title: "",
      firstName: "",
      lastName: "",
      email: "",
    })),
    ...Array.from({ length: childrenCount }, () => ({
      type: "child" as const,
      pan: "",
      title: "",
      firstName: "",
      lastName: "",
      email: "",
      age: undefined as number | undefined,
    })),
  ];

  const form = useForm<IHotelBookingForm>({
    resolver: zodResolver(HotelBookingSchema),
    defaultValues: {
      guests: defaultGuests,
      payment_method: "pay-by-card",
      arrival_mode: "flight",
      departure_mode: "flight",
      departure_time: "",
      arrival_time: "",
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "guests",
  });

  const cancellationTableColumns: { header: string; accessorKey: string }[] = [
    {
      header: "Cancelled On or After",
      accessorKey: "cancelled_on_or_after",
    },
    {
      header: "Cancelled On or Before",
      accessorKey: "cancelled_on_or_before",
    },
    {
      header: "Cancellation Charges",
      accessorKey: "cancellation_charges",
    },
  ];

  const arrivalMode = form.watch("arrival_mode");
  const departureMode = form.watch("departure_mode");

  const handleChangeHotel = () => {
    // Navigate back using browser history
    router.back();
  };

  const onSubmit = async (values: IHotelBookingForm) => {
    setIsSubmitting(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Generate mock booking ID
    const bookingId = `HTL${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    // Show success notification
    toast.success("Booking Confirmed!", {
      description: `Your hotel has been booked successfully. Booking ID: ${bookingId}`,
    });

    // Navigate to main hotels page after a short delay
    setTimeout(() => {
      router.push("/bookings/hotels");
    }, 1500);
  };

  useEffect(() => {
    form.reset({
      guests: defaultGuests,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestCount.adults, childrenCount]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Guest Details Section */}
        <FormSection title="Guest Details" icon={Users} description="Provide information for all guests - Room 1">
          <div className="space-y-4">
            {fields.map((field, index) => (
              <GuestFormSection
                key={field.id}
                control={form.control}
                index={index}
                guestType={field.type}
                isLeadGuest={index === 0}
                totalAdults={guestCount.adults}
                onValidatePAN={() => console.log("Validate PAN")}
                onSameForAll={(checked) => console.log("Same for all:", checked)}
              />
            ))}
          </div>
        </FormSection>

        {/* Trip Details */}
        <FormSection title="Trip Details" icon={Plane} description="Enter arrival and departure information">
          <div className="border p-6 rounded-xl space-y-6">
            {/* Arrival Details */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="arrival_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Arrival Details</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="flight" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Arriving by Flight</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="surface" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Arriving by Surface</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {arrivalMode === "flight" && (
                  <FormField
                    control={form.control}
                    name="arrival_flight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flight Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Flight Number" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="arrival_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="arrival_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <TimePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Departure Details */}
            <div className="space-y-4 pt-3 border-t">
              <FormField
                control={form.control}
                name="departure_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departure Details</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="flight" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Departing by Flight</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="surface" />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">Departing by Surface</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {departureMode === "flight" && (
                  <FormField
                    control={form.control}
                    name="departure_flight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flight Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter Flight Number" className="h-10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="departure_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="departure_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <TimePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </FormSection>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormSection title="Special Requests" icon={MessageSquare}>
            <FormField
              control={form.control}
              name="special_requests"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any special requests or requirements"
                      {...field}
                      className="min-h-[100px] resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>

          <FormSection title="Remarks" icon={FileText}>
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Enter any additional remarks"
                      {...field}
                      className="min-h-[100px] resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormSection>
        </div>

        {/* Payment Method */}
        <FormSection title="Payment Method" icon={CreditCard} description="Select your preferred payment option">
          <FormField
            control={form.control}
            name="payment_method"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="space-y-3">
                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                      <FormControl>
                        <RadioGroupItem value="pay-later" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer flex-1">Hold & Pay Later</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                      <FormControl>
                        <RadioGroupItem value="pay-by-card" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer flex-1">Pay Now by Debit/Credit Card</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 hover:bg-accent/50 transition-colors">
                      <FormControl>
                        <RadioGroupItem value="pay-by-credit-limit" />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer flex-1">Pay Now by Credit Limit</FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        {/* Cancellation Charges */}
        <FormSection
          title="Cancellation Charges"
          icon={AlertCircle}
          description="Review the cancellation policy for this booking"
        >
          <div className="rounded-lg border overflow-hidden">
            <NoBorderTable columns={cancellationTableColumns} tableData={cancellationTableData} />
          </div>
        </FormSection>

        {/* Hotel Norms */}
        <FormSection
          title="Hotel Norms"
          icon={Hotel}
          description="Important hotel policies and check-in/check-out information"
        >
          <ol className="list-decimal space-y-3 text-sm text-muted-foreground pl-5">
            <li>Early check out will attract full cancellation charge unless otherwise specified</li>
            <li>Check-in Time: 15:00</li>
            <li>Check-out Time: 11:00</li>
            <li>
              Guests aged 6 and up are charged the same price as adults; please include them as adults when making a
              reservation. Additional beds will include additional charges. Children under 6 do not receive an
              additional bed; please book accordingly.
            </li>
          </ol>
        </FormSection>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end items-center pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            onClick={handleChangeHotel}
          >
            Change Hotel
          </Button>
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            loading={isSubmitting}
            loadingText="Processing..."
          >
            Review Booking
          </Button>
        </div>
      </form>
    </Form>
  );
}
