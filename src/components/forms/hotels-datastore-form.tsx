import { useRouter } from "next/navigation";
import * as z from "zod";

// Legacy room interface for backward compatibility
interface LegacyHotelRoom {
  room_category: string;
  season_dates?: string;
  meal_plan?: string;
  rate_per_room_night?: number;
  single_pp?: number;
  double_pp?: number;
  extra_bed_pp?: number;
  child_no_bed?: number;
  max_occupancy?: string;
  other_details?: string;
}

// Legacy room schema for this form
const LegacyHotelRoomSchema = z.object({
  room_category: z.string().min(1, "Room category is required"),
  season_dates: z.string().optional(),
  meal_plan: z.string().optional(),
  rate_per_room_night: z.number().optional(),
  single_pp: z.number().optional(),
  double_pp: z.number().optional(),
  extra_bed_pp: z.number().optional(),
  child_no_bed: z.number().optional(),
  max_occupancy: z.string().optional(),
  other_details: z.string().optional(),
});

// Legacy schema for this form
const LegacyHotelsDatastoreSchema = z.object({
  id: z.string().optional(),
  hotel_name: z
    .string()
    .min(2, { message: "Hotel name must be at least 2 characters." }),
  hotel_code: z.string().optional(),
  hotel_address: z.string().optional(),
  hotel_city: z.string().uuid({ message: "City is required" }),
  hotel_country: z.string().uuid({ message: "Country is required" }),
  hotel_phone: z.string().optional(),
  hotel_email: z
    .string()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
  hotel_description: z.string().optional(),
  hotel_currency: z.string().optional(),
  property_type: z.string().optional(),
  star_rating: z.string().optional(),
  preferred: z.boolean().default(false),
  markup: z.number().optional(),
  examples: z.string().optional(),
  cancellation_policy: z.string().optional(),
  payment_policy: z.string().optional(),
  remarks: z.string().optional(),
  rooms: z.array(LegacyHotelRoomSchema).optional(),
});

type LegacyHotelsDatastore = z.infer<typeof LegacyHotelsDatastoreSchema>;
import { useEffect, useState } from "react";
import { IOption } from "@/types/common";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  fetchCitiesByCountryId,
  fetchCountries,
} from "@/data-access/datastore";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Mail, Phone, Plus, Trash2 } from "lucide-react";
import { PhoneInput } from "../ui/phone-input";
import { Autocomplete } from "../ui/autocomplete";
import { VirtualizedAutocomplete } from "../ui/virtualized-autocomplete";
import { Textarea } from "../ui/textarea";
import {
  CURRENCY_OPTIONS,
  HOTEL_PROPERTY_TYPES,
  HOTEL_STAR_RATING,
} from "@/constants/data";
import { createHotels, updateHotels } from "@/data-access/hotels";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";

type Props = {
  initialData: LegacyHotelsDatastore | null;
  onSuccess?: () => void;
  isDuplicating?: boolean;
};

export default function HotelsDatastoreForm({ initialData, onSuccess }: Props) {
  const router = useRouter();

  const [countryOptions, setCountryOptions] = useState<IOption[]>([]);
  const [cityOptions, setCityOptions] = useState<IOption[]>([]);

  const form = useForm({
    resolver: zodResolver(LegacyHotelsDatastoreSchema),
    values: {
      hotel_name: initialData?.hotel_name || "",
      hotel_description: initialData?.hotel_description || "",
      hotel_city: initialData?.hotel_city || "",
      hotel_country: initialData?.hotel_country || "",
      hotel_address: initialData?.hotel_address || "",
      hotel_code: initialData?.hotel_code || "",
      hotel_currency: initialData?.hotel_currency || "",
      hotel_email: initialData?.hotel_email || "",
      hotel_phone: initialData?.hotel_phone || "",
      cancellation_policy: initialData?.cancellation_policy || "",
      remarks: initialData?.remarks || "",
      examples: initialData?.examples || "",
      payment_policy: initialData?.payment_policy || "",
      property_type: initialData?.property_type || "",
      star_rating: initialData?.star_rating || "",
      preferred: initialData?.preferred || false,
      markup: initialData?.markup || undefined,
      rooms: (initialData?.rooms || []).map((room: LegacyHotelRoom) => ({
        room_category: room.room_category ?? "",
        season_dates: room.season_dates ?? "",
        meal_plan: room.meal_plan ?? "",
        rate_per_room_night: room.rate_per_room_night ?? undefined,
        single_pp: room.single_pp ?? undefined,
        double_pp: room.double_pp ?? undefined,
        extra_bed_pp: room.extra_bed_pp ?? undefined,
        child_no_bed: room.child_no_bed ?? undefined,
        max_occupancy: room.max_occupancy ?? "",
        other_details: room.other_details ?? "",
      })),
    },
  });

  const {
    fields: roomFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "rooms",
  });
  useEffect(() => {
    fetchCountries().then((options) => {
      setCountryOptions(options);
    });
  }, []);

  const country = form.watch("hotel_country");

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
      if (name === "hotel_country") {
        setCityOptions([]);
        form.setValue("hotel_city", "");
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  async function onSubmit(values: any) {
    try {
      const { error } =
        initialData && initialData.id
          ? await updateHotels(initialData.id, values)
          : await createHotels(values);

      if (error) throw error;

      toast.success(
        initialData
          ? "Hotel updated successfully"
          : "Hotel created successfully"
      );
      onSuccess?.();
      router.refresh();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to save hotel");
    }
  }
  const isLoading = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* General Information Section */}
        <div className="space-y-6 border rounded-lg p-4">
          <h4 className="text-md font-semibold mb-6">General Information</h4>

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
              name="hotel_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter hotel code"
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
              name="hotel_currency"
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      />
                      <Mail className="top-2.5 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      />
                      <Phone className="top-2.5 right-2.5 absolute w-4 h-4 text-muted-foreground" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hotel_country"
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
            <FormField
              control={form.control}
              name="hotel_city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <VirtualizedAutocomplete
                    options={cityOptions}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="hotel_address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hotel Address</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter hotel address"
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
              name="star_rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="dark:text-muted-foreground">
                    Rating
                  </FormLabel>
                  <Autocomplete
                    options={HOTEL_STAR_RATING}
                    value={field.value}
                    onChange={field.onChange}
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
                  <FormLabel className="dark:text-muted-foreground">
                    Property Type
                  </FormLabel>
                  <Autocomplete
                    options={HOTEL_PROPERTY_TYPES}
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                <FormLabel>Examples</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter examples"
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
                          e.target.value ? parseInt(e.target.value) : undefined
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
                    <FormLabel>Preferred Hotel</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Rooms Section */}
        <div className="space-y-6 border rounded-lg p-4">
          <h4 className="text-md font-semibold flex items-center justify-between">
            Rooms
            <Button type="button" onClick={() => append({ room_category: "" })}>
              <Plus className="size-4" /> Add Room
            </Button>
          </h4>

          {roomFields.map((field, index) => (
            <div key={field.id} className="border p-4 rounded-md space-y-4">
              <div className="flex justify-between items-center">
                <h5 className="text-sm font-medium">
                  Room Category {index + 1}
                </h5>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`rooms.${index}.room_category`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter room category" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`rooms.${index}.max_occupancy`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Occupancy</FormLabel>
                      <FormControl>
                        <Input placeholder="eg. 2A + 1C OR 3A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`rooms.${index}.rate_per_room_night`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate per Night</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`rooms.${index}.single_pp`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Single (Per Pax)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`rooms.${index}.double_pp`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Double (Per Pax)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`rooms.${index}.extra_bed_pp`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extra Bed (Per Pax)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`rooms.${index}.child_no_bed`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child (No Bed)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="-"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          onWheel={(e) => e.currentTarget.blur()}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`rooms.${index}.meal_plan`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Plan</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter meal plan"
                          value={field.value ?? ""}
                          onChange={field.onChange}
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
                name={`rooms.${index}.season_dates`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Season/Dates</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter season/dates " {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`rooms.${index}.other_details`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter any additional notes"
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
          ))}
        </div>

        {/* Policies Section */}
        <div className="space-y-6 border rounded-lg p-4">
          <h4 className="text-md font-semibold mb-6">Policies</h4>
          <FormField
            control={form.control}
            name="payment_policy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Policy</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter payment policy"
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
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? initialData
                ? "Updating..."
                : "Creating..."
              : initialData
              ? "Update Hotel"
              : "Create Hotel"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
