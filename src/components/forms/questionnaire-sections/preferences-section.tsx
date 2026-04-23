"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BorderedCard } from "@/components/ui/bordered-card";
import { Loader2, AlertCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  getQuestionnaire,
  updateQuestionnaireField,
  fetchQueryGuests,
  updateGuestPreferences,
} from "@/data-access/questionnaire";
import type { GuestDetail, Preference } from "@/types/questionnaire";
import { Badge } from "@/components/ui/badge";
import { PreferencesView } from "./preferences-view";
import Show from "@/components/ui/show";

interface PreferencesSectionProps {
  queryId: string;
  queryDetails?: {
    services?: string[];
    pax_details?: {
      adults?: number;
      children?: number;
      children_ages?: number[];
    };
  };
}

const DIETARY_OPTIONS = [
  { value: "none", label: "No Preference" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "indian_veg", label: "Indian Vegetarian (No Onion/Garlic)" },
  { value: "vegan", label: "Vegan" },
  { value: "jain", label: "Jain" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "other", label: "Other (Specify)" },
];

const BED_TYPE_OPTIONS = [
  { value: "king", label: "King Bed" },
  { value: "queen", label: "Queen Bed" },
  { value: "twin", label: "Twin Beds" },
];

// Schema for the preferences form
const PreferencesFormSchema = z.object({
  // Trip-level preferences
  interconnecting_rooms: z.boolean().optional(),
  special_room_requests: z.string().optional(),
  luggage_checkin: z.coerce.number().optional(),
  luggage_cabin: z.coerce.number().optional(),
  oversized_luggage: z.boolean().optional(),
  child_seat_required: z.boolean().optional(),
  child_seat_count: z.coerce.number().optional(),
  honeymoon: z.boolean().optional(),
  anniversary: z.boolean().optional(),
  birthday: z.boolean().optional(),
  other_requests: z.string().optional(),
});

type PreferencesFormData = z.infer<typeof PreferencesFormSchema>;

// Interface for per-guest preferences
interface GuestPreference {
  guest_id: string; // We'll use first_name + last_name as identifier
  guest_name: string;
  dietary_preference?: string;
  dietary_custom?: string;
  food_allergies?: string;
  medical_restrictions?: string;
  bed_type?: string;
  smoking?: boolean;
}

export function PreferencesSection({
  queryId,
  queryDetails,
}: PreferencesSectionProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [guestDetails, setGuestDetails] = useState<GuestDetail[]>([]);
  const [guestPreferences, setGuestPreferences] = useState<GuestPreference[]>(
    [],
  );
  const hasHotelService = true; //queryDetails?.services?.includes("hotel") ?? false;

  // Calculate total passengers from query details
  const totalPassengers =
    (queryDetails?.pax_details?.adults || 0) +
    (queryDetails?.pax_details?.children || 0);

  const form = useForm<PreferencesFormData>({
    resolver: zodResolver(PreferencesFormSchema),
    defaultValues: {
      interconnecting_rooms: false,
      special_room_requests: "",
      luggage_checkin: 0,
      luggage_cabin: 0,
      oversized_luggage: false,
      child_seat_required: false,
      child_seat_count: 0,
      honeymoon: false,
      anniversary: false,
      birthday: false,
      other_requests: "",
    },
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const { leadGuest, passengers } = await fetchQueryGuests(queryId);
      const allGuests = [leadGuest, ...passengers].filter(Boolean) as GuestDetail[];
      setGuestDetails(allGuests);

      if (allGuests.length > 0) {
        const existingPrefs: GuestPreference[] = allGuests.map((guest) => ({
          guest_id: guest.guest_id!,
          guest_name: `${guest.first_name} ${guest.last_name}`,
          dietary_preference: guest.dietary_preference,
          dietary_custom: guest.dietary_custom,
          food_allergies: guest.food_allergies,
          medical_restrictions: guest.medical_restrictions,
          bed_type: guest.bed_type,
          smoking: guest.smoking,
        }));
        setGuestPreferences(existingPrefs);
      }

      const result = await getQuestionnaire(queryId);

      if (result.data) {
        // Load trip-level preferences
        if (result.data.preferences && result.data.preferences.length > 0) {
          const prefs = result.data.preferences[0] as Preference;
          form.reset({
            interconnecting_rooms: prefs.interconnecting_rooms || false,
            special_room_requests: prefs.special_room_requests || "",
            luggage_checkin: prefs.luggage_checkin || 0,
            luggage_cabin: prefs.luggage_cabin || 0,
            oversized_luggage: prefs.oversized_luggage || false,
            child_seat_required: prefs.child_seat_required || false,
            child_seat_count: prefs.child_seat_count || 0,
            honeymoon: prefs.honeymoon || false,
            anniversary: prefs.anniversary || false,
            birthday: prefs.birthday || false,
            other_requests: prefs.other_requests || "",
          });
          setHasData(true);
        } else {
          // No saved preferences, go to edit mode
          setIsEditMode(true);
        }
      }

      setIsLoading(false);
    };

    loadData();
  }, [queryId, form]);

  const handleAddDietaryPreference = (guestId: string) => {
    const guest = guestDetails.find((g) => g.guest_id === guestId);
    if (!guest) return;

    const existingIndex = guestPreferences.findIndex(
      (gp) => gp.guest_id === guestId,
    );

    const newPref: GuestPreference = {
      guest_id: guestId,
      guest_name: `${guest.first_name} ${guest.last_name}`,
      dietary_preference: guest.dietary_preference || "none",
      dietary_custom: guest.dietary_custom || "",
      food_allergies: guest.food_allergies || "",
      medical_restrictions: guest.medical_restrictions || "",
      bed_type: guest.bed_type,
      smoking: guest.smoking,
    };

    if (existingIndex >= 0) {
      const updated = [...guestPreferences];
      updated[existingIndex] = newPref;
      setGuestPreferences(updated);
    } else {
      setGuestPreferences([...guestPreferences, newPref]);
    }
  };

  const handleUpdateGuestPreference = (
    guestId: string,
    field: keyof GuestPreference,
    value: any,
  ) => {
    setGuestPreferences((prev) =>
      prev.map((gp) =>
        gp.guest_id === guestId ? { ...gp, [field]: value } : gp,
      ),
    );
  };

  const handleRemoveGuestPreference = (guestId: string) => {
    setGuestPreferences((prev) => prev.filter((gp) => gp.guest_id !== guestId));
  };

  const handleAddBedPreference = (guestId: string, bedType: string) => {
    const guest = guestDetails.find((g) => g.guest_id === guestId);
    if (!guest) return;

    const existingIndex = guestPreferences.findIndex(
      (gp) => gp.guest_id === guestId,
    );

    const newPref: GuestPreference = {
      guest_id: guestId,
      guest_name: `${guest.first_name} ${guest.last_name}`,
      dietary_preference: guest.dietary_preference,
      dietary_custom: guest.dietary_custom,
      food_allergies: guest.food_allergies,
      medical_restrictions: guest.medical_restrictions,
      bed_type: bedType,
      smoking: guest.smoking || false,
    };

    if (existingIndex >= 0) {
      const updated = [...guestPreferences];
      updated[existingIndex] = { ...updated[existingIndex], bed_type: bedType };
      setGuestPreferences(updated);
    } else {
      setGuestPreferences([...guestPreferences, newPref]);
    }
  };

  const onSubmit = async (data: PreferencesFormData) => {
    setIsSaving(true);

    try {
      // 1. Update trip-level preferences
      const tripPreferences: Preference = {
        interconnecting_rooms: data.interconnecting_rooms,
        special_room_requests: data.special_room_requests,
        luggage_checkin: data.luggage_checkin,
        luggage_cabin: data.luggage_cabin,
        oversized_luggage: data.oversized_luggage,
        child_seat_required: data.child_seat_required,
        child_seat_count: data.child_seat_count,
        honeymoon: data.honeymoon,
        anniversary: data.anniversary,
        birthday: data.birthday,
        other_requests: data.other_requests,
      };

      const prefResult = await updateQuestionnaireField(
        queryId,
        "preferences",
        [tripPreferences],
      );

      if (prefResult.error) {
        throw new Error(prefResult.error);
      }

      // 2. Update per-guest preferences in travel_agent_guest_details
      const guestResult = await updateGuestPreferences(
        guestPreferences
          .filter((gp) => !!gp.guest_id)
          .map((gp) => ({
            guestId: gp.guest_id,
            dietary_preference: gp.dietary_preference,
            dietary_custom: gp.dietary_custom,
            food_allergies: gp.food_allergies,
            medical_restrictions: gp.medical_restrictions,
            bed_type: gp.bed_type,
            smoking: gp.smoking,
          })),
      );

      if (guestResult.error) {
        throw new Error(guestResult.error);
      }

      toast.success("Preferences saved successfully");
      setHasData(true);
      setIsEditMode(false);
    } catch (error: any) {
      toast.error("Failed to save preferences", {
        description: error.message,
      });
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show view mode if data exists and not in edit mode
  if (hasData && !isEditMode) {
    const preferences = form.getValues();
    const preferencesData: Preference = {
      interconnecting_rooms: preferences.interconnecting_rooms,
      special_room_requests: preferences.special_room_requests,
      luggage_checkin: preferences.luggage_checkin,
      luggage_cabin: preferences.luggage_cabin,
      oversized_luggage: preferences.oversized_luggage,
      child_seat_required: preferences.child_seat_required,
      child_seat_count: preferences.child_seat_count,
      honeymoon: preferences.honeymoon,
      anniversary: preferences.anniversary,
      birthday: preferences.birthday,
      other_requests: preferences.other_requests,
    };

    return (
      <PreferencesView
        preferences={preferencesData}
        guestDetails={guestDetails}
        onEdit={() => setIsEditMode(true)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="flex-1 h-0">
            <div className="space-y-6 py-5 px-4">
              {guestDetails.length === 0 ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">
                      No Guest Details Found
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      Please complete the Guest Details section first before
                      filling out preferences. Preferences are associated with
                      individual guests and trip-level settings.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Meal & Dietary Preferences */}
                  <BorderedCard
                    title="Meal & Dietary Preferences"
                    variant="dashed"
                    collapsible
                    defaultOpen
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Optional preferences for each traveler
                        </p>
                        {totalPassengers > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {guestPreferences.length} of {totalPassengers}{" "}
                            travelers
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-3">
                        {guestPreferences.map((guestPref) => (
                          <BorderedCard
                            key={guestPref.guest_id}
                            variant="default"
                          >
                            {/* Header Row - Guest Selection & Remove */}
                            <div className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveGuestPreference(
                                    guestPref.guest_id,
                                  )
                                }
                                className="h-9 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              {/* Dietary Preference Row */}
                              <div className="flex gap-3 items-center">
                                <div className="flex-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Select Guest
                                  </label>
                                  <Select
                                    value={guestPref.guest_id}
                                    onValueChange={(newGuestId) => {
                                      const newGuest = guestDetails.find(
                                        (g) => g.guest_id === newGuestId,
                                      );
                                      if (newGuest) {
                                        handleUpdateGuestPreference(
                                          guestPref.guest_id,
                                          "guest_id",
                                          newGuestId,
                                        );
                                        handleUpdateGuestPreference(
                                          guestPref.guest_id,
                                          "guest_name",
                                          `${newGuest.first_name} ${newGuest.last_name}`,
                                        );
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {guestDetails.map((guest, index) => {
                                        const guestId = guest.guest_id!;
                                        const isUsed = guestPreferences.some(
                                          (gp) =>
                                            gp.guest_id === guestId &&
                                            gp.guest_id !== guestPref.guest_id,
                                        );
                                        return (
                                          <SelectItem
                                            key={guestId}
                                            value={guestId}
                                            disabled={isUsed}
                                          >
                                            {guest.first_name} {guest.last_name}{" "}
                                            {index === 0 && "(Lead)"}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Dietary Preference
                                  </label>
                                  <Select
                                    value={
                                      guestPref.dietary_preference || "none"
                                    }
                                    onValueChange={(value) =>
                                      handleUpdateGuestPreference(
                                        guestPref.guest_id,
                                        "dietary_preference",
                                        value,
                                      )
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DIETARY_OPTIONS.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {guestPref.dietary_preference === "other" && (
                                  <div className="flex-1">
                                    <label className="text-xs font-medium text-muted-foreground">
                                      Specify Other
                                    </label>
                                    <Input
                                      value={guestPref.dietary_custom || ""}
                                      onChange={(e) =>
                                        handleUpdateGuestPreference(
                                          guestPref.guest_id,
                                          "dietary_custom",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Custom preference"
                                      className="h-9"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Allergies & Restrictions Row */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Food Allergies
                                  </label>
                                  <Textarea
                                    value={guestPref.food_allergies || ""}
                                    onChange={(e) =>
                                      handleUpdateGuestPreference(
                                        guestPref.guest_id,
                                        "food_allergies",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="e.g., Nuts, Shellfish"
                                    rows={2}
                                    className="text-sm resize-none"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-xs font-medium text-muted-foreground">
                                    Medical Restrictions
                                  </label>
                                  <Textarea
                                    value={guestPref.medical_restrictions || ""}
                                    onChange={(e) =>
                                      handleUpdateGuestPreference(
                                        guestPref.guest_id,
                                        "medical_restrictions",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="e.g., Diabetic, Low sodium"
                                    rows={2}
                                    className="text-sm resize-none"
                                  />
                                </div>
                              </div>
                            </div>
                          </BorderedCard>
                        ))}

                        {/* Add Button or Initial Prompt */}
                        {guestDetails.length > 0 && (
                          <div className="flex justify-center pt-1">
                            {guestPreferences.length === 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  const firstGuest = guestDetails[0];
                                  if (firstGuest) {
                                    const guestId = `${firstGuest.first_name}_${firstGuest.last_name}`;
                                    handleAddDietaryPreference(guestId);
                                  }
                                }}
                                className="w-full max-w-md border-dashed border-2"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Dietary Preferences (Optional)
                              </Button>
                            ) : (
                              guestPreferences.length < totalPassengers && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    const availableGuest = guestDetails.find(
                                      (guest) =>
                                        !guestPreferences.some(
                                          (gp) =>
                                            gp.guest_id ===
                                            `${guest.first_name}_${guest.last_name}`,
                                        ),
                                    );
                                    if (availableGuest) {
                                      const guestId = `${availableGuest.first_name}_${availableGuest.last_name}`;
                                      handleAddDietaryPreference(guestId);
                                    }
                                  }}
                                  disabled={
                                    guestPreferences.length >= totalPassengers
                                  }
                                  className="w-full max-w-md border-dashed border-2"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Another Traveler
                                </Button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </BorderedCard>

                  {/* Rooming & Bedding Preferences */}
                  {hasHotelService && (
                    <BorderedCard
                      title="Rooming & Bedding Preferences"
                      variant="dashed"
                      collapsible
                      defaultOpen
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">
                            Optional bed preferences for each traveler
                          </p>
                          {totalPassengers > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {
                                guestPreferences.filter((gp) => gp.bed_type)
                                  .length
                              }{" "}
                              of {totalPassengers} travelers
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-3">
                          {/* Display Bed Preferences as Cards */}
                          {guestPreferences
                            .filter((gp) => gp.bed_type)
                            .map((guestPref) => (
                              <BorderedCard
                                key={`bed-${guestPref.guest_id}`}
                                variant="default"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 grid grid-cols-2 gap-3 items-center">
                                    <div className="text-sm font-medium">
                                      {guestPref.guest_name}
                                    </div>
                                    <Select
                                      value={guestPref.bed_type || ""}
                                      onValueChange={(value) =>
                                        handleUpdateGuestPreference(
                                          guestPref.guest_id,
                                          "bed_type",
                                          value,
                                        )
                                      }
                                    >
                                      <SelectTrigger className="w-full h-9">
                                        <SelectValue placeholder="Select bed type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BED_TYPE_OPTIONS.map((option) => (
                                          <SelectItem
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handleUpdateGuestPreference(
                                        guestPref.guest_id,
                                        "bed_type",
                                        undefined,
                                      )
                                    }
                                    className="h-9 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </BorderedCard>
                            ))}

                          {/* Add Button */}
                          {guestDetails.length > 0 && (
                            <div className="flex justify-center pt-1">
                              {guestPreferences.filter((gp) => gp.bed_type)
                                .length === 0 ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => {
                                    const firstGuest = guestDetails[0];
                                    if (firstGuest) {
                                      const guestId = `${firstGuest.first_name}_${firstGuest.last_name}`;
                                      handleAddBedPreference(guestId, "king");
                                    }
                                  }}
                                  className="w-full max-w-md border-dashed border-2"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Bed Preferences (Optional)
                                </Button>
                              ) : (
                                guestPreferences.filter((gp) => gp.bed_type)
                                  .length < totalPassengers && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                      const availableGuest = guestDetails.find(
                                        (guest) => {
                                          const guestId = `${guest.first_name}_${guest.last_name}`;
                                          return !guestPreferences.some(
                                            (gp) =>
                                              gp.guest_id === guestId &&
                                              gp.bed_type,
                                          );
                                        },
                                      );
                                      if (availableGuest) {
                                        const guestId = `${availableGuest.first_name}_${availableGuest.last_name}`;
                                        handleAddBedPreference(guestId, "king");
                                      }
                                    }}
                                    disabled={
                                      guestPreferences.filter(
                                        (gp) => gp.bed_type,
                                      ).length >= totalPassengers
                                    }
                                    className="w-full max-w-md border-dashed border-2"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Another Traveler
                                  </Button>
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {/* Trip-level Room Preferences */}
                        <div className="pt-4 mt-4 border-t space-y-3">
                          <p className="text-xs font-medium text-muted-foreground">
                            General Room Requests
                          </p>
                          <FormField
                            control={form.control}
                            name="interconnecting_rooms"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  Interconnecting Rooms Required
                                </FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="special_room_requests"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-muted-foreground">
                                  Special Room Requests
                                </FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    placeholder="Any special room requirements"
                                    rows={2}
                                    className="text-sm resize-none"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </BorderedCard>
                  )}

                  {/* Transfer & Transport Preferences */}
                  <BorderedCard
                    title="Transfer & Transport Preferences"
                    variant="dashed"
                    collapsible
                    defaultOpen
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="luggage_checkin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Check-in Luggage Count</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                placeholder="Number of checked bags"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="luggage_cabin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cabin Luggage Count</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                {...field}
                                placeholder="Number of cabin bags"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="oversized_luggage"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Oversized Luggage (Surfboards, Golf Clubs, etc.)
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="child_seat_required"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Child Seat Required
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      {form.watch("child_seat_required") && (
                        <FormField
                          control={form.control}
                          name="child_seat_count"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Number of Child Seats</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  {...field}
                                  placeholder="How many child seats needed"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </BorderedCard>

                  {/* Special Requests & Occasions */}
                  <BorderedCard
                    title="Special Requests & Occasions"
                    variant="dashed"
                    collapsible
                    defaultOpen
                  >
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Let us know if you're celebrating any special occasions.
                      </p>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="honeymoon"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Honeymoon
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="anniversary"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Anniversary
                              </FormLabel>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="birthday"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                Birthday
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="other_requests"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Other Special Requests</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Any other special requests or information we should know"
                                rows={4}
                              />
                            </FormControl>
                            <FormDescription>
                              Include any additional information about
                              celebrations, special needs, or requests.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </BorderedCard>
                </>
              )}
            </div>
          </ScrollArea>

          {guestDetails.length > 0 && (
            <div className="flex justify-end gap-4 pt-2 px-4 border-t flex-shrink-0">
              <Show when={isEditMode}>
                <Button
                  type="button"
                  disabled={isSaving}
                  size="lg"
                  variant="outline"
                  onClick={() => setIsEditMode(false)}
                >
                  Cancel
                </Button>
              </Show>
              <Button type="submit" disabled={isSaving} size="lg">
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Preferences
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
