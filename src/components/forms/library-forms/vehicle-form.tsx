"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BorderedCard } from "@/components/ui/bordered-card";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";
import useUser from "@/hooks/use-user";
import { VEHICLE_TYPES, VEHICLE_CATEGORIES, OWNERSHIP_TYPES } from "@/constants/data";
import { LIBRARY_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { addLibraryItem, updateLibraryItem } from "@/data-access/docs";
import { getSupplierOptions } from "@/data-access/suppliers";
import { IOption } from "@/types/common";
import { toast } from "sonner";
import { VehicleLibraryFormData, vehicleLibraryFormSchema } from "../schemas/library-schema";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";

interface VehicleFormProps {
  initialData: Partial<VehicleLibraryFormData>;
  onNext: (data: any) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

interface VehicleFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: (Partial<VehicleLibraryFormData> & { id?: string }) | null;
  onSuccess?: () => void;
}

function VehicleForm({ initialData, onNext, formRef }: VehicleFormProps) {
  const { user } = useUser();
  const [supplierOptions, setSupplierOptions] = useState<IOption[]>([]);

  const form = useForm<VehicleLibraryFormData>({
    resolver: zodResolver(vehicleLibraryFormSchema),
    defaultValues: {
      brand: initialData?.brand || "",
      v_type: initialData?.v_type || "",
      category: initialData?.category || "",
      yr_of_reg: initialData?.yr_of_reg || undefined,
      v_number: initialData?.v_number || "",
      status: initialData?.status || "active",
      owned_by_type: initialData?.owned_by_type || "company",
      supplier_id: initialData?.supplier_id || undefined,
      owned_by_notes: initialData?.owned_by_notes || "",
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



  // Watch ownership type for conditional fields
  const ownershipType = form.watch("owned_by_type");

  // Clear supplier_id when ownership type changes away from "supplier"
  useEffect(() => {
    if (ownershipType !== "supplier") {
      form.setValue("supplier_id", undefined);
    }
  }, [ownershipType, form]);

  const onSubmit = async (data: VehicleLibraryFormData) => {
    // Ensure supplier_id is null/undefined when ownership type is not "supplier"
    const submissionData = {
      ...data,
      supplier_id: data.owned_by_type === "supplier" ? data.supplier_id : null,
    };
    onNext(submissionData);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">{initialData?.v_number ? "Edit Vehicle" : "Create Vehicle"}</h2>
        <p className="text-muted-foreground">Enter the vehicle details and ownership information</p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <BorderedCard variant="dashed">
            <div className="space-y-6 my-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vehicle Type */}
                <FormField
                  control={form.control}
                  name="v_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VEHICLE_TYPES.map(({ label, value }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {VEHICLE_CATEGORIES.map(({ label, value }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brand */}
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Toyota, Honda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vehicle Number */}
                <FormField
                  control={form.control}
                  name="v_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., ABC-1234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Year of Registration */}
                <FormField
                  control={form.control}
                  name="yr_of_reg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Registration *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1900"
                          placeholder={new Date().getFullYear().toString()}
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                {/* Owned By */}
                <FormField
                  control={form.control}
                  name="owned_by_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Owned By *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OWNERSHIP_TYPES.map(({ label, value }) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Conditional: Supplier Selection */}
                {ownershipType === "supplier" && (
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

              {/* Conditional: Custom Ownership Details */}
              {ownershipType === "custom" && (
                <FormField
                  control={form.control}
                  name="owned_by_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ownership Details *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter custom ownership details..."
                          {...field}
                          value={field.value || ""}
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="images"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Images</FormLabel>
                    <FormControl>
                      <S3ImageUpload
                        images={field.value || []}
                        onChange={field.onChange}
                        userId={user?.id || ""}
                        disabled={!user?.id}
                        prefix="vehicle_images/"
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
export default function VehicleFullscreenForm({ isOpen, onClose, initialData, onSuccess }: VehicleFullscreenFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<VehicleLibraryFormData>>({});
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
        const submissionData = { ...formData, ...data };

        if ((initialData as any)?.id) {
          const result = await updateLibraryItem("vehicles", (initialData as any).id, submissionData as any);
          if ("error" in result && result.error) throw new Error(result.error);
          toast.success("Vehicle updated successfully!");
        } else {
          const result = await addLibraryItem("vehicles", submissionData as any);
          if ("error" in result && result.error) throw new Error(result.error);
          toast.success("Vehicle created successfully!");
        }

        router.refresh();
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Error saving vehicle:", error);
        toast.error("Failed to save vehicle data");
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
        <DialogTitle className="sr-only">Vehicle Configuration</DialogTitle>
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
                  <span>{(initialData as any)?.id ? "Edit Vehicle" : "Create Vehicle"}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <div className="mx-auto max-w-full px-4">
              <VehicleForm
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
                Save Vehicle
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
