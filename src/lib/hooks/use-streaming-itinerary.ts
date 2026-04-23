"use client";

import { useState, useEffect } from "react";

interface StreamingItineraryDay {
  day: number;
  title: string;
  date?: string;
  activities: any[];
  status: "generating" | "complete";
}

interface UseStreamingItineraryProps {
  isGenerating: boolean;
  finalItinerary?: any;
}

export function useStreamingItinerary({ isGenerating, finalItinerary }: UseStreamingItineraryProps) {
  const [streamingDays, setStreamingDays] = useState<StreamingItineraryDay[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);

  // When generation starts, reset streaming state
  useEffect(() => {
    if (isGenerating) {
      setStreamingDays([]);
      setCurrentDayIndex(0);
    }
  }, [isGenerating]);

  // When final itinerary is received, show all days
  useEffect(() => {
    if (!isGenerating && finalItinerary?.itinerary_data?.days) {
      const days = finalItinerary.itinerary_data.days.map((day: any, index: number) => ({
        day: index + 1,
        title: day.title || `Day ${index + 1}`,
        date: day.date,
        activities: day.activities || [],
        status: "complete" as const,
      }));
      setStreamingDays(days);
    }
  }, [isGenerating, finalItinerary]);

  // Progressive streaming simulation - reveal one day every 500ms during generation
  useEffect(() => {
    if (!isGenerating || !finalItinerary?.itinerary_data?.days) return;

    const days = finalItinerary.itinerary_data.days;
    if (currentDayIndex >= days.length) return;

    const timer = setTimeout(() => {
      const day = days[currentDayIndex];
      setStreamingDays((prev) => [
        ...prev,
        {
          day: currentDayIndex + 1,
          title: day.title || `Day ${currentDayIndex + 1}`,
          date: day.date,
          activities: day.activities || [],
          status: "generating",
        },
      ]);
      setCurrentDayIndex((prev) => prev + 1);
    }, 500);

    return () => clearTimeout(timer);
  }, [isGenerating, currentDayIndex, finalItinerary]);

  return {
    streamingDays,
    isStreaming: isGenerating && streamingDays.length > 0,
  };
}
