"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Skeleton } from "@/components/ui/skeleton";
import { BorderedCard } from "@/components/ui/bordered-card";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCityById } from "@/data-access/datastore";
import { createHotel, updateHotel } from "@/data-access/dmc-hotels";
import { DmcHotel } from "@/types/hotels";
import { CURRENCY_OPTIONS, HOTEL_PROPERTY_TYPES } from "@/constants/data";
import { toast } from "sonner";

const GeneralInfoSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  hotel_code: z.string().optional(),
  currency: z.string().min(1, "Currency is required"),
  property_type: z.string().optional(),
  star_rating: z.number().int().min(1).max(5).optional(),
  is_preferred: z.boolean(),
  status: z.enum(["active", "inactive"]),
  country_id: z.string().optional(),
  city_id: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().optional(),
  description: z.string().optional(),
});

export type GeneralInfoFormValues = z.infer<typeof GeneralInfoSchema>;

interface DmcHotelGeneralInfoFormProps {
  hotelId: string | null;
  initialHotel: DmcHotel | null;
  onSaved: (hotel: DmcHotel) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export default function GeneralInfoForm({
  hotelId,
  initialHotel,
  onSaved,
  onDirtyChange,
}: DmcHotelGeneralInfoFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<GeneralInfoFormValues>({
    resolver: zodResolver(GeneralInfoSchema),
    mode: "onBlur",
    defaultValues: {
      name: initialHotel?.name || "",
      hotel_code: initialHotel?.hotel_code || "",
      currency: initialHotel?.currency || "USD",
      property_type: initialHotel?.property_type || "",
      star_rating: initialHotel?.star_rating || undefined,
      is_preferred: initialHotel?.is_preferred ?? false,
      status: initialHotel?.status || "active",
      country_id: initialHotel?.country_id || "",
      city_id: initialHotel?.city_id || "",
      address: initialHotel?.address || "",
      latitude: initialHotel?.latitude || undefined,
      longitude: initialHotel?.longitude || undefined,
      email: initialHotel?.email || "",
      phone: initialHotel?.phone || "",
      website: initialHotel?.website || "",
      description: initialHotel?.description || "",
    },
  });

  const { isDirty } = form.formState;
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  const lastReportedDirty = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (lastReportedDirty.current !== isDirty) {
      lastReportedDirty.current = isDirty;
      onDirtyChangeRef.current?.(isDirty);
    }
  }, [isDirty]);

  useEffect(() => {
    return () => { onDirtyChangeRef.current?.(false); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const countryId = form.watch("country_id");
  const { countries: countryOptions, isLoadingCountries } = useCountryCityOptions({});

  const searchCities = useCallback(
    (search: string) =>
      countryId ? fetchCitiesByCountryId(countryId, search) : Promise.resolve([]),
    [countryId]
  );

  useEffect(() => {
    form.setValue("city_id", "", { shouldValidate: false });
  }, [countryId, form]);

  useEffect(() => {
    if (initialHotel) {
      form.reset({
        name: initialHotel.name || "",
        hotel_code: initialHotel.hotel_code || "",
        currency: initialHotel.currency || "USD",
        property_type: initialHotel.property_type || "",
        star_rating: initialHotel.star_rating || undefined,
        is_preferred: initialHotel.is_preferred ?? false,
        status: initialHotel.status || "active",
        country_id: initialHotel.country_id || "",
        city_id: initialHotel.city_id || "",
        address: initialHotel.address || "",
        latitude: initialHotel.latitude || undefined,
        longitude: initialHotel.longitude || undefined,
        email: initialHotel.email || "",
        phone: initialHotel.phone || "",
        website: initialHotel.website || "",
        description: initialHotel.description || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialHotel?.id]);

  const onSubmit = async (data: GeneralInfoFormValues) => {
    setIsSaving(true);
    try {
      const result = hotelId
        ? await updateHotel(hotelId, data)
        : await createHotel(data);

      if (result.error) {
        toast.error(result.error);
        setIsSaving(false);
        return;
      }

      if (result.data) {
        toast.success(hotelId ? "Hotel updated" : "Hotel created");
        onSaved(result.data);
        form.reset(data);
      }
    } catch (err) {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Info */}
          <BorderedCard title="Basic">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter hotel name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hotel_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hotel Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. HT001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Autocomplete
                        options={CURRENCY_OPTIONS}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select currency"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="property_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Autocomplete
                        options={HOTEL_PROPERTY_TYPES}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select property type"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="star_rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Star Rating</FormLabel>
                      <Select
                        value={field.value?.toString() || ""}
                        onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n} ★
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <FormField
                  control={form.control}
                  name="is_preferred"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormLabel className="text-sm">Preferred</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </BorderedCard>

          {/* Location */}
          <BorderedCard title="Location">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country_id"
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
                          placeholder="Search country..."
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="city_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Autocomplete
                        mode="server"
                        value={field.value}
                        onChange={field.onChange}
                        onSearch={searchCities}
                        fetchByValue={(id) => fetchCityById(id)}
                        placeholder="Search city..."
                        disabled={!countryId}
                        emptyMessage={!countryId ? "Select a country first" : "No cities found"}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 20.1234"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                          type="number"
                          step="0.0001"
                          placeholder="e.g. 57.5012"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </BorderedCard>

          {/* Contact */}
          <BorderedCard title="Contact">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="hotel@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" {...field} />
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
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </BorderedCard>

          {/* Description */}
          <BorderedCard title="Description">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter hotel description" className="min-h-24" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </BorderedCard>

          {/* Sticky Save Button */}
          <div className="sticky bottom-0 border-t bg-background px-6 py-3 flex items-center justify-end gap-3">
            {isDirty && !isSaving && (
              <span className="text-xs text-yellow-600 font-medium">Unsaved changes</span>
            )}
            <Button type="submit" disabled={!isDirty || isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
