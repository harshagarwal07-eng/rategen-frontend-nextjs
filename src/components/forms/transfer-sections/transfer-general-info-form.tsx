"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Wand2, Loader2, Save, Edit3, X } from "lucide-react";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { CURRENCY_OPTIONS, TRANSFER_MODES } from "@/constants/data";
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

// Transfer General Info Schema
const TransferGeneralInfoSchema = z.object({
  id: z.string().optional(),
  transfer_name: z.string().min(2, {
    message: "Transfer name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  mode: z.string().optional(),
  currency: z.string().optional(),
  country: z.string().uuid({ message: "Country is required" }).optional(),
  state: z.string().optional(),
  city: z.string().uuid({ message: "City is required" }).optional(),
  preferred: z.boolean().default(false),
  markup: z.number().optional(),
  examples: z.string().optional(),
  images: z.array(z.string()).default([]),
});

export type ITransferGeneralInfo = z.infer<typeof TransferGeneralInfoSchema>;

interface TransferGeneralInfoFormProps {
  initialData?: Partial<
    ITransferGeneralInfo & {
      id?: string;
      state?: string | null;
      transfer_datastore_id?: string | null;
      is_unlinked?: boolean;
    }
  >;
  syncedColumns: string[];
  onNext: (data: ITransferGeneralInfo & { id?: string }) => void;
  formRef?: React.RefObject<HTMLFormElement>;
}

export default function TransferGeneralInfoForm({
  initialData,
  syncedColumns,
  onNext,
  formRef,
}: TransferGeneralInfoFormProps) {
  const { user } = useUser();
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [editingExamples, setEditingExamples] = useState(false);

  const form = useForm({
    resolver: zodResolver(TransferGeneralInfoSchema),
    defaultValues: {
      id: initialData?.id || undefined,
      transfer_name: initialData?.transfer_name || "",
      description: initialData?.description || "",
      mode: initialData?.mode || "",
      currency: initialData?.currency || "",
      country: initialData?.country || "",
      state: initialData?.state || "",
      city: initialData?.city || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || undefined,
      examples: initialData?.examples || "",
      images: initialData?.images || [],
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
        transfer_name: initialData?.transfer_name || "",
        description: initialData?.description || "",
        mode: initialData?.mode || "",
        currency: initialData?.currency || "",
        country: initialData?.country || "",
        state: initialData?.state || "",
        city: initialData?.city || "",
        preferred: initialData?.preferred || false,
        markup: initialData?.markup || undefined,
        examples: initialData?.examples || "",
        images: initialData?.images || [],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  // check if hotel is linked to hotel datastore and locked inputs
  const isLinked = !!initialData?.transfer_datastore_id && !initialData.is_unlinked;

  const getIsLocked = (name: string) => {
    return isLinked && syncedColumns.includes(name);
  };

  const onSubmit = async (data: any) => {
    onNext({ ...data, id: initialData?.id });
  };

  const handleGenerateExamples = async () => {
    const transferName = form.getValues("transfer_name");
    const description = form.getValues("description");

    if (!transferName) {
      toast.error("Please enter a transfer name first");
      return;
    }

    setGeneratingExamples(true);
    try {
      const prompt = `Create examples for a transfer named "${transferName}"${
        description ? ` with description: ${description}` : ""
      }.`;
      const result = await generateExamples(prompt, "transfer");
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
        <p className="text-muted-foreground">Enter the basic details about the transfer service</p>
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
              name="transfer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter transfer name"
                      {...field}
                      disabled={getIsLocked("transfer.transfer_name")}
                      rightIcon={getIsLocked("transfer.transfer_name") && <IndicateLocked />}
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
                      type="number"
                      placeholder="Enter markup percentage"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      disabled={getIsLocked("transfer.markup")}
                      rightIcon={getIsLocked("transfer.markup") && <IndicateLocked />}
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
                      placeholder="Enter transfer description"
                      className="min-h-[100px]"
                      {...field}
                      disabled={getIsLocked("transfer.description")}
                      rightIcon={getIsLocked("transfer.description") && <IndicateLocked />}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2">
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode of Transport</FormLabel>
                  <Autocomplete
                    options={TRANSFER_MODES}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select mode"
                    disabled={getIsLocked("transfer.mode")}
                    rightIcon={getIsLocked("transfer.mode") && <IndicateLocked />}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    disabled={getIsLocked("transfer.currency")}
                    rightIcon={getIsLocked("transfer.currency") && <IndicateLocked />}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div
            className={cn("grid grid-cols-1 md:grid-cols-2 gap-4 lg:col-span-2", showStateInput && "md:grid-cols-3")}
          >
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
                      disabled={getIsLocked("transfer.country")}
                      rightIcon={getIsLocked("transfer.country") && <IndicateLocked />}
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
                        disabled={!countryValue || getIsLocked("transfer.state")}
                        rightIcon={getIsLocked("transfer.state") && <IndicateLocked />}
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
                    disabled={(showStateInput ? !stateValue : !countryValue) || getIsLocked("transfer.city")}
                    rightIcon={getIsLocked("transfer.city") && <IndicateLocked />}
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
                      disabled={getIsLocked("transfer.preferred")}
                    />
                  </FormControl>
                  <div
                    className={cn(
                      "space-y-1 leading-none",
                      getIsLocked("transfer.preferred") && "pointer-events-none opacity-50"
                    )}
                  >
                    <FormLabel>Preferred Transfer</FormLabel>
                    <div className="text-sm text-muted-foreground">Mark this transfer as preferred</div>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Examples Section */}
          {/* <div className="space-y-4 lg:col-span-2">
            <FormField
              control={form.control}
              name="examples"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
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
                            disabled={generatingExamples}
                            className="flex items-center gap-2"
                          >
                            {generatingExamples ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Wand2 />
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
                              // Reset to original value if cancelled
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
                        disabled={false}
                      />
                    ) : field.value ? (
                      <div className="min-h-[120px] p-3 border rounded-md bg-muted/30 text-sm">
                        <RategenMarkdown
                          content={field.value}
                          className="text-sm"
                        />
                      </div>
                    ) : (
                      <MessageMarkdown
                        placeholder="Enter examples or generate them automatically"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={false}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div> */}

          {/* Images Section */}
          <div className="space-y-4 lg:col-span-2">
            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Transfer Images{" "}
                    {getIsLocked("transfer.images") && (
                      <IndicateLocked tooltip="Adding or removing images is restricted" />
                    )}
                  </FormLabel>
                  <FormControl>
                    <S3ImageUpload
                      images={field.value || []}
                      onChange={field.onChange}
                      userId={user?.id || ""}
                      prefix="transfer_images/"
                      disabled={!user?.id || getIsLocked("transfer.images")}
                    />
                  </FormControl>
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
