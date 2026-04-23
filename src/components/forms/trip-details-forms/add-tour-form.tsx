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
import { Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import PaxCounter from "@/components/common/pax-counter";

// Day selector options (temporary - will be dynamic later)
const TRIP_DAYS = Array.from({ length: 5 }, (_, i) => ({
  value: `day_${i + 1}`,
  label: `Day ${i + 1}`,
}));

// Duration options
const DURATION_OPTIONS = [
  { value: "30min", label: "30 min" },
  { value: "1h", label: "1h" },
  { value: "1h30min", label: "1h 30min" },
  { value: "2h", label: "2h" },
  { value: "2h30min", label: "2h 30min" },
  { value: "3h", label: "3h" },
  { value: "3h30min", label: "3h 30min" },
  { value: "4h", label: "4h" },
  { value: "4h30min", label: "4h 30min" },
  { value: "5h", label: "5h" },
];

const TourFormSchema = z.object({
  name: z.string().min(1, "Tour name is required"),
  day: z.string().min(1, "Day is required"),
  time: z.string().optional(),
  duration: z.string().min(1, "Duration is required"),
  people: z.object({
    adults: z.number(),
    children: z.number(),
    infants: z.number().optional(),
  }),
  address: z.string().optional(),
  city: z.string().optional(),
  pin: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  price: z.string().optional(),
  notes: z.string().optional(),
});

export type ITourForm = z.infer<typeof TourFormSchema>;

type Props = {
  initialData?: ITourForm;
};

export default function TourForm({ initialData }: Props) {
  const form = useForm<ITourForm>({
    resolver: zodResolver(TourFormSchema),
    defaultValues: {
      ...initialData,
      people: initialData?.people || {
        adults: 2,
        children: 0,
        infants: 0,
      },
    },
  });

  const onSubmit = (data: ITourForm) => {
    console.log(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Tour Name *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter tour name"
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

        {/* Schedule Section */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="day"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Day *
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
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. 9:00 AM"
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
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Duration *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DURATION_OPTIONS.map((duration) => (
                      <SelectItem key={duration.value} value={duration.value}>
                        {duration.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            Add Tour
          </Button>
        </div>
      </form>
    </Form>
  );
}
