"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BorderedCard } from "@/components/ui/bordered-card";
import {
  Edit,
  Utensils,
  Hotel,
  Luggage,
  Heart,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { Preference, GuestDetail } from "@/types/questionnaire";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Show from "@/components/ui/show";

interface PreferencesViewProps {
  preferences?: Preference;
  guestDetails: GuestDetail[];
  onEdit: () => void;
}

export function PreferencesView({
  preferences,
  guestDetails,
  onEdit,
}: PreferencesViewProps) {
  const InfoRow = ({
    icon: Icon,
    label,
    value,
    className,
  }: {
    icon: LucideIcon;
    label: string;
    value: string | React.ReactNode;
    className?: string;
  }) => (
    <div className={`flex items-start gap-3 ${className || ""}`}>
      <div className="mt-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium break-words">{value || "-"}</p>
      </div>
    </div>
  );

  const BooleanIndicator = ({ value }: { value?: boolean }) => {
    if (value === undefined || value === false) {
      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">No</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 text-primary">
        <CheckCircle2 className="h-4 w-4" />
        <span className="text-sm font-medium">Yes</span>
      </div>
    );
  };

  const getDietaryLabel = (value?: string) => {
    const options: Record<string, string> = {
      none: "No Preference",
      vegetarian: "Vegetarian",
      indian_veg: "Indian Vegetarian (No Onion/Garlic)",
      vegan: "Vegan",
      jain: "Jain",
      halal: "Halal",
      kosher: "Kosher",
      other: "Other",
    };
    return options[value || "none"] || value || "No Preference";
  };

  const getBedTypeLabel = (value?: string) => {
    const options: Record<string, string> = {
      king: "King Bed",
      queen: "Queen Bed",
      twin: "Twin Beds",
    };
    return options[value || ""] || value || "-";
  };

  // Filter guests with any preferences
  const guestsWithPrefs = guestDetails.filter(
    (guest) =>
      guest.dietary_preference ||
      guest.food_allergies ||
      guest.medical_restrictions ||
      guest.bed_type
  );

  // Check for special occasions
  const specialOccasions = [];
  if (preferences?.honeymoon) specialOccasions.push("Honeymoon");
  if (preferences?.anniversary) specialOccasions.push("Anniversary");
  if (preferences?.birthday) specialOccasions.push("Birthday");

  // Check if room arrangements section has data
  const hasRoomArrangements =
    !!preferences?.interconnecting_rooms ||
    !!preferences?.special_room_requests;

  // Check if transfer section has data
  const hasTransferData =
    (preferences?.luggage_checkin && preferences.luggage_checkin > 0) ||
    (preferences?.luggage_cabin && preferences.luggage_cabin > 0) ||
    !!preferences?.oversized_luggage ||
    !!preferences?.child_seat_required;

  // Check if special occasions section has data
  const hasSpecialOccasions =
    specialOccasions.length > 0 || !!preferences?.other_requests;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-background flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Dietary, room, and special requests
          </p>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
          <Edit className="h-3.5 w-3.5" />
          Edit Preferences
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="space-y-6 py-5 px-4">
          {/* Guest Preferences - Grouped by Person */}
          <Show when={guestsWithPrefs.length > 0}>
            <BorderedCard
              title="Guest Preferences"
              variant="dashed"
              collapsible
              defaultOpen
            >
              <div className="space-y-4 mt-4">
                {guestsWithPrefs.map((guest, index) => {
                  const guestName = `${guest.first_name} ${guest.last_name}`;
                  const hasDietary =
                    guest.dietary_preference ||
                    guest.food_allergies ||
                    guest.medical_restrictions;
                  const hasBedding = guest.bed_type;

                  return (
                    <BorderedCard key={index} title={guestName}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Dietary Information */}
                        {hasDietary && (
                          <>
                            <InfoRow
                              icon={Utensils}
                              label="Dietary Preference"
                              value={
                                <>
                                  {getDietaryLabel(guest.dietary_preference)}
                                  {guest.dietary_preference === "other" &&
                                    guest.dietary_custom && (
                                      <span className="text-xs text-muted-foreground ml-2">
                                        ({guest.dietary_custom})
                                      </span>
                                    )}
                                </>
                              }
                            />
                            {guest.food_allergies && (
                              <InfoRow
                                icon={Utensils}
                                label="Food Allergies"
                                value={guest.food_allergies}
                              />
                            )}
                          </>
                        )}

                        {/* Bedding Preference */}
                        {hasBedding && (
                          <InfoRow
                            icon={Hotel}
                            label="Bed Preference"
                            value={getBedTypeLabel(guest.bed_type)}
                          />
                        )}

                        {/* Medical Restrictions - Full Width */}
                        {guest.medical_restrictions && (
                          <div className="md:col-span-2">
                            <InfoRow
                              icon={Utensils}
                              label="Medical Restrictions"
                              value={guest.medical_restrictions}
                            />
                          </div>
                        )}
                      </div>
                    </BorderedCard>
                  );
                })}
              </div>
            </BorderedCard>
          </Show>

          {/* Room Arrangements */}
          <Show when={hasRoomArrangements}>
            <BorderedCard
              title="Room Arrangements"
              variant="dashed"
              collapsible
              defaultOpen
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Hotel className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Interconnecting Rooms
                    </p>
                    <BooleanIndicator
                      value={preferences?.interconnecting_rooms}
                    />
                  </div>
                </div>
                {preferences?.special_room_requests && (
                  <div className="md:col-span-2">
                    <InfoRow
                      icon={Hotel}
                      label="Special Room Requests"
                      value={preferences.special_room_requests}
                    />
                  </div>
                )}
              </div>
            </BorderedCard>
          </Show>

          {/* Transfer & Transport Preferences */}
          <Show when={hasTransferData}>
            <BorderedCard
              title="Transfer & Transport"
              variant="dashed"
              collapsible
              defaultOpen
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <InfoRow
                  icon={Luggage}
                  label="Check-in Luggage"
                  value={`${preferences?.luggage_checkin || 0} bags`}
                />
                <InfoRow
                  icon={Luggage}
                  label="Cabin Luggage"
                  value={`${preferences?.luggage_cabin || 0} bags`}
                />
                <div className="flex items-start gap-3">
                  <Luggage className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Oversized Luggage
                    </p>
                    <BooleanIndicator value={preferences?.oversized_luggage} />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Luggage className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">
                      Child Seat Required
                    </p>
                    <BooleanIndicator
                      value={preferences?.child_seat_required}
                    />
                  </div>
                </div>
                {preferences?.child_seat_required &&
                  preferences.child_seat_count && (
                    <InfoRow
                      icon={Luggage}
                      label="Number of Child Seats"
                      value={`${preferences.child_seat_count} seats`}
                    />
                  )}
              </div>
            </BorderedCard>
          </Show>

          {/* Special Requests & Occasions */}
          <Show when={hasSpecialOccasions}>
            <BorderedCard
              title="Special Occasions & Requests"
              variant="dashed"
              collapsible
              defaultOpen
            >
              <div className="space-y-4">
                {/* Special Occasions */}
                {specialOccasions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Celebrating
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {specialOccasions.map((occasion, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="gap-1.5"
                        >
                          <Heart className="h-3 w-3" />
                          {occasion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Requests */}
                {preferences?.other_requests && (
                  <div
                    className={
                      specialOccasions.length > 0 ? "pt-4 border-t" : ""
                    }
                  >
                    <InfoRow
                      icon={Heart}
                      label="Other Special Requests"
                      value={preferences.other_requests}
                      className="items-start"
                    />
                  </div>
                )}
              </div>
            </BorderedCard>
          </Show>
        </div>
      </ScrollArea>
    </div>
  );
}
