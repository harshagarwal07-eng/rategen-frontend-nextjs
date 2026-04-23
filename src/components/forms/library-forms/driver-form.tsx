"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BorderedCard } from "@/components/ui/bordered-card";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";
import useUser from "@/hooks/use-user";
import { DriverLibraryFormData, driverLibraryFormSchema } from "../schemas/library-schema";
import { LIBRARY_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { addLibraryItem, updateLibraryItem } from "@/data-access/docs";
import { getSupplierOptions } from "@/data-access/suppliers";
import { IOption } from "@/types/common";
import { toast } from "sonner";
import { GENDERS, LANGUAGES, PAYROLL_TYPES } from "@/constants/data";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";

interface DriverFormProps {
  initialData: Partial<DriverLibraryFormData>;
  onNext: (data: any) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

interface DriverFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: (DriverLibraryFormData & { id?: string }) | null;
  onSuccess?: () => void;
}

function DriverForm({ initialData, onNext, formRef }: DriverFormProps) {
  const { user } = useUser();
  const [supplierOptions, setSupplierOptions] = useState<IOption[]>([]);

  // Check if whatsapp_number matches phone on initial load
  const isSameAsPhone = initialData?.phone && initialData?.whatsapp_number
    ? initialData.phone === initialData.whatsapp_number
    : false;
  const [sameAsPhone, setSameAsPhone] = useState(isSameAsPhone);

  const form = useForm<DriverLibraryFormData>({
    resolver: zodResolver(driverLibraryFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      gender: initialData?.gender || "",
      phone: initialData?.phone || "",
      whatsapp_number: initialData?.whatsapp_number || "",
      languages_known: initialData?.languages_known || [],
      status: initialData?.status || "active",
      payroll_type: initialData?.payroll_type || "company",
      supplier_id: initialData?.supplier_id || undefined,
      images: initialData?.images || [],
      country: initialData?.country || undefined,
      state: initialData?.state || undefined,
      city: initialData?.city || undefined,
    },
  });

  // Watch country and state field changes
  const country = form.watch("country");
  const state = form.watch("state");

  // Use cached country/city options
  const {
    countries: countryOptions,
    states: stateOptions,
    cities: cityOptions,
  } = useCountryCityOptions({ countryId: country || undefined, stateId: state || undefined });

  const countryCodeById = Object.fromEntries(countryOptions.map((c) => [c.value, c.code!]));
  const showStateInput = !!country && countryCodeById[country] === "IN";

  // Fetch supplier options
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const options = (await getSupplierOptions()) as IOption[];
        setSupplierOptions(options);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("Failed to load suppliers");
      }
    };

    fetchSuppliers();
  }, []);

  // Watch phone field for checkbox functionality
  const phoneValue = form.watch("phone");

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      const isSame = initialData?.phone && initialData?.whatsapp_number
        ? initialData.phone === initialData.whatsapp_number
        : false;
      setSameAsPhone(isSame);

      form.reset({
        name: initialData?.name || "",
        gender: initialData?.gender || "",
        phone: initialData?.phone || "",
        whatsapp_number: initialData?.whatsapp_number || "",
        languages_known: initialData?.languages_known || [],
        status: initialData?.status || "active",
        payroll_type: initialData?.payroll_type || "company",
        supplier_id: initialData?.supplier_id || undefined,
        images: initialData?.images || [],
        country: initialData?.country || undefined,
        state: initialData?.state || undefined,
        city: initialData?.city || undefined,
      });
    }
  }, [initialData, form]);

  // Clear state and city when country changes
  useEffect(() => {
    form.setValue("state", undefined, { shouldValidate: false });
  }, [country, form]);

  // Clear city when country or state changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "country" || name === "state") {
        form.setValue("city", undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Watch payroll type for conditional fields
  const payrollType = form.watch("payroll_type");

  // Clear supplier_id when payroll type changes away from "supplier"
  useEffect(() => {
    if (payrollType !== "supplier") {
      form.setValue("supplier_id", undefined);
    }
  }, [payrollType, form]);

  const onSubmit = async (data: DriverLibraryFormData) => {
    // Ensure supplier_id is null/undefined when payroll type is not "supplier"
    // If sameAsPhone is checked, set whatsapp_number to phone
    const submissionData = {
      ...data,
      supplier_id: data.payroll_type === "supplier" ? data.supplier_id : null,
      whatsapp_number: sameAsPhone ? data.phone : data.whatsapp_number,
    };
    onNext(submissionData);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">{initialData?.name ? "Edit Driver" : "Create Driver"}</h2>
        <p className="text-muted-foreground">Enter the driver details and payroll information</p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <BorderedCard variant="dashed">
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Driver Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter driver name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Gender */}
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENDERS.map((gender) => (
                            <SelectItem key={gender.value} value={gender.value}>
                              {gender.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Languages Known */}
                <FormField
                  control={form.control}
                  name="languages_known"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Languages Known *</FormLabel>
                      <FormControl>
                        <MultiSelector values={field.value} onValuesChange={field.onChange} loop={false}>
                          <MultiSelectorTrigger data={LANGUAGES}>
                            <MultiSelectorInput placeholder="Select languages" />
                          </MultiSelectorTrigger>
                          <MultiSelectorContent>
                            <MultiSelectorList>
                              {LANGUAGES.map((language) => (
                                <MultiSelectorItem key={language.value} value={language.value}>
                                  {language.label}
                                </MultiSelectorItem>
                              ))}
                            </MultiSelectorList>
                          </MultiSelectorContent>
                        </MultiSelector>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <PhoneInput
                          placeholder="Enter phone number"
                          value={field.value}
                          defaultCountry="IN"
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* WhatsApp Number */}
                <FormField
                  control={form.control}
                  name="whatsapp_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex justify-between items-center">
                        WhatsApp Number
                        <div className="flex items-center gap-2 mr-4">
                          <Checkbox
                            id="driver-same-phone"
                            checked={sameAsPhone}
                            onCheckedChange={(checked) => {
                              setSameAsPhone(!!checked);
                              if (checked) {
                                field.onChange(phoneValue);
                              }
                            }}
                          />
                          <label htmlFor="driver-same-phone" className="text-xs text-muted-foreground cursor-pointer">
                            Same as phone
                          </label>
                        </div>
                      </FormLabel>
                      <FormControl>
                        <PhoneInput
                          placeholder="Enter WhatsApp number"
                          value={sameAsPhone ? phoneValue : field.value || ""}
                          defaultCountry="IN"
                          onChange={field.onChange}
                          disabled={sameAsPhone}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LIBRARY_STATUS_CONFIGS.map((config) => (
                            <SelectItem key={config.value} value={config.value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className={cn("grid grid-cols-1 gap-6", showStateInput ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
                {/* Country */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Autocomplete
                        options={countryOptions}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Select country"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* State (conditional for India) */}
                {showStateInput && (
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Autocomplete
                          options={stateOptions}
                          value={field.value || undefined}
                          onChange={field.onChange}
                          placeholder="Select state"
                          disabled={!country}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* City */}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Autocomplete
                        mode="server"
                        value={field.value || undefined}
                        onChange={field.onChange}
                        onSearch={(search) =>
                          state ? fetchCitiesByStateId(state, search) : fetchCitiesByCountryId(country!, search)
                        }
                        fetchByValue={(id) => fetchCityById(id)}
                        placeholder="Select city"
                        disabled={showStateInput ? !state : !country}
                        emptyMessage={
                          showStateInput && !state
                            ? "Select a state first"
                            : !country
                              ? "Select a country first"
                              : "No cities available"
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payroll Type */}
                <FormField
                  control={form.control}
                  name="payroll_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payroll *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select payroll type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYROLL_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional: Supplier Selection */}
                {payrollType === "supplier" && (
                  <FormField
                    control={form.control}
                    name="supplier_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <FormControl>
                          <Autocomplete
                            options={supplierOptions}
                            value={field.value || undefined}
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
              </div>

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Image</FormLabel>
                    <FormControl>
                      <S3ImageUpload
                        images={field.value || []}
                        onChange={field.onChange}
                        userId={user?.id || ""}
                        disabled={!user?.id}
                        prefix="driver_images/"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </BorderedCard>
        </form>
      </Form>
    </div>
  );
}

// Fullscreen Form Component
export default function DriverFullscreenForm({ isOpen, onClose, initialData, onSuccess }: DriverFullscreenFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<DriverLibraryFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form state when dialog opens/closes or initialData changes
  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {});
    } else {
      // Reset completely when dialog closes
      setFormData({});
    }
  }, [isOpen, initialData]);

  const handleSubmit = useCallback(
    async (data: any) => {
      setIsLoading(true);
      try {
        // Update form data and ensure ID is preserved
        const updatedFormData = { ...formData, ...data };
        setFormData(updatedFormData);

        if ((initialData as any)?.id) {
          // Update existing driver
          const result = await updateLibraryItem("drivers", (initialData as any).id, updatedFormData as any);
          if ("error" in result && result.error) throw new Error(result.error);
          toast.success("Driver updated successfully!");
        } else {
          // Create new driver
          const result = await addLibraryItem("drivers", updatedFormData as any);
          if ("error" in result && result.error) throw new Error(result.error);
          toast.success("Driver created successfully!");
        }

        router.refresh();
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Error saving driver:", error);
        toast.error("Failed to save driver data");
      } finally {
        setIsLoading(false);
      }
    },
    [formData, initialData, router, onSuccess, onClose]
  );

  const handleClose = () => {
    router.refresh();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="max-w-full sm:max-w-full h-full p-0 gap-0 flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Driver Configuration</DialogTitle>
        {/* Fixed Header */}
        <div className="sticky top-0">
          <DialogHeader className="space-y-4 border-b bg-muted">
            {/* Tabs Navigation */}
            <div className="flex justify-center">
              <div className="flex bg-muted rounded-lg p-1">
                <div
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    "bg-background text-foreground shadow-sm"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      "bg-primary text-primary-foreground"
                    )}
                  >
                    1
                  </span>
                  <span>{(initialData as any)?.id ? "Edit Driver" : "Create Driver"}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <div className="mx-auto max-w-full px-4">
              <DriverForm
                initialData={formData}
                onNext={handleSubmit}
                formRef={formRef as React.RefObject<HTMLFormElement>}
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="sticky bottom-0 border-t px-4 py-2 bg-muted">
            <div className="flex items-center justify-end">
              <Button
                onClick={() => formRef.current?.requestSubmit()}
                className="min-w-32"
                loading={isLoading}
                loadingText="Saving..."
                disabled={isLoading}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Driver
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
