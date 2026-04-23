"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HotelSearchSchema, IHotelSearchForm } from "../schemas/api-booking-search-schema";
import { DatePicker } from "@/components/ui/date-picker";
import PaxCounter from "@/components/common/pax-counter";
import { Input } from "@/components/ui/input";

export default function HotelBookingSearchForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<IHotelSearchForm>({
    resolver: zodResolver(HotelSearchSchema),
    defaultValues: {
      country: "",
      city: "",
      checkIn: undefined,
      checkOut: undefined,
      rating: undefined,
      accommodation_type: undefined,
      guests: [
        {
          adults: 1,
          children: 0,
          children_ages: [],
        },
      ],
    },
  });

  const onSubmit = async (values: IHotelSearchForm) => {
    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Extract destination from city for URL param
    const destination = values.city.toLowerCase().replace(/\s+/g, "-");

    // Navigate to search results with destination in searchParams
    router.push(`/api-services/hotels/search?step=choose-room&destination=${destination}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Country *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter country name"
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
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">City *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter city name"
                    {...field}
                    className="h-10"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkIn"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Check-in Date *</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                    minDate={new Date()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="checkOut"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Check-out Date *</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                    minDate={new Date()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="guests"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Guests *</FormLabel>
                <FormControl>
                  <PaxCounter
                    value={field.value}
                    onChange={field.onChange}
                    heading="Guests"
                    description="Add number of guests"
                    showRooms={false}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium">Rating</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="2">2 ★</SelectItem>
                    <SelectItem value="3">3 ★</SelectItem>
                    <SelectItem value="4">4 ★</SelectItem>
                    <SelectItem value="5">5 ★</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-center pt-4">
          <Button
            type="submit"
            size="lg"
            disabled={isLoading}
            loading={isLoading}
            loadingText="Searching..."
            className="min-w-[240px] h-11"
          >
            Search Hotels
          </Button>
        </div>
      </form>
    </Form>
  );
}
