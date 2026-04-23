"use client";

import { TransfersDatastoreSchema, ITransfersDatastore } from "./schemas/transfers-datastore-schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CURRENCY_OPTIONS, TRANSFER_MODES } from "@/constants/data";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createTransfer, updateTransfer } from "@/data-access/transfers";
import { generateExamples } from "@/data-access/common";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useState, useEffect } from "react";
import { ImagePlus, X, Wand2, Loader2, Edit3, Save } from "lucide-react";
import { uploadToS3, S3UploadResponse } from "@/lib/s3-upload";
import S3Image from "@/components/ui/s3-image";
import useUser from "@/hooks/use-user";
import { IOption } from "@/types/common";
import { VirtualizedAutocomplete } from "@/components/ui/virtualized-autocomplete";
import { fetchCitiesByCountryId, fetchCountries } from "@/data-access/datastore";
import { MessageMarkdown } from "@/components/ui/message-markdown";
import RategenMarkdown from "@/components/ui/rategen-markdown";

type Props = {
  initialData: ITransfersDatastore | null;
  onSuccess?: () => void;
};

export default function TransfersDatastoreForm({ initialData, onSuccess }: Props) {
  const router = useRouter();
  const [uploadingImages, setUploadingImages] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [editingExamples, setEditingExamples] = useState(false);
  const { user } = useUser();

  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [cityOptions, setCityOptions] = useState<IOption[]>([]);

  const form = useForm({
    resolver: zodResolver(TransfersDatastoreSchema),
    values: {
      transfer_name: initialData?.transfer_name || "",
      description: initialData?.description || "",
      mode: initialData?.mode || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || undefined,
      rule: initialData?.rule || "",
      raw_rates: initialData?.raw_rates || "",
      cancellation_policy: initialData?.cancellation_policy || "",
      remarks: initialData?.remarks || "",
      currency: initialData?.currency || "",
      images: initialData?.images || [],
      country: initialData?.country || "",
      city: initialData?.city || "",
      examples: initialData?.examples || "",
    },
  });

  useEffect(() => {
    fetchCountries().then((options) => {
      setCountryOptions(options);
    });
  }, []);

  const country = form.watch("country");

  useEffect(() => {
    if (!country) {
      setCityOptions([]);
      return;
    }
    fetchCitiesByCountryId(country).then((options) => {
      setCityOptions(options);
    });
  }, [country]);

  // Clear city options when country changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "country") {
        setCityOptions([]);
        form.setValue("city", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const removeImage = (indexToRemove: number) => {
    const images = (form.getValues("images") || []) as string[];
    form.setValue(
      "images",
      images.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length || !user?.id) return;

    setUploadingImages(true);
    const files = Array.from(e.target.files);
    const images = (form.getValues("images") || []) as string[];

    try {
      const uploadPromises = files.map(async (file) => {
        const result: S3UploadResponse = await uploadToS3({
          file,
          userId: user.id,
        });

        if (result.error) throw new Error(result.error);
        return result.url!;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      form.setValue("images", [...images, ...uploadedUrls]);
      toast.success("Images uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload images");
      console.error("Upload error:", error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleGenerateExamples = async () => {
    setGeneratingExamples(true);
    try {
      const formData = form.getValues();
      const { data, error } = await generateExamples(formData, "transfers");

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

  async function onSubmit(values: any) {
    try {
      const { error } =
        initialData && initialData.id ? await updateTransfer(initialData.id, values) : await createTransfer(values);

      if (error) throw error;

      toast.success(initialData ? "Transfer updated successfully" : "Transfer created successfully");
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save transfer");
    }
  }

  const isLoading = form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">General Information</h4>

            <FormField
              control={form.control}
              name="transfer_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter transfer name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode of Transport</FormLabel>
                    <Autocomplete options={TRANSFER_MODES} value={field.value} onChange={field.onChange} />
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
                    <Autocomplete options={CURRENCY_OPTIONS} value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Autocomplete options={countryOptions} value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <VirtualizedAutocomplete options={cityOptions} value={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter transfer description"
                      {...field}
                      value={field.value || ""}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                            disabled={isLoading || generatingExamples}
                            className="flex items-center gap-2"
                          >
                            {generatingExamples ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 />}
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
            />

            <FormField
              control={form.control}
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transfer Images</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Image Grid */}
                      {field.value && field.value.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {field.value.map((url: string, index: number) => (
                            <div key={`${url}-${index}`} className="relative group aspect-square">
                              <S3Image url={url} index={index} />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Upload Button */}
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingImages}
                          onClick={() => document.getElementById("image-upload")?.click()}
                        >
                          <ImagePlus className="h-4 w-4 mr-2" />
                          {uploadingImages ? "Uploading..." : "Add Images"}
                        </Button>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImages}
                        />
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Configuration Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">Configuration</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferred"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 mt-8">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Preferred Transfer</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="raw_rates"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raw Rates</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter raw rates information"
                      {...field}
                      value={field.value || ""}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Policies Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">Policies</h4>

            <FormField
              control={form.control}
              name="rule"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rules</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter transfer rules"
                      {...field}
                      value={field.value || ""}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cancellation_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cancellation Policy</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter cancellation policy"
                      {...field}
                      value={field.value || ""}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter additional remarks"
                      {...field}
                      value={field.value || ""}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit" disabled={isLoading || uploadingImages}>
              {isLoading
                ? initialData
                  ? "Updating..."
                  : "Creating..."
                : initialData
                  ? "Update Transfer"
                  : "Create Transfer"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
