"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Wand2, Loader2, Save, Edit3, X } from "lucide-react";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { CURRENCY_OPTIONS } from "@/constants/data";
import { generateExamples } from "@/data-access/common";
import { MessageMarkdown } from "@/components/ui/message-markdown";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { toast } from "sonner";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import useUser from "@/hooks/use-user";
import IndicateLocked from "@/components/common/indicate-locked";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";

// Tour General Info Schema
const TourGeneralInfoSchema = z.object({
  id: z.string().optional(),
  tour_name: z.string().min(2, {
    message: "Tour name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().uuid({ message: "Country is required" }).optional(),
  state: z.string().optional(),
  city: z.string().uuid({ message: "City is required" }).optional(),
  preferred: z.boolean().default(false),
  markup: z.string().optional(),
  examples: z.string().optional(),
  images: z.array(z.string()).default([]), // Tour images (S3 URLs)
  remarks: z.string().optional(), // AI will refer to this
  notes: z.string().optional(), // For frontend and vouchers
  // Google Places fields
  formatted_address: z.string().optional(),
  website: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  maps_url: z.string().optional(),
  timings: z.array(z.string()).optional(),
});

export type ITourGeneralInfo = z.infer<typeof TourGeneralInfoSchema>;

interface TourGeneralInfoFormProps {
  initialData?: Partial<
    ITourGeneralInfo & {
      id?: string;
      tour_datastore_id?: string | null;
      is_unlinked: boolean;
    }
  >;
  syncedColumns: string[];
  onNext: (data: ITourGeneralInfo & { id?: string }) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

// Helper function for numeric input handling
const handleNumericChange = (field: any, value: string) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    field.onChange("");
    return;
  }
  // Allow numbers and decimal point
  if (/^\d*\.?\d*$/.test(trimmedValue)) {
    field.onChange(trimmedValue);
  }
};

export default function TourGeneralInfoForm({
  initialData,
  syncedColumns,
  onNext,
  setIsLoading,
  formRef,
}: TourGeneralInfoFormProps) {
  const { user } = useUser();
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [editingExamples, setEditingExamples] = useState(false);

  const form = useForm({
    resolver: zodResolver(TourGeneralInfoSchema),
    mode: "onBlur", // Only validate on blur, not on change
    defaultValues: {
      id: initialData?.id || undefined,
      tour_name: initialData?.tour_name || "",
      description: initialData?.description || "",
      currency: initialData?.currency || "",
      country: initialData?.country || "",
      state: initialData?.state || "",
      city: initialData?.city || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || "",
      examples: initialData?.examples || "",
      images: initialData?.images || [],
      remarks: initialData?.remarks || "",
      notes: initialData?.notes || "",
      // Google Places fields
      formatted_address: initialData?.formatted_address || "",
      website: initialData?.website || "",
      latitude: initialData?.latitude || undefined,
      longitude: initialData?.longitude || undefined,
      maps_url: initialData?.maps_url || "",
      timings: initialData?.timings || [],
    },
  });

  // Watch country field changes for city fetching
  const countryValue = form.watch("country");
  const stateValue = form.watch("state");

  // Use cached country/city options
  const {
    countries: countryOptions,
    states: stateOptions,
    cities: cityOptions,
    isLoadingCountries,
    isLoadingStates,
    isLoadingCities,
  } = useCountryCityOptions({ countryId: countryValue, stateId: stateValue });

  const countryCodeById = Object.fromEntries(countryOptions.map((c) => [c.value, c.code!]));
  const showStateInput = !!countryValue && countryCodeById[countryValue] === "IN";

  useEffect(() => {
    form.setValue("state", "", { shouldValidate: false });
    form.setValue("city", "", { shouldValidate: false });
  }, [countryValue, form]);

  useEffect(() => {
    if (showStateInput) {
      form.setValue("city", "", { shouldValidate: false });
    }
  }, [stateValue, showStateInput, form]);

  // Reset form when initialData.id changes (for navigation between records)
  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData?.id || undefined,
        tour_name: initialData?.tour_name || "",
        description: initialData?.description || "",
        currency: initialData?.currency || "",
        country: initialData?.country || "",
        state: initialData?.state || "",
        city: initialData?.city || "",
        preferred: initialData?.preferred || false,
        markup: initialData?.markup || "",
        examples: initialData?.examples || "",
        images: initialData?.images || [],
        remarks: initialData?.remarks || "",
        notes: initialData?.notes || "",
        // Google Places fields
        formatted_address: initialData?.formatted_address || "",
        website: initialData?.website || "",
        latitude: initialData?.latitude || undefined,
        longitude: initialData?.longitude || undefined,
        maps_url: initialData?.maps_url || "",
        timings: initialData?.timings || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  // check if hotel is linked to hotel datastore and locked inputs
  const isLinked = !!initialData?.tour_datastore_id && !initialData.is_unlinked;

  const getIsLocked = (name: string) => {
    return isLinked && syncedColumns.includes(name);
  };

  const onSubmit = async (data: any) => {
    setIsLoading?.(true);
    onNext({ ...data, id: initialData?.id });
  };

  const handleGenerateExamples = async () => {
    const tourName = form.getValues("tour_name");
    const description = form.getValues("description");

    if (!tourName) {
      toast.error("Please enter a tour name first");
      return;
    }

    setGeneratingExamples(true);
    try {
      const prompt = `Create examples for a tour named "${tourName}"${
        description ? ` with description: ${description}` : ""
      }.`;
      const result = await generateExamples(prompt, "tour");
      if ("data" in result && result.data) {
        form.setValue("examples", result.data);
        toast.success("Examples generated successfully");
      } else {
        throw new Error("Failed to generate examples");
      }
    } catch (error) {
      console.error("Error generating examples:", error);
      toast.error("Failed to generate examples");
    } finally {
      setGeneratingExamples(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">General Information</h2>
        <p className="text-muted-foreground">Enter the basic details about the tour</p>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tour_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter tour name"
                      {...field}
                      disabled={getIsLocked("tour.tour_name")}
                      rightIcon={getIsLocked("tour.tour_name") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="markup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Markup (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Enter markup percentage"
                      {...field}
                      onChange={(e) => handleNumericChange(field, e.target.value)}
                      disabled={getIsLocked("tour.markup")}
                      rightIcon={getIsLocked("tour.markup") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="lg:col-span-2">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter tour description"
                      className="min-h-[100px]"
                      {...field}
                      disabled={getIsLocked("tour.description")}
                      rightIcon={getIsLocked("tour.description") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div
            className={cn("grid grid-cols-1 md:grid-cols-3 gap-4 lg:col-span-2", showStateInput && "md:grid-cols-4")}
          >
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Autocomplete
                    options={CURRENCY_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select currency"
                    disabled={getIsLocked("tour.currency")}
                    rightIcon={getIsLocked("tour.currency") && <IndicateLocked />}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  {isLoadingCountries ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Autocomplete
                      options={countryOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select country"
                      disabled={getIsLocked("tour.country")}
                      rightIcon={getIsLocked("tour.country") && <IndicateLocked />}
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {showStateInput && (
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    {isLoadingStates ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Autocomplete
                        options={stateOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select state"
                        disabled={!countryValue || getIsLocked("tour.state")}
                        rightIcon={getIsLocked("tour.state") && <IndicateLocked />}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <Autocomplete
                    mode="server"
                    value={field.value}
                    onChange={field.onChange}
                    onSearch={(search) =>
                      stateValue
                        ? fetchCitiesByStateId(stateValue, search)
                        : fetchCitiesByCountryId(countryValue!, search)
                    }
                    fetchByValue={(id) => fetchCityById(id)}
                    placeholder="Select city"
                    disabled={(showStateInput ? !stateValue : !countryValue) || getIsLocked("tour.city")}
                    rightIcon={getIsLocked("tour.city") && <IndicateLocked />}
                    emptyMessage={
                      showStateInput && !stateValue
                        ? "Select a state first"
                        : !countryValue
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
          <div className="lg:col-span-2">
            <FormField
              control={form.control}
              name="formatted_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Full address"
                      {...field}
                      disabled={getIsLocked("tour.formatted_address")}
                      rightIcon={getIsLocked("tour.formatted_address") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Website & Maps URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://example.com"
                      {...field}
                      disabled={getIsLocked("tour.website")}
                      rightIcon={getIsLocked("tour.website") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maps_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Google Maps URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Google Maps link"
                      {...field}
                      disabled={getIsLocked("tour.maps_url")}
                      rightIcon={getIsLocked("tour.maps_url") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Latitude & Longitude */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
            <FormField
              control={form.control}
              name="latitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Latitude</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 28.6139"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val === "") {
                          field.onChange(null);
                        } else if (/^-?\d*\.?\d*$/.test(val)) {
                          const num = parseFloat(val);
                          field.onChange(isNaN(num) ? null : num);
                        }
                      }}
                      disabled={getIsLocked("tour.latitude")}
                      rightIcon={getIsLocked("tour.latitude") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="longitude"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Longitude</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g., 77.2090"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        if (val === "") {
                          field.onChange(null);
                        } else if (/^-?\d*\.?\d*$/.test(val)) {
                          const num = parseFloat(val);
                          field.onChange(isNaN(num) ? null : num);
                        }
                      }}
                      disabled={getIsLocked("tour.longitude")}
                      rightIcon={getIsLocked("tour.longitude") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="lg:col-span-2">
            <FormField
              control={form.control}
              name="preferred"
              render={({ field }) => (
                <FormItem
                  className={cn(
                    "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4",
                    field.value && "bg-primary/10 border-primary/20"
                  )}
                >
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={getIsLocked("tour.preferred")}
                    />
                  </FormControl>
                  <div
                    className={cn(
                      "space-y-1 leading-none",
                      getIsLocked("tour.preferred") && "pointer-events-none opacity-50"
                    )}
                  >
                    <FormLabel>Preferred Tour</FormLabel>
                    <div className="text-sm text-muted-foreground">Mark this tour as preferred</div>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Images Section */}
          <div className="space-y-4 lg:col-span-2">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Tour Images{" "}
                    {getIsLocked("tour.images") && <IndicateLocked tooltip="Adding or removing images is restricted" />}
                  </FormLabel>
                  <FormControl>
                    <S3ImageUpload
                      images={field.value || []}
                      onChange={field.onChange}
                      userId={user?.id || ""}
                      prefix="tour_images/"
                      disabled={!user?.id || getIsLocked("tour.images")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* AI Remarks Section */}
          <div className="lg:col-span-2">
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter AI-specific remarks about this tour..."
                      className="min-h-[80px]"
                      {...field}
                      disabled={getIsLocked("tour.remarks")}
                      rightIcon={getIsLocked("tour.remarks") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormDescription>Specific notes for AI to reference when generating responses</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Notes Section */}
          <div className="lg:col-span-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter general notes about this tour..."
                      className="min-h-[80px]"
                      {...field}
                      disabled={getIsLocked("tour.notes")}
                      rightIcon={getIsLocked("tour.notes") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormDescription>General notes for frontend display and voucher purposes</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    </div>
  );
}
