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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import PaxCounter from "@/components/common/pax-counter";

// Day selector options (temporary - will be dynamic later)
const TRIP_DAYS = Array.from({ length: 5 }, (_, i) => ({
  value: `day_${i + 1}`,
  label: `Day ${i + 1}`,
}));

const HotelFormSchema = z.object({
  hotel: z.string().min(1, "Hotel name is required"),
  check_in_day: z.string().min(1, "Check-in day is required"),
  check_in_time: z.string().optional(),
  check_out_day: z.string().min(1, "Check-out day is required"),
  check_out_time: z.string().optional(),
  people: z.object({
    adults: z.number(),
    children: z.number(),
    infants: z.number().optional(),
  }),
  address: z.string().optional(),
  city: z.string().optional(),
  pin: z.string().optional(),
  country: z.string().optional(),
  photo: z.any().optional(),
  website: z.string().optional(),
  price: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type IHotelForm = z.infer<typeof HotelFormSchema>;

type Props = {
  initialData?: IHotelForm;
};

export default function HotelForm({ initialData }: Props) {
  const form = useForm<IHotelForm>({
    resolver: zodResolver(HotelFormSchema),
    defaultValues: {
      ...initialData,
      people: initialData?.people || {
        adults: 2,
        children: 0,
        infants: 0,
      },
    },
  });

  const watchCheckInDay = form.watch("check_in_day");

  const getAvailableCheckOutDays = () => {
    if (!watchCheckInDay) return TRIP_DAYS;

    const checkInIndex = TRIP_DAYS.findIndex(
      (d) => d.value === watchCheckInDay
    );
    return TRIP_DAYS.filter((_, idx) => idx >= checkInIndex);
  };

  const onSubmit = (data: IHotelForm) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hotel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Hotel Name *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter hotel name"
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
            name="people"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Guests
                </FormLabel>
                <FormControl>
                  <PaxCounter
                    value={field.value}
                    onChange={field.onChange}
                    showRooms={false}
                    enableInfant={true}
                    heading="Guests"
                    description="Add number of guests"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Stay Duration Section */}
        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="check_in_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Check-in Day *
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
            name="check_in_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Check-in Time
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

          <FormField
            control={form.control}
            name="check_out_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Check-out Day *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getAvailableCheckOutDays().map((day) => (
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
            name="check_out_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Check-out Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. 11:00 AM"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Location Details Section */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  City
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter city" {...field} className="h-10" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Country
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter country"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter address"
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
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  PIN
                </FormLabel>
                <FormControl>
                  <Input placeholder="Enter PIN" {...field} className="h-10" />
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
            Add Hotel
          </Button>
        </div>
      </form>
    </Form>
  );
}
