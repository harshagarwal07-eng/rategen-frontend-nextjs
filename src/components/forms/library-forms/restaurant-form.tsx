"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { RestaurantLibraryFormData, restaurantLibraryFormSchema } from "../schemas/library-schema";
import { LIBRARY_STATUS_CONFIGS } from "@/lib/status-styles-config";
import { addLibraryItem, updateLibraryItem } from "@/data-access/docs";
import { toast } from "sonner";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { VirtualizedAutocomplete } from "@/components/ui/virtualized-autocomplete";
import { IRestaurant } from "@/types/docs";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";

interface RestaurantFormProps {
  initialData: Partial<RestaurantLibraryFormData>;
  onNext: (data: any) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

interface RestaurantFullscreenFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: (RestaurantLibraryFormData & { id?: string }) | null;
  onSuccess?: () => void;
}

function RestaurantForm({ initialData, onNext, formRef }: RestaurantFormProps) {
  const form = useForm<RestaurantLibraryFormData>({
    resolver: zodResolver(restaurantLibraryFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      address: initialData?.address || null,
      country: initialData?.country || null,
      state: initialData?.state || null,
      city: initialData?.city || null,
      landline_number: initialData?.landline_number || "",
      phone: initialData?.phone || "",
      poc_name: initialData?.poc_name || null,
      status: initialData?.status || "active",
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

  // Clear state when country changes
  useEffect(() => {
    form.setValue("state", null, { shouldValidate: false });
  }, [country, form]);

  // Clear city when country or state changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "country" || name === "state") {
        form.setValue("city", null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData?.name || "",
        address: initialData?.address || null,
        country: initialData?.country || null,
        state: initialData?.state || null,
        city: initialData?.city || null,
        landline_number: initialData?.landline_number || "",
        phone: initialData?.phone || "",
        poc_name: initialData?.poc_name || null,
        status: initialData?.status || "active",
      });
    }
  }, [initialData, form]);

  const onSubmit = async (data: RestaurantLibraryFormData) => {
    onNext(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">{initialData?.name ? "Edit Restaurant" : "Create Restaurant"}</h2>
        <p className="text-muted-foreground">Enter the restaurant details and contact information</p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <BorderedCard variant="dashed">
            <div className="space-y-8 my-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Restaurant Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter restaurant name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Contact Person Name */}
                <FormField
                  control={form.control}
                  name="poc_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact person name" {...field} value={field.value || ""} />
                      </FormControl>
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
                        value={field.value || ""}
                        onChange={field.onChange}
                        placeholder="Select country"
                        searchPlaceholder="Search countries..."
                        showCountryFlag
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
                          value={field.value || ""}
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
                        value={field.value || ""}
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

              {/* Address */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter full address"
                        className="min-h-[100px]"
                        {...field}
                        value={field.value || ""}
                        disabled={false}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          placeholder="Enter phone number"
                          value={field.value || ""}
                          defaultCountry="IN"
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* WhatsApp Number (Landline) */}
                <FormField
                  control={form.control}
                  name="landline_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          placeholder="Enter WhatsApp number"
                          value={field.value || ""}
                          defaultCountry="IN"
                          onChange={field.onChange}
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
            </div>
          </BorderedCard>
        </form>
      </Form>
    </div>
  );
}

// Fullscreen Form Component
export default function RestaurantFullscreenForm({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}: RestaurantFullscreenFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<RestaurantLibraryFormData>>({});
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

        // Remove joined fields that don't exist in the database table
        const { countries, cities, country_name, city_name, ...cleanData } = updatedFormData as any;

        if ((initialData as any)?.id) {
          // Update existing restaurant
          const { data: responseData, error } = await updateLibraryItem(
            "restaurants",
            (initialData as any).id,
            cleanData
          );
          if (error) return toast.error(error);
          toast.success("Restaurant updated successfully!");
        } else {
          // Create new restaurant
          const { data: responseData, error } = await addLibraryItem("restaurants", cleanData as IRestaurant);
          if (error) return toast.error(error);
          toast.success("Restaurant created successfully!");
        }

        router.refresh();
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error("Error saving restaurant:", error);
        toast.error("Failed to save restaurant data");
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
        <DialogTitle className="sr-only">Restaurant Configuration</DialogTitle>
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
                  <span>{(initialData as any)?.id ? "Edit Restaurant" : "Create Restaurant"}</span>
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 pb-20">
            <div className="mx-auto max-w-full px-4">
              <RestaurantForm
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
                Save Restaurant
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
