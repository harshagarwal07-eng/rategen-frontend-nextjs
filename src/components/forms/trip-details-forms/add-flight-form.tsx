"use client";

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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import PaxCounter from "@/components/common/pax-counter";

// Day selector options (temporary - will be dynamic later)
const TRIP_DAYS = Array.from({ length: 5 }, (_, i) => ({
  value: `day_${i + 1}`,
  label: `Day ${i + 1}`,
}));

const FlightFormSchema = z.object({
  airline: z.string().min(1, "Airline is required"),
  flight_number: z.string().min(1, "Flight number is required"),
  from: z.string().min(1, "Departure airport is required"),
  to: z.string().min(1, "Arrival airport is required"),
  departure_day: z.string().min(1, "Departure day is required"),
  departure_time: z.string().optional(),
  arrival_day: z.string().min(1, "Arrival day is required"),
  arrival_time: z.string().optional(),
  passengers: z.object({
    adults: z.number(),
    children: z.number(),
    infants: z.number().optional(),
  }),
  phone: z.string().optional(),
  website: z.string().optional(),
  price: z.string().optional(),
  notes: z.string().optional(),
});

export type IFlightForm = z.infer<typeof FlightFormSchema>;

type Props = {
  initialData?: IFlightForm;
};

export default function FlightForm({ initialData }: Props) {
  const form = useForm<IFlightForm>({
    resolver: zodResolver(FlightFormSchema),
    defaultValues: {
      ...initialData,
      passengers: initialData?.passengers || {
        adults: 2,
        children: 0,
        infants: 0,
      },
    },
  });

  const watchDepartureDay = form.watch("departure_day");

  const getAvailableArrivalDays = () => {
    if (!watchDepartureDay) return TRIP_DAYS;

    const departureIndex = TRIP_DAYS.findIndex(
      (d) => d.value === watchDepartureDay
    );
    return TRIP_DAYS.filter((_, idx) => idx >= departureIndex);
  };

  const onSubmit = (data: IFlightForm) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Flight Information Section */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="airline"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Airline *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter airline name"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="flight_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Flight Number *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. 6E-123"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Route Section */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="from"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  From *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. DEL - Delhi"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="to"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  To *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. BOM - Mumbai"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Flight Schedule Section */}
        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="departure_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Departure Day *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRIP_DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
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
            name="departure_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Departure Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. 10:30 AM"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="arrival_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Arrival Day *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getAvailableArrivalDays().map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
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
            name="arrival_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Arrival Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. 2:00 PM"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Passengers Section */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="passengers"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Passengers
                </FormLabel>
                <FormControl>
                  <PaxCounter
                    value={field.value}
                    onChange={field.onChange}
                    showRooms={false}
                    enableInfant={true}
                    heading="Passengers"
                    description="Add number of passengers"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Additional Details Section */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Phone
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter phone"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Website
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter website"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Price
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter price"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground">
                Notes
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit Button */}
        <div className="pt-2 text-right">
          <Button type="submit">
            <Plus className="w-4 h-4 mr-2" />
            Add Flight
          </Button>
        </div>
      </form>
    </Form>
  );
}
