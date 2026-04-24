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
import { Autocomplete } from "@/components/ui/autocomplete";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCityById } from "@/data-access/datastore";
import { MealProduct } from "@/types/meals";
import { CURRENCY_OPTIONS } from "@/constants/data";

const GeneralInfoSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Meal name is required"),
  currency: z.string().min(1, "Currency is required"),
  country_id: z.string().optional(),
  geo_id: z.string().optional(),
});

type GeneralInfoValues = z.infer<typeof GeneralInfoSchema>;

interface MealGeneralInfoFormProps {
  initialData?: MealProduct | null;
  onNext: (data: GeneralInfoValues) => void;
  setIsLoading?: (loading: boolean) => void;
  formRef?: React.RefObject<HTMLFormElement>;
  onContextChange?: (name: string, countryName: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function MealGeneralInfoForm({
  initialData,
  onNext,
  setIsLoading,
  formRef,
  onContextChange,
  onDirtyChange,
}: MealGeneralInfoFormProps) {
  const form = useForm<GeneralInfoValues>({
    resolver: zodResolver(GeneralInfoSchema),
    mode: "onBlur",
    defaultValues: {
      id: initialData?.id || undefined,
      name: initialData?.name || "",
      currency: initialData?.currency || "",
      country_id: initialData?.country_id || "",
      geo_id: initialData?.geo_id || "",
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
    form.setValue("geo_id", "", { shouldValidate: false });
  }, [countryId, form]);

  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData.id || undefined,
        name: initialData.name || "",
        currency: initialData.currency || "",
        country_id: initialData.country_id || "",
        geo_id: initialData.geo_id || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const onSubmit = (data: GeneralInfoValues) => {
    setIsLoading?.(true);
    onNext({ ...data, id: initialData?.id });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">General Information</h2>
        <p className="text-muted-foreground">Enter the basic details about this meal product</p>
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
                  <FormLabel>Meal Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Garden Buffet" {...field} />
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
              name="geo_id"
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
        </form>
      </Form>
    </div>
  );
}
