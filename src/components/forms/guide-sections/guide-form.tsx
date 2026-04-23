"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Wand2, Loader2, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BorderedCard } from "@/components/ui/bordered-card";
import { CURRENCY_OPTIONS, GUIDE_TYPES } from "@/constants/data";
import { cn } from "@/lib/utils";
import useUser from "@/hooks/use-user";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import { generateExamples } from "@/data-access/common";
import { MessageMarkdown } from "@/components/ui/message-markdown";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { toast } from "sonner";
import { IGuidesDatastore, GuidesDatastoreSchema } from "../schemas/guides-datastore-schema";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualizedAutocomplete } from "@/components/ui/virtualized-autocomplete";
import IndicateLocked from "@/components/common/indicate-locked";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";

interface GuideFormProps {
  initialData: Partial<IGuidesDatastore>;
  syncedColumns: string[];
  onNext: (data: any) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

export default function GuideForm({ initialData, syncedColumns, onNext, formRef }: GuideFormProps) {
  const { user } = useUser();
  const [isLoading] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [editingExamples, setEditingExamples] = useState(false);

  const form = useForm<IGuidesDatastore>({
    resolver: zodResolver(GuidesDatastoreSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      guide_type: initialData?.guide_type || "",
      language: initialData?.language || "",
      country: initialData?.country || undefined,
      state: initialData?.state || "",
      city: initialData?.city || "",
      currency: initialData?.currency || "",
      description: initialData?.description || "",
      examples: initialData?.examples || "",
      images: initialData?.images || [],
      preferred: initialData?.preferred || false,
      per_day_rate: initialData?.per_day_rate || undefined,
      markup: initialData?.markup || undefined,
      cancellation_policy: initialData?.cancellation_policy || "",
      remarks: initialData?.remarks || "",
      notes: initialData?.notes || "",
      inclusions: initialData?.inclusions || "",
      exclusions: initialData?.exclusions || "",
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
        guide_type: initialData?.guide_type || "",
        language: initialData?.language || "",
        country: initialData?.country || "",
        state: initialData?.state || "",
        city: initialData?.city || "",
        currency: initialData?.currency || "",
        description: initialData?.description || "",
        examples: initialData?.examples || "",
        images: initialData?.images || [],
        preferred: initialData?.preferred || false,
        per_day_rate: initialData?.per_day_rate || undefined,
        markup: initialData?.markup || undefined,
        cancellation_policy: initialData?.cancellation_policy || "",
        remarks: initialData?.remarks || "",
        notes: initialData?.notes || "",
        inclusions: initialData?.inclusions || "",
        exclusions: initialData?.exclusions || "",
      });
    }
  }, [initialData, form]);

  const handleGenerateExamples = async () => {
    setGeneratingExamples(true);
    try {
      const formData = form.getValues();
      const { data, error } = await generateExamples(formData, "guides");

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

  const onSubmit = async (data: IGuidesDatastore) => {
    onNext(data);
  };

  // check if meal is linked to hotel datastore and locked inputs
  const isLinked = !!initialData?.guide_datastore_id && !initialData.is_unlinked;

  const getIsLocked = (name: string) => {
    return isLinked && syncedColumns.includes(name);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Create Guide</h2>
        <p className="text-muted-foreground">Enter the guide details, policies, and information</p>
      </div>

      <Form {...form}>
        <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information */}
          <BorderedCard title="General Information" variant="dashed">
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Guide Type */}
                <FormField
                  control={form.control}
                  name="guide_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guide Type *</FormLabel>
                      <Autocomplete
                        options={GUIDE_TYPES}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select guide type"
                        disabled={isLoading || getIsLocked("guide.guide_type")}
                        rightIcon={getIsLocked("guide.guide_type") && <IndicateLocked />}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Language */}
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. English/French"
                          {...field}
                          disabled={isLoading || getIsLocked("guide.language")}
                          rightIcon={getIsLocked("guide.language") && <IndicateLocked />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", showStateInput && "lg:grid-cols-3")}>
                {/* Country */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Autocomplete
                        options={countryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select country"
                        disabled={isLoading || getIsLocked("guide.country")}
                        rightIcon={getIsLocked("guide.country") && <IndicateLocked />}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* State */}
                {showStateInput && (
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State *</FormLabel>
                        {isLoadingCities ? (
                          <Skeleton className="h-10 w-full" />
                        ) : (
                          <Autocomplete
                            options={stateOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select state"
                            disabled={!country || isLoading || getIsLocked("guide.state")}
                            rightIcon={getIsLocked("guide.state") && <IndicateLocked />}
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
                        disabled={(showStateInput ? !state : !country) || isLoading || getIsLocked("guide.city")}
                        rightIcon={getIsLocked("guide.city") && <IndicateLocked />}
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
                        disabled={getIsLocked("guide.currency")}
                        rightIcon={getIsLocked("guide.currency") && <IndicateLocked />}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Per Day Rate */}
                <FormField
                  control={form.control}
                  name="per_day_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Day Rate</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Enter per day rate"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={isLoading || getIsLocked("guide.per_day_rate")}
                          rightIcon={getIsLocked("guide.per_day_rate") && <IndicateLocked />}
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
                          disabled={isLoading || getIsLocked("guide.markup")}
                          rightIcon={getIsLocked("guide.markup") && <IndicateLocked />}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Preferred Guide */}
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
                          disabled={isLoading || getIsLocked("guide.preferred")}
                        />
                      </FormControl>
                      <div
                        className={cn("space-y-1 leading-none", getIsLocked("guide.preferred") && <IndicateLocked />)}
                      >
                        <FormLabel>Preferred Guide</FormLabel>
                        <div className="text-sm text-muted-foreground">Mark this guide as preferred</div>
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
                          placeholder="Enter guide description"
                          {...field}
                          value={field.value || ""}
                          rows={4}
                          disabled={isLoading || getIsLocked("guide.description")}
                          rightIcon={getIsLocked("guide.description") && <IndicateLocked />}
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
                            placeholder="What's included in this guide service..."
                            className="min-h-[100px]"
                            {...field}
                            disabled={getIsLocked("guide.inclusions")}
                            rightIcon={getIsLocked("guide.inclusions") && <IndicateLocked />}
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
                            placeholder="What's excluded from this guide service..."
                            className="min-h-[100px]"
                            {...field}
                            disabled={getIsLocked("guide.exclusions")}
                            rightIcon={getIsLocked("guide.exclusions") && <IndicateLocked />}
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
                        Guide Images
                        {getIsLocked("guide.images") && (
                          <IndicateLocked tooltip="Adding or removing images is restricted" />
                        )}
                      </FormLabel>
                      <FormControl>
                        <S3ImageUpload
                          images={field.value || []}
                          onChange={field.onChange}
                          userId={user?.id || ""}
                          prefix="guide_images/"
                          disabled={!user?.id || getIsLocked("guide.images")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
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
                        disabled={getIsLocked("guide.cancellation_policy")}
                        rightIcon={getIsLocked("guide.cancellation_policy") && <IndicateLocked />}
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
                        disabled={getIsLocked("guide.remarks")}
                        rightIcon={getIsLocked("guide.remarks") && <IndicateLocked />}
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
                        disabled={getIsLocked("guide.notes")}
                        rightIcon={getIsLocked("guide.notes") && <IndicateLocked />}
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
