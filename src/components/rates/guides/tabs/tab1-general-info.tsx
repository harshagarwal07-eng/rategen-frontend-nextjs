"use client";

import { useCallback, useEffect, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCityById } from "@/data-access/datastore";
import { Guide } from "@/types/guides";
import { CURRENCY_OPTIONS } from "@/constants/data";

const GeneralInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Guide name is required"),
  currency: z.string().min(1, "Currency is required"),
  country_id: z.string().optional(),
  city_id: z.string().optional(),
  is_active: z.boolean(),
});

export type GuideGeneralInfoValues = z.infer<typeof GeneralInfoSchema>;

interface GuideGeneralInfoFormProps {
  initialData?: Guide | null;
  onNext: (data: GuideGeneralInfoValues) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onContextChange?: (name: string, countryName: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function GuideGeneralInfoForm({
  initialData,
  onNext,
  setIsLoading,
  formRef,
  onContextChange,
  onDirtyChange,
}: GuideGeneralInfoFormProps) {
  const form = useForm<GuideGeneralInfoValues>({
    resolver: zodResolver(GeneralInfoSchema),
    mode: "onBlur",
    defaultValues: {
      id: initialData?.id || undefined,
      name: initialData?.name || "",
      currency: initialData?.currency || "USD",
      country_id: initialData?.country_id || "",
      city_id: initialData?.city_id || "",
      is_active: initialData?.is_active ?? true,
    },
  });

  const countryId = form.watch("country_id");
  const watchName = form.watch("name");

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

  const { countries: countryOptions, isLoadingCountries } = useCountryCityOptions({});

  const onContextChangeRef = useRef(onContextChange);
  onContextChangeRef.current = onContextChange;
  const lastReportedContext = useRef<{ name: string; countryName: string } | null>(null);

  const countryName = countryOptions.find((o) => o.value === countryId)?.label || "";

  useEffect(() => {
    const name = watchName || "";
    if (
      lastReportedContext.current?.name === name &&
      lastReportedContext.current?.countryName === countryName
    ) {
      return;
    }
    lastReportedContext.current = { name, countryName };
    onContextChangeRef.current?.(name, countryName);
  }, [watchName, countryName]);

  const searchCities = useCallback(
    (search: string) =>
      countryId ? fetchCitiesByCountryId(countryId, search) : Promise.resolve([]),
    [countryId]
  );

  useEffect(() => {
    form.setValue("city_id", "", { shouldValidate: false });
  }, [countryId, form]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData.id || undefined,
        name: initialData.name || "",
        currency: initialData.currency || "USD",
        country_id: initialData.country_id || "",
        city_id: initialData.city_id || "",
        is_active: initialData.is_active ?? true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const onSubmit = (data: GuideGeneralInfoValues) => {
    setIsLoading?.(true);
    onNext({ ...data, id: initialData?.id });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">General Information</h2>
        <p className="text-muted-foreground">Enter the basic details about this guide</p>
      </div>

      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guide Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. English Speaking Guide" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
          </div>

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
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel className="mt-0">Active</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <span className="text-sm text-muted-foreground">
                  {field.value ? "Yes" : "No"}
                </span>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
