import type { ItineraryDayData, ItineraryActivity } from "@/app/(root)/playground/components/ui/itinerary-day-card";

/**
 * Parses markdown content to extract itinerary data
 * Looks for day-wise structure with activities
 */
export function parseItinerary(content: string): {
  hasItinerary: boolean;
  days: ItineraryDayData[];
  remainingContent: string;
} {
  // Match day headers like "## Day 1: Title" or "# Day 1: Title"
  const dayRegex = /^#{1,3}\s*Day\s+(\d+):\s*(.+)$/gim;
  const matches = Array.from(content.matchAll(dayRegex));

  if (matches.length === 0) {
    return {
      hasItinerary: false,
      days: [],
      remainingContent: content,
    };
  }

  const days: ItineraryDayData[] = [];
  let remainingContent = content;

  // Process each day
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const dayNumber = parseInt(match[1]);
    const dayTitle = match[2].trim();
    const dayStartIndex = match.index!;
    const dayEndIndex = matches[i + 1]?.index ?? content.length;

    // Extract day content
    const dayContent = content.substring(dayStartIndex, dayEndIndex);

    // Parse activities from the day content
    const activities = parseActivities(dayContent);

    days.push({
      day: dayNumber,
      title: dayTitle,
      activities,
    });

    // Remove parsed content from remaining
    remainingContent = remainingContent.replace(dayContent, "");
  }

  return {
    hasItinerary: true,
    days,
    remainingContent: remainingContent.trim(),
  };
}

/**
 * Parses activities from day content
 * Looks for patterns like:
 * - 9:00 AM - Activity title - Description
 * - 9:00 AM: Activity title
 * - **9:00 AM** - Activity
 */
function parseActivities(dayContent: string): ItineraryActivity[] {
  const activities: ItineraryActivity[] = [];

  // Split by lines
  const lines = dayContent.split("\n");

  // Skip the header line (Day X: Title)
  const contentLines = lines.slice(1);

  let currentActivity: Partial<ItineraryActivity> | null = null;

  for (const line of contentLines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) continue;

    // Match time patterns (e.g., "9:00 AM", "9:00", "09:00 AM", etc.)
    // Patterns: - 9:00 AM - Title OR - **9:00 AM** - Title OR - 9:00 AM: Title
    const timePattern = /^[-*\s]*(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\s*[-:*\s]+(.+)/i;
    const match = trimmedLine.match(timePattern);

    if (match) {
      // If we have a current activity, save it
      if (currentActivity && currentActivity.time && currentActivity.title) {
        activities.push(currentActivity as ItineraryActivity);
      }

      // Start new activity
      const time = match[1].trim();
      const rest = match[2].trim();

      // Try to split title and description
      // Pattern: "Title - Description" or "Title (Location)" or "Title"
      const titleDescPattern = /^([^-()]+)(?:\s*[-]\s*(.+))?$/;
      const titleMatch = rest.match(titleDescPattern);

      currentActivity = {
        time,
        title: titleMatch ? titleMatch[1].trim() : rest,
        description: titleMatch && titleMatch[2] ? titleMatch[2].trim() : rest,
      };

      // Try to extract location from description
      const locationPattern = /\(([^)]+)\)/;
      const locMatch = currentActivity.description?.match(locationPattern);
      if (locMatch) {
        currentActivity.location = locMatch[1];
        currentActivity.description = currentActivity.description?.replace(locationPattern, "").trim();
      }

      // Try to extract duration from description
      const durationPattern = /(\d+\s*(?:hours?|hrs?|minutes?|mins?))/i;
      const durMatch = currentActivity.description?.match(durationPattern);
      if (durMatch) {
        currentActivity.duration = durMatch[1];
        currentActivity.description = currentActivity.description?.replace(durationPattern, "").trim();
      }
    } else if (currentActivity && trimmedLine.startsWith("-")) {
      // This might be additional info for the current activity
      const additionalInfo = trimmedLine.substring(1).trim();
      if (currentActivity.description) {
        currentActivity.description += " " + additionalInfo;
      } else {
        currentActivity.description = additionalInfo;
      }
    }
  }

  // Add the last activity
  if (currentActivity && currentActivity.time && currentActivity.title) {
    activities.push(currentActivity as ItineraryActivity);
  }

  return activities;
}
