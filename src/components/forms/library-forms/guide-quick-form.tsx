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
import {
  MultiSelector,
  MultiSelectorContent,
  MultiSelectorInput,
  MultiSelectorItem,
  MultiSelectorList,
  MultiSelectorTrigger,
} from "@/components/ui/multi-select";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { addLibraryItem } from "@/data-access/docs";
import { getSupplierOptions } from "@/data-access/suppliers";
import type { IOption } from "@/types/common";
import { GENDERS, LANGUAGES, PAYROLL_TYPES } from "@/constants/data";

const guideQuickSchema = z.object({
  name: z.string().min(1, "Name is required"),
  gender: z.string().min(1, "Gender is required"),
  phone: z.string().min(1, "Phone is required"),
  languages_known: z.array(z.string()).min(1, "At least one language is required"),
  payroll_type: z.string().min(1, "Payroll type is required"),
  supplier_id: z.string().optional().nullable(),
});

type GuideQuickData = z.infer<typeof guideQuickSchema>;

export function GuideQuickForm({
  supplierId,
  onSave,
}: {
  supplierId?: string;
  onSave: (id: string, label: string) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<IOption[]>([]);

  const form = useForm<GuideQuickData>({
    resolver: zodResolver(guideQuickSchema),
    defaultValues: {
      name: "",
      gender: "",
      phone: "",
      languages_known: [],
      payroll_type: supplierId ? "supplier" : "company",
      supplier_id: supplierId || null,
    },
  });

  const payrollType = form.watch("payroll_type");

  useEffect(() => {
    getSupplierOptions().then((opts) => setSupplierOptions(opts as IOption[]));
  }, []);

  useEffect(() => {
    if (supplierId && payrollType === "supplier") {
      form.setValue("supplier_id", supplierId);
    }
  }, [supplierId, payrollType, form]);

  const onSubmit = async (data: GuideQuickData) => {
    setIsLoading(true);
    try {
      const result = await addLibraryItem("guides", {
        ...data,
        supplier_id: data.payroll_type === "supplier" ? data.supplier_id : null,
        status: "active",
        images: [],
        whatsapp_number: null,
        country: null,
        state: null,
        city: null,
      } as any);
      if (result.error || !result.data) {
        toast.error(result.error || "Failed to create guide");
        return;
      }
      toast.success("Guide created successfully");
      onSave(result.data.id, `${data.name} (${data.phone})`);
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
                <Input placeholder="Guide name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone *</FormLabel>
                <FormControl>
                  <Input placeholder="+1234567890" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="languages_known"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Languages *</FormLabel>
              <MultiSelector onValuesChange={field.onChange} values={field.value}>
                <MultiSelectorTrigger data={LANGUAGES}>
                  <MultiSelectorInput placeholder="Select languages" />
                </MultiSelectorTrigger>
                <MultiSelectorContent>
                  <MultiSelectorList>
                    {LANGUAGES.map((lang) => (
                      <MultiSelectorItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MultiSelectorItem>
                    ))}
                  </MultiSelectorList>
                </MultiSelectorContent>
              </MultiSelector>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="payroll_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payroll Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PAYROLL_TYPES.filter((p) => p.value !== "independent").map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        {payrollType === "supplier" && (
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
            Save Guide
          </Button>
        </div>
      </form>
    </Form>
  );
}
