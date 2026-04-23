"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Wand2, Loader2, Edit3, Save, X } from "lucide-react";
import { CURRENCY_OPTIONS, MEAL_CUISINES, MEAL_OPTIONS, MEAL_RATE_TYPES } from "@/constants/data";
import useUser from "@/hooks/use-user";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import { generateExamples } from "@/data-access/common";
import { MessageMarkdown } from "@/components/ui/message-markdown";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { toast } from "sonner";
import Show from "@/components/ui/show";
import { IMealsDatastore, MealsDatastoreSchema } from "../schemas/meals-datastore-schema";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualizedAutocomplete } from "@/components/ui/virtualized-autocomplete";
import IndicateLocked from "@/components/common/indicate-locked";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";
import { cn } from "@/lib/utils";

interface MealFormProps {
  initialData: Partial<IMealsDatastore>;
  syncedColumns: string[];
  onNext: (data: any) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

interface AgeRangeFieldProps {
  form: any;
  category: "adult" | "teenager" | "child" | "infant";
  onRemove: () => void;
}

// Helper function for numeric input handling
const handleNumericChange = (field: any, value: string) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    field.onChange(null);
    return;
  }
  // Allow numbers and decimal point
  if (/^\d*\.?\d*$/.test(trimmedValue)) {
    const numValue = parseFloat(trimmedValue);
    if (!isNaN(numValue)) {
      field.onChange(numValue);
    }
  }
};

function AgeRangeField({ form, category, onRemove }: AgeRangeFieldProps) {
  const fieldName = `age_policy.${category}.meals` as const;

  const handleAgeChange = (field: any, value: string) => {
    const trimmedValue = value.trim();

    // Allow empty
    if (trimmedValue === "") {
      field.onChange(null);
      return;
    }

    // Only allow integers 0-99
    if (/^\d{1,2}$/.test(trimmedValue)) {
      const numValue = parseInt(trimmedValue, 10);
      if (numValue >= 0 && numValue <= 99) {
        field.onChange(numValue);
      }
    }
  };

  const handleBlur = (field: any) => {
    // On blur, if empty, set to 0
    if (field.value === null || field.value === undefined) {
      field.onChange(0);
    }
  };

  return (
    <div className="flex items-end gap-3">
      <FormField
        control={form.control}
        name={`${fieldName}.from` as any}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel className="text-xs text-muted-foreground">From</FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="-"
                value={field.value != null ? String(field.value) : ""}
                onChange={(e) => handleAgeChange(field, e.target.value)}
                onBlur={() => handleBlur(field)}
                disabled={false}
                className="h-9"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={`${fieldName}.to` as any}
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel className="text-xs text-muted-foreground">To</FormLabel>
            <FormControl>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="-"
                value={field.value != null ? String(field.value) : ""}
                onChange={(e) => handleAgeChange(field, e.target.value)}
                onBlur={() => handleBlur(field)}
                disabled={false}
                className="h-9"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Show when={category !== "adult"}>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="h-9 px-2">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </Show>
    </div>
  );
}

export default function MealForm({ initialData, syncedColumns, onNext, formRef }: MealFormProps) {
  const { user } = useUser();
  const [isLoading] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [editingExamples, setEditingExamples] = useState(false);

  const form = useForm<IMealsDatastore>({
    resolver: zodResolver(MealsDatastoreSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      meal_name: initialData?.meal_name || "",
      description: initialData?.description || "",
      country: initialData?.country || "",
      state: initialData?.state || "",
      city: initialData?.city || "",
      currency: initialData?.currency || "",
      images: initialData?.images || [],
      examples: initialData?.examples || "",
      inclusions: initialData?.inclusions || "",
      exclusions: initialData?.exclusions || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || undefined,
      remarks: initialData?.remarks || "",
      notes: initialData?.notes || "",
      menu_link: initialData?.menu_link || "",
      cancellation_policy: initialData?.cancellation_policy || "",
      age_policy: initialData?.age_policy || {
        adult: {
          meals: { from: 17, to: 99 },
        },
        child: {
          meals: { from: 2, to: 17 },
        },
        infant: {
          meals: { from: 0, to: 2 },
        },
        teenager: {},
      },
      meal_plan_rates: initialData?.meal_plan_rates || [
        {
          meal_type: "",
          cuisine: "",
          option: "",
          rates: {},
        },
      ],
    },
  });

  // Watch country field changes for city fetching
  const country = form.watch("country");
  const state = form.watch("state");

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
    form.setValue("state", "", { shouldValidate: false });
    form.setValue("city", "", { shouldValidate: false });
  }, [country, form]);

  useEffect(() => {
    if (showStateInput) {
      form.setValue("city", "", { shouldValidate: false });
    }
  }, [state, showStateInput, form]);

  // Clear city when country changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "country") {
        form.setValue("city", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        id: initialData?.id || undefined,
        meal_name: initialData?.meal_name || "",
        description: initialData?.description || "",
        country: initialData?.country || "",
        state: initialData?.state || "",
        city: initialData?.city || "",
        currency: initialData?.currency || "",
        images: initialData?.images || [],
        examples: initialData?.examples || "",
        inclusions: initialData?.inclusions || "",
        exclusions: initialData?.exclusions || "",
        preferred: initialData?.preferred || false,
        markup: initialData?.markup || undefined,
        remarks: initialData?.remarks || "",
        notes: initialData?.notes || "",
        menu_link: initialData?.menu_link || "",
        cancellation_policy: initialData?.cancellation_policy || "",
        age_policy: initialData?.age_policy || {
          adult: {
            meals: { from: 17, to: 99 },
          },
          child: {
            meals: { from: 2, to: 17 },
          },
          infant: {
            meals: { from: 0, to: 2 },
          },
          teenager: {},
        },
        meal_plan_rates: initialData?.meal_plan_rates || [
          {
            meal_type: "",
            cuisine: "",
            option: "",
            rates: {},
          },
        ],
      });
    }
  }, [initialData, form]);

  const {
    fields: mealPlanFields,
    append: appendMealPlan,
    remove: removeMealPlan,
  } = useFieldArray({
    control: form.control,
    name: "meal_plan_rates",
  });

  const handleGenerateExamples = async () => {
    setGeneratingExamples(true);
    try {
      const formData = form.getValues();
      const { data, error } = await generateExamples(formData, "meals");

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

  const onSubmit = async (data: IMealsDatastore) => {
    onNext(data);
  };

  const addAgeRange = (category: "adult" | "teenager" | "child" | "infant") => {
    const defaultValues = {
      adult: { from: 17, to: 99 },
      child: { from: 2, to: 17 },
      infant: { from: 0, to: 2 },
      teenager: { from: 13, to: 16 },
    };

    form.setValue(`age_policy.${category}.meals`, defaultValues[category]);
  };

  const removeAgeRange = (category: "adult" | "teenager" | "child" | "infant") => {
    form.setValue(`age_policy.${category}.meals`, undefined);
  };

  const hasAgeRange = (category: "adult" | "teenager" | "child" | "infant") => {
    const policy = form.watch(`age_policy.${category}.meals`);
    return policy !== undefined && policy !== null;
  };

  // check if meal is linked to hotel datastore and locked inputs
  const isLinked = !!initialData?.meal_datastore_id && !initialData.is_unlinked;

  const getIsLocked = (name: string) => {
    return isLinked && syncedColumns.includes(name);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Create Meal</h2>
        <p className="text-muted-foreground">Enter the meal details, age policy, and rates</p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <BorderedCard title="General Information" variant="dashed">
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Meal Name */}
                <FormField
                  control={form.control}
                  name="meal_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter meal name"
                          {...field}
                          disabled={isLoading || getIsLocked("meal.meal_name")}
                          rightIcon={getIsLocked("meal.meal_name") && <IndicateLocked />}
                        />
                      </FormControl>
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
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={isLoading || getIsLocked("meal.markup")}
                          rightIcon={getIsLocked("meal.markup") && <IndicateLocked />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Menu Link */}
                <FormField
                  control={form.control}
                  name="menu_link"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menu Link</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="Enter menu link (e.g., https://example.com/menu)"
                          {...field}
                          disabled={isLoading || getIsLocked("meal.menu_link")}
                          rightIcon={getIsLocked("meal.menu_link") && <IndicateLocked />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", showStateInput && "lg:grid-cols-4")}>
                {/* Currency */}
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
                        disabled={getIsLocked("meal.currency")}
                        rightIcon={getIsLocked("meal.currency") && <IndicateLocked />}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Country */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Autocomplete
                        options={countryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select country"
                        disabled={getIsLocked("meal.country")}
                        rightIcon={getIsLocked("meal.country") && <IndicateLocked />}
                      />
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
                        <FormLabel>State *</FormLabel>
                        <Autocomplete
                          options={stateOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select State"
                          disabled={!country || getIsLocked("meal.state")}
                          rightIcon={getIsLocked("meal.state") && <IndicateLocked />}
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
                      <FormLabel>City *</FormLabel>
                      {isLoadingCities ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Autocomplete
                          mode="server"
                          value={field.value}
                          onChange={field.onChange}
                          onSearch={(search) =>
                            state ? fetchCitiesByStateId(state, search) : fetchCitiesByCountryId(country, search)
                          }
                          fetchByValue={(id) => fetchCityById(id)}
                          placeholder="Select city"
                          disabled={(showStateInput ? !state : !country) || getIsLocked("meal.city")}
                          rightIcon={getIsLocked("meal.city") && <IndicateLocked />}
                          emptyMessage={
                            showStateInput && !state
                              ? "Select a state first"
                              : !country
                                ? "Select a country first"
                                : "No cities available"
                          }
                        />
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Preferred Meal */}
                <FormField
                  control={form.control}
                  name="preferred"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading || getIsLocked("meal.preferred")}
                        />
                      </FormControl>
                      <div
                        className={cn(
                          "space-y-1 leading-none",
                          getIsLocked("meal.preferred") && "pointer-events-none opacity-50"
                        )}
                      >
                        <FormLabel>Preferred Meal</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Mark this meal as a preferred option for recommendations
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter meal description"
                          {...field}
                          value={field.value || ""}
                          rows={4}
                          disabled={isLoading || getIsLocked("meal.description")}
                          rightIcon={getIsLocked("meal.description") && <IndicateLocked />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Examples */}
                {/* <FormField
                  control={form.control}
                  name="examples"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel>Examples</FormLabel>
                        <div className="flex items-center gap-2">
                          {!editingExamples ? (
                            <>
                              {field.value && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingExamples(true)}
                                  className="flex items-center gap-2"
                                >
                                  <Edit3 className="h-4 w-4" />
                                  Edit
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="ai"
                                size="sm"
                                onClick={handleGenerateExamples}
                                disabled={isLoading || generatingExamples}
                                className="flex items-center gap-2"
                              >
                                {generatingExamples ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Wand2 className="h-4 w-4" />
                                )}
                                {generatingExamples ? "Generating..." : "Generate"}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingExamples(false)}
                                className="flex items-center gap-2"
                              >
                                <Save className="h-4 w-4" />
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingExamples(false);
                                }}
                                className="flex items-center gap-2"
                              >
                                <X className="h-4 w-4" />
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <FormControl>
                        {editingExamples ? (
                          <MessageMarkdown
                            placeholder="Enter examples or generate them automatically"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isLoading}
                          />
                        ) : field.value ? (
                          <div className="min-h-[120px] p-3 border rounded-md bg-muted/30 text-sm">
                            <RategenMarkdown content={field.value} className="text-sm" />
                          </div>
                        ) : (
                          <MessageMarkdown
                            placeholder="Enter examples or generate them automatically"
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isLoading}
                          />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}
                {/* Inclusions & Exclusions */}
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="inclusions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inclusions (Comma separated)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What's included in this meal service..."
                            className="min-h-[100px]"
                            {...field}
                            disabled={getIsLocked("meal.inclusions")}
                            rightIcon={getIsLocked("meal.inclusions") && <IndicateLocked />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exclusions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exclusions (Comma separated)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What's excluded from this meal service..."
                            className="min-h-[100px]"
                            {...field}
                            disabled={getIsLocked("meal.exclusions")}
                            rightIcon={getIsLocked("meal.exclusions") && <IndicateLocked />}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {/* Images */}
                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Meal Images
                        {getIsLocked("meal.images") && (
                          <IndicateLocked tooltip="Adding or removing images is restricted" />
                        )}
                      </FormLabel>
                      <FormControl>
                        <S3ImageUpload
                          images={field.value || []}
                          onChange={field.onChange}
                          userId={user?.id || ""}
                          prefix="meal_images/"
                          disabled={!user?.id || getIsLocked("meal.images")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </BorderedCard>

          {/* Age Policy */}
          <BorderedCard title="Age Policy" variant="dashed">
            <div className="space-y-4 mt-4">
              {/* Adult Age */}
              <BorderedCard title="Adult Age" collapsible defaultOpen>
                <div className="grid grid-cols-1 gap-4">
                  {hasAgeRange("adult") && (
                    <AgeRangeField form={form} category="adult" onRemove={() => removeAgeRange("adult")} />
                  )}
                </div>
              </BorderedCard>

              {/* Teenager */}
              <BorderedCard title="Teenager" collapsible defaultOpen>
                <div className="grid grid-cols-1 gap-4">
                  {hasAgeRange("teenager") ? (
                    <AgeRangeField form={form} category="teenager" onRemove={() => removeAgeRange("teenager")} />
                  ) : (
                    <Button type="button" variant="dashed" onClick={() => addAgeRange("teenager")}>
                      <Plus />
                      Add Meals
                    </Button>
                  )}
                </div>
              </BorderedCard>

              {/* Child Age */}
              <BorderedCard title="Child Age" collapsible defaultOpen>
                <div className="grid grid-cols-1 gap-4">
                  {hasAgeRange("child") ? (
                    <AgeRangeField form={form} category="child" onRemove={() => removeAgeRange("child")} />
                  ) : (
                    <Button type="button" variant="dashed" onClick={() => addAgeRange("child")}>
                      <Plus />
                      Add Meals
                    </Button>
                  )}
                </div>
              </BorderedCard>

              {/* Infant Age */}
              <BorderedCard title="Infant Age" collapsible defaultOpen>
                <div className="grid grid-cols-1 gap-4">
                  {hasAgeRange("infant") ? (
                    <AgeRangeField form={form} category="infant" onRemove={() => removeAgeRange("infant")} />
                  ) : (
                    <Button type="button" variant="dashed" onClick={() => addAgeRange("infant")}>
                      <Plus />
                      Add Meals
                    </Button>
                  )}
                </div>
              </BorderedCard>
            </div>
          </BorderedCard>

          {/* Meal Rates */}
          <BorderedCard title="Meal Rates" variant="dashed">
            <div className="space-y-4">
              {(() => {
                const agePolicy = form.watch("age_policy");
                const ageCategories: Array<{
                  key: "adult" | "teenager" | "child" | "infant";
                  label: string;
                  range: string;
                }> = [];

                // Adult is always present
                if (agePolicy?.adult?.meals) {
                  ageCategories.push({
                    key: "adult",
                    label: "Adults",
                    range: `${agePolicy.adult.meals.from}-${agePolicy.adult.meals.to}`,
                  });
                }

                // Check for optional categories
                if (agePolicy?.teenager?.meals) {
                  ageCategories.push({
                    key: "teenager",
                    label: "Teenagers",
                    range: `${agePolicy.teenager.meals.from}-${agePolicy.teenager.meals.to}`,
                  });
                }

                if (agePolicy?.child?.meals) {
                  ageCategories.push({
                    key: "child",
                    label: "Children",
                    range: `${agePolicy.child.meals.from}-${agePolicy.child.meals.to}`,
                  });
                }

                if (agePolicy?.infant?.meals) {
                  ageCategories.push({
                    key: "infant",
                    label: "Infants",
                    range: `${agePolicy.infant.meals.from}-${agePolicy.infant.meals.to}`,
                  });
                }

                return (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-left bg-muted/50 font-medium text-sm">Meal Type</TableHead>
                            <TableHead className="text-left bg-muted/50 font-medium text-sm">Cuisine</TableHead>
                            <TableHead className="text-left bg-muted/50 font-medium text-sm">Option</TableHead>
                            {ageCategories.map((cat) => (
                              <TableHead key={cat.key} className="text-center bg-muted/50 font-medium text-sm">
                                <div>{cat.label}</div>
                                <div className="text-xs font-normal text-muted-foreground">({cat.range})</div>
                              </TableHead>
                            ))}
                            <TableHead className="text-center bg-muted/50 font-medium text-sm w-[80px]">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mealPlanFields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell className="w-[180px]">
                                <FormField
                                  control={form.control}
                                  name={`meal_plan_rates.${index}.meal_type` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select meal type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {MEAL_RATE_TYPES.map((type) => (
                                              <SelectItem key={type.value} value={type.value}>
                                                {type.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-[150px]">
                                <FormField
                                  control={form.control}
                                  name={`meal_plan_rates.${index}.cuisine` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select cuisine" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {MEAL_CUISINES.map((cuisine) => (
                                              <SelectItem key={cuisine.value} value={cuisine.value}>
                                                {cuisine.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-[130px]">
                                <FormField
                                  control={form.control}
                                  name={`meal_plan_rates.${index}.option` as any}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                          <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select option" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {MEAL_OPTIONS.map((option) => (
                                              <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              {ageCategories.map((cat) => (
                                <TableCell key={cat.key}>
                                  <FormField
                                    control={form.control}
                                    name={`meal_plan_rates.${index}.rates.${cat.key}` as any}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="-"
                                            value={field.value != null ? String(field.value) : ""}
                                            onChange={(e) => handleNumericChange(field, e.target.value)}
                                            className="h-8 text-sm text-center"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeMealPlan(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="w-full">
                      <Button
                        type="button"
                        variant="dashed"
                        onClick={() =>
                          appendMealPlan({
                            meal_type: "",
                            cuisine: "",
                            option: "",
                            rates: {},
                          })
                        }
                        className="w-full"
                      >
                        <Plus />
                        Add Meal Rate
                      </Button>
                    </div>
                  </>
                );
              })()}
            </div>
          </BorderedCard>

          {/* Policies & Remarks */}
          <BorderedCard title="Policies & Remarks" variant="dashed">
            <div className="space-y-6 mt-4">
              {/* Cancellation Policy */}
              <FormField
                control={form.control}
                name="cancellation_policy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancellation Policy</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter cancellation policy details"
                        className="min-h-[100px]"
                        {...field}
                        disabled={getIsLocked("meal.cancellation_policy")}
                        rightIcon={getIsLocked("meal.cancellation_policy") && <IndicateLocked />}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AI Remarks */}
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Remarks</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter AI-generated remarks or suggestions"
                        className="min-h-[100px]"
                        {...field}
                        disabled={getIsLocked("meal.remarks")}
                        rightIcon={getIsLocked("meal.remarks") && <IndicateLocked />}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter additional notes"
                        className="min-h-[100px]"
                        {...field}
                        disabled={getIsLocked("meal.notes")}
                        rightIcon={getIsLocked("meal.notes") && <IndicateLocked />}
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
