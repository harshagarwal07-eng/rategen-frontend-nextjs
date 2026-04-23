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

const TransferFormSchema = z.object({
  name: z.string().min(1, "Transfer name is required"),
  pick_up_day: z.string().min(1, "Pick-up day is required"),
  pick_up_time: z.string().optional(),
  drop_off_day: z.string().min(1, "Drop-off day is required"),
  drop_off_time: z.string().optional(),
  pax_count: z.object({
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

export type ITransferForm = z.infer<typeof TransferFormSchema>;

type Props = {
  initialData?: ITransferForm;
};

export default function TransferForm({ initialData }: Props) {
  const form = useForm<ITransferForm>({
    resolver: zodResolver(TransferFormSchema),
    defaultValues: {
      ...initialData,
      pax_count: initialData?.pax_count || {
        adults: 2,
        children: 0,
        infants: 0,
      },
    },
  });

  const watchPickUpDay = form.watch("pick_up_day");

  const getAvailableDropOffDays = () => {
    if (!watchPickUpDay) return TRIP_DAYS;

    const pickUpIndex = TRIP_DAYS.findIndex((d) => d.value === watchPickUpDay);
    return TRIP_DAYS.filter((_, idx) => idx >= pickUpIndex);
  };

  const onSubmit = (data: ITransferForm) => {
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
                  Transfer Name *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter transfer name"
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
            name="pax_count"
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

        {/* Transfer Schedule Section */}
        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="pick_up_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Pick-up Day *
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
            name="pick_up_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Pick-up Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. 10:00 AM"
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
            name="drop_off_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Drop-off Day *
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getAvailableDropOffDays().map((day) => (
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
            name="drop_off_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">
                  Drop-off Time
                </FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="e.g. 12:00 PM"
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
            Add Transfer
          </Button>
        </div>
      </form>
    </Form>
  );
}
