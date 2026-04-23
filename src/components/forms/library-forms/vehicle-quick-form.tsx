"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { addLibraryItem } from "@/data-access/docs";
import { getSupplierOptions } from "@/data-access/suppliers";
import type { IOption } from "@/types/common";
import { VEHICLE_TYPES, VEHICLE_CATEGORIES, OWNERSHIP_TYPES } from "@/constants/data";

const vehicleQuickSchema = z.object({
  brand: z.string().min(1, "Brand is required"),
  v_type: z.string().min(1, "Vehicle type is required"),
  v_number: z.string().min(1, "Vehicle number is required"),
  category: z.string().min(1, "Category is required"),
  owned_by_type: z.string().min(1, "Ownership type is required"),
  supplier_id: z.string().optional().nullable(),
});

type VehicleQuickData = z.infer<typeof vehicleQuickSchema>;

export function VehicleQuickForm({
  supplierId,
  onSave,
}: {
  supplierId?: string;
  onSave: (id: string, label: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<IOption[]>([]);

  const form = useForm<VehicleQuickData>({
    resolver: zodResolver(vehicleQuickSchema),
    defaultValues: {
      brand: "",
      v_type: "",
      v_number: "",
      category: "",
      owned_by_type: supplierId ? "supplier" : "company",
      supplier_id: supplierId || null,
    },
  });

  const ownedByType = form.watch("owned_by_type");

  useEffect(() => {
    getSupplierOptions().then((opts) => setSupplierOptions(opts as IOption[]));
  }, []);

  useEffect(() => {
    if (supplierId && ownedByType === "supplier") {
      form.setValue("supplier_id", supplierId);
    }
  }, [supplierId, ownedByType, form]);

  const onSubmit = async (data: VehicleQuickData) => {
    setIsLoading(true);
    try {
      const result = await addLibraryItem("vehicles", {
        ...data,
        supplier_id: data.owned_by_type === "supplier" ? data.supplier_id : null,
        status: "active",
        images: [],
        owned_by_notes: null,
        yr_of_reg: null,
        country: null,
        state: null,
        city: null,
      } as any);
      if (result.error || !result.data) {
        toast.error(result.error || "Failed to create vehicle");
        return;
      }
      toast.success("Vehicle created successfully");
      onSave(result.data.id, `${data.brand} ${data.category || data.v_type} (${data.v_number})`.trim());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand *</FormLabel>
                <FormControl>
                  <Input placeholder="Toyota, Mercedes..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="v_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reg. Number *</FormLabel>
                <FormControl>
                  <Input placeholder="Registration number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="v_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Type *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {VEHICLE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="owned_by_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owned By *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ownership" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {OWNERSHIP_TYPES.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {ownedByType === "supplier" && (
          <FormField
            control={form.control}
            name="supplier_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier</FormLabel>
                <FormControl>
                  <Autocomplete
                    mode="client"
                    options={supplierOptions}
                    value={field.value || ""}
                    onChange={field.onChange}
                    placeholder="Select supplier"
                    searchPlaceholder="Search suppliers..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end pt-2">
          <Button type="submit" loading={isLoading} loadingText="Saving...">
            <Save className="h-4 w-4 mr-2" />
            Save Vehicle
          </Button>
        </div>
      </form>
    </Form>
  );
}
