"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { updateChatItinerary } from "@/data-access/chat-itinerary";
import {
  updateActivity,
  deleteActivity as deleteActivityFromTable,
  moveActivityToDay,
  createActivitiesBulk,
  type CreateActivityInput,
} from "@/data-access/itinerary-activities";
import { addActivityWithRates, addMultiNightHotelWithRates } from "@/data-access/add-activity-with-rates";
import { getChatItinerary } from "@/data-access/chat-itinerary";
import { toast } from "sonner";

interface Day {
  day?: number;
  title?: string;
  date?: string;
  activities?: Activity[];
}

interface Activity {
  activity_id?: string;
  id?: string;
  package_type?: string;
  activity?: string;
  title?: string;
  position?: number;
  status?: "included" | "excluded" | "optional" | "suggestion";
  [key: string]: any;
}

interface UseItineraryMutationsProps {
  chatId: string;
  optionNumber: number;
  itineraryData: any;
  onUpdate: (newItineraryData: any) => void;
}

export function useItineraryMutations({
  chatId,
  optionNumber,
  itineraryData,
  onUpdate,
}: UseItineraryMutationsProps) {
  const [isSaving, setIsSaving] = useState(false);

  // Use ref to always have access to the latest itineraryData
  // This prevents stale closure issues when mutations are called in sequence
  const itineraryDataRef = useRef(itineraryData);
  useEffect(() => {
    itineraryDataRef.current = itineraryData;
  }, [itineraryData]);

  // Helper to save changes to database
  const saveChanges = useCallback(
    async (newItineraryData: any, changeDescription: string) => {
      setIsSaving(true);
      try {
        const result = await updateChatItinerary(
          chatId,
          {
            itinerary_data: newItineraryData,
            change_type: "manual_edit",
            change_description: changeDescription,
          },
          optionNumber
        );

        if (result) {
          onUpdate(newItineraryData);
          return true;
        } else {
          toast.error("Failed to save changes");
          return false;
        }
      } catch (error) {
        console.error("[useItineraryMutations] Error saving:", error);
        toast.error("Failed to save changes");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [chatId, optionNumber, onUpdate]
  );

  // =====================================================
  // DAY OPERATIONS
  // =====================================================

  /**
   * Add a new day before the specified index
   */
  const addDayBefore = useCallback(
    async (dayIndex: number) => {
      const days = [...(itineraryDataRef.current?.days || [])];
      const targetDay = days[dayIndex];

      // Create new day
      const newDay: Day = {
        day: dayIndex + 1,
        title: "Free Day",
        date: targetDay?.date, // Will need to shift dates
        activities: [],
      };

      // Insert new day
      days.splice(dayIndex, 0, newDay);

      // Renumber all days
      const updatedDays = days.map((day, idx) => ({
        ...day,
        day: idx + 1,
      }));

      const newItineraryData = { ...itineraryDataRef.current, days: updatedDays };
      const success = await saveChanges(newItineraryData, `Added day before Day ${dayIndex + 1}`);
      if (success) {
        toast.success("Day added successfully");
      }
      return success;
    },
    [saveChanges]
  );

  /**
   * Add a new day after the specified index
   */
  const addDayAfter = useCallback(
    async (dayIndex: number) => {
      const days = [...(itineraryDataRef.current?.days || [])];
      const targetDay = days[dayIndex];

      // Create new day
      const newDay: Day = {
        day: dayIndex + 2,
        title: "Free Day",
        date: targetDay?.date, // Will need to shift dates
        activities: [],
      };

      // Insert new day after
      days.splice(dayIndex + 1, 0, newDay);

      // Renumber all days
      const updatedDays = days.map((day, idx) => ({
        ...day,
        day: idx + 1,
      }));

      const newItineraryData = { ...itineraryDataRef.current, days: updatedDays };
      const success = await saveChanges(newItineraryData, `Added day after Day ${dayIndex + 1}`);
      if (success) {
        toast.success("Day added successfully");
      }
      return success;
    },
    [saveChanges]
  );

  /**
   * Remove a day
   */
  const removeDay = useCallback(
    async (dayIndex: number) => {
      const days = [...(itineraryDataRef.current?.days || [])];

      if (days.length <= 1) {
        toast.error("Cannot remove the last day");
        return false;
      }

      // Remove the day
      days.splice(dayIndex, 1);

      // Renumber all days
      const updatedDays = days.map((day, idx) => ({
        ...day,
        day: idx + 1,
      }));

      const newItineraryData = { ...itineraryDataRef.current, days: updatedDays };
      const success = await saveChanges(newItineraryData, `Removed Day ${dayIndex + 1}`);
      if (success) {
        toast.success("Day removed successfully");
      }
      return success;
    },
    [saveChanges]
  );

  /**
   * Clear all activities from a day
   */
  const clearDay = useCallback(
    async (dayIndex: number) => {
      const days = [...(itineraryDataRef.current?.days || [])];

      days[dayIndex] = {
        ...days[dayIndex],
        activities: [],
      };

      const newItineraryData = { ...itineraryDataRef.current, days };
      const success = await saveChanges(newItineraryData, `Cleared Day ${dayIndex + 1}`);
      if (success) {
        toast.success("Day cleared successfully");
      }
      return success;
    },
    [saveChanges]
  );

  /**
   * Update day title
   */
  const updateDayTitle = useCallback(
    async (dayIndex: number, newTitle: string) => {
      const days = [...(itineraryDataRef.current?.days || [])];

      days[dayIndex] = {
        ...days[dayIndex],
        title: newTitle,
      };

      const newItineraryData = { ...itineraryDataRef.current, days };
      const success = await saveChanges(newItineraryData, `Updated Day ${dayIndex + 1} title`);
      if (success) {
        toast.success("Title updated");
      }
      return success;
    },
    [saveChanges]
  );

  // =====================================================
  // ACTIVITY OPERATIONS
  // =====================================================

  /**
   * Move activity to previous day
   */
  const moveActivityToPreviousDay = useCallback(
    async (dayIndex: number, activityId: string) => {
      if (dayIndex === 0) {
        toast.error("Cannot move to previous day - already on Day 1");
        return false;
      }

      setIsSaving(true);
      try {
        // Update activity in table (day_number is 1-indexed, dayIndex is 0-indexed)
        const newDayNumber = dayIndex; // Previous day = current dayIndex (since day_number = dayIndex + 1)
        const success = await moveActivityToDay(activityId, newDayNumber);

        if (success) {
          // Also update JSONB for backward compat
          const days = [...(itineraryDataRef.current?.days || [])];
          const currentDay = days[dayIndex];
          const previousDay = days[dayIndex - 1];

          const activityIndex = currentDay.activities?.findIndex(
            (a: Activity) => (a.activity_id || a.id) === activityId
          );

          if (activityIndex !== -1 && activityIndex !== undefined) {
            const activity = currentDay.activities[activityIndex];
            currentDay.activities.splice(activityIndex, 1);
            previousDay.activities = [...(previousDay.activities || []), activity];
            days[dayIndex] = currentDay;
            days[dayIndex - 1] = previousDay;

            const newItineraryData = { ...itineraryDataRef.current, days };
            await saveChanges(newItineraryData, `Moved activity to Day ${dayIndex}`);
          }

          toast.success("Activity moved to previous day");
          return true;
        } else {
          toast.error("Failed to move activity");
          return false;
        }
      } catch (error) {
        console.error("[moveActivityToPreviousDay] Error:", error);
        toast.error("Failed to move activity");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [saveChanges]
  );

  /**
   * Move activity to next day
   */
  const moveActivityToNextDay = useCallback(
    async (dayIndex: number, activityId: string) => {
      const days = [...(itineraryDataRef.current?.days || [])];

      if (dayIndex >= days.length - 1) {
        toast.error("Cannot move to next day - already on last day");
        return false;
      }

      setIsSaving(true);
      try {
        // Update activity in table (day_number is 1-indexed, dayIndex is 0-indexed)
        const newDayNumber = dayIndex + 2; // Next day = dayIndex + 2
        const success = await moveActivityToDay(activityId, newDayNumber);

        if (success) {
          // Also update JSONB for backward compat
          const currentDay = days[dayIndex];
          const nextDay = days[dayIndex + 1];

          const activityIndex = currentDay.activities?.findIndex(
            (a: Activity) => (a.activity_id || a.id) === activityId
          );

          if (activityIndex !== -1 && activityIndex !== undefined) {
            const activity = currentDay.activities[activityIndex];
            currentDay.activities.splice(activityIndex, 1);
            nextDay.activities = [...(nextDay.activities || []), activity];
            days[dayIndex] = currentDay;
            days[dayIndex + 1] = nextDay;

            const newItineraryData = { ...itineraryDataRef.current, days };
            await saveChanges(newItineraryData, `Moved activity to Day ${dayIndex + 2}`);
          }

          toast.success("Activity moved to next day");
          return true;
        } else {
          toast.error("Failed to move activity");
          return false;
        }
      } catch (error) {
        console.error("[moveActivityToNextDay] Error:", error);
        toast.error("Failed to move activity");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [saveChanges]
  );

  /**
   * Remove activity from a day
   */
  const removeActivity = useCallback(
    async (dayIndex: number, activityId: string) => {
      setIsSaving(true);
      try {
        // Delete from activities table (cascades to breakups via FK)
        const success = await deleteActivityFromTable(activityId);

        if (success) {
          // Also update JSONB for backward compat
          const days = [...(itineraryDataRef.current?.days || [])];
          const currentDay = days[dayIndex];

          const activityIndex = currentDay.activities?.findIndex(
            (a: Activity) => (a.activity_id || a.id) === activityId
          );

          if (activityIndex !== -1 && activityIndex !== undefined) {
            currentDay.activities.splice(activityIndex, 1);
            days[dayIndex] = currentDay;

            const newItineraryData = { ...itineraryDataRef.current, days };
            await saveChanges(newItineraryData, `Removed activity from Day ${dayIndex + 1}`);
          }

          toast.success("Activity removed");
          return true;
        } else {
          toast.error("Failed to remove activity");
          return false;
        }
      } catch (error) {
        console.error("[removeActivity] Error:", error);
        toast.error("Failed to remove activity");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [saveChanges]
  );

  /**
   * Update activity status (included/excluded/optional/suggestion)
   */
  const updateActivityStatus = useCallback(
    async (dayIndex: number, activityId: string, status: Activity["status"]) => {
      const days = [...(itineraryDataRef.current?.days || [])];
      const currentDay = days[dayIndex];

      // Find and update activity
      const activityIndex = currentDay.activities?.findIndex(
        (a: Activity) => (a.activity_id || a.id) === activityId
      );

      if (activityIndex === -1 || activityIndex === undefined) {
        toast.error("Activity not found");
        return false;
      }

      currentDay.activities[activityIndex] = {
        ...currentDay.activities[activityIndex],
        status,
      };

      days[dayIndex] = currentDay;

      const newItineraryData = { ...itineraryDataRef.current, days };
      const success = await saveChanges(newItineraryData, `Updated activity status to ${status}`);
      if (success) {
        toast.success(`Activity marked as ${status}`);
      }
      return success;
    },
    [saveChanges]
  );

  /**
   * Reorder activities within a day (drag and drop)
   */
  const reorderActivities = useCallback(
    async (dayIndex: number, fromIndex: number, toIndex: number) => {
      const days = [...(itineraryDataRef.current?.days || [])];
      const currentDay = days[dayIndex];
      const activities = [...(currentDay.activities || [])];

      // Remove from old position and insert at new position
      const [movedActivity] = activities.splice(fromIndex, 1);
      activities.splice(toIndex, 0, movedActivity);

      // Update positions
      const updatedActivities = activities.map((activity, idx) => ({
        ...activity,
        position: idx,
      }));

      days[dayIndex] = { ...currentDay, activities: updatedActivities };

      const newItineraryData = { ...itineraryDataRef.current, days };
      const success = await saveChanges(newItineraryData, `Reordered activities in Day ${dayIndex + 1}`);
      return success;
    },
    [saveChanges]
  );

  /**
   * Move activity between days (drag and drop across days)
   */
  const moveActivityBetweenDays = useCallback(
    async (fromDayIndex: number, toDayIndex: number, activityId: string, toPosition?: number) => {
      setIsSaving(true);
      try {
        // Update activity in table (day_number is 1-indexed, dayIndex is 0-indexed)
        const newDayNumber = toDayIndex + 1;
        const success = await moveActivityToDay(activityId, newDayNumber);

        if (success) {
          // Also update JSONB for backward compat
          const days = [...(itineraryDataRef.current?.days || [])];
          const fromDay = days[fromDayIndex];
          const toDay = days[toDayIndex];

          const activityIndex = fromDay.activities?.findIndex(
            (a: Activity) => (a.activity_id || a.id) === activityId
          );

          if (activityIndex !== -1 && activityIndex !== undefined) {
            const activity = fromDay.activities[activityIndex];
            fromDay.activities.splice(activityIndex, 1);

            const targetActivities = [...(toDay.activities || [])];
            const insertPosition = toPosition ?? targetActivities.length;
            targetActivities.splice(insertPosition, 0, activity);

            const updatedTargetActivities = targetActivities.map((a, idx) => ({
              ...a,
              position: idx,
            }));

            days[fromDayIndex] = fromDay;
            days[toDayIndex] = { ...toDay, activities: updatedTargetActivities };

            const newItineraryData = { ...itineraryDataRef.current, days };
            await saveChanges(
              newItineraryData,
              `Moved activity from Day ${fromDayIndex + 1} to Day ${toDayIndex + 1}`
            );
          }

          toast.success("Activity moved");
          return true;
        } else {
          toast.error("Failed to move activity");
          return false;
        }
      } catch (error) {
        console.error("[moveActivityBetweenDays] Error:", error);
        toast.error("Failed to move activity");
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [saveChanges]
  );

  /**
   * Add a new activity to a day - creates in DB with auto-rates
   * For hotels with multiple nights, creates one activity per night
   */
  const addActivity = useCallback(
    async (dayIndex: number, activity: Partial<Activity>) => {
      setIsSaving(true);
      try {
        // Determine service type and ID
        const serviceType = activity.package_type as "hotel" | "tour" | "transfer";
        let serviceId = "";
        let serviceName = activity.title || activity.activity || "";

        // Get the correct service_id based on type
        if (serviceType === "hotel") {
          serviceId = (activity as any).room_id || "";
        } else if (serviceType === "tour") {
          serviceId = (activity as any).tour_package_id || "";
        } else if (serviceType === "transfer") {
          serviceId = (activity as any).transfer_package_id || "";
        }

        // Calculate day date from itinerary data
        const days = itineraryDataRef.current?.days || [];
        const dayDate = days[dayIndex]?.date || new Date().toISOString().split("T")[0];

        // Check if this is a manual entry (library items or manual entries)
        const isManualHotel = serviceType === "hotel" && (activity as any).is_manual === true;
        const isManualTour = serviceType === "tour" && (activity as any).is_manual === true;
        const isManualTransfer = serviceType === "transfer" && (activity as any).is_manual === true;
        const nights = (activity as any).nights || 1;

        // Handle manual hotel entry (no rates from database)
        if (isManualHotel) {
          // Get itinerary metadata for creating activities
          const itinerary = await getChatItinerary(chatId, optionNumber);
          if (!itinerary) {
            toast.error("Failed to find itinerary");
            return null;
          }

          const { id: itineraryId, adults, children } = itinerary;
          const pax = {
            adults: adults || 2,
            children: children || 0,
          };

          // Create activities for each night
          const activityInputs: CreateActivityInput[] = [];
          for (let i = 0; i < nights; i++) {
            const nightDayNumber = dayIndex + 1 + i;
            const nightDate = new Date(dayDate);
            nightDate.setDate(nightDate.getDate() + i);
            const nightDateStr = nightDate.toISOString().split("T")[0];

            const activityInput: CreateActivityInput = {
              chat_id: chatId,
              itinerary_id: itineraryId,
              service_type: "hotel",
              service_id: null, // Manual/Library - no database reference
              library_item_id: (activity as any).library_item_id || null,
              day_number: nightDayNumber,
              day_date: nightDateStr,
              option_number: optionNumber,
              adults: pax.adults,
              teens: 0,
              children: pax.children,
              infants: 0,
              cost_price: (activity as any).base_rate_per_night || 0,
              sale_price: (activity as any).base_rate_per_night || 0,
              currency: (activity as any).currency || "USD",
              // Hotel-specific fields
              hotel_name: (activity as any).hotel_name,
              hotel_city: (activity as any).hotel_city,
              hotel_country: (activity as any).hotel_country,
              hotel_address: (activity as any).hotel_address,
              hotel_phone: (activity as any).hotel_phone,
              hotel_email: (activity as any).hotel_email,
              hotel_star_rating: (activity as any).hotel_star_rating,
              hotel_property_type: (activity as any).hotel_property_type,
              room_category: (activity as any).room_category,
              meal_plan: (activity as any).meal_plan,
              max_occupancy: (activity as any).max_occupancy,
              rooms: (activity as any).rooms,
              room_pax_distribution: (activity as any).room_pax_distribution,
              check_in_date: i === 0 ? (activity as any).check_in_date : undefined,
              check_out_date: i === nights - 1 ? (activity as any).check_out_date : undefined,
              offers: (activity as any).offers,
              notes: (activity as any).library_item_id ? `Library hotel` : `Manual hotel entry`,
              images: (activity as any).images || [],
            };

            activityInputs.push(activityInput);
          }

          // Bulk create activities
          const createdActivities = await createActivitiesBulk(activityInputs);
          if (createdActivities.length === 0) {
            toast.error("Failed to add manual hotel");
            return null;
          }

          // Update JSONB for all days
          for (let i = 0; i < createdActivities.length; i++) {
            const currentDayIndex = dayIndex + i;
            if (days[currentDayIndex]) {
              const currentDay = days[currentDayIndex];
              const newActivityEntry: Activity = {
                activity_id: createdActivities[i].id,
                position: currentDay?.activities?.length || 0,
                status: "included",
                ...activity,
                title: `${(activity as any).hotel_name} - ${(activity as any).room_category}`,
                is_manual: true,
              };
              days[currentDayIndex] = {
                ...currentDay,
                activities: [...(currentDay?.activities || []), newActivityEntry],
              };
            }
          }

          const newItineraryData = { ...itineraryDataRef.current, days };
          await saveChanges(newItineraryData, `Added manual ${nights}N hotel stay starting Day ${dayIndex + 1}`);

          toast.success(`Manual ${nights}-night hotel stay added`);

          return {
            success: true,
            activity: createdActivities[0],
            activities: createdActivities,
            breakups: [],
          };
        }

        // Handle manual tour entry (library tours or manual entries)
        if (isManualTour) {
          const itinerary = await getChatItinerary(chatId, optionNumber);
          if (!itinerary) {
            toast.error("Failed to find itinerary");
            return null;
          }

          const { id: itineraryId, adults, children } = itinerary;
          const pax = {
            adults: adults || 2,
            children: children || 0,
          };

          const activityInput: CreateActivityInput = {
            chat_id: chatId,
            itinerary_id: itineraryId,
            service_type: "tour",
            service_id: null, // Manual/Library - no database reference
            library_item_id: (activity as any).library_item_id || null,
            day_number: dayIndex + 1,
            day_date: dayDate,
            option_number: optionNumber,
            adults: pax.adults,
            teens: 0,
            children: pax.children,
            infants: 0,
            cost_price: 0,
            sale_price: 0,
            currency: (activity as any).currency || "USD",
            // Tour-specific fields
            tour_name: (activity as any).tour_name,
            tour_city: (activity as any).tour_city,
            tour_country: (activity as any).tour_country,
            package_name: (activity as any).package_name,
            package_description: (activity as any).package_description,
            categories: (activity as any).categories,
            duration: (activity as any).duration,
            tour_type: (activity as any).tour_type,
            includes_transfer: (activity as any).includes_transfer,
            meeting_point: (activity as any).meeting_point,
            pickup_point: (activity as any).pickup_point,
            dropoff_point: (activity as any).dropoff_point,
            start_date: (activity as any).start_date,
            start_time: (activity as any).start_time,
            end_date: (activity as any).end_date,
            end_time: (activity as any).end_time,
            operational_hours: (activity as any).operational_hours,
            inclusions: (activity as any).inclusions,
            exclusions: (activity as any).exclusions,
            cancellation_policy: (activity as any).cancellation_policy,
            agency_cancellation_policy: (activity as any).agency_cancellation_policy,
            age_policy: (activity as any).age_policy,
            add_ons: (activity as any).add_ons,
            seasons: (activity as any).seasons,
            notes: (activity as any).library_item_id ? `Library tour` : `Manual tour entry`,
            remarks: (activity as any).remarks,
            images: (activity as any).images || [],
          };

          const createdActivities = await createActivitiesBulk([activityInput]);
          if (createdActivities.length === 0) {
            toast.error("Failed to add manual tour");
            return null;
          }

          // Update JSONB
          const currentDay = days[dayIndex];
          const newActivityEntry: Activity = {
            activity_id: createdActivities[0].id,
            position: currentDay?.activities?.length || 0,
            status: "included",
            ...activity,
            title: (activity as any).tour_name || (activity as any).package_name || "Tour",
            is_manual: true,
          };
          days[dayIndex] = {
            ...currentDay,
            activities: [...(currentDay?.activities || []), newActivityEntry],
          };

          const newItineraryData = { ...itineraryDataRef.current, days };
          await saveChanges(newItineraryData, `Added manual tour to Day ${dayIndex + 1}`);

          toast.success("Manual tour added");

          return {
            success: true,
            activity: createdActivities[0],
            activities: createdActivities,
            breakups: [],
          };
        }

        // Handle manual transfer entry (library transfers or manual entries)
        if (isManualTransfer) {
          const itinerary = await getChatItinerary(chatId, optionNumber);
          if (!itinerary) {
            toast.error("Failed to find itinerary");
            return null;
          }

          const { id: itineraryId, adults, children } = itinerary;
          const pax = {
            adults: adults || 2,
            children: children || 0,
          };

          const activityInput: CreateActivityInput = {
            chat_id: chatId,
            itinerary_id: itineraryId,
            service_type: "transfer",
            service_id: null, // Manual/Library - no database reference
            library_item_id: (activity as any).library_item_id || null,
            day_number: dayIndex + 1,
            day_date: dayDate,
            option_number: optionNumber,
            adults: pax.adults,
            teens: 0,
            children: pax.children,
            infants: 0,
            cost_price: 0,
            sale_price: 0,
            currency: (activity as any).currency || "USD",
            // Transfer-specific fields
            transfer_name: (activity as any).transfer_name,
            transfer_city: (activity as any).transfer_city,
            transfer_country: (activity as any).transfer_country,
            package_name: (activity as any).package_name,
            package_description: (activity as any).package_description,
            transfer_mode: (activity as any).transfer_mode,
            transfer_type: (activity as any).transfer_type,
            is_sic: (activity as any).is_sic,
            pickup_date: (activity as any).pickup_date,
            pickup_time: (activity as any).pickup_time,
            pickup_point: (activity as any).pickup_point,
            drop_date: (activity as any).drop_date,
            drop_time: (activity as any).drop_time,
            drop_point: (activity as any).drop_point,
            meeting_point: (activity as any).meeting_point,
            duration_hours: (activity as any).duration_hours,
            duration_days: (activity as any).duration_days,
            distance_km: (activity as any).distance_km,
            inclusions: (activity as any).inclusions,
            exclusions: (activity as any).exclusions,
            cancellation_policy: (activity as any).cancellation_policy,
            agency_cancellation_policy: (activity as any).agency_cancellation_policy,
            age_policy: (activity as any).age_policy,
            add_ons: (activity as any).add_ons,
            seasons: (activity as any).seasons,
            notes: (activity as any).library_item_id ? `Library transfer` : `Manual transfer entry`,
            remarks: (activity as any).remarks,
            images: (activity as any).images || [],
          };

          const createdActivities = await createActivitiesBulk([activityInput]);
          if (createdActivities.length === 0) {
            toast.error("Failed to add manual transfer");
            return null;
          }

          // Update JSONB
          const currentDay = days[dayIndex];
          const newActivityEntry: Activity = {
            activity_id: createdActivities[0].id,
            position: currentDay?.activities?.length || 0,
            status: "included",
            ...activity,
            title: (activity as any).transfer_name || (activity as any).package_name || "Transfer",
            is_manual: true,
          };
          days[dayIndex] = {
            ...currentDay,
            activities: [...(currentDay?.activities || []), newActivityEntry],
          };

          const newItineraryData = { ...itineraryDataRef.current, days };
          await saveChanges(newItineraryData, `Added manual transfer to Day ${dayIndex + 1}`);

          toast.success("Manual transfer added");

          return {
            success: true,
            activity: createdActivities[0],
            activities: createdActivities,
            breakups: [],
          };
        }

        // If we have a service_id, use the new server action to create activity + breakups
        if (serviceId && serviceType) {
          // For hotels with multiple nights, use bulk insert function
          const isMultiNightHotel = serviceType === "hotel" && nights > 1;

          if (isMultiNightHotel) {
            // Use bulk insert for multi-night hotels
            const result = await addMultiNightHotelWithRates({
              chatId,
              optionNumber,
              startDayNumber: dayIndex + 1,
              startDayDate: dayDate,
              nights,
              serviceId,
              hotelId: (activity as any).hotel_id || "",
              hotelName: (activity as any).hotel_name || serviceName,
              hotelCity: (activity as any).hotel_city,
              hotelCountry: (activity as any).hotel_country,
              hotelAddress: (activity as any).hotel_address,
              hotelStarRating: (activity as any).hotel_star_rating,
              hotelPropertyType: (activity as any).hotel_property_type,
              roomCategory: (activity as any).room_category,
              mealPlan: (activity as any).meal_plan,
              maxOccupancy: (activity as any).max_occupancy,
              rooms: (activity as any).rooms,
              roomPaxDistribution: (activity as any).room_pax_distribution,
              checkInDate: (activity as any).check_in_date,
              checkOutDate: (activity as any).check_out_date,
              images: (activity as any).images,
            });

            if (!result.success) {
              toast.error(result.error || "Failed to add hotel");
              return null;
            }

            // Update JSONB for all days
            const activities = result.activities || [];
            for (let i = 0; i < activities.length; i++) {
              const currentDayIndex = dayIndex + i;
              if (days[currentDayIndex]) {
                const currentDay = days[currentDayIndex];
                const newActivityEntry: Activity = {
                  activity_id: activities[i].id,
                  position: currentDay?.activities?.length || 0,
                  status: "included",
                  ...activity,
                  title: `${(activity as any).hotel_name} - ${(activity as any).room_category}`,
                };
                days[currentDayIndex] = {
                  ...currentDay,
                  activities: [...(currentDay?.activities || []), newActivityEntry],
                };
              }
            }

            const newItineraryData = { ...itineraryDataRef.current, days };
            await saveChanges(newItineraryData, `Added ${nights}N hotel stay starting Day ${dayIndex + 1}`);

            toast.success(`${nights}-night hotel stay added`);

            // Return in format expected by callers
            return {
              success: true,
              activity: activities[0],
              activities,
              breakups: result.breakups,
            };
          }

          // Single activity (non-hotel or 1-night hotel)
          const result = await addActivityWithRates({
            chatId,
            optionNumber,
            dayNumber: dayIndex + 1,
            dayDate,
            serviceType,
            serviceId,
            serviceName,
            additionalData: {
              hotel_id: (activity as any).hotel_id,
              hotel_name: (activity as any).hotel_name,
              hotel_city: (activity as any).hotel_city,
              hotel_country: (activity as any).hotel_country,
              hotel_address: (activity as any).hotel_address,
              hotel_star_rating: (activity as any).hotel_star_rating,
              hotel_property_type: (activity as any).hotel_property_type,
              room_category: (activity as any).room_category,
              meal_plan: (activity as any).meal_plan,
              max_occupancy: (activity as any).max_occupancy,
              rooms: (activity as any).rooms,
              room_pax_distribution: (activity as any).room_pax_distribution,
              check_in_date: (activity as any).check_in_date,
              check_out_date: (activity as any).check_out_date,
              tour_id: (activity as any).tour_id,
              tour_name: (activity as any).tour_name,
              package_name: (activity as any).package_name,
              transfer_id: (activity as any).transfer_id,
              transfer_name: (activity as any).transfer_name,
              transfer_type: (activity as any).transfer_type,
              pickup_point: (activity as any).pickup_point,
              drop_point: (activity as any).drop_point,
              images: (activity as any).images,
            },
          });

          if (!result.success) {
            toast.error(result.error || "Failed to add activity");
            return null;
          }

          // Also update JSONB for backward compatibility
          const currentDay = days[dayIndex];
          const newActivity: Activity = {
            activity_id: result.activity?.id || `activity-${Date.now()}`,
            position: currentDay?.activities?.length || 0,
            status: "included",
            ...activity,
          };

          days[dayIndex] = {
            ...currentDay,
            activities: [...(currentDay?.activities || []), newActivity],
          };

          const newItineraryData = { ...itineraryDataRef.current, days };
          await saveChanges(newItineraryData, `Added activity to Day ${dayIndex + 1}`);

          toast.success("Activity added with rates");
          return result;
        }

        // Fallback: No service_id, just add to JSONB (legacy behavior)
        const currentDay = days[dayIndex];
        const newActivity: Activity = {
          activity_id: activity.activity_id || `activity-${Date.now()}`,
          position: currentDay?.activities?.length || 0,
          status: "included",
          ...activity,
        };

        days[dayIndex] = {
          ...currentDay,
          activities: [...(currentDay?.activities || []), newActivity],
        };

        const newItineraryData = { ...itineraryDataRef.current, days };
        const success = await saveChanges(newItineraryData, `Added activity to Day ${dayIndex + 1}`);
        if (success) {
          toast.success("Activity added");
        }
        return success ? { activity: newActivity } : null;
      } catch (error) {
        console.error("[addActivity] Error:", error);
        toast.error("Failed to add activity");
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [chatId, optionNumber, saveChanges]
  );

  return {
    isSaving,
    // Day operations
    addDayBefore,
    addDayAfter,
    removeDay,
    clearDay,
    updateDayTitle,
    // Activity operations
    moveActivityToPreviousDay,
    moveActivityToNextDay,
    removeActivity,
    updateActivityStatus,
    reorderActivities,
    moveActivityBetweenDays,
    addActivity,
  };
}
