/**
 * Itinerary Hooks (TanStack Query + Supabase Realtime)
 *
 * Custom hooks for fetching and mutating itinerary data.
 * Uses TanStack Query for caching, refetching, and optimistic updates.
 * Uses Supabase Realtime to automatically refresh when activities change.
 */

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getItineraryWithActivities } from "@/data-access/itinerary-activities";
import { createClient } from "@/utils/supabase/client";
import debounce from "lodash/debounce";

// =====================================================
// TYPES
// =====================================================

export interface ItineraryMutation {
  mutation_type: string;
  day?: number;
  activity_id?: string;
  from_day?: number;
  to_day?: number;
  changes?: Record<string, any>;
  new_sequence?: string[];
  reason?: string;
}

interface ItineraryData {
  id: string;
  chat_id: string;
  destination: string;
  destination_code: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  adults: number;
  children: number;
  children_ages: number[] | null;
  itinerary_data: any;
  status: "draft" | "confirmed" | "quoted" | "booked";
  version: number;
  created_at: string;
  updated_at: string;
}

// =====================================================
// HOOKS
// =====================================================

/**
 * Fetch itinerary for a chat
 * Uses server action to fetch from DB and build itinerary_data from activities
 * Subscribes to Supabase Realtime for automatic updates when activities change
 *
 * @param chatId - Chat ID
 * @returns Query result with itinerary data
 */
export function useItinerary(chatId: string, isGenerating: boolean = false) {
  const queryClient = useQueryClient();
  const isGeneratingRef = useRef(isGenerating);
  isGeneratingRef.current = isGenerating;

  // Subscribe to Realtime changes on itinerary_activities
  useEffect(() => {
    if (!chatId) return;

    const supabase = createClient();

    // Debounced invalidation to prevent cascade of refetches
    const debouncedInvalidate = debounce(() => {
      // Skip invalidation if currently generating (SSE handles updates)
      if (isGeneratingRef.current) {
        console.log("[useItinerary] ⏭️ Skipping invalidation during generation");
        return;
      }
      console.log("[useItinerary] 🔄 Debounced invalidation triggered");
      queryClient.invalidateQueries({ queryKey: ["itinerary", chatId] });
    }, 500); // 500ms debounce

    // Subscribe to INSERT/UPDATE on itinerary_activities for this chat
    const channel = supabase
      .channel(`itinerary-activities-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "itinerary_activities",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          console.log("[useItinerary] 📡 Realtime event:", payload.eventType);
          debouncedInvalidate();
        }
      )
      .subscribe((status) => {
        console.log("[useItinerary] 📡 Realtime subscription status:", status);
      });

    // Cleanup subscription on unmount
    return () => {
      console.log("[useItinerary] 🔌 Unsubscribing from Realtime");
      debouncedInvalidate.cancel();
      supabase.removeChannel(channel);
    };
  }, [chatId, queryClient]);

  return useQuery({
    queryKey: ["itinerary", chatId],
    queryFn: async () => {
      console.log("[useItinerary] 🔍 Fetching itinerary for chatId:", chatId);
      const data = await getItineraryWithActivities(chatId);

      if (!data) {
        console.log("[useItinerary] ⚠️ No itinerary found");
        return null;
      }

      console.log("[useItinerary] ✅ Fetched itinerary:", { hasDays: !!data?.itinerary_data?.days?.length });
      return data as ItineraryData;
    },
    enabled: !!chatId,
    // Don't refetch while AI is generating - let SSE updates flow through
    staleTime: isGenerating ? Infinity : 5000, // 5s staleTime when not generating
    refetchOnMount: !isGenerating,
    refetchOnWindowFocus: false, // Disable - causes unnecessary refetches
    refetchOnReconnect: !isGenerating,
  });
}

/**
 * Mutate itinerary
 *
 * Hook for applying mutations to an itinerary.
 * Includes optimistic updates for better UX.
 *
 * @param chatId - Chat ID
 * @returns Mutation object with mutate function
 */
export function useItineraryMutation(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mutation: ItineraryMutation) => {
      console.log("[useItineraryMutation] Sending mutation:", mutation);

      const response = await fetch(`${BACKEND_URL}/api/itineraries/${chatId}/mutations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mutation),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to apply mutation");
      }

      return response.json();
    },

    // Optimistic update - update UI immediately before API responds
    onMutate: async (mutation) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["itinerary", chatId] });

      // Snapshot previous value
      const previousItinerary = queryClient.getQueryData(["itinerary", chatId]);

      // Optimistically update to the new value
      queryClient.setQueryData(["itinerary", chatId], (old: any) => {
        if (!old) return old;

        // Clone the itinerary data
        const optimisticData = JSON.parse(JSON.stringify(old));
        const itineraryData = optimisticData.itinerary_data;

        if (!itineraryData || !itineraryData.days) return old;

        // Apply optimistic mutation
        switch (mutation.mutation_type) {
          case "ADD_ACTIVITY":
            const dayToAdd = itineraryData.days.find((d: any) => d.day === mutation.day);
            if (dayToAdd && mutation.changes?.activity) {
              dayToAdd.activities = dayToAdd.activities || [];
              dayToAdd.activities.push(mutation.changes.activity);
            }
            break;

          case "REMOVE_ACTIVITY":
            itineraryData.days.forEach((day: any) => {
              day.activities = day.activities.filter((a: any) => a.activity_id !== mutation.activity_id);
            });
            break;

          case "MOVE_ACTIVITY_BETWEEN_DAYS":
            const fromDay = itineraryData.days.find((d: any) => d.day === mutation.from_day);
            const toDay = itineraryData.days.find((d: any) => d.day === mutation.to_day);
            if (fromDay && toDay) {
              const activityIndex = fromDay.activities?.findIndex((a: any) => a.activity_id === mutation.activity_id);
              if (activityIndex !== undefined && activityIndex >= 0) {
                const [activity] = fromDay.activities.splice(activityIndex, 1);
                toDay.activities = toDay.activities || [];
                toDay.activities.push(activity);
              }
            }
            break;

          case "REORDER_ACTIVITIES":
            const dayToReorder = itineraryData.days.find((d: any) => d.day === mutation.day);
            if (dayToReorder && mutation.new_sequence && dayToReorder.activities) {
              const activityMap = new Map(dayToReorder.activities.map((a: any) => [a.activity_id, a]));
              dayToReorder.activities = mutation.new_sequence.map((id: string) => activityMap.get(id)).filter(Boolean);
            }
            break;

          case "SWAP_DAYS":
            const day1Index = itineraryData.days.findIndex((d: any) => d.day === mutation.from_day);
            const day2Index = itineraryData.days.findIndex((d: any) => d.day === mutation.to_day);

            if (day1Index !== -1 && day2Index !== -1) {
              // Swap the entire day objects
              const tempDay = itineraryData.days[day1Index];
              itineraryData.days[day1Index] = itineraryData.days[day2Index];
              itineraryData.days[day2Index] = tempDay;

              // Update the day numbers to maintain correct order
              itineraryData.days[day1Index].day = mutation.from_day;
              itineraryData.days[day2Index].day = mutation.to_day;
            }
            break;
        }

        optimisticData.version = (optimisticData.version || 0) + 1;

        return optimisticData;
      });

      // Return context with previous value
      return { previousItinerary };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      console.error("[useItineraryMutation] Error, rolling back:", err);
      if (context?.previousItinerary) {
        queryClient.setQueryData(["itinerary", chatId], context.previousItinerary);
      }
    },

    // Refetch after success or error to ensure correctness
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary", chatId] });
    },
  });
}

/**
 * Fetch itinerary history
 *
 * @param chatId - Chat ID
 * @returns Query result with history data
 */
export function useItineraryHistory(chatId: string) {
  return useQuery({
    queryKey: ["itinerary-history", chatId],
    queryFn: async () => {
      const response = await fetch(`${BACKEND_URL}/api/itineraries/${chatId}/history`);

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      return response.json();
    },
    enabled: !!chatId,
  });
}
