"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BorderedCard } from "@/components/ui/bordered-card";
import {
  Edit,
  User,
  Users,
  Phone,
  Globe,
  Calendar,
  Activity,
  FileText,
} from "lucide-react";
import type { GuestDetail } from "@/types/questionnaire";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";

interface GuestDetailsViewProps {
  leadGuest: GuestDetail;
  passengers: GuestDetail[];
  onEdit: () => void;
}

export function GuestDetailsView({
  leadGuest,
  passengers,
  onEdit,
}: GuestDetailsViewProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "MMM dd, yyyy");
    } catch {
      return "-";
    }
  };

  const getPassengerTypeLabel = (type: string) => {
    switch (type) {
      case "adult":
        return "Adult (12+)";
      case "child":
        return "Child (2-11)";
      case "infant":
        return "Infant (0-1)";
      default:
        return "Lead Guest";
    }
  };

  const InfoRow = ({
    icon: Icon,
    label,
    value,
  }: {
    icon: LucideIcon;
    label: string;
    value: string;
  }) => (
    <div className="flex items-start gap-3">
      <div className="mt-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium break-words">{value || "-"}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 bg-background flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Guest Details</h2>
          <p className="text-sm text-muted-foreground">
            Complete information for all passengers
          </p>
        </div>
        <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
          <Edit className="h-3.5 w-3.5" />
          Edit Details
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        <div className="space-y-6 py-5 px-4">
          {/* Lead Guest Section */}
          <BorderedCard title="" variant="dashed" collapsible defaultOpen>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <h3 className="text-base font-semibold text-foreground">
                  {`${leadGuest.title || ""} ${leadGuest.first_name || ""} ${
                    leadGuest.last_name || ""
                  }`
                    .trim()
                    .toUpperCase()}
                </h3>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                  Lead Guest - Primary Contact
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <InfoRow
                  icon={User}
                  label="Gender"
                  value={
                    leadGuest.gender
                      ? leadGuest.gender.charAt(0).toUpperCase() +
                        leadGuest.gender.slice(1)
                      : "-"
                  }
                />
                <InfoRow
                  icon={Calendar}
                  label="Date of Birth"
                  value={formatDate(leadGuest.date_of_birth)}
                />
                <InfoRow
                  icon={Globe}
                  label="Nationality"
                  value={leadGuest.nationality_name || "-"}
                />
                <InfoRow
                  icon={FileText}
                  label="Passport Number"
                  value={leadGuest.passport_number || "-"}
                />
                <InfoRow
                  icon={Calendar}
                  label="Passport Issue Date"
                  value={formatDate(leadGuest.passport_issue_date)}
                />
                <InfoRow
                  icon={Calendar}
                  label="Passport Expiry"
                  value={formatDate(leadGuest.passport_expiry)}
                />
                <InfoRow
                  icon={Phone}
                  label="Contact Mobile"
                  value={leadGuest.contact_mobile || "-"}
                />
              </div>
            </div>
            {/* Medical & Mobility Section */}
            {(leadGuest.medical_conditions ||
              leadGuest.mobility_assistance) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {leadGuest.medical_conditions && (
                  <InfoRow
                    icon={Activity}
                    label="Medical Conditions"
                    value={leadGuest.medical_conditions}
                  />
                )}
                {leadGuest.mobility_assistance && (
                  <InfoRow
                    icon={Activity}
                    label="Mobility Assistance"
                    value={leadGuest.mobility_assistance}
                  />
                )}
              </div>
            )}
          </BorderedCard>

          {/* Other Passengers Section */}
          {passengers.length > 0 && (
          <BorderedCard
            title={`Other Passengers (${passengers.length})`}
            variant="dashed"
            collapsible
            defaultOpen
          >
              <div className="space-y-5 mt-4">
                {passengers.map((passenger, index) => {
                  const displayName = passenger.first_name
                    ? `${passenger.title || ""} ${passenger.first_name} ${
                        passenger.last_name || ""
                      }`.trim()
                    : `Passenger ${index + 2}`;

                  return (
                    <BorderedCard key={index} title="">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b">
                          <h3 className="text-base font-semibold text-foreground">
                            {displayName.toUpperCase()}
                          </h3>
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                            {getPassengerTypeLabel(passenger.type || "adult")}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <InfoRow
                            icon={User}
                            label="Gender"
                            value={
                              passenger.gender
                                ? passenger.gender.charAt(0).toUpperCase() +
                                  passenger.gender.slice(1)
                                : "-"
                            }
                          />
                          <InfoRow
                            icon={Calendar}
                            label="Date of Birth"
                            value={formatDate(passenger.date_of_birth)}
                          />
                          <InfoRow
                            icon={Globe}
                            label="Nationality"
                            value={passenger.nationality_name || "-"}
                          />
                          <InfoRow
                            icon={FileText}
                            label="Passport Number"
                            value={passenger.passport_number || "-"}
                          />
                          <InfoRow
                            icon={Calendar}
                            label="Passport Issue Date"
                            value={formatDate(passenger.passport_issue_date)}
                          />
                          <InfoRow
                            icon={Calendar}
                            label="Passport Expiry"
                            value={formatDate(passenger.passport_expiry)}
                          />
                        </div>
                        {/* Medical & Mobility Section */}
                        {(passenger.medical_conditions ||
                          passenger.mobility_assistance) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                            {passenger.medical_conditions && (
                              <InfoRow
                                icon={Activity}
                                label="Medical Conditions"
                                value={passenger.medical_conditions}
                              />
                            )}
                            {passenger.mobility_assistance && (
                              <InfoRow
                                icon={Activity}
                                label="Mobility Assistance"
                                value={passenger.mobility_assistance}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </BorderedCard>
                  );
                })}
              </div>
          </BorderedCard>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
