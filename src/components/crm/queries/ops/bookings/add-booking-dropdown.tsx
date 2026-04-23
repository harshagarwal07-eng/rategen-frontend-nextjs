"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { getAvailableActivitiesForBooking } from "@/data-access/bookings";
import { cn } from "@/lib/utils";
import type { ActivityDropdownItem } from "@/types/ops-bookings";
import BookingFormOrchestrator from "@/components/forms/ops-forms/booking-form-orchestrator";

interface AddBookingDropdownProps {
  queryId: string;
  optionNumber?: number | null;
  className?: string;
}

export function AddBookingDropdown({ queryId, optionNumber, className }: AddBookingDropdownProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

  // Fetch available activities
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["available-activities", queryId, optionNumber],
    queryFn: () => getAvailableActivitiesForBooking(queryId, optionNumber),
    enabled: !!queryId && open, // Only fetch when dropdown opens
  });

  // Handle activity selection
  const handleSelectActivity = (activity: ActivityDropdownItem) => {
    setSelectedActivityId(activity.id);
    setOpen(false);
  };

  // Handle form close
  const handleCloseForm = () => {
    setSelectedActivityId(null);
  };

  // Handle form success
  const handleFormSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["query-bookings", queryId] });
    queryClient.invalidateQueries({ queryKey: ["available-activities", queryId] });
  };

  // Get service name from activity
  const getServiceName = (activity: ActivityDropdownItem): string => {
    if (activity.service_type === "hotel") {
      return activity.hotel_name || "Hotel";
    } else if (activity.service_type === "tour") {
      return activity.tour_name || "Tour";
    } else if (activity.service_type === "transfer") {
      return activity.transfer_name || "Transfer";
    }
    return "Unknown Service";
  };

  // Get service date from activity
  const getServiceDate = (activity: ActivityDropdownItem): string => {
    let dateString: string | undefined;

    if (activity.service_type === "hotel" && activity.check_in_date) {
      dateString = activity.check_in_date;
    } else if (activity.service_type === "tour" && activity.tour_date) {
      dateString = activity.tour_date;
    } else if (activity.service_type === "transfer" && activity.pickup_date) {
      dateString = activity.pickup_date;
    }

    return dateString ? format(parseISO(dateString), "MMM d") : "";
  };

  return (
    <div className={cn(className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-full text-xs">
            <Plus className="h-3 w-3 mr-1.5" />
            Add Booking
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[400px] p-0">
          <Command>
            <CommandInput placeholder="Search activities..." className="h-9" />
            <CommandList>
              <CommandEmpty>
                {isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : (
                  "No activities found."
                )}
              </CommandEmpty>
              <CommandGroup>
                {activities.map((activity) => (
                  <CommandItem
                    key={activity.id}
                    value={`${getServiceName(activity)} ${activity.service_type} day ${activity.day_number} ${getServiceDate(activity)}`}
                    onSelect={() => handleSelectActivity(activity)}
                    className="flex items-center gap-2 py-2 cursor-pointer"
                  >
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal">
                      Day {activity.day_number}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 shrink-0 font-normal capitalize">
                      {activity.service_type}
                    </Badge>
                    <span className="text-xs font-medium truncate flex-1">{getServiceName(activity)}</span>
                    {getServiceDate(activity) && (
                      <span className="text-[10px] text-muted-foreground shrink-0">{getServiceDate(activity)}</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Booking Form Modal */}
      <BookingFormOrchestrator
        isOpen={!!selectedActivityId}
        queryId={queryId}
        activityId={selectedActivityId || ""}
        onClose={handleCloseForm}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
