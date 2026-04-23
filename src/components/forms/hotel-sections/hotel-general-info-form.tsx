"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhoneInput } from "@/components/ui/phone-input";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Phone, Wand2, Loader2, Edit3, Save, X } from "lucide-react";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { CURRENCY_OPTIONS, HOTEL_PROPERTY_TYPES, HOTEL_STAR_RATING } from "@/constants/data";
import { HotelGeneralInfoSchema, IHotelGeneralInfo } from "../schemas/hotels-datastore-schema";
import { generateExamples } from "@/data-access/common";
import { MessageMarkdown } from "@/components/ui/message-markdown";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import IndicateLocked from "@/components/common/indicate-locked";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";

interface HotelGeneralInfoFormProps {
  initialData?: Partial<
    IHotelGeneralInfo & {
      id?: string;
      hotel_datastore_id?: string | null;
      is_unlinked?: boolean;
    }
  >;
  onNext: (data: IHotelGeneralInfo & { id?: string }) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  syncedColumns: string[];
}

export default function HotelGeneralInfoForm({
  initialData,
  onNext,
  formRef,
  syncedColumns,
}: HotelGeneralInfoFormProps) {
  const [isLoading] = useState(false); // Form submission loading handled by parent
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [editingExamples, setEditingExamples] = useState(false);
  const [editingOffers, setEditingOffers] = useState(false);

  const form = useForm({
    resolver: zodResolver(HotelGeneralInfoSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      hotel_name: initialData?.hotel_name || "",
      hotel_code: initialData?.hotel_code || "",
      hotel_address: initialData?.hotel_address || "",
      hotel_city: initialData?.hotel_city || "",
      hotel_country: initialData?.hotel_country || "",
      hotel_phone: initialData?.hotel_phone || "",
      hotel_email: initialData?.hotel_email || "",
      hotel_description: initialData?.hotel_description || "",
      hotel_currency: initialData?.hotel_currency || "",
      property_type: initialData?.property_type || "",
      star_rating: initialData?.star_rating || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || undefined,
      examples: initialData?.examples || "",
      offers: initialData?.offers || "",
    },
  });

  // Reset form when initialData changes (for duplicate functionality)
  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData?.id || undefined,
        hotel_name: initialData?.hotel_name || "",
        hotel_code: initialData?.hotel_code || "",
        hotel_address: initialData?.hotel_address || "",
        hotel_country: initialData?.hotel_country || "",
        hotel_state: initialData?.hotel_state || "",
        hotel_city: initialData?.hotel_city || "",
        hotel_phone: initialData?.hotel_phone || "",
        hotel_email: initialData?.hotel_email || "",
        hotel_description: initialData?.hotel_description || "",
        hotel_currency: initialData?.hotel_currency || "",
        property_type: initialData?.property_type || "",
        star_rating: initialData?.star_rating || "",
        preferred: initialData?.preferred || false,
        markup: initialData?.markup || undefined,
        examples: initialData?.examples || "",
        offers: initialData?.offers || "",
      });
    }
  }, [initialData, form]);

  // Watch country field changes for city fetching
  const country = form.watch("hotel_country");
  const state = form.watch("hotel_state");

  // Use cached country/city options
  const {
    countries: countryOptions,
    states: stateOptions,
    cities: cityOptions,
    isLoadingCountries,
    isLoadingStates,
    isLoadingCities,
  } = useCountryCityOptions({ countryId: country, stateId: state });

  const countryCodeById = Object.fromEntries(countryOptions.map((c) => [c.value, c.code!]));
  const showStateInput = !!country && countryCodeById[country] === "IN";

  useEffect(() => {
    form.setValue("hotel_state", "", { shouldValidate: false });
    // form.setValue("hotel_city", "", { shouldValidate: false });
  }, [country, form]);

  useEffect(() => {
    // form.setValue("hotel_city", "", { shouldValidate: false });
  }, [state, form]);

  // Reset form when initialData.id changes (for navigation between records)
  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData?.id || undefined,
        hotel_name: initialData?.hotel_name || "",
        hotel_code: initialData?.hotel_code || "",
        hotel_address: initialData?.hotel_address || "",
        hotel_country: initialData?.hotel_country || "",
        hotel_state: initialData?.hotel_state || "",
        hotel_city: initialData?.hotel_city || "",
        hotel_phone: initialData?.hotel_phone || "",
        hotel_email: initialData?.hotel_email || "",
        hotel_description: initialData?.hotel_description || "",
        hotel_currency: initialData?.hotel_currency || "",
        property_type: initialData?.property_type || "",
        star_rating: initialData?.star_rating || "",
        preferred: initialData?.preferred || false,
        markup: initialData?.markup || undefined,
        examples: initialData?.examples || "",
        offers: initialData?.offers || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  // Clear city when country changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "hotel_country") {
        form.setValue("hotel_city", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const handleGenerateExamples = async () => {
    setGeneratingExamples(true);
    try {
      const formData = form.getValues();
      const { data, error } = await generateExamples(formData, "hotels");

      if (error) {
        toast.error(error);
        return;
      }

      form.setValue("examples", data.examples);
      toast.success("Examples generated successfully");
    } finally {
      setGeneratingExamples(false);
    }
  };

  // check if hotel is linked to hotel datastore and locked inputs
  const isLinked = !!initialData?.hotel_datastore_id && !initialData.is_unlinked;

  const getIsLocked = (name: string) => {
    return isLinked && syncedColumns.includes(name);
  };

  const onSubmit = async (data: any) => {
    onNext(data);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">General Information</h2>
        <p className="text-muted-foreground">Enter the basic details about the hotel</p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hotel Name - Full Width */}
            <FormField
              control={form.control}
              name="hotel_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter hotel name"
                      {...field}
                      className="text-lg"
                      disabled={isLoading || getIsLocked("hotel.hotel_name")}
                      rightIcon={getIsLocked("hotel.hotel_name") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hotel Code */}
            <FormField
              control={form.control}
              name="hotel_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter hotel code"
                      {...field}
                      disabled={isLoading || getIsLocked("hotel.hotel_code")}
                      rightIcon={getIsLocked("hotel.hotel_code") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Currency */}
            <FormField
              control={form.control}
              name="hotel_currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency</FormLabel>
                  <Autocomplete
                    options={CURRENCY_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select currency"
                    disabled={isLoading || getIsLocked("hotel.hotel_currency")}
                    rightIcon={getIsLocked("hotel.hotel_currency") && <IndicateLocked className="-mr-1.5" />}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Email */}
              <FormField
                control={form.control}
                name="hotel_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="Enter email"
                          {...field}
                          disabled={isLoading || getIsLocked("hotel.hotel_email")}
                          rightIcon={getIsLocked("hotel.hotel_email") && <IndicateLocked />}
                        />
                        {!getIsLocked("hotel.hotel_email") && (
                          <Mail className="absolute top-2.5 right-2.5 w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone */}
              <FormField
                control={form.control}
                name="hotel_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <PhoneInput
                          defaultCountry="IN"
                          placeholder="Enter a phone number"
                          international
                          {...field}
                          disabled={isLoading || getIsLocked("hotel.hotel_phone")}
                          rightIcon={getIsLocked("hotel.hotel_phone") && <IndicateLocked />}
                        />
                        {!getIsLocked("hotel.hotel_phone") && (
                          <Phone className="absolute top-2.5 right-2.5 w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div
              className={cn("lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6", showStateInput && "lg:grid-cols-3")}
            >
              {/* Country */}
              <FormField
                control={form.control}
                name="hotel_country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    {isLoadingCountries ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Autocomplete
                        options={countryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select country"
                        disabled={isLoading || getIsLocked("hotel.hotel_country")}
                        rightIcon={getIsLocked("hotel.hotel_country") && <IndicateLocked />}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showStateInput && (
                <FormField
                  control={form.control}
                  name="hotel_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State *</FormLabel>
                      {isLoadingStates ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Autocomplete
                          options={stateOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select state"
                          disabled={!country || isLoading || getIsLocked("hotel.hotel_state")}
                          rightIcon={getIsLocked("hotel.hotel_state") && <IndicateLocked className="-mr-1.5" />}
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* City */}
              <FormField
                control={form.control}
                name="hotel_city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <Autocomplete
                      mode="server"
                      value={field.value}
                      onChange={field.onChange}
                      onSearch={(search) =>
                        state ? fetchCitiesByStateId(state, search) : fetchCitiesByCountryId(country!, search)
                      }
                      fetchByValue={(id) => fetchCityById(id)}
                      placeholder="Select city"
                      disabled={(showStateInput ? !state : !country) || isLoading || getIsLocked("hotel.hotel_city")}
                      rightIcon={getIsLocked("hotel.hotel_city") && <IndicateLocked className="-mr-1.5" />}
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

            {/* Property Type */}
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
                    disabled={isLoading || getIsLocked("hotel.property_type")}
                    rightIcon={getIsLocked("hotel.property_type") && <IndicateLocked />}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Star Rating */}
            <FormField
              control={form.control}
              name="star_rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Star Rating</FormLabel>
                  <Autocomplete
                    options={HOTEL_STAR_RATING}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select rating"
                    disabled={isLoading || getIsLocked("hotel.star_rating")}
                    rightIcon={getIsLocked("hotel.star_rating") && <IndicateLocked />}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Markup */}
            <FormField
              control={form.control}
              name="markup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Markup (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter markup percentage"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      disabled={isLoading || getIsLocked("hotel.markup")}
                      rightIcon={getIsLocked("hotel.markup") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hotel Address - Full Width */}
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="hotel_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hotel Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter hotel address"
                        {...field}
                        disabled={isLoading || getIsLocked("hotel.hotel_address")}
                        rightIcon={getIsLocked("hotel.hotel_address") && <IndicateLocked />}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description - Full Width */}
              <FormField
                control={form.control}
                name="hotel_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter hotel description"
                        {...field}
                        disabled={isLoading || getIsLocked("hotel.hotel_description")}
                        rightIcon={getIsLocked("hotel.hotel_description") && <IndicateLocked />}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Preferred Checkbox */}
            <div className="lg:col-span-3">
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
                        disabled={isLoading || getIsLocked("hotel.preferred")}
                      />
                    </FormControl>
                    <div
                      className={cn(
                        "space-y-1 leading-none",
                        getIsLocked("hotel.preferred") && "pointer-events-none opacity-50"
                      )}
                    >
                      <FormLabel>Preferred Hotel {getIsLocked("hotel.preferred") && <IndicateLocked />}</FormLabel>
                      <div className="text-sm text-muted-foreground">Mark this hotel as preferred</div>
                    </div>
                  </FormItem>
                )}
              />
            </div>
            {/* <div className="flex items-center space-x-2 lg:col-span-3">
              <FormField
                control={form.control}
                name="preferred"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Preferred Hotel
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div> */}

            {/* Offers - Full Width */}
            <div className="lg:col-span-3">
              <FormField
                control={form.control}
                name="offers"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Offers</FormLabel>
                      {/* disabled Edit button, Showing editable input by default */}
                      <div className="flex items-center gap-2">
                        {!editingOffers ? (
                          <>
                            {field.value && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingOffers(true)}
                                className="flex items-center gap-2"
                                disabled={getIsLocked("hotel.offers")}
                              >
                                <Edit3 className="h-4 w-4" />
                                Edit
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingOffers(false)}
                              className="flex items-center gap-2"
                              disabled={getIsLocked("hotel.offers")}
                            >
                              <Save className="h-4 w-4" />
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingOffers(false);
                                // Reset to original value if cancelled
                              }}
                              className="flex items-center gap-2"
                              disabled={getIsLocked("hotel.offers")}
                            >
                              <X className="h-4 w-4" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <FormControl>
                      {editingOffers ? (
                        <MessageMarkdown
                          placeholder="Enter special offers, promotions, or discounts available at this hotel"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={isLoading || getIsLocked("hotel.offers")}
                          rightIcon={getIsLocked("hotel.offers") && <IndicateLocked />}
                        />
                      ) : field.value ? (
                        <div className="min-h-[120px] p-3 border rounded-md bg-muted/30 text-sm">
                          <RategenMarkdown content={field.value} className="text-sm" />
                        </div>
                      ) : (
                        <MessageMarkdown
                          placeholder="Enter special offers, promotions, or discounts available at this hotel"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                          disabled={isLoading || getIsLocked("hotel.offers")}
                          rightIcon={getIsLocked("hotel.offers") && <IndicateLocked />}
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
