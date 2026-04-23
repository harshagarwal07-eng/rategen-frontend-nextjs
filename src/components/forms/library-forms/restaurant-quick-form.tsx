"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { addLibraryItem } from "@/data-access/docs";

const restaurantQuickSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  phone: z.string().optional().nullable(),
  poc_name: z.string().optional().nullable(),
});

type RestaurantQuickData = z.infer<typeof restaurantQuickSchema>;

export function RestaurantQuickForm({ onSave }: { onSave: (id: string, label: string) => void }) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RestaurantQuickData>({
    resolver: zodResolver(restaurantQuickSchema),
    defaultValues: { name: "", phone: "", poc_name: "" },
  });

  const onSubmit = async (data: RestaurantQuickData) => {
    setIsLoading(true);
    try {
      const result = await addLibraryItem("restaurants", {
        ...data,
        status: "active",
        address: null,
        landline_number: null,
        country: null,
        state: null,
        city: null,
      } as any);
      if (result.error || !result.data) {
        toast.error(result.error || "Failed to create restaurant");
        return;
      }
      toast.success("Restaurant created successfully");
      onSave(result.data.id, data.name);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Restaurant name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="poc_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>POC Name</FormLabel>
                <FormControl>
                  <Input placeholder="Point of contact" {...field} value={field.value || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={isLoading} loadingText="Saving...">
            <Save className="h-4 w-4 mr-2" />
            Save Restaurant
          </Button>
        </div>
      </form>
    </Form>
  );
}
