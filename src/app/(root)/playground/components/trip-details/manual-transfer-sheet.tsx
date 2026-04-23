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
  Car,
} from "lucide-react";
import { createLibraryItem } from "@/data-access/itinerary-library";
import { toast } from "sonner";
import useUser from "@/hooks/use-user";
import { CURRENCY_OPTIONS } from "@/constants/data";
import { useCountryCityOptions } from "@/hooks/use-country-city-options";
import { fetchCitiesByCountryId, fetchCityById } from "@/data-access/datastore";
import { cn } from "@/lib/utils";
import {
  type ManualTransferFormData,
  type ManualTransferData,
  type TransferMode,
  TRANSFER_MODES,
  TRANSFER_TYPE_GROUPS,
} from "./transfer-sheet/types";

interface ManualTransferSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (transferData: ManualTransferData) => Promise<void>;
  isSaving: boolean;
}

const createEmptySeason = () => ({
  dates: "",
  sic_adult: "",
  sic_child: "",
  pvt_rates: [] as Array<{ vehicle_type: string; capacity: string; rate: string }>,
});

const createEmptyAddOn = () => ({
  name: "",
  adult_rate: "",
  child_rate: "",
  is_mandatory: false,
});

const initialFormData: ManualTransferFormData = {
  transfer_name: "",
  transfer_city: "",
  transfer_country: "",
  package_description: "",
  transfer_mode: "vehicle",
  currency: "",
  images: [],
  pickup_date: "",
  pickup_time: "",
  pickup_point: "",
  drop_date: "",
  drop_time: "",
  drop_point: "",
  meeting_point: "",
  transfer_type: [],
  is_sic: false,
  duration_hours: "",
  duration_days: "",
  distance_km: "",
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

export default function ManualTransferSheet({ open, onOpenChange, onSave, isSaving }: ManualTransferSheetProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("overview");
  const [formData, setFormData] = useState<ManualTransferFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    countries: countryOptions,
    isLoadingCountries,
  } = useCountryCityOptions({ countryId: formData.transfer_country });

  const handleChange = (field: keyof ManualTransferFormData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      if (field === "transfer_country") {
        newData.transfer_city = "";
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

  // PVT rate handlers
  const addPvtRate = (seasonIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      seasons: prev.seasons.map((season, i) =>
        i === seasonIndex
          ? { ...season, pvt_rates: [...season.pvt_rates, { vehicle_type: "", capacity: "", rate: "" }] }
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

  // Transfer type toggle
  const toggleTransferType = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      transfer_type: prev.transfer_type.includes(type)
        ? prev.transfer_type.filter((t) => t !== type)
        : [...prev.transfer_type, type],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.transfer_name.trim()) {
      newErrors.transfer_name = "Transfer name is required";
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
          sic_rate_adult: s.sic_adult ? parseFloat(s.sic_adult) : undefined,
          sic_rate_child: s.sic_child ? parseFloat(s.sic_child) : undefined,
          per_vehicle_rate: s.pvt_rates
            .filter((r) => r.vehicle_type && r.rate)
            .map((r) => ({
              vehicle_type: r.vehicle_type,
              capacity: r.capacity,
              rate: parseFloat(r.rate),
            })),
        }));

      // Resolve city/country names
      let cityName: string | undefined;
      let countryName: string | undefined;

      if (formData.transfer_city) {
        const cityData = await fetchCityById(formData.transfer_city);
        cityName = cityData?.label;
      }
      if (formData.transfer_country) {
        const countryOption = countryOptions.find((c) => c.value === formData.transfer_country);
        countryName = countryOption?.label;
      }

      // Create library item
      const { data: libraryItem, error } = await createLibraryItem({
        service_type: "transfer",
        name: formData.transfer_name.trim(),
        city: cityName || undefined,
        country: countryName || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        data: {
          package_description: formData.package_description.trim(),
          transfer_mode: formData.transfer_mode,
          transfer_type: formData.transfer_type,
          is_sic: formData.is_sic,
          meeting_point: formData.meeting_point.trim(),
          duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : undefined,
          duration_days: formData.duration_days ? parseFloat(formData.duration_days) : undefined,
          distance_km: formData.distance_km ? parseFloat(formData.distance_km) : undefined,
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
        console.error("[ManualTransferSheet] Failed to save to library:", error);
        toast.error("Failed to save transfer to library");
        return;
      }

      // Build transfer data
      const transferData: ManualTransferData = {
        library_item_id: libraryItem?.id,
        transfer_name: formData.transfer_name.trim(),
        transfer_city: cityName,
        transfer_country: countryName,
        package_description: formData.package_description.trim() || undefined,
        transfer_mode: formData.transfer_mode,
        currency: formData.currency || undefined,
        images: formData.images.length > 0 ? formData.images : undefined,
        pickup_date: formData.pickup_date || undefined,
        pickup_time: formData.pickup_time || undefined,
        pickup_point: formData.pickup_point.trim() || undefined,
        drop_date: formData.drop_date || undefined,
        drop_time: formData.drop_time || undefined,
        drop_point: formData.drop_point.trim() || undefined,
        meeting_point: formData.meeting_point.trim() || undefined,
        transfer_type: formData.transfer_type.length > 0 ? formData.transfer_type : undefined,
        is_sic: formData.is_sic,
        duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : undefined,
        duration_days: formData.duration_days ? parseFloat(formData.duration_days) : undefined,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : undefined,
        add_ons: add_ons.length > 0 ? add_ons : undefined,
        notes: formData.notes.trim() || undefined,
        inclusions: formData.inclusions.trim() || undefined,
        exclusions: formData.exclusions.trim() || undefined,
        cancellation_policy: formData.cancellation_policy.trim() || undefined,
        agency_cancellation_policy: formData.agency_cancellation_policy.trim() || undefined,
        age_policy,
        seasons: seasons.length > 0 ? seasons : undefined,
      };

      await onSave(transferData);
      toast.success("Transfer saved to your library");

      handleReset();
      onOpenChange(false);
    } catch (error) {
      console.error("[ManualTransferSheet] Error:", error);
      toast.error("Failed to save transfer");
    }
  };

  const isVehicleDisposal = formData.transfer_mode === "vehicle_disposal";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[90vw] p-0 flex flex-col" side="right">
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-orange-600" />
            <SheetTitle className="text-left">Add Manual Transfer</SheetTitle>
            <Badge variant="outline" className="text-xs">
              Manual Entry
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter transfer details manually. This will be saved to your library for future use.
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
              {/* Transfer Info */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Car className="h-4 w-4" /> Transfer Information
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer_name" className="text-xs">
                      Transfer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="transfer_name"
                      placeholder="e.g., Airport to Hotel Transfer"
                      value={formData.transfer_name}
                      onChange={(e) => handleChange("transfer_name", e.target.value)}
                      className={errors.transfer_name ? "border-destructive" : ""}
                    />
                    {errors.transfer_name && <p className="text-xs text-destructive">{errors.transfer_name}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Transfer Mode</Label>
                      <Select
                        value={formData.transfer_mode}
                        onValueChange={(v) => handleChange("transfer_mode", v as TransferMode)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFER_MODES.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Currency</Label>
                      <Select value={formData.currency} onValueChange={(v) => handleChange("currency", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Country</Label>
                    {isLoadingCountries ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Autocomplete
                        options={countryOptions}
                        value={formData.transfer_country}
                        onChange={(v) => handleChange("transfer_country", v)}
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
                      value={formData.transfer_city}
                      onChange={(v) => handleChange("transfer_city", v)}
                      onSearch={(search) => fetchCitiesByCountryId(formData.transfer_country!, search)}
                      fetchByValue={(id) => fetchCityById(id)}
                      placeholder="Select city"
                      disabled={!formData.transfer_country}
                      emptyMessage={!formData.transfer_country ? "Select a country first" : "No cities available"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Package Description</Label>
                  <Textarea
                    placeholder="Describe the transfer service..."
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

                {/* Pickup */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Pickup Date</Label>
                    <DatePicker
                      value={formData.pickup_date ? new Date(formData.pickup_date) : undefined}
                      onChange={(date) => handleChange("pickup_date", date?.toISOString().split("T")[0] || "")}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pickup Time</Label>
                    <TimePicker
                      value={formData.pickup_time || "09:00"}
                      onChange={(v) => handleChange("pickup_time", v)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Pickup Point</Label>
                    <Input
                      placeholder="Pickup location"
                      value={formData.pickup_point}
                      onChange={(e) => handleChange("pickup_point", e.target.value)}
                    />
                  </div>
                </div>

                {/* Drop */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Drop Date</Label>
                    <DatePicker
                      value={formData.drop_date ? new Date(formData.drop_date) : undefined}
                      onChange={(date) => handleChange("drop_date", date?.toISOString().split("T")[0] || "")}
                      placeholder="Select date"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Drop Time</Label>
                    <TimePicker
                      value={formData.drop_time || "17:00"}
                      onChange={(v) => handleChange("drop_time", v)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Drop Point</Label>
                    <Input
                      placeholder="Drop-off location"
                      value={formData.drop_point}
                      onChange={(e) => handleChange("drop_point", e.target.value)}
                    />
                  </div>
                </div>

                {/* Meeting Point & Duration */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Meeting Point</Label>
                    <Input
                      placeholder="Meeting location"
                      value={formData.meeting_point}
                      onChange={(e) => handleChange("meeting_point", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Duration (Hours)</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={formData.duration_hours}
                      onChange={(e) => handleChange("duration_hours", e.target.value)}
                    />
                  </div>
                  {isVehicleDisposal && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-xs">Duration (Days)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={formData.duration_days}
                          onChange={(e) => handleChange("duration_days", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Distance (KMs)</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          value={formData.distance_km}
                          onChange={(e) => handleChange("distance_km", e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Transfer Type & SIC */}
                <div className="space-y-2">
                  <Label className="text-xs">Transfer Type</Label>
                  <div className="space-y-2">
                    {TRANSFER_TYPE_GROUPS.map((group) => (
                      <div key={group.group} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-medium">{group.group}</p>
                        <div className="flex flex-wrap gap-1">
                          {group.options.map((opt) => (
                            <Badge
                              key={opt.value}
                              variant={formData.transfer_type.includes(opt.value) ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                              onClick={() => toggleTransferType(opt.value)}
                            >
                              {opt.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is_sic"
                    checked={formData.is_sic}
                    onCheckedChange={(checked) => handleChange("is_sic", checked as boolean)}
                  />
                  <Label htmlFor="is_sic" className="text-xs cursor-pointer">
                    SIC (Seat-in-Coach) Available
                  </Label>
                </div>
              </section>

              <Separator />

              {/* Transfer Images */}
              <section className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" /> Transfer Images
                </h3>
                {user?.id ? (
                  <S3ImageUpload
                    images={formData.images}
                    onChange={(images) => handleChange("images", images)}
                    userId={user.id}
                    prefix="library-transfers/"
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
                    <Plus className="h-4 w-4" /> Transfer Add-ons
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
                  placeholder="What's included in the transfer..."
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

              {/* Cancellation Policies */}
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
                                    placeholder="Vehicle type (e.g., Sedan)"
                                    value={pvt.vehicle_type}
                                    onChange={(e) => updatePvtRate(idx, pi, "vehicle_type", e.target.value)}
                                    className="h-8 flex-1"
                                  />
                                  <Input
                                    placeholder="Capacity"
                                    value={pvt.capacity}
                                    onChange={(e) => updatePvtRate(idx, pi, "capacity", e.target.value)}
                                    className="h-8 w-24"
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
                <Car className="h-4 w-4 mr-2" />
                Save to Library
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type { ManualTransferData };
