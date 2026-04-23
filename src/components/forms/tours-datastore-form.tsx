"use client";

import { ToursDatastoreSchema, IToursDatastore } from "@/components/forms/schemas/tours-datastore-schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CURRENCY_OPTIONS } from "@/constants/data";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createTours, updateTours } from "@/data-access/tours";
import { generateExamples } from "@/data-access/common";
import { Autocomplete } from "../ui/autocomplete";
import { useState, useEffect } from "react";
import { ImagePlus, PenTool, Sparkles, X, Wand2, Loader2, Edit3, Save } from "lucide-react";
import { uploadToS3, S3UploadResponse } from "@/lib/s3-upload";
import useUser from "@/hooks/use-user";
import S3Image from "@/components/ui/s3-image";
import { IOption } from "@/types/common";
import { VirtualizedAutocomplete } from "../ui/virtualized-autocomplete";
import { KeyValue } from "@/types/common";
import { Card, CardContent } from "@/components/ui/card";
import { fetchCitiesByCountryId, fetchCountries } from "@/data-access/datastore";
import AITourCreation from "./ai-tour-creation";
import { MessageMarkdown } from "@/components/ui/message-markdown";
import RategenMarkdown from "@/components/ui/rategen-markdown";
import { Button } from "@/components/ui/button";

type Props = {
  initialData: IToursDatastore | null;
  onSuccess?: () => void;
  isDuplicating?: boolean;
};

export default function ToursDatastoreForm({ initialData, onSuccess }: Props) {
  const router = useRouter();
  const { user } = useUser();

  const [creationMode, setCreationMode] = useState<"manual" | "ai" | "select">("select");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [generatingExamples, setGeneratingExamples] = useState(false);
  const [editingExamples, setEditingExamples] = useState(false);
  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [cityOptions, setCityOptions] = useState<IOption[]>([]);

  const form = useForm({
    resolver: zodResolver(ToursDatastoreSchema),
    values: {
      tour_name: initialData?.tour_name || "",
      ticket_only_rate_adult: initialData?.ticket_only_rate_adult || undefined,
      ticket_only_rate_child: initialData?.ticket_only_rate_child || undefined,
      sic_rate_adult: initialData?.sic_rate_adult || undefined,
      sic_rate_child: initialData?.sic_rate_child || undefined,
      pvt_rate: initialData?.pvt_rate || {},
      raw_rates: initialData?.raw_rates || "",
      description: initialData?.description || "",
      remarks: initialData?.remarks || "",
      cancellation_policy: initialData?.cancellation_policy || "",
      child_policy: initialData?.child_policy || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || "",
      currency: initialData?.currency || "",
      country: initialData?.country || "",
      city: initialData?.city || "",
      // Google Places fields
      formatted_address: initialData?.formatted_address || "",
      website: initialData?.website || "",
      latitude: initialData?.latitude || undefined,
      longitude: initialData?.longitude || undefined,
      rating: initialData?.rating || undefined,
      user_ratings_total: initialData?.user_ratings_total || undefined,
      types: initialData?.types || undefined,
      review_summary: initialData?.review_summary || "",
      maps_url: initialData?.maps_url || "",
      place_id: initialData?.place_id || "",
      images: initialData?.images || [],
      timings: initialData?.timings || [],
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

  const removeImage = (indexToRemove: number) => {
    const images = (form.getValues("images") || []) as string[];
    form.setValue(
      "images",
      images.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleGenerateExamples = async () => {
    setGeneratingExamples(true);
    try {
      const formData = form.getValues();
      const { data, error } = await generateExamples(formData, "tours");

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

  async function onSubmit(values: any) {
    const { error } =
      initialData && initialData.id ? await updateTours(initialData.id, values) : await createTours(values);

    if (error) return toast.error(error);

    toast.success(initialData ? "Tour updated successfully" : "Tour created successfully");
    onSuccess?.();
    router.refresh();
  }

  const handleAITourData = (tourData: any) => {
    form.reset({
      tour_name: tourData.tour_name || "",
      description: tourData.description || "",
      country: tourData.country || "",
      city: tourData.city || "",
      remarks: tourData.remarks || "",
      formatted_address: tourData.formatted_address || "",
      website: tourData.website || "",
      latitude: tourData.latitude || undefined,
      longitude: tourData.longitude || undefined,
      rating: tourData.rating || undefined,
      user_ratings_total: tourData.user_ratings_total || undefined,
      types: tourData.types || undefined,
      review_summary: tourData.review_summary || "",
      maps_url: tourData.maps_url || "",
      place_id: tourData.place_id || "",
      ticket_only_rate_adult: undefined,
      ticket_only_rate_child: undefined,
      sic_rate_adult: undefined,
      sic_rate_child: undefined,
      pvt_rate: {},
      raw_rates: "",
      timings: tourData.timings || [],
      cancellation_policy: tourData.cancellation_policy || "",
      child_policy: tourData.child_policy || "",
      currency: tourData.currency || "",
      preferred: false,
      markup: "",
      images: tourData.images || [],
      examples: "",
    });

    setCreationMode("manual"); // Switch to manual mode to edit the form
  };

  const isLoading = form.formState.isSubmitting;

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

  // Show mode selection if no initial data and in select mode
  if (!initialData && creationMode === "select") {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Create New Tour</h3>
          <p className="text-sm text-muted-foreground">Choose how you&apos;d like to create your tour</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCreationMode("ai")}>
            <CardContent className="p-6 text-center">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-blue-600" />
              <h4 className="font-semibold mb-2">Create with AI</h4>
              <p className="text-sm text-muted-foreground">
                Search for a place and automatically populate tour details using Google Places
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCreationMode("manual")}>
            <CardContent className="p-6 text-center">
              <PenTool className="h-8 w-8 mx-auto mb-3 text-green-600" />
              <h4 className="font-semibold mb-2">Manual Entry</h4>
              <p className="text-sm text-muted-foreground">Manually enter all tour details yourself</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show AI creation interface
  if (creationMode === "ai") {
    return <AITourCreation onPlaceSelected={handleAITourData} onCancel={() => setCreationMode("select")} />;
  }

  // Show manual form (default)
  return (
    <div className="space-y-6">
      {!initialData && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{creationMode === "manual" ? "Manual Tour Creation" : "Edit Tour"}</h3>
          <Button variant="outline" size="sm" onClick={() => setCreationMode("select")} type="button">
            Change Creation Method
          </Button>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* General Information Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">General Information</h4>
            <FormField
              control={form.control}
              name="tour_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tour Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter tour name" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <FormField
                control={form.control}
                name="markup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markup</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter markup" {...field} value={field.value || ""} disabled={isLoading} />
                    </FormControl>
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
              name="formatted_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter formatted address"
                      {...field}
                      value={field.value || ""}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="maps_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Google Maps link" {...field} value={field.value || ""} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.0000000"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitude</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="0.0000000"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="5"
                        placeholder="0.0"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                name="user_ratings_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Reviews</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="-"
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
            </div>

            <FormField
              control={form.control}
              name="review_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review Summary</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Summary of user reviews from Google Places"
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter tour description"
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
                  <FormLabel>Tour Images</FormLabel>
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

            {/* Timings Array Field */}
            <FormField
              control={form.control}
              name="timings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timings</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {Array.isArray(field.value) && field.value.length > 0 ? (
                        (field.value as string[]).map((timing, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input
                              placeholder="Enter timing (e.g. 09:00-11:00)"
                              value={timing}
                              onChange={(e) => {
                                const updated = Array.isArray(field.value) ? [...field.value] : [];
                                updated[idx] = e.target.value;
                                field.onChange(updated);
                              }}
                              disabled={isLoading}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => {
                                const updated = Array.isArray(field.value)
                                  ? field.value.filter((_: any, i: number) => i !== idx)
                                  : [];
                                field.onChange(updated);
                              }}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground text-sm">No timings added.</div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          let timingsArr: string[] = [];
                          if (Array.isArray(field.value)) {
                            timingsArr = [...field.value];
                          }
                          timingsArr.push("");
                          field.onChange(timingsArr);
                        }}
                        disabled={isLoading}
                      >
                        Add Timing
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Rate Information Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">Rate Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ticket_only_rate_adult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Rate (Adult)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="-"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                name="ticket_only_rate_child"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ticket Rate (Child)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="-"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sic_rate_adult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIC Rate (Adult)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="-"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
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
                name="sic_rate_child"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SIC Rate (Child)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="-"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PVT Rate Object Field */}
            <FormField
              control={form.control}
              name="pvt_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PVT Rates</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {field.value && Object.keys(field.value).length > 0 ? (
                        Object.entries(field.value as KeyValue).map(([key, value], idx) => (
                          <div key={`${key}-${idx}`} className="flex gap-2 items-center">
                            <Input
                              placeholder="Key (e.g. 1pax, 2pax)"
                              value={key}
                              onChange={(e) => {
                                const updated = {
                                  ...(field.value as KeyValue),
                                };
                                delete updated[key];
                                updated[e.target.value || `${idx + 1}pax`] = value;
                                field.onChange(updated);
                              }}
                              disabled
                              readOnly
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="-"
                              value={value || ""}
                              onChange={(e) => {
                                const updated = {
                                  ...(field.value as KeyValue),
                                };
                                updated[key] = e.target.value ? parseFloat(e.target.value) : 0;
                                field.onChange(updated);
                              }}
                              onWheel={(e) => e.currentTarget.blur()}
                              disabled={isLoading}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => {
                                const updated = {
                                  ...(field.value as KeyValue),
                                };
                                delete updated[key];
                                field.onChange(updated);
                              }}
                              disabled={isLoading}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted-foreground text-sm">No PVT rates added.</div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updated = {
                            ...((field.value as KeyValue) || {}),
                          };
                          const existingKeys = Object.keys(updated);
                          const newKey = `${existingKeys.length + 1}pax`;
                          updated[newKey] = 0;
                          field.onChange(updated);
                        }}
                        disabled={isLoading}
                      >
                        Add PVT Rate
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <FormField
              control={form.control}
              name="preferred"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isLoading} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Preferred Tour</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Policies Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">Policies</h4>
            <FormField
              control={form.control}
              name="child_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Child Policy</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter child policy"
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
              {isLoading ? (initialData ? "Updating..." : "Creating...") : initialData ? "Update Tour" : "Create Tour"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
