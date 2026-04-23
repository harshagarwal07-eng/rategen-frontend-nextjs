"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, Ellipsis, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addDays } from "date-fns";
import ItineraryCard from "./itinerary-card";
import { motion, AnimatePresence } from "framer-motion";
import { useItineraryMutations } from "../../hooks/use-itinerary-mutations";
import ActivityDetailsSheet from "./activity-details-sheet";
import HotelActivitySheet from "./hotel-activity-sheet";
import TourActivitySheet from "./tour-activity-sheet";
import TransferActivitySheet from "./transfer-activity-sheet";
import AddActivityPopover from "./add-activity-popover";
import EditDayTitleDialog from "./edit-day-title-dialog";
import {
  getActivitiesGroupedByDay,
  type ItineraryActivity,
} from "@/data-access/itinerary-activities";

// @dnd-kit imports
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ItinerariesProps {
  days: any[]; // Legacy - kept for backward compat during transition
  chatId: string;
  dmcId: string;
  isLoading?: boolean;
  itineraryData?: any;
  optionNumber?: number;
  isPanelExpanded?: boolean;
  onItineraryUpdate?: (newItineraryData: any) => void;
  checkInDate?: string; // For calculating day dates
  numNights?: number; // For determining number of days
  refreshKey?: number; // Trigger refetch when changed
}

// NOTE: expandHotelStaysForDisplay was removed
// Hotels are now stored per-night in itinerary_activities table
// Each night has its own hotel activity record with per-night pricing

// Sortable Activity Item Component
interface SortableActivityProps {
  activity: any;
  activityId: string;
  dayIndex: number;
  activityIndex: number;
  day: any;
  onCardClick: (activity: any) => void;
  renderCardActions: (dayIndex: number, activity: any) => React.ReactNode;
  getActivityDisplayName: (activity: any) => string;
  getActivityDescription: (activity: any) => string;
  isAnyDragging?: boolean;
}

function SortableActivity({
  activity,
  activityId,
  dayIndex,
  activityIndex,
  day,
  onCardClick,
  renderCardActions,
  getActivityDisplayName,
  getActivityDescription,
  isAnyDragging = false,
}: SortableActivityProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: activityId,
    data: {
      type: "activity",
      activity,
      dayIndex,
      activityIndex,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div className="relative">
      {/* Drop indicator - shows above this item when something is dragged over it */}
      {isOver && !isDragging && (
        <div className="absolute -top-1 left-7 right-0 h-1 bg-primary rounded-full z-10" />
      )}
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        variants={{
          hidden: { opacity: 0, x: -20 },
          visible: { opacity: 1, x: 0 },
        }}
        initial="hidden"
        animate="visible"
        exit={{ opacity: 0, x: -20 }}
        transition={{
          duration: 0.3,
          delay: activityIndex * 0.05,
          ease: "easeOut",
        }}
        className={cn(
          "flex gap-2 items-start group transition-all duration-200 cursor-grab active:cursor-grabbing",
          isDragging && "opacity-50 z-50",
          isAnyDragging && !isDragging && "ring-1 ring-dashed ring-muted-foreground/30 rounded-lg"
        )}
      >
        <div className="mt-3 shrink-0">
          <GripVertical className={cn(
            "h-5 w-5 transition-opacity",
            isAnyDragging ? "opacity-50" : "opacity-0 group-hover:opacity-50"
          )} />
        </div>
        <div className="flex-1 space-y-2">
          <ItineraryCard
            data={{
              id: activityId,
              category: activity.package_type || "tour",
              transferMode: activity.transfer_mode,
              name: getActivityDisplayName(activity),
              description: getActivityDescription(activity),
              price: activity.price || "0",
              date: activity.date || day.date,
              // Pass images for thumbnail
              images: activity.images,
              image_url: activity.image_url,
            }}
            onClick={() => onCardClick(activity)}
            actions={renderCardActions(dayIndex, activity)}
            showPrice={true}
          />
          {/* Meal Plan Card */}
          {activity.package_type === "hotel" && activity.meal_plan && (
            <ItineraryCard
              data={{
                id: `meal-plan-${activityId}`,
                category: "meal_plan",
                name: activity.meal_plan,
                description: "Included with accommodation",
                price: "0",
              }}
              showPrice={false}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Get display name for activity from table format
 */
function getActivityDisplayNameFromTable(activity: ItineraryActivity): string {
  switch (activity.service_type) {
    case "hotel":
      return (activity as any).hotel_name || "Hotel Stay";
    case "tour":
      return (activity as any).tour_name || "Tour";
    case "transfer":
      return (activity as any).transfer_name || "Transfer";
    case "combo":
      return (activity as any).activity_name || "Combo Package";
    case "meal":
      return (activity as any).activity_name || "Meal";
    case "activity":
      return (activity as any).activity_name || "Activity";
    default:
      return (activity as any).activity_name || activity.service_type || "Activity";
  }
}

export default function Itineraries({
  days: legacyDays,
  chatId,
  dmcId,
  isLoading = false,
  itineraryData,
  optionNumber = 1,
  isPanelExpanded = false,
  onItineraryUpdate,
  checkInDate,
  numNights,
  refreshKey,
}: ItinerariesProps) {
  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<any>(null);

  // Activity details sheet state
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  // Edit day title dialog state
  const [editTitleDialogOpen, setEditTitleDialogOpen] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState<number>(0);
  const [editingDayTitle, setEditingDayTitle] = useState<string>("");

  // Activities from normalized table
  const [tableActivities, setTableActivities] = useState<Record<number, ItineraryActivity[]>>({});
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  // Function to refresh activities
  const refreshActivities = useCallback(() => {
    setLocalRefreshKey((prev) => prev + 1);
  }, []);

  // Fetch activities from itinerary_activities table
  useEffect(() => {
    async function fetchActivities() {
      if (!chatId || isLoading) return;

      try {
        const activitiesByDay = await getActivitiesGroupedByDay(chatId, optionNumber);
        setTableActivities(activitiesByDay);
        setActivitiesLoaded(true);
      } catch (error) {
        console.error("[Itineraries] Error fetching activities:", error);
        setActivitiesLoaded(true); // Still mark as loaded to fallback to legacy
      }
    }

    fetchActivities();
  }, [chatId, optionNumber, isLoading, refreshKey, localRefreshKey]);

  // Build days from activities table (source of truth)
  const days = useMemo(() => {
    // If activities loaded from table, use them
    if (activitiesLoaded && Object.keys(tableActivities).length > 0) {
      const effectiveCheckIn = checkInDate || itineraryData?.check_in;
      const effectiveNights = numNights || itineraryData?.nights || Object.keys(tableActivities).length;

      // Build days array from activities
      const daysArray: any[] = [];
      for (let dayNum = 1; dayNum <= effectiveNights + 1; dayNum++) {
        const dayActivities = tableActivities[dayNum] || [];
        const dayDate = effectiveCheckIn
          ? format(addDays(new Date(effectiveCheckIn), dayNum - 1), "yyyy-MM-dd")
          : undefined;

        // Convert ItineraryActivity to the format the UI expects
        const convertedActivities = dayActivities.map((act) => ({
          activity_id: act.id,
          id: act.id,
          service_id: act.service_id, // Package/Room ID for fetching details
          service_parent_id: act.service_parent_id, // Parent entity ID (hotel_id, tour_id, transfer_id)
          package_type: act.service_type,
          service_type: act.service_type,
          activity: getActivityDisplayNameFromTable(act),
          title: getActivityDisplayNameFromTable(act),
          chat_id: act.chat_id,
          option_number: act.option_number,
          // Hotel specific
          hotel_name: (act as any).hotel_name,
          room_category: (act as any).rooms?.[0]?.room_category,
          rooms: (act as any).rooms,
          room_pax_distribution: (act as any).room_pax_distribution,
          meal_plan: (act as any).meal_plan,
          hotel_id: (act as any).hotel_id,
          room_id: (act as any).room_id,
          check_in_date: (act as any).check_in_date,
          check_out_date: (act as any).check_out_date,
          check_in_time: (act as any).check_in_time,
          check_out_time: (act as any).check_out_time,
          early_checkin: (act as any).early_checkin,
          late_checkout: (act as any).late_checkout,
          hotel_star_rating: (act as any).hotel_star_rating,
          hotel_city: (act as any).hotel_city,
          hotel_country: (act as any).hotel_country,
          hotel_phone: (act as any).hotel_phone,
          hotel_email: (act as any).hotel_email,
          meal_complimentary: (act as any).meal_complimentary,
          offers: (act as any).offers,
          remarks: (act as any).remarks,
          // Tour specific
          tour_name: (act as any).tour_name,
          tour_id: (act as any).tour_id,
          tour_date: (act as any).tour_date,
          // Generic activity name (combo, meal, activity types)
          activity_name: (act as any).activity_name,
          // Transfer specific
          transfer_name: (act as any).transfer_name,
          transfer_id: (act as any).transfer_id,
          transfer_mode: (act as any).transfer_mode,
          pickup_date: (act as any).pickup_date,
          pickup_point: (act as any).pickup_point,
          drop_point: (act as any).drop_point,
          service_context: (act as any).pickup_point && (act as any).drop_point
            ? `${(act as any).pickup_point} → ${(act as any).drop_point}`
            : undefined,
          // Passenger details (categorized by service age_policy)
          adults: act.adults,
          teens: act.teens,
          children: act.children,
          infants: act.infants,
          children_ages: act.children_ages,
          // Common
          notes: act.notes,
          status: "included",
          position: 0,
          price: act.sale_price?.toString() || "0",
          cost_price: act.cost_price,
          sale_price: act.sale_price,
          // Images
          images: (act as any).images,
          image_url: (act as any).image_url,
          // Library/manual hotel support
          library_item_id: (act as any).library_item_id,
          is_manual: (act as any).is_manual || false,
        }));

        daysArray.push({
          day: dayNum,
          title: itineraryData?.days?.[dayNum - 1]?.title || "", // Get title from legacy if available
          date: dayDate,
          activities: convertedActivities,
        });
      }
      return daysArray;
    }

    // Fallback to legacy days prop during transition
    return legacyDays;
  }, [tableActivities, activitiesLoaded, checkInDate, numNights, itineraryData, legacyDays]);

  // Itinerary mutations hook
  const mutations = useItineraryMutations({
    chatId,
    optionNumber,
    itineraryData,
    onUpdate: (newData) => {
      onItineraryUpdate?.(newData);
      // Refresh activities from table after mutation
      getActivitiesGroupedByDay(chatId, optionNumber).then(setTableActivities);
    },
  });

  // Hotels are now stored per-night in the database, no expansion needed

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate unique IDs for all activities
  const getActivityId = useCallback((dayIndex: number, activity: any, activityIndex: number) => {
    return activity.activity_id || activity.id || `activity-${dayIndex}-${activityIndex}`;
  }, []);

  // Get all activity IDs for a day
  const getActivityIds = useCallback(
    (dayIndex: number, activities: any[]) => {
      return activities.map((activity, idx) => getActivityId(dayIndex, activity, idx));
    },
    [getActivityId]
  );

  // Find activity by ID
  const findActivity = useCallback(
    (id: string) => {
      for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
        const activities = days[dayIndex].activities || [];
        for (let activityIndex = 0; activityIndex < activities.length; activityIndex++) {
          const activityId = getActivityId(dayIndex, activities[activityIndex], activityIndex);
          if (activityId === id) {
            return { dayIndex, activityIndex, activity: activities[activityIndex] };
          }
        }
      }
      return null;
    },
    [days, getActivityId]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveId(active.id as string);

      const found = findActivity(active.id as string);
      if (found) {
        setActiveActivity(found.activity);
      }
    },
    [findActivity]
  );

  // Handle drag over (for moving between days)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    // This is handled by the drag end for simplicity
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setActiveActivity(null);

      if (!over) return;

      const activeData = findActivity(active.id as string);
      const overData = findActivity(over.id as string);

      if (!activeData) return;

      const sourceDayIndex = activeData.dayIndex;
      const sourceActivityIndex = activeData.activityIndex;

      if (overData) {
        const targetDayIndex = overData.dayIndex;
        const targetActivityIndex = overData.activityIndex;

        if (sourceDayIndex === targetDayIndex) {
          // Reorder within same day
          if (sourceActivityIndex !== targetActivityIndex) {
            await mutations.reorderActivities(sourceDayIndex, sourceActivityIndex, targetActivityIndex);
          }
        } else {
          // Move between days
          await mutations.moveActivityBetweenDays(
            sourceDayIndex,
            targetDayIndex,
            active.id as string,
            targetActivityIndex
          );
        }
      }
    },
    [findActivity, mutations]
  );

  // Handle card click - open details sheet
  const handleCardClick = useCallback((activity: any) => {
    setSelectedActivity(activity);
    setDetailsSheetOpen(true);
  }, []);

  // Handle edit title
  const handleEditTitle = useCallback((dayIndex: number, currentTitle: string) => {
    setEditingDayIndex(dayIndex);
    setEditingDayTitle(currentTitle || "");
    setEditTitleDialogOpen(true);
  }, []);

  // Handle add activity
  const handleAddActivity = useCallback(
    async (dayIndex: number, activity: any) => {
      const result = await mutations.addActivity(dayIndex, activity);

      // If hotel with autoOpenSheet flag, open the hotel sheet
      if (activity.package_type === "hotel" && activity.autoOpenSheet && result) {
        // Set the activity to open in the sheet
        const hotelActivity = {
          ...activity,
          id: result.activity?.id || activity.activity_id,
          service_type: "hotel",
          service_id: activity.room_id || null, // room_id (null for library hotels)
          service_parent_id: activity.hotel_id || null, // hotel_id (null for library hotels)
          library_item_id: activity.library_item_id || null,
          is_manual: activity.is_manual || false,
          chat_id: chatId,
          option_number: optionNumber,
        };
        setSelectedActivity(hotelActivity);
        setDetailsSheetOpen(true);
      }
    },
    [mutations, chatId, optionNumber]
  );

  // Render activity card actions dropdown
  const renderCardActions = useCallback(
    (dayIndex: number, activity: any) => {
      const activityId = activity.activity_id || activity.id;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <Ellipsis className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="left" sideOffset={7} onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onSelect={() => handleCardClick(activity)}>View Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => mutations.moveActivityToPreviousDay(dayIndex, activityId)}
              disabled={dayIndex === 0}
            >
              Move to previous day
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => mutations.moveActivityToNextDay(dayIndex, activityId)}
              disabled={dayIndex >= days.length - 1}
            >
              Move to next day
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => mutations.updateActivityStatus(dayIndex, activityId, "included")}
              disabled={activity.status === "included"}
            >
              Mark as included
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => mutations.updateActivityStatus(dayIndex, activityId, "excluded")}
              disabled={activity.status === "excluded"}
            >
              Mark as excluded
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => mutations.updateActivityStatus(dayIndex, activityId, "optional")}
              disabled={activity.status === "optional"}
            >
              Mark as optional
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => mutations.updateActivityStatus(dayIndex, activityId, "suggestion")}
              disabled={activity.status === "suggestion"}
            >
              Mark as suggestion
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => mutations.removeActivity(dayIndex, activityId)}
              className="text-destructive"
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    [handleCardClick, mutations, days.length]
  );

  // Animation variants
  const dayVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
  };

  // Helper to get display name for activity
  const getActivityDisplayName = (activity: any): string => {
    if (activity.package_type === "hotel") {
      const hotelName = activity.hotel_name || activity.title || activity.activity || "Hotel";
      const roomCategory = activity.room_category;
      if (roomCategory) {
        return `${hotelName} - ${roomCategory}`;
      }
      return hotelName;
    }
    if (activity.package_type === "combo" || activity.package_type === "meal" || activity.package_type === "activity") {
      return activity.activity_name || activity.title || activity.activity || activity.package_type;
    }
    return activity.title || activity.activity || "Untitled";
  };

  // Helper to get description for activity
  const getActivityDescription = (activity: any): string => {
    if (activity.package_type === "hotel" && activity.meal_plan) {
      return activity.meal_plan;
    }
    if (activity.package_type === "transfer" && activity.service_context) {
      return activity.service_context;
    }
    return activity.description || activity.time || "";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium">Generating your itinerary...</p>
          <p className="text-xs text-muted-foreground">Finding the best activities and accommodations</p>
        </div>
        <div className="w-full space-y-4 px-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-12 bg-muted rounded-lg" />
              <div className="h-24 bg-muted/50 rounded-lg ml-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <Accordion type="multiple" className="w-full">
          <AnimatePresence mode="popLayout">
            {days.map((day, index) => {
              const activities = day.activities || [];
              const activityIds = getActivityIds(index, activities);

              return (
                <motion.div
                  key={day.day || index}
                  variants={dayVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <AccordionItem
                    value={`day-${index}`}
                    className="border-0 overflow-hidden border-b-2 border-border last:border-0 px-0"
                  >
                    <div className="relative">
                      <AccordionTrigger className="w-full py-3 pr-10 hover:no-underline flex items-center justify-between [&[data-state=open]>svg]:rotate-180 flex-row-reverse gap-2 [&_svg]:stroke-primary bg-transparent cursor-pointer">
                        <div className="flex items-center gap-3 text-left flex-1 min-w-0 text-base font-normal">
                          <span className="shrink-0">Day {index + 1}</span>
                          <span className="text-primary font-medium truncate min-w-0">
                            {day.title || "Add Title"}
                          </span>
                          {day.date && (
                            <span className="text-sm text-muted-foreground shrink-0 whitespace-nowrap">
                              {format(new Date(day.date), "EEE, MMM d")}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>

                      {/* Day actions dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="absolute right-0 top-3 hover:text-primary transition-colors p-1 z-10">
                            <Ellipsis className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" side="bottom" sideOffset={7}>
                          <DropdownMenuItem onClick={() => handleEditTitle(index, day.title || "")}>
                            Edit title
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => mutations.addDayBefore(index)}>
                            Add day before
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => mutations.addDayAfter(index)}>
                            Add day after
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => mutations.clearDay(index)}>Clear day</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => mutations.removeDay(index)}
                            className="text-destructive"
                            disabled={days.length <= 1}
                          >
                            Remove day
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <AccordionContent className="space-y-2">
                      <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
                        {activities.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className={cn(
                              "text-center py-8 text-muted-foreground px-4 rounded-lg transition-all",
                              activeId && "border-2 border-dashed border-primary/50 bg-primary/5"
                            )}
                          >
                            <p>{activeId ? "Drop here" : "No activities planned yet"}</p>
                            <p className="text-sm mt-1">
                              {activeId ? "Release to add to this day" : "Add activities using the button below"}
                            </p>
                          </motion.div>
                        ) : (
                          <AnimatePresence mode="popLayout">
                            {activities
                              .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
                              .map((activity: any, activityIndex: number) => {
                                const activityId = getActivityId(index, activity, activityIndex);

                                return (
                                  <SortableActivity
                                    key={activityId}
                                    activity={activity}
                                    activityId={activityId}
                                    dayIndex={index}
                                    activityIndex={activityIndex}
                                    day={day}
                                    onCardClick={handleCardClick}
                                    renderCardActions={renderCardActions}
                                    getActivityDisplayName={getActivityDisplayName}
                                    getActivityDescription={getActivityDescription}
                                    isAnyDragging={!!activeId}
                                  />
                                );
                              })}
                          </AnimatePresence>
                        )}
                      </SortableContext>

                      {/* Add Activity Button */}
                      <AddActivityPopover
                        trigger={
                          <Button variant="outline" className="border-2 border-primary text-primary ml-7 mt-2">
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        }
                        onAddActivity={(activity) => handleAddActivity(index, activity)}
                        dayIndex={index}
                        isPanelExpanded={isPanelExpanded}
                        itineraryNights={numNights || itineraryData?.nights}
                        itineraryCheckIn={checkInDate || itineraryData?.check_in}
                        travelers={{
                          adults: itineraryData?.travelers?.adults || itineraryData?.adults || 2,
                          teens: itineraryData?.travelers?.teens || 0,
                          children: itineraryData?.travelers?.children || itineraryData?.children || 0,
                          infants: itineraryData?.travelers?.infants || 0,
                          children_ages: itineraryData?.travelers?.children_ages || itineraryData?.children_ages || [],
                        }}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Accordion>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeId && activeActivity ? (
            <div className="opacity-80 bg-background rounded-lg shadow-lg p-2">
              <ItineraryCard
                data={{
                  id: activeId,
                  category: activeActivity.package_type || "tour",
                  transferMode: activeActivity.transfer_mode,
                  name: getActivityDisplayName(activeActivity),
                  description: getActivityDescription(activeActivity),
                  price: activeActivity.price || "0",
                  images: activeActivity.images,
                  image_url: activeActivity.image_url,
                }}
                showPrice={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Activity Details Sheet - Use specialized sheets by service type */}
      {selectedActivity?.service_type === "hotel" ? (
        <HotelActivitySheet
          open={detailsSheetOpen}
          onOpenChange={setDetailsSheetOpen}
          activity={selectedActivity}
          onActivityUpdate={(updated) => {
            setSelectedActivity(updated);
          }}
          onRefresh={refreshActivities}
        />
      ) : selectedActivity?.service_type === "tour" ? (
        <TourActivitySheet
          open={detailsSheetOpen}
          onOpenChange={setDetailsSheetOpen}
          activity={selectedActivity}
          onActivityUpdate={(updated) => {
            setSelectedActivity(updated);
          }}
          onRefresh={refreshActivities}
        />
      ) : selectedActivity?.service_type === "transfer" ? (
        <TransferActivitySheet
          open={detailsSheetOpen}
          onOpenChange={setDetailsSheetOpen}
          activity={selectedActivity}
          onActivityUpdate={(updated) => {
            setSelectedActivity(updated);
          }}
          onRefresh={refreshActivities}
        />
      ) : (
        <ActivityDetailsSheet
          open={detailsSheetOpen}
          onOpenChange={setDetailsSheetOpen}
          activity={selectedActivity}
        />
      )}

      {/* Edit Day Title Dialog */}
      <EditDayTitleDialog
        open={editTitleDialogOpen}
        onOpenChange={setEditTitleDialogOpen}
        dayIndex={editingDayIndex}
        currentTitle={editingDayTitle}
        onSave={mutations.updateDayTitle}
      />
    </>
  );
}
