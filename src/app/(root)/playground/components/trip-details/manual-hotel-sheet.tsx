"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Building2,
  Phone,
  Mail,
  MapPin,
  UtensilsCrossed,
  Tag,
  FileText,
  AlertCircle,
  CreditCard,
  Users,
  Baby,
  Calendar,
  Plus,
  Trash2,
  ImageIcon,
} from "lucide-react";
import { createLibraryItem } from "@/data-access/itinerary-library";
import { toast } from "sonner";
import useUser from "@/hooks/use-user";
import { MEAL_TYPES, DEFAULT_MEAL_PLAN, MEAL_TYPES_ENUM } from "@/constants/meal-types";
import { CURRENCY_OPTIONS, HOTEL_PROPERTY_TYPES, HOTEL_STAR_RATING } from "@/constants/data";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";
import { cn } from "@/lib/utils";

interface ManualHotelSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (hotelData: ManualHotelData) => Promise<void>;
  isSaving: boolean;
}

export interface RoomData {
  room_category: string;
  meal_plan?: string;
  max_occupancy?: string;
  other_details?: string;
  extra_bed_policy?: string;
  stop_sale?: string;
  // Seasons for this room
  seasons?: Array<{
    dates: string;
    rate_per_night?: number;
    single_pp?: number;
    double_pp?: number;
    extra_bed_pp?: number;
    child_no_bed?: number;
  }>;
}

export interface ManualHotelData {
  library_item_id?: string;
  // Hotel info
  hotel_name: string;
  hotel_city?: string;
  hotel_state?: string;
  hotel_country?: string;
  hotel_address?: string;
  hotel_phone?: string;
  hotel_email?: string;
  hotel_star_rating?: string;
  hotel_property_type?: string;
  // Currency for all rates
  currency?: string;
  // Images
  images?: string[];
  // Rooms (multiple)
  rooms: RoomData[];
  // Offers & Remarks
  offers?: string;
  remarks?: string;
  // Policies
  cancellation_policy?: string;
  payment_policy?: string;
  group_policy?: string;
  // Age Policy
  age_policy?: {
    infant?: { min_age: number; max_age: number };
    child?: { min_age: number; max_age: number };
    teenager?: { min_age: number; max_age: number };
    adult?: { min_age: number };
  };
  // Meal Plan Rates
  meal_plan_rates?: Array<{
    meal_type: string;
    rates: { adult?: number; child?: number; infant?: number };
  }>;
}

interface RoomFormData {
  room_category: string;
  meal_plan: string;
  max_occupancy: string;
  other_details: string;
  extra_bed_policy: string;
  stop_sale: string;
  seasons: Array<{
    dates: string;
    rate_per_night: string;
    single_pp: string;
    double_pp: string;
    extra_bed_pp: string;
    child_no_bed: string;
  }>;
}

interface FormData {
  // Hotel info
  hotel_name: string;
  hotel_city: string;
  hotel_state: string;
  hotel_country: string;
  hotel_address: string;
  hotel_phone: string;
  hotel_email: string;
  hotel_star_rating: string;
  hotel_property_type: string;
  // Currency
  currency: string;
  // Images
  images: string[];
  // Rooms (multiple)
  rooms: RoomFormData[];
  // Offers & Remarks
  offers: string;
  remarks: string;
  // Policies
  cancellation_policy: string;
  payment_policy: string;
  group_policy: string;
  // Age Policy
  infant_min_age: string;
  infant_max_age: string;
  child_min_age: string;
  child_max_age: string;
  teen_min_age: string;
  teen_max_age: string;
  adult_min_age: string;
  // Meal Plan Rates
  meal_plan_rates: Array<{
    meal_type: string;
    adult_rate: string;
    child_rate: string;
    infant_rate: string;
  }>;
}

const createEmptyRoom = (): RoomFormData => ({
  room_category: "",
  meal_plan: DEFAULT_MEAL_PLAN,
  max_occupancy: "",
  other_details: "",
  extra_bed_policy: "",
  stop_sale: "",
  seasons: [],
});

const initialFormData: FormData = {
  hotel_name: "",
  hotel_city: "",
  hotel_state: "",
  hotel_country: "",
  hotel_address: "",
  hotel_phone: "",
  hotel_email: "",
  hotel_star_rating: "",
  hotel_property_type: "Hotel",
  currency: "",
  images: [],
  rooms: [createEmptyRoom()],
  offers: "",
  remarks: "",
  cancellation_policy: "",
  payment_policy: "",
  group_policy: "",
  infant_min_age: "0",
  infant_max_age: "2",
  child_min_age: "2",
  child_max_age: "12",
  teen_min_age: "12",
  teen_max_age: "18",
  adult_min_age: "18",
  meal_plan_rates: [],
};

export default function ManualHotelSheet({ open, onOpenChange, onSave, isSaving }: ManualHotelSheetProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use cached country/city options
  const {
    countries: countryOptions,
    states: stateOptions,
    cities: cityOptions,
    isLoadingCountries,
    isLoadingStates,
    isLoadingCities,
  } = useCountryCityOptions({ countryId: formData.hotel_country, stateId: formData.hotel_state });

  const countryCodeById = Object.fromEntries(countryOptions.map((c) => [c.value, c.code!]));
  const showStateInput = !!formData.hotel_country && countryCodeById[formData.hotel_country] === "IN";

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Reset dependent fields when country changes
      if (field === "hotel_country") {
        newData.hotel_state = "";
        newData.hotel_city = "";
      }
      // Reset city when state changes
      if (field === "hotel_state") {
        newData.hotel_city = "";
      }
      return newData;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setErrors({});
    setActiveTab("overview");
    setActiveRoomIndex(0);
  };

  // Room handlers
  const addRoom = () => {
    setFormData((prev) => ({
      ...prev,
      rooms: [...prev.rooms, createEmptyRoom()],
    }));
    setActiveRoomIndex(formData.rooms.length);
  };

  const removeRoom = (index: number) => {
    if (formData.rooms.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index),
    }));
    if (activeRoomIndex >= index && activeRoomIndex > 0) {
      setActiveRoomIndex(activeRoomIndex - 1);
    }
  };

  const updateRoom = (index: number, field: keyof RoomFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room, i) => (i === index ? { ...room, [field]: value } : room)),
    }));
  };

  // Season handlers for a specific room
  const addSeasonToRoom = (roomIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room, i) =>
        i === roomIndex
          ? {
              ...room,
              seasons: [
                ...room.seasons,
                {
                  dates: "",
                  rate_per_night: "",
                  single_pp: "",
                  double_pp: "",
                  extra_bed_pp: "",
                  child_no_bed: "",
                },
              ],
            }
          : room
      ),
    }));
  };

  const updateSeasonInRoom = (roomIndex: number, seasonIndex: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room, i) =>
        i === roomIndex
          ? {
              ...room,
              seasons: room.seasons.map((season, si) => (si === seasonIndex ? { ...season, [field]: value } : season)),
            }
          : room
      ),
    }));
  };

  const removeSeasonFromRoom = (roomIndex: number, seasonIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room, i) =>
        i === roomIndex ? { ...room, seasons: room.seasons.filter((_, si) => si !== seasonIndex) } : room
      ),
    }));
  };

  // Meal Plan Rates handlers
  const addMealPlanRate = () => {
    const existingTypes = formData.meal_plan_rates.map((r) => r.meal_type);
    const availableType = MEAL_TYPES_ENUM.find((t) => !existingTypes.includes(t)) || "Other";
    setFormData((prev) => ({
      ...prev,
      meal_plan_rates: [
        ...prev.meal_plan_rates,
        { meal_type: availableType, adult_rate: "", child_rate: "", infant_rate: "" },
      ],
    }));
  };

  const updateMealPlanRate = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      meal_plan_rates: prev.meal_plan_rates.map((rate, i) => (i === index ? { ...rate, [field]: value } : rate)),
    }));
  };

  const removeMealPlanRate = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      meal_plan_rates: prev.meal_plan_rates.filter((_, i) => i !== index),
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.hotel_name.trim()) {
      newErrors.hotel_name = "Hotel name is required";
    }

    // Validate at least one room with a category
    const hasValidRoom = formData.rooms.some((room) => room.room_category.trim());
    if (!hasValidRoom) {
      newErrors.rooms = "At least one room category is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setActiveTab("overview");
      return;
    }

    try {
      // Build age policy
      const age_policy = {
        infant: {
          min_age: parseInt(formData.infant_min_age) || 0,
          max_age: parseInt(formData.infant_max_age) || 2,
        },
        child: {
          min_age: parseInt(formData.child_min_age) || 2,
          max_age: parseInt(formData.child_max_age) || 12,
        },
        teenager: {
          min_age: parseInt(formData.teen_min_age) || 12,
          max_age: parseInt(formData.teen_max_age) || 18,
        },
        adult: {
          min_age: parseInt(formData.adult_min_age) || 18,
        },
      };

      // Build meal plan rates
      const meal_plan_rates = formData.meal_plan_rates
        .filter((r) => r.meal_type)
        .map((r) => ({
          meal_type: r.meal_type,
          rates: {
            adult: r.adult_rate ? parseFloat(r.adult_rate) : undefined,
            child: r.child_rate ? parseFloat(r.child_rate) : undefined,
            infant: r.infant_rate ? parseFloat(r.infant_rate) : undefined,
          },
        }));

      // Build rooms with their seasons
      const rooms: RoomData[] = formData.rooms
        .filter((room) => room.room_category.trim())
        .map((room) => ({
          room_category: room.room_category.trim(),
          meal_plan: room.meal_plan || undefined,
          max_occupancy: room.max_occupancy.trim() || undefined,
          other_details: room.other_details.trim() || undefined,
          extra_bed_policy: room.extra_bed_policy.trim() || undefined,
          stop_sale: room.stop_sale.trim() || undefined,
          seasons: room.seasons
            .filter((s) => s.dates)
            .map((s) => ({
              dates: s.dates,
              rate_per_night: s.rate_per_night ? parseFloat(s.rate_per_night) : undefined,
              single_pp: s.single_pp ? parseFloat(s.single_pp) : undefined,
              double_pp: s.double_pp ? parseFloat(s.double_pp) : undefined,
              extra_bed_pp: s.extra_bed_pp ? parseFloat(s.extra_bed_pp) : undefined,
              child_no_bed: s.child_no_bed ? parseFloat(s.child_no_bed) : undefined,
            })),
        }));

      // Resolve city/state/country names from UUIDs
      let cityName: string | undefined;
      let stateName: string | undefined;
      let countryName: string | undefined;

      if (formData.hotel_city) {
        const cityData = await fetchCityById(formData.hotel_city);
        cityName = cityData?.label;
      }
      if (formData.hotel_state) {
        const stateOption = stateOptions.find((s) => s.value === formData.hotel_state);
        stateName = stateOption?.label;
      }
      if (formData.hotel_country) {
        const countryOption = countryOptions.find((c) => c.value === formData.hotel_country);
        countryName = countryOption?.label;
      }

      // Create library item first to save for future reuse
      const { data: libraryItem, error } = await createLibraryItem({
        service_type: "hotel",
        name: formData.hotel_name.trim(),
        city: cityName || undefined,
        state: stateName || undefined,
        country: countryName || undefined,
        address: formData.hotel_address.trim() || undefined,
        phone: formData.hotel_phone.trim() || undefined,
        email: formData.hotel_email.trim() || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        data: {
          star_rating: formData.hotel_star_rating,
          property_type: formData.hotel_property_type,
          offers: formData.offers.trim(),
          cancellation_policy: formData.cancellation_policy.trim(),
          payment_policy: formData.payment_policy.trim(),
          group_policy: formData.group_policy.trim(),
          age_policy,
          meal_plan_rates,
          rooms,
        },
        currency: formData.currency || undefined,
      });

      if (error) {
        console.error("[ManualHotelSheet] Failed to save to library:", error);
        toast.error("Failed to save hotel to library");
        return;
      }

      // Build hotel data
      const hotelData: ManualHotelData = {
        library_item_id: libraryItem?.id,
        hotel_name: formData.hotel_name.trim(),
        hotel_city: cityName || undefined,
        hotel_state: stateName || undefined,
        hotel_country: countryName || undefined,
        hotel_address: formData.hotel_address.trim() || undefined,
        hotel_phone: formData.hotel_phone.trim() || undefined,
        hotel_email: formData.hotel_email.trim() || undefined,
        hotel_star_rating: formData.hotel_star_rating || undefined,
        hotel_property_type: formData.hotel_property_type || undefined,
        currency: formData.currency || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        rooms,
        offers: formData.offers.trim() || undefined,
        remarks: formData.remarks.trim() || undefined,
        cancellation_policy: formData.cancellation_policy.trim() || undefined,
        payment_policy: formData.payment_policy.trim() || undefined,
        group_policy: formData.group_policy.trim() || undefined,
        age_policy,
        meal_plan_rates,
      };

      await onSave(hotelData);
      toast.success("Hotel saved to your library");

      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error("[ManualHotelSheet] Error:", error);
      toast.error("Failed to save hotel");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] p-0 flex flex-col" side="right">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <SheetTitle className="text-left">Add Manual Hotel</SheetTitle>
            <Badge variant="outline" className="text-xs">
              Manual Entry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter hotel details manually. This will be saved to your library for future use.
          </p>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 shrink-0 w-full max-w-2xl">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="policies" className="text-xs">
              Policies
            </TabsTrigger>
            <TabsTrigger value="pricing" className="text-xs">
              Rooms & Rates
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 p-4 space-y-6">
              {/* Hotel Info */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Hotel Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotel_name" className="text-xs">
                      Hotel Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="hotel_name"
                      placeholder="e.g., Grand Hyatt Mumbai"
                      value={formData.hotel_name}
                      onChange={(e) => handleChange("hotel_name", e.target.value)}
                      className={errors.hotel_name ? "border-destructive" : ""}
                    />
                    {errors.hotel_name && <p className="text-xs text-destructive">{errors.hotel_name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Star Rating</Label>
                      <Select
                        value={formData.hotel_star_rating}
                        onValueChange={(v) => handleChange("hotel_star_rating", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOTEL_STAR_RATING.map((r) => (
                            <SelectItem key={r.value} value={r.value}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Property Type</Label>
                      <Select
                        value={formData.hotel_property_type}
                        onValueChange={(v) => handleChange("hotel_property_type", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOTEL_PROPERTY_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "grid grid-cols-3 gap-4",
                    showStateInput && "grid-cols-4"
                  )}
                >
                  <div className="space-y-2">
                    <Label className="text-xs">Country</Label>
                    {isLoadingCountries ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Autocomplete
                        options={countryOptions}
                        value={formData.hotel_country}
                        onChange={(v) => handleChange("hotel_country", v)}
                        placeholder="Select country"
                      />
                    )}
                  </div>

                  {showStateInput && (
                    <div className="space-y-2">
                      <Label className="text-xs">State</Label>
                      {isLoadingStates ? (
                        <Skeleton className="h-10 w-full" />
                      ) : (
                        <Autocomplete
                          options={stateOptions}
                          value={formData.hotel_state}
                          onChange={(v) => handleChange("hotel_state", v)}
                          placeholder="Select state"
                          disabled={!formData.hotel_country}
                        />
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> City
                    </Label>
                    <Autocomplete
                      mode="server"
                      value={formData.hotel_city}
                      onChange={(v) => handleChange("hotel_city", v)}
                      onSearch={(search) =>
                        formData.hotel_state
                          ? fetchCitiesByStateId(formData.hotel_state)
                          : fetchCitiesByCountryId(formData.hotel_country!, search)
                      }
                      fetchByValue={(id) => fetchCityById(id)}
                      placeholder="Select city"
                      disabled={showStateInput ? !formData.hotel_state : !formData.hotel_country}
                      emptyMessage={
                        showStateInput && !formData.hotel_state
                          ? "Select a state first"
                          : !formData.hotel_country
                            ? "Select a country first"
                            : "No cities available"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Currency</Label>
                    <Select value={formData.currency} onValueChange={(v) => handleChange("currency", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Address</Label>
                  <Textarea
                    placeholder="Full hotel address..."
                    value={formData.hotel_address}
                    onChange={(e) => handleChange("hotel_address", e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone
                    </Label>
                    <Input
                      placeholder="+91 22 1234 5678"
                      value={formData.hotel_phone}
                      onChange={(e) => handleChange("hotel_phone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="reservations@hotel.com"
                      value={formData.hotel_email}
                      onChange={(e) => handleChange("hotel_email", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Hotel Images */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Hotel Images
                </h3>
                {user?.id ? (
                  <S3ImageUpload
                    images={formData.images}
                    onChange={(images) => handleChange("images", images)}
                    userId={user.id}
                    prefix="library-hotels/"
                    maxImages={10}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Please log in to upload images</p>
                )}
              </section>

              <Separator />

              {/* Offers & Remarks */}
              <section className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Offers
                  </Label>
                  <Textarea
                    placeholder="Special offers, discounts, complimentary services..."
                    value={formData.offers}
                    onChange={(e) => handleChange("offers", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Remarks
                  </Label>
                  <Textarea
                    placeholder="Additional notes or remarks..."
                    value={formData.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </section>
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies" className="mt-0 p-4 space-y-6">
              {/* Cancellation Policy */}
              <section className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Cancellation Policy
                </Label>
                <Textarea
                  placeholder="e.g., Free cancellation up to 7 days before check-in..."
                  value={formData.cancellation_policy}
                  onChange={(e) => handleChange("cancellation_policy", e.target.value)}
                  className="min-h-[80px]"
                />
              </section>

              <Separator />

              {/* Payment Policy */}
              <section className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Payment Policy
                </Label>
                <Textarea
                  placeholder="e.g., 50% advance at booking, balance at check-in..."
                  value={formData.payment_policy}
                  onChange={(e) => handleChange("payment_policy", e.target.value)}
                  className="min-h-[80px]"
                />
              </section>

              <Separator />

              {/* Group Policy */}
              <section className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Users className="h-3 w-3" /> Group Policy
                </Label>
                <Textarea
                  placeholder="e.g., Special rates for groups of 10+ rooms..."
                  value={formData.group_policy}
                  onChange={(e) => handleChange("group_policy", e.target.value)}
                  className="min-h-[80px]"
                />
              </section>

              <Separator />

              {/* Age Policy */}
              <section className="space-y-3">
                <Label className="text-xs flex items-center gap-1">
                  <Baby className="h-3 w-3" /> Age Policy
                </Label>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2 p-3 border rounded-lg">
                    <p className="text-xs font-medium">Infant</p>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={formData.infant_min_age}
                        onChange={(e) => handleChange("infant_min_age", e.target.value)}
                        className="w-14 h-8 text-xs text-center"
                      />
                      <span className="text-xs">-</span>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={formData.infant_max_age}
                        onChange={(e) => handleChange("infant_max_age", e.target.value)}
                        className="w-14 h-8 text-xs text-center"
                      />
                      <span className="text-xs">yrs</span>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 border rounded-lg">
                    <p className="text-xs font-medium">Child</p>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={18}
                        value={formData.child_min_age}
                        onChange={(e) => handleChange("child_min_age", e.target.value)}
                        className="w-14 h-8 text-xs text-center"
                      />
                      <span className="text-xs">-</span>
                      <Input
                        type="number"
                        min={0}
                        max={18}
                        value={formData.child_max_age}
                        onChange={(e) => handleChange("child_max_age", e.target.value)}
                        className="w-14 h-8 text-xs text-center"
                      />
                      <span className="text-xs">yrs</span>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 border rounded-lg">
                    <p className="text-xs font-medium">Teenager</p>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={0}
                        max={21}
                        value={formData.teen_min_age}
                        onChange={(e) => handleChange("teen_min_age", e.target.value)}
                        className="w-14 h-8 text-xs text-center"
                      />
                      <span className="text-xs">-</span>
                      <Input
                        type="number"
                        min={0}
                        max={21}
                        value={formData.teen_max_age}
                        onChange={(e) => handleChange("teen_max_age", e.target.value)}
                        className="w-14 h-8 text-xs text-center"
                      />
                      <span className="text-xs">yrs</span>
                    </div>
                  </div>

                  <div className="space-y-2 p-3 border rounded-lg">
                    <p className="text-xs font-medium">Adult</p>
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        min={12}
                        max={25}
                        value={formData.adult_min_age}
                        onChange={(e) => handleChange("adult_min_age", e.target.value)}
                        className="w-14 h-8 text-xs text-center"
                      />
                      <span className="text-xs">+ yrs</span>
                    </div>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Meal Plan Rates */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1">
                    <UtensilsCrossed className="h-3 w-3" /> Meal Plan Rates
                  </Label>
                  <Button type="button" variant="outline" size="sm" onClick={addMealPlanRate}>
                    <Plus className="h-3 w-3 mr-1" /> Add Rate
                  </Button>
                </div>

                {formData.meal_plan_rates.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="py-2 px-3 text-left font-medium">Meal Type</th>
                          <th className="py-2 px-3 text-center font-medium">Adult</th>
                          <th className="py-2 px-3 text-center font-medium">Child</th>
                          <th className="py-2 px-3 text-center font-medium">Infant</th>
                          <th className="py-2 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.meal_plan_rates.map((rate, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="py-2 px-3">
                              <Select
                                value={rate.meal_type}
                                onValueChange={(v) => updateMealPlanRate(idx, "meal_type", v)}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEAL_TYPES_ENUM.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={rate.adult_rate}
                                onChange={(e) => updateMealPlanRate(idx, "adult_rate", e.target.value)}
                                className="h-8 text-center"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={rate.child_rate}
                                onChange={(e) => updateMealPlanRate(idx, "child_rate", e.target.value)}
                                className="h-8 text-center"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={rate.infant_rate}
                                onChange={(e) => updateMealPlanRate(idx, "infant_rate", e.target.value)}
                                className="h-8 text-center"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeMealPlanRate(idx)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No meal plan rates added</p>
                )}
              </section>
            </TabsContent>

            {/* Rooms Tab */}
            <TabsContent value="pricing" className="mt-0 p-4 space-y-6">
              {/* Room Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {formData.rooms.map((room, idx) => (
                  <Button
                    key={idx}
                    type="button"
                    variant={activeRoomIndex === idx ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveRoomIndex(idx)}
                    className="text-xs"
                  >
                    {room.room_category || `Room ${idx + 1}`}
                  </Button>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={addRoom}>
                  <Plus className="h-3 w-3 mr-1" /> Add Room
                </Button>
              </div>

              {errors.rooms && <p className="text-xs text-destructive">{errors.rooms}</p>}

              {/* Active Room Details */}
              {formData.rooms[activeRoomIndex] && (
                <div className="space-y-6 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Room Details</h3>
                    {formData.rooms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoom(activeRoomIndex)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Remove Room
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Room Category <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        placeholder="e.g., Deluxe Room, Suite"
                        value={formData.rooms[activeRoomIndex].room_category}
                        onChange={(e) => updateRoom(activeRoomIndex, "room_category", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <UtensilsCrossed className="h-3 w-3" /> Meal Plan
                      </Label>
                      <Select
                        value={formData.rooms[activeRoomIndex].meal_plan}
                        onValueChange={(v) => updateRoom(activeRoomIndex, "meal_plan", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MEAL_TYPES.map((meal) => (
                            <SelectItem key={meal.short} value={meal.short}>
                              {meal.short} - {meal.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1">
                        <Users className="h-3 w-3" /> Max Occupancy
                      </Label>
                      <Input
                        placeholder="e.g., 2A+1C"
                        value={formData.rooms[activeRoomIndex].max_occupancy}
                        onChange={(e) => updateRoom(activeRoomIndex, "max_occupancy", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Other Details</Label>
                    <Textarea
                      placeholder="Additional room details, amenities, etc..."
                      value={formData.rooms[activeRoomIndex].other_details}
                      onChange={(e) => updateRoom(activeRoomIndex, "other_details", e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Extra Bed Policy</Label>
                      <Textarea
                        placeholder="Enter extra bed policy details..."
                        value={formData.rooms[activeRoomIndex].extra_bed_policy}
                        onChange={(e) => updateRoom(activeRoomIndex, "extra_bed_policy", e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Stop Sale</Label>
                      <Textarea
                        placeholder="e.g., 01 Dec 24 - 15 Dec 24"
                        value={formData.rooms[activeRoomIndex].stop_sale}
                        onChange={(e) => updateRoom(activeRoomIndex, "stop_sale", e.target.value)}
                        className="min-h-[60px]"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Seasons for this room */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1">
                        <Calendar className="h-4 w-4" /> Seasons & Rates
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addSeasonToRoom(activeRoomIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Season
                      </Button>
                    </div>

                    {formData.rooms[activeRoomIndex].seasons.length > 0 ? (
                      <div className="space-y-4">
                        {formData.rooms[activeRoomIndex].seasons.map((season, sIdx) => (
                          <div key={sIdx} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <Label className="text-xs">Season Dates</Label>
                                <DateRangePicker
                                  value={season.dates}
                                  onChange={(v) => updateSeasonInRoom(activeRoomIndex, sIdx, "dates", v)}
                                  placeholder="Select season dates"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 mt-6"
                                onClick={() => removeSeasonFromRoom(activeRoomIndex, sIdx)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-5 gap-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Rate/Night</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="-"
                                  value={season.rate_per_night}
                                  onChange={(e) =>
                                    updateSeasonInRoom(activeRoomIndex, sIdx, "rate_per_night", e.target.value)
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Single PP</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="-"
                                  value={season.single_pp}
                                  onChange={(e) =>
                                    updateSeasonInRoom(activeRoomIndex, sIdx, "single_pp", e.target.value)
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Double PP</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="-"
                                  value={season.double_pp}
                                  onChange={(e) =>
                                    updateSeasonInRoom(activeRoomIndex, sIdx, "double_pp", e.target.value)
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Extra Bed PP</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="-"
                                  value={season.extra_bed_pp}
                                  onChange={(e) =>
                                    updateSeasonInRoom(activeRoomIndex, sIdx, "extra_bed_pp", e.target.value)
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Child No Bed</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="-"
                                  value={season.child_no_bed}
                                  onChange={(e) =>
                                    updateSeasonInRoom(activeRoomIndex, sIdx, "child_no_bed", e.target.value)
                                  }
                                  className="h-8"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 border rounded-lg border-dashed">
                        <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No seasons added</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Add seasons to define different rates for different periods
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-end gap-3 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Save to Library
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
