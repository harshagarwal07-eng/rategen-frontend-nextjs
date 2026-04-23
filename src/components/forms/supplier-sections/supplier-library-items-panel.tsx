"use client";

import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  MultiSelector,
  MultiSelectorTrigger,
  MultiSelectorInput,
  MultiSelectorContent,
  MultiSelectorList,
  MultiSelectorItem,
} from "@/components/ui/multi-select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { toast } from "sonner";
import { addLibraryItem } from "@/data-access/docs";
import { VEHICLE_TYPES, VEHICLE_CATEGORIES, GENDERS, LANGUAGES } from "@/constants/data";
import { LIBRARY_STATUS_CONFIGS } from "@/lib/status-styles-config";
import useUser from "@/hooks/use-user";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import { z } from "zod";
import type { ItemTypes } from "@/types/suppliers";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";
import { cn } from "@/lib/utils";

// ── types & constants ──────────────────────────────────────────────────────
type LibraryAddType = "vehicle" | "driver" | "guide" | "restaurant";

// ── panel-local validation schemas ─────────────────────────────────────────
const requiredStr = (msg: string) => z.string().min(1, msg);

const vehicleSchema = z.object({
  _type: z.literal("vehicle"),
  brand: requiredStr("Brand is required"),
  v_type: requiredStr("Vehicle type is required"),
  category: requiredStr("Category is required"),
  v_number: requiredStr("Vehicle number is required"),
  yr_of_reg: z
    .number()
    .min(1900, "Year must be 1900 or later")
    .max(new Date().getFullYear(), "Year cannot be in the future"),
  status: requiredStr("Status is required"),
  images: z.array(z.string()),
  country: z.string().uuid().nullable().optional(),
  state: z.string().uuid().nullable().optional(),
  city: z.string().uuid().nullable().optional(),
});

const personSchema = z.object({
  name: requiredStr("Name is required"),
  gender: requiredStr("Gender is required"),
  phone: requiredStr("Phone number is required"),
  languages_known: z.array(z.string()).min(1, "At least one language is required"),
  status: requiredStr("Status is required"),
  images: z.array(z.string()),
  country: z.string().uuid().nullable().optional(),
  state: z.string().uuid().nullable().optional(),
  city: z.string().uuid().nullable().optional(),
});

const restaurantSchema = z.object({
  _type: z.literal("restaurant"),
  name: requiredStr("Restaurant name is required"),
  phone: z.string().optional(),
  status: requiredStr("Status is required"),
  country: z.string().uuid().nullable().optional(),
  state: z.string().uuid().nullable().optional(),
  city: z.string().uuid().nullable().optional(),
});

const libraryPanelSchema = z.discriminatedUnion("_type", [
  vehicleSchema,
  personSchema.extend({ _type: z.literal("driver") }),
  personSchema.extend({ _type: z.literal("guide") }),
  restaurantSchema,
]);

const TYPE_LABELS: Record<LibraryAddType, string> = {
  vehicle: "Vehicle",
  driver: "Driver",
  guide: "Guide",
  restaurant: "Restaurant",
};

function getVisibleLibraryTypes(category: ItemTypes[]): LibraryAddType[] {
  if (category.length === 0) return ["vehicle", "driver", "guide", "restaurant"];
  const visible = new Set<LibraryAddType>();
  if (category.includes("transfer")) {
    visible.add("vehicle");
    visible.add("driver");
  }
  if (category.includes("guide")) {
    visible.add("guide");
  }
  if (category.includes("meal")) {
    visible.add("restaurant");
  }
  return (["vehicle", "driver", "guide", "restaurant"] as LibraryAddType[]).filter((t) => visible.has(t));
}

interface LibraryFormValues {
  _type: LibraryAddType;
  // vehicle
  brand: string;
  v_type: string;
  category: string;
  v_number: string;
  yr_of_reg: number;
  owned_by_type: string;
  supplier_id: string;
  owned_by_notes: string;
  images: string[];
  // driver / guide
  name: string;
  gender: string;
  phone: string;
  whatsapp_number: string;
  languages_known: string[];
  status: string;
  payroll_type: string;
  // restaurant
  poc_name: string;
  // location fields
  country?: string | null;
  state?: string | null;
  city?: string | null;
  // UI-only (not sent to DB)
  _sameAsPhone: boolean;
}

interface SupplierLibraryItemsPanelProps {
  supplierId: string;
  category?: ItemTypes[];
}

export default function SupplierLibraryItemsPanel({ supplierId, category = [] }: SupplierLibraryItemsPanelProps) {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const visibleTypes = useMemo(() => getVisibleLibraryTypes(category), [category]);
  const [activeType, setActiveType] = useState<LibraryAddType | null>(visibleTypes[0] ?? null);
  const [isAdding, setIsAdding] = useState(false);

  const form = useForm<LibraryFormValues>({
    resolver: zodResolver(libraryPanelSchema) as any,
    defaultValues: {
      _type: activeType ?? "vehicle",
      brand: "",
      v_type: "",
      category: "",
      v_number: "",
      yr_of_reg: new Date().getFullYear(),
      owned_by_type: "supplier",
      supplier_id: supplierId,
      owned_by_notes: "",
      images: [],
      name: "",
      gender: "",
      phone: "",
      whatsapp_number: "",
      languages_known: [],
      status: "active",
      payroll_type: "supplier",
      poc_name: "",
      country: undefined,
      state: undefined,
      city: undefined,
      _sameAsPhone: false,
    },
  });

  // Watch country and state field changes
  const country = form.watch("country");
  const state = form.watch("state");

  // Use cached country/city options
  const {
    countries: countryOptions,
    states: stateOptions,
    cities: cityOptions,
  } = useCountryCityOptions({ countryId: country || undefined, stateId: state || undefined });

  const countryCodeById = Object.fromEntries(countryOptions.map((c) => [c.value, c.code!]));
  const showStateInput = !!country && countryCodeById[country] === "IN";

  // Clear state when country changes
  useEffect(() => {
    form.setValue("state", undefined, { shouldValidate: false });
  }, [country, form]);

  // Clear city when country or state changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "country" || name === "state") {
        form.setValue("city", undefined);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const getDefaultValues = (type: LibraryAddType): Partial<LibraryFormValues> => ({
    _type: type,
    // Vehicle defaults
    brand: "",
    v_type: "",
    category: "",
    v_number: "",
    yr_of_reg: new Date().getFullYear(),
    owned_by_type: "supplier",
    supplier_id: supplierId,
    owned_by_notes: "",
    images: [],
    // Person defaults
    name: "",
    gender: "",
    phone: "",
    whatsapp_number: "",
    languages_known: [],
    status: "active",
    payroll_type: "supplier",
    // Restaurant defaults
    poc_name: "",
    // Location defaults
    country: undefined,
    state: undefined,
    city: undefined,
    _sameAsPhone: false,
  });

  const switchType = (type: LibraryAddType) => {
    setActiveType(type);
    form.reset(getDefaultValues(type));
  };

  const onSubmit = async (data: LibraryFormValues) => {
    if (!activeType) return;
    setIsAdding(true);
    try {
      let result: any;

      if (activeType === "vehicle") {
        result = await addLibraryItem("vehicles", {
          brand: data.brand.trim(),
          v_type: data.v_type,
          category: data.category,
          v_number: data.v_number.trim(),
          yr_of_reg: data.yr_of_reg,
          status: data.status,
          owned_by_type: "supplier",
          supplier_id: supplierId,
          images: data.images,
          country: data.country || null,
          state: data.state || null,
          city: data.city || null,
        } as any);
      } else if (activeType === "driver" || activeType === "guide") {
        result = await addLibraryItem(activeType === "driver" ? "drivers" : "guides", {
          name: data.name.trim(),
          gender: data.gender,
          phone: data.phone.trim(),
          whatsapp_number: (sameAsPhone ? data.phone.trim() : data.whatsapp_number?.trim()) || null,
          languages_known: data.languages_known,
          status: data.status,
          payroll_type: "supplier",
          supplier_id: supplierId,
          images: data.images,
          country: data.country || null,
          state: data.state || null,
          city: data.city || null,
        } as any);
      } else if (activeType === "restaurant") {
        result = await addLibraryItem("restaurants", {
          name: data.name.trim(),
          poc_name: data.poc_name.trim() || null,
          phone: data.phone.trim(),
          status: data.status,
          supplier_id: supplierId,
          country: data.country || null,
          state: data.state || null,
          city: data.city || null,
        } as any);
      }

      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${TYPE_LABELS[activeType]} added successfully`);
      queryClient.invalidateQueries({ queryKey: ["supplier-library-items", supplierId] });
      form.reset(getDefaultValues(activeType));
    } finally {
      setIsAdding(false);
    }
  };
  const is = (types: LibraryAddType | LibraryAddType[]) => {
    const arr = Array.isArray(types) ? types : [types];
    return activeType !== null && arr.includes(activeType);
  };

  const sameAsPhone = form.watch("_sameAsPhone");
  const phone = form.watch("phone");

  // Auto-update WhatsApp when "Same as Phone" is checked
  useEffect(() => {
    if (sameAsPhone && phone) {
      form.setValue("whatsapp_number", phone);
    }
  }, [sameAsPhone, phone, form]);

  return (
    <div className="space-y-3">
      {/* Type selector tabs */}
      <div className="flex gap-2 flex-wrap">
        {visibleTypes.map((type) => (
          <Button
            key={type}
            type="button"
            variant={activeType === type ? "default" : "outline"}
            size="sm"
            onClick={() => switchType(type)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {TYPE_LABELS[type]}
          </Button>
        ))}
      </div>

      {/* Form panel */}
      {activeType && (
        <div className="border-2 border-primary/20 rounded-lg p-4 bg-accent/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Single grid with 4 columns for all fields */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* ── Vehicle fields ── */}
                {is("vehicle") && (
                  <>
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Toyota" {...field} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="v_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {VEHICLE_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {VEHICLE_CATEGORIES.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="v_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. ABC-1234" {...field} className="h-9" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="yr_of_reg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year of Registration *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1900"
                              placeholder={new Date().getFullYear().toString()}
                              className="h-9"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* ── Name (driver / guide / restaurant) ── */}
                {is(["driver", "guide", "restaurant"]) && (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {activeType === "restaurant" ? "Restaurant Name" : `${TYPE_LABELS[activeType!]} Name`} *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={activeType === "restaurant" ? "e.g. Spice Garden" : `${activeType} name`}
                            {...field}
                            className="h-9"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* ── Gender (driver / guide) ── */}
                {is(["driver", "guide"]) && (
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender *</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              {GENDERS.map((g) => (
                                <SelectItem key={g.value} value={g.value}>
                                  {g.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* ── Phone (driver / guide / restaurant) ── */}
                {is(["driver", "guide", "restaurant"]) && (
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone *</FormLabel>
                        <FormControl>
                          <PhoneInput
                            {...field}
                            value={field.value}
                            placeholder="Phone number"
                            defaultCountry="IN"
                            international
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* ── WhatsApp (driver / guide) ── */}
                {is(["driver", "guide"]) && (
                  <FormField
                    control={form.control}
                    name="whatsapp_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex justify-between items-center">
                          WhatsApp
                          <div className="flex items-center gap-2 mr-4">
                            <Checkbox
                              id="lib-same-phone"
                              checked={sameAsPhone}
                              onCheckedChange={(checked) => {
                                form.setValue("_sameAsPhone", !!checked);
                                if (checked) field.onChange(phone);
                              }}
                            />
                            <label htmlFor="lib-same-phone" className="text-xs text-muted-foreground cursor-pointer">
                              Same as phone
                            </label>
                          </div>
                        </FormLabel>
                        <FormControl>
                          <PhoneInput
                            {...field}
                            value={sameAsPhone ? phone : field.value}
                            placeholder="WhatsApp number"
                            defaultCountry="IN"
                            disabled={sameAsPhone}
                            international
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {/* ── Languages (driver / guide) ── */}
                {is(["driver", "guide"]) && (
                  <FormField
                    control={form.control}
                    name="languages_known"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Languages *</FormLabel>
                        <FormControl>
                          <MultiSelector values={field.value} onValuesChange={field.onChange} loop={false}>
                            <MultiSelectorTrigger data={LANGUAGES}>
                              <MultiSelectorInput placeholder="Select languages" />
                            </MultiSelectorTrigger>
                            <MultiSelectorContent>
                              <MultiSelectorList>
                                {LANGUAGES.map((l) => (
                                  <MultiSelectorItem key={l.value} value={l.value}>
                                    {l.label}
                                  </MultiSelectorItem>
                                ))}
                              </MultiSelectorList>
                            </MultiSelectorContent>
                          </MultiSelector>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* ── Contact Person (restaurant) ── */}
                {is("restaurant") && (
                  <FormField
                    control={form.control}
                    name="poc_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl>
                          <Input placeholder="POC name" {...field} className="h-9" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {/* Status — shown for all types */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LIBRARY_STATUS_CONFIGS.map((s) => (
                              <SelectItem key={s.value} value={s.value}>
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* ── Country ── */}
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Autocomplete
                        options={countryOptions}
                        value={field.value || undefined}
                        onChange={field.onChange}
                        placeholder="Select country"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ── State (conditional for India) ── */}
                {showStateInput && (
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Autocomplete
                          options={stateOptions}
                          value={field.value || undefined}
                          onChange={field.onChange}
                          placeholder="Select state"
                          disabled={!country}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* ── City ── */}
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <Autocomplete
                        mode="server"
                        value={field.value || undefined}
                        onChange={field.onChange}
                        onSearch={(search) =>
                          state ? fetchCitiesByStateId(state, search) : fetchCitiesByCountryId(country!, search)
                        }
                        fetchByValue={(id) => fetchCityById(id)}
                        placeholder="Select city"
                        disabled={showStateInput ? !state : !country}
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

              {/* Images — at the bottom, only for vehicle / driver / guide */}
              {is(["vehicle", "driver", "guide"]) && (
                <FormField
                  control={form.control}
                  name="images"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Images</FormLabel>
                      <FormControl>
                        <S3ImageUpload
                          images={field.value}
                          onChange={field.onChange}
                          userId={user?.id || ""}
                          disabled={!user?.id}
                          prefix={`${activeType}_images/`}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (activeType) {
                      form.reset(getDefaultValues(activeType));
                    }
                    setActiveType(null);
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button type="submit" disabled={isAdding} loading={isAdding}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  );
}
