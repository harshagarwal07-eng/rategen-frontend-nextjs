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
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import { S3ImageUpload } from "@/components/ui/s3-image-upload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  MapPin,
  Clock,
  Plus,
  Trash2,
  ImageIcon,
  FileText,
  AlertCircle,
  Baby,
  Calendar,
  Tag,
  LucideFerrisWheel,
  Car,
} from "lucide-react";
import { createLibraryItem } from "@/data-access/itinerary-library";
import { toast } from "sonner";
import useUser from "@/hooks/use-user";
import { CURRENCY_OPTIONS } from "@/constants/data";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCitiesByStateId, fetchCityById } from "@/data-access/datastore";
import { cn } from "@/lib/utils";
import {
  type ManualTourFormData,
  type ManualTourData,
  TOUR_CATEGORIES,
  TOUR_TYPES,
  DAYS_OF_WEEK,
} from "./tour-sheet/types";

interface ManualTourSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tourData: ManualTourData) => Promise<void>;
  isSaving: boolean;
}

const createEmptySeason = () => ({
  dates: "",
  ticket_only_adult: "",
  ticket_only_child: "",
  ticket_only_infant: "",
  ticket_only_teen: "",
  sic_adult: "",
  sic_child: "",
  pvt_rates: [] as Array<{ vehicle_type: string; rate: string }>,
});

const createEmptyAddOn = () => ({
  name: "",
  adult_rate: "",
  child_rate: "",
  is_mandatory: false,
});

const initialFormData: ManualTourFormData = {
  tour_name: "",
  tour_city: "",
  tour_country: "",
  package_description: "",
  categories: [],
  currency: "",
  images: [],
  operational_hours: [],
  start_date: "",
  start_time: "",
  end_date: "",
  end_time: "",
  duration_days: "",
  duration_hours: "",
  duration_minutes: "",
  tour_type: "ticket_only",
  includes_transfer: false,
  meeting_point: "",
  pickup_point: "",
  dropoff_point: "",
  add_ons: [],
  notes: "",
  inclusions: "",
  exclusions: "",
  cancellation_policy: "",
  agency_cancellation_policy: "",
  infant_min_age: "0",
  infant_max_age: "2",
  child_min_age: "2",
  child_max_age: "12",
  teen_min_age: "12",
  teen_max_age: "18",
  adult_min_age: "18",
  seasons: [],
};

export default function ManualTourSheet({ open, onOpenChange, onSave, isSaving }: ManualTourSheetProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [formData, setFormData] = useState<ManualTourFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Use cached country/city options
  const {
    countries: countryOptions,
    cities: cityOptions,
    isLoadingCountries,
    isLoadingCities,
  } = useCountryCityOptions({ countryId: formData.tour_country });

  const handleChange = (field: keyof ManualTourFormData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Reset city when country changes
      if (field === "tour_country") {
        newData.tour_city = "";
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
  };

  // Add-on handlers
  const addAddOn = () => {
    setFormData((prev) => ({
      ...prev,
      add_ons: [...prev.add_ons, createEmptyAddOn()],
    }));
  };

  const updateAddOn = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.map((addon, i) => (i === index ? { ...addon, [field]: value } : addon)),
    }));
  };

  const removeAddOn = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      add_ons: prev.add_ons.filter((_, i) => i !== index),
    }));
  };

  // Season handlers
  const addSeason = () => {
    setFormData((prev) => ({
      ...prev,
      seasons: [...prev.seasons, createEmptySeason()],
    }));
  };

  const updateSeason = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      seasons: prev.seasons.map((season, i) => (i === index ? { ...season, [field]: value } : season)),
    }));
  };

  const removeSeason = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      seasons: prev.seasons.filter((_, i) => i !== index),
    }));
  };

  // PVT rate handlers within seasons
  const addPvtRate = (seasonIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      seasons: prev.seasons.map((season, i) =>
        i === seasonIndex
          ? { ...season, pvt_rates: [...season.pvt_rates, { vehicle_type: "", rate: "" }] }
          : season
      ),
    }));
  };

  const updatePvtRate = (seasonIndex: number, rateIndex: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      seasons: prev.seasons.map((season, i) =>
        i === seasonIndex
          ? {
              ...season,
              pvt_rates: season.pvt_rates.map((rate, ri) =>
                ri === rateIndex ? { ...rate, [field]: value } : rate
              ),
            }
          : season
      ),
    }));
  };

  const removePvtRate = (seasonIndex: number, rateIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      seasons: prev.seasons.map((season, i) =>
        i === seasonIndex
          ? { ...season, pvt_rates: season.pvt_rates.filter((_, ri) => ri !== rateIndex) }
          : season
      ),
    }));
  };

  // Operational hours handlers
  const addOperationalHour = () => {
    setFormData((prev) => ({
      ...prev,
      operational_hours: [...prev.operational_hours, { day: "Monday", time_start: "09:00", time_end: "17:00" }],
    }));
  };

  const updateOperationalHour = (index: number, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      operational_hours: prev.operational_hours.map((oh, i) => (i === index ? { ...oh, [field]: value } : oh)),
    }));
  };

  const removeOperationalHour = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      operational_hours: prev.operational_hours.filter((_, i) => i !== index),
    }));
  };

  const toggleCategory = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.tour_name.trim()) {
      newErrors.tour_name = "Tour name is required";
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

      // Build duration
      const duration = {
        days: formData.duration_days ? parseInt(formData.duration_days) : undefined,
        hours: formData.duration_hours ? parseInt(formData.duration_hours) : undefined,
        minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : undefined,
      };

      // Build add-ons
      const add_ons = formData.add_ons
        .filter((a) => a.name.trim())
        .map((a) => ({
          name: a.name.trim(),
          adult_rate: a.adult_rate ? parseFloat(a.adult_rate) : undefined,
          child_rate: a.child_rate ? parseFloat(a.child_rate) : undefined,
          is_mandatory: a.is_mandatory,
        }));

      // Build seasons
      const seasons = formData.seasons
        .filter((s) => s.dates)
        .map((s) => ({
          dates: s.dates,
          ticket_only_rate_adult: s.ticket_only_adult ? parseFloat(s.ticket_only_adult) : undefined,
          ticket_only_rate_child: s.ticket_only_child ? parseFloat(s.ticket_only_child) : undefined,
          ticket_only_rate_infant: s.ticket_only_infant ? parseFloat(s.ticket_only_infant) : undefined,
          ticket_only_rate_teenager: s.ticket_only_teen ? parseFloat(s.ticket_only_teen) : undefined,
          sic_rate_adult: s.sic_adult ? parseFloat(s.sic_adult) : undefined,
          sic_rate_child: s.sic_child ? parseFloat(s.sic_child) : undefined,
          pvt_rate: s.pvt_rates.reduce(
            (acc, r) => {
              if (r.vehicle_type && r.rate) {
                acc[r.vehicle_type] = parseFloat(r.rate);
              }
              return acc;
            },
            {} as Record<string, number>
          ),
        }));

      // Resolve city/country names from UUIDs
      let cityName: string | undefined;
      let countryName: string | undefined;

      if (formData.tour_city) {
        const cityData = await fetchCityById(formData.tour_city);
        cityName = cityData?.label;
      }
      if (formData.tour_country) {
        const countryOption = countryOptions.find((c) => c.value === formData.tour_country);
        countryName = countryOption?.label;
      }

      // Create library item
      const { data: libraryItem, error } = await createLibraryItem({
        service_type: "tour",
        name: formData.tour_name.trim(),
        city: cityName || undefined,
        country: countryName || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        data: {
          package_description: formData.package_description.trim(),
          categories: formData.categories,
          operational_hours: formData.operational_hours,
          duration,
          tour_type: formData.tour_type,
          includes_transfer: formData.includes_transfer,
          meeting_point: formData.meeting_point.trim(),
          pickup_point: formData.pickup_point.trim(),
          dropoff_point: formData.dropoff_point.trim(),
          add_ons,
          notes: formData.notes.trim(),
          inclusions: formData.inclusions.trim(),
          exclusions: formData.exclusions.trim(),
          cancellation_policy: formData.cancellation_policy.trim(),
          agency_cancellation_policy: formData.agency_cancellation_policy.trim(),
          age_policy,
          seasons,
        },
        currency: formData.currency || undefined,
      });

      if (error) {
        console.error("[ManualTourSheet] Failed to save to library:", error);
        toast.error("Failed to save tour to library");
        return;
      }

      // Build tour data
      const tourData: ManualTourData = {
        library_item_id: libraryItem?.id,
        tour_name: formData.tour_name.trim(),
        tour_city: cityName,
        tour_country: countryName,
        package_description: formData.package_description.trim() || undefined,
        categories: formData.categories.length > 0 ? formData.categories : undefined,
        currency: formData.currency || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        operational_hours: formData.operational_hours.length > 0 ? formData.operational_hours : undefined,
        start_date: formData.start_date || undefined,
        start_time: formData.start_time || undefined,
        end_date: formData.end_date || undefined,
        end_time: formData.end_time || undefined,
        duration,
        tour_type: formData.tour_type,
        includes_transfer: formData.includes_transfer,
        meeting_point: formData.meeting_point.trim() || undefined,
        pickup_point: formData.pickup_point.trim() || undefined,
        dropoff_point: formData.dropoff_point.trim() || undefined,
        add_ons: add_ons.length > 0 ? add_ons : undefined,
        notes: formData.notes.trim() || undefined,
        inclusions: formData.inclusions.trim() || undefined,
        exclusions: formData.exclusions.trim() || undefined,
        cancellation_policy: formData.cancellation_policy.trim() || undefined,
        agency_cancellation_policy: formData.agency_cancellation_policy.trim() || undefined,
        age_policy,
        seasons: seasons.length > 0 ? seasons : undefined,
      };

      await onSave(tourData);
      toast.success("Tour saved to your library");

      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error("[ManualTourSheet] Error:", error);
      toast.error("Failed to save tour");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] p-0 flex flex-col" side="right">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <LucideFerrisWheel className="h-5 w-5 text-green-600" />
            <SheetTitle className="text-left">Add Manual Tour</SheetTitle>
            <Badge variant="outline" className="text-xs">
              Manual Entry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter tour details manually. This will be saved to your library for future use.
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
              Pricing
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0 p-4 space-y-6">
              {/* Tour Info */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <LucideFerrisWheel className="h-4 w-4" /> Tour Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tour_name" className="text-xs">
                      Tour Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="tour_name"
                      placeholder="e.g., Eiffel Tower Skip-the-Line Tour"
                      value={formData.tour_name}
                      onChange={(e) => handleChange("tour_name", e.target.value)}
                      className={errors.tour_name ? "border-destructive" : ""}
                    />
                    {errors.tour_name && <p className="text-xs text-destructive">{errors.tour_name}</p>}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Country</Label>
                    {isLoadingCountries ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Autocomplete
                        options={countryOptions}
                        value={formData.tour_country}
                        onChange={(v) => handleChange("tour_country", v)}
                        placeholder="Select country"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> City
                    </Label>
                    <Autocomplete
                      mode="server"
                      value={formData.tour_city}
                      onChange={(v) => handleChange("tour_city", v)}
                      onSearch={(search) => fetchCitiesByCountryId(formData.tour_country!, search)}
                      fetchByValue={(id) => fetchCityById(id)}
                      placeholder="Select city"
                      disabled={!formData.tour_country}
                      emptyMessage={!formData.tour_country ? "Select a country first" : "No cities available"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Categories
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {TOUR_CATEGORIES.map((cat) => (
                      <Badge
                        key={cat.value}
                        variant={formData.categories.includes(cat.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleCategory(cat.value)}
                      >
                        {cat.label}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Package Description</Label>
                  <Textarea
                    placeholder="Describe the tour package..."
                    value={formData.package_description}
                    onChange={(e) => handleChange("package_description", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </section>

              <Separator />

              {/* Booking Details */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Booking Details
                </h3>

                {/* Operational Hours */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Operational Hours</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOperationalHour}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  {formData.operational_hours.length > 0 && (
                    <div className="space-y-2">
                      {formData.operational_hours.map((oh, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Select
                            value={oh.day}
                            onValueChange={(v) => updateOperationalHour(idx, "day", v)}
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_OF_WEEK.map((day) => (
                                <SelectItem key={day} value={day}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <TimePicker
                            value={oh.time_start}
                            onChange={(v) => updateOperationalHour(idx, "time_start", v)}
                            className="w-24 h-8"
                          />
                          <span className="text-xs">to</span>
                          <TimePicker
                            value={oh.time_end}
                            onChange={(v) => updateOperationalHour(idx, "time_end", v)}
                            className="w-24 h-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeOperationalHour(idx)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dates & Times */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Start Date</Label>
                    <DatePicker
                      value={formData.start_date ? new Date(formData.start_date) : undefined}
                      onChange={(date) => handleChange("start_date", date?.toISOString().split("T")[0] || "")}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Start Time</Label>
                    <TimePicker
                      value={formData.start_time || "09:00"}
                      onChange={(v) => handleChange("start_time", v)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End Date</Label>
                    <DatePicker
                      value={formData.end_date ? new Date(formData.end_date) : undefined}
                      onChange={(date) => handleChange("end_date", date?.toISOString().split("T")[0] || "")}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End Time</Label>
                    <TimePicker
                      value={formData.end_time || "17:00"}
                      onChange={(v) => handleChange("end_time", v)}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Duration */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Duration (Days)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formData.duration_days}
                      onChange={(e) => handleChange("duration_days", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Hours</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      placeholder="0"
                      value={formData.duration_hours}
                      onChange={(e) => handleChange("duration_hours", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Minutes</Label>
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      placeholder="0"
                      value={formData.duration_minutes}
                      onChange={(e) => handleChange("duration_minutes", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Tour Type</Label>
                    <Select
                      value={formData.tour_type}
                      onValueChange={(v) => handleChange("tour_type", v as any)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TOUR_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Transfer & Points */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includes_transfer"
                      checked={formData.includes_transfer}
                      onCheckedChange={(checked) => handleChange("includes_transfer", checked as boolean)}
                    />
                    <Label htmlFor="includes_transfer" className="text-xs cursor-pointer flex items-center gap-1">
                      <Car className="h-3 w-3" /> Includes Transfers
                    </Label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Meeting Point</Label>
                    <Input
                      placeholder="Where to meet"
                      value={formData.meeting_point}
                      onChange={(e) => handleChange("meeting_point", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pick-up Point</Label>
                    <Input
                      placeholder="Pick-up location"
                      value={formData.pickup_point}
                      onChange={(e) => handleChange("pickup_point", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Drop-off Point</Label>
                    <Input
                      placeholder="Drop-off location"
                      value={formData.dropoff_point}
                      onChange={(e) => handleChange("dropoff_point", e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <Separator />

              {/* Tour Images */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Tour Images
                </h3>
                {user?.id ? (
                  <S3ImageUpload
                    images={formData.images}
                    onChange={(images) => handleChange("images", images)}
                    userId={user.id}
                    prefix="library-tours/"
                    maxImages={10}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground">Please log in to upload images</p>
                )}
              </section>

              <Separator />

              {/* Add-ons */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Tour Add-ons
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addAddOn}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>

                {formData.add_ons.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="py-2 px-3 text-left font-medium">Name</th>
                          <th className="py-2 px-3 text-center font-medium">Adult Rate</th>
                          <th className="py-2 px-3 text-center font-medium">Child Rate</th>
                          <th className="py-2 px-3 text-center font-medium">Mandatory</th>
                          <th className="py-2 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.add_ons.map((addon, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="py-2 px-3">
                              <Input
                                placeholder="Add-on name"
                                value={addon.name}
                                onChange={(e) => updateAddOn(idx, "name", e.target.value)}
                                className="h-8"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={addon.adult_rate}
                                onChange={(e) => updateAddOn(idx, "adult_rate", e.target.value)}
                                className="h-8 text-center"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={addon.child_rate}
                                onChange={(e) => updateAddOn(idx, "child_rate", e.target.value)}
                                className="h-8 text-center"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">
                              <Checkbox
                                checked={addon.is_mandatory}
                                onCheckedChange={(checked) => updateAddOn(idx, "is_mandatory", checked)}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => removeAddOn(idx)}
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
                  <p className="text-xs text-muted-foreground">No add-ons added</p>
                )}
              </section>

              <Separator />

              {/* Notes */}
              <section className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Notes
                </Label>
                <Textarea
                  placeholder="Additional notes or remarks..."
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  className="min-h-[60px]"
                />
              </section>
            </TabsContent>

            {/* Policies Tab */}
            <TabsContent value="policies" className="mt-0 p-4 space-y-6">
              {/* Inclusions */}
              <section className="space-y-2">
                <Label className="text-xs">Inclusions</Label>
                <Textarea
                  placeholder="What's included in the tour..."
                  value={formData.inclusions}
                  onChange={(e) => handleChange("inclusions", e.target.value)}
                  className="min-h-[80px]"
                />
              </section>

              <Separator />

              {/* Exclusions */}
              <section className="space-y-2">
                <Label className="text-xs">Exclusions</Label>
                <Textarea
                  placeholder="What's not included..."
                  value={formData.exclusions}
                  onChange={(e) => handleChange("exclusions", e.target.value)}
                  className="min-h-[80px]"
                />
              </section>

              <Separator />

              {/* Cancellation Policy */}
              <section className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> DMC Cancellation Policy
                </Label>
                <Textarea
                  placeholder="e.g., Free cancellation up to 24 hours before..."
                  value={formData.cancellation_policy}
                  onChange={(e) => handleChange("cancellation_policy", e.target.value)}
                  className="min-h-[80px]"
                />
              </section>

              <section className="space-y-2">
                <Label className="text-xs">Agency Cancellation Policy</Label>
                <Textarea
                  placeholder="Your agency's cancellation policy (if different)..."
                  value={formData.agency_cancellation_policy}
                  onChange={(e) => handleChange("agency_cancellation_policy", e.target.value)}
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
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="mt-0 p-4 space-y-6">
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Seasonal Rates
                  </h3>
                  <Button type="button" variant="outline" size="sm" onClick={addSeason}>
                    <Plus className="h-3 w-3 mr-1" /> Add Season
                  </Button>
                </div>

                {formData.seasons.length > 0 ? (
                  <div className="space-y-4">
                    {formData.seasons.map((season, idx) => (
                      <div key={idx} className="border rounded-lg p-4 space-y-4 bg-muted/30">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <Label className="text-xs">Season Dates</Label>
                            <DateRangePicker
                              value={season.dates}
                              onChange={(v) => updateSeason(idx, "dates", v)}
                              placeholder="Select season dates"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 mt-6"
                            onClick={() => removeSeason(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        {/* Ticket Only Rates */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">Ticket Only Rates</Label>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Adult</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="-"
                                value={season.ticket_only_adult}
                                onChange={(e) => updateSeason(idx, "ticket_only_adult", e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Child</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="-"
                                value={season.ticket_only_child}
                                onChange={(e) => updateSeason(idx, "ticket_only_child", e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Infant</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="-"
                                value={season.ticket_only_infant}
                                onChange={(e) => updateSeason(idx, "ticket_only_infant", e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Teenager</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="-"
                                value={season.ticket_only_teen}
                                onChange={(e) => updateSeason(idx, "ticket_only_teen", e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>

                        {/* SIC Rates */}
                        <div className="space-y-2">
                          <Label className="text-xs font-medium">SIC (Seat-in-Coach) Rates</Label>
                          <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Adult</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="-"
                                value={season.sic_adult}
                                onChange={(e) => updateSeason(idx, "sic_adult", e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Child</Label>
                              <Input
                                type="number"
                                min={0}
                                placeholder="-"
                                value={season.sic_child}
                                onChange={(e) => updateSeason(idx, "sic_child", e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </div>
                        </div>

                        {/* PVT Rates */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Private Transfer Rates (Per Vehicle)</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => addPvtRate(idx)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Vehicle
                            </Button>
                          </div>
                          {season.pvt_rates.length > 0 ? (
                            <div className="space-y-2">
                              {season.pvt_rates.map((pvt, pi) => (
                                <div key={pi} className="flex items-center gap-2">
                                  <Input
                                    placeholder="Vehicle type (e.g., Sedan, SUV)"
                                    value={pvt.vehicle_type}
                                    onChange={(e) => updatePvtRate(idx, pi, "vehicle_type", e.target.value)}
                                    className="h-8 flex-1"
                                  />
                                  <Input
                                    type="number"
                                    min={0}
                                    placeholder="Rate"
                                    value={pvt.rate}
                                    onChange={(e) => updatePvtRate(idx, pi, "rate", e.target.value)}
                                    className="h-8 w-24"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => removePvtRate(idx, pi)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No vehicle rates added</p>
                          )}
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
              </section>
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
                <LucideFerrisWheel className="h-4 w-4 mr-2" />
                Save to Library
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { ManualTourData };
