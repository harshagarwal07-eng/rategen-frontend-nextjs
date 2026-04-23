import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  CarOnDisposalDatastoreSchema,
  ICarOnDisposalDatastore,
} from "./schemas/car-on-disposal-datastore-schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Autocomplete } from "../ui/autocomplete";
import { CURRENCY_OPTIONS } from "@/constants/data";
import { useEffect, useState } from "react";
import { IOption } from "@/types/common";
import { fetchCountries } from "@/data-access/datastore";
import useUser from "@/hooks/use-user";
import { S3UploadResponse, uploadToS3 } from "@/lib/s3-upload";
import { toast } from "sonner";
import S3Image from "../ui/s3-image";
import { ImagePlus, X } from "lucide-react";
import {
  createCarOnDisposal,
  updateCarOnDisposal,
} from "@/data-access/car-on-disposal";
import { Checkbox } from "../ui/checkbox";

type Props = {
  initialData: ICarOnDisposalDatastore | null;
  onSuccess?: () => void;
};

export default function CarOnDisposalDatastoreForm({
  initialData,
  onSuccess,
}: Props) {
  const router = useRouter();
  const { user } = useUser();

  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const form = useForm({
    resolver: zodResolver(CarOnDisposalDatastoreSchema),
    values: {
      name: initialData?.name || "",
      brand: initialData?.brand || "",
      capacity: initialData?.capacity || undefined,
      max_hrs_per_day: initialData?.max_hrs_per_day || undefined,
      min_km_per_day: initialData?.min_km_per_day || undefined,
      rate_per_km: initialData?.rate_per_km || undefined,
      route: initialData?.brand || "",
      surcharge_per_hr: initialData?.surcharge_per_hr || undefined,
      vbp_max_hrs_per_day: initialData?.vbp_max_hrs_per_day || undefined,
      vbp_max_km_per_day: initialData?.vbp_max_km_per_day || undefined,
      vbp_rate: initialData?.vbp_rate || undefined,
      vbp_surcharge_per_hr: initialData?.vbp_surcharge_per_hr || undefined,
      vbp_surcharge_per_km: initialData?.vbp_surcharge_per_km || undefined,
      country: initialData?.country || "",
      currency: initialData?.currency || "",
      images: initialData?.images || [],
      examples: initialData?.examples || "",
      remarks: initialData?.remarks || "",
      description: initialData?.description || "",
      cancellation_policy: initialData?.cancellation_policy || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || undefined,
    },
  });

  useEffect(() => {
    fetchCountries().then((options) => {
      setCountryOptions(options);
    });
  }, []);

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

  async function onSubmit(values: any) {
    try {
      const { error } =
        initialData && initialData.id
          ? await updateCarOnDisposal(initialData.id, values)
          : await createCarOnDisposal(values);
      if (error) throw error;
      toast.success(
        initialData
          ? "Car on disposal updated successfully"
          : "Car on disposal created successfully"
      );
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save car on disposal");
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car On Disposal Name*</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter car on disposal name"
                      {...field}
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
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Autocomplete
                      options={CURRENCY_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
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
                    <Autocomplete
                      options={countryOptions}
                      value={field.value}
                      onChange={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>{" "}
                    <FormControl>
                      <Input
                        placeholder="Enter brand"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>{" "}
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="-"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined
                          )
                        }
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
              name="route"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Route</FormLabel>{" "}
                  <FormControl>
                    <Input
                      placeholder="Enter route"
                      {...field}
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
                      placeholder="Enter car on disposal description"
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
              name="images"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Car Images</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Image Grid */}
                      {field.value && field.value.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {field.value.map((url: string, index: number) => (
                            <div
                              key={`${url}-${index}`}
                              className="relative group aspect-square"
                            >
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
                          onClick={() =>
                            document.getElementById("image-upload")?.click()
                          }
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

          {/* Rate Information Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">Rate Information</h4>

            <div className="space-y-4">
              <FormLabel className="text-base font-medium">
                Km Based Pricing
              </FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rate_per_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate Per Km</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                  name="min_km_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min km per Day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                  name="max_hrs_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Hours/Day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                  name="surcharge_per_hr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surcharge/Hour</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <FormLabel className="text-base font-medium">
                Vehicle Based Pricing
              </FormLabel>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vbp_rate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                  name="vbp_max_hrs_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Hours/Day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                  name="vbp_max_km_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Km/Day</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                  name="vbp_surcharge_per_hr"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surcharge/Hour</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
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
                  name="vbp_surcharge_per_km"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surcharge/km</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined
                          )
                        }
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
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Preferred</FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Policies Section */}
          <div className="space-y-6 border rounded-lg p-4">
            <h4 className="text-md font-semibold mb-6">Policies</h4>

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
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? initialData
                  ? "Updating..."
                  : "Creating..."
                : initialData
                ? "Update Guide"
                : "Create Guide"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
