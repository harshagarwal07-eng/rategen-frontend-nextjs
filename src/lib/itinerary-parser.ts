/**
 * Itinerary Parser Utility
 * Handles conversion between structured itinerary data and text format
 * Uses special delimiters to encode service references
 */

export type ItineraryItemType = "hotel" | "tour" | "transfer" | "text";

export interface ItineraryItem {
  id: string; // Unique identifier for the item in the UI
  type: ItineraryItemType;
  serviceId?: string; // UUID for hotel/tour/transfer
  serviceName: string; // Display name
  description?: string; // For custom text items
}

export interface ItineraryDay {
  dayNumber: number;
  items: ItineraryItem[];
}

export interface Itinerary {
  days: ItineraryDay[];
}

/**
 * Parse text format into structured itinerary data
 * Example input:
 * [DAY:1]
 * [HOTEL:uuid:Hotel Name]
 * [TOUR:uuid:Tour Name]
 * [DAY:2]
 * [TRANSFER:uuid:Transfer Name]
 * [TEXT:Custom activity description]
 */
export function parseItineraryFromText(text: string): Itinerary {
  const lines = text.split("\n").filter((line) => line.trim());
  const days: ItineraryDay[] = [];
  let currentDay: ItineraryDay | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Match [DAY:1]
    const dayMatch = trimmedLine.match(/^\[DAY:(\d+)\]$/);
    if (dayMatch) {
      const dayNumber = parseInt(dayMatch[1], 10);
      currentDay = { dayNumber, items: [] };
      days.push(currentDay);
      continue;
    }

    // Match [HOTEL:id:name] or [TOUR:id:name] or [TRANSFER:id:name]
    const serviceMatch = trimmedLine.match(
      /^\[(HOTEL|TOUR|TRANSFER):([^:]+):(.+)\]$/
    );
    if (serviceMatch && currentDay) {
      const [, type, serviceId, serviceName] = serviceMatch;
      currentDay.items.push({
        id: `${Date.now()}-${Math.random()}`, // Generate unique UI ID
        type: type.toLowerCase() as ItineraryItemType,
        serviceId,
        serviceName,
      });
      continue;
    }

    // Match [TEXT:description]
    const textMatch = trimmedLine.match(/^\[TEXT:(.+)\]$/);
    if (textMatch && currentDay) {
      const [, description] = textMatch;
      currentDay.items.push({
        id: `${Date.now()}-${Math.random()}`,
        type: "text",
        serviceName: description,
        description,
      });
      continue;
    }

    // If we encounter a line that doesn't match any pattern but we have a current day,
    // treat it as custom text
    if (currentDay && trimmedLine) {
      currentDay.items.push({
        id: `${Date.now()}-${Math.random()}`,
        type: "text",
        serviceName: trimmedLine,
        description: trimmedLine,
      });
    }
  }

  return { days };
}

/**
 * Convert structured itinerary data to text format
 */
export function serializeItineraryToText(itinerary: Itinerary): string {
  const lines: string[] = [];

  for (const day of itinerary.days) {
    lines.push(`[DAY:${day.dayNumber}]`);

    for (const item of day.items) {
      switch (item.type) {
        case "hotel":
        case "tour":
        case "transfer":
          if (item.serviceId && item.serviceName) {
            lines.push(
              `[${item.type.toUpperCase()}:${item.serviceId}:${item.serviceName}]`
            );
          }
          break;
        case "text":
          if (item.description) {
            lines.push(`[TEXT:${item.description}]`);
          }
          break;
      }
    }
  }

  return lines.join("\n");
}

/**
 * Convert itinerary to human-readable display format
 * Example output:
 * Day 1
 * → Singapore Airport to Any Hotel Transfer (One Way)
 * → Garden by the Bay tickets with transfers
 *
 * Day 2
 * → Universal Studios + SEA Aquarium with transfers
 */
export function formatItineraryForDisplay(itinerary: Itinerary): string {
  const lines: string[] = [];

  for (const day of itinerary.days) {
    lines.push(`Day ${day.dayNumber}`);

    for (const item of day.items) {
      lines.push(`→ ${item.serviceName}`);
    }

    lines.push(""); // Empty line between days
  }

  return lines.join("\n").trim();
}

/**
 * Initialize empty itinerary based on number of nights
 */
export function createEmptyItinerary(numberOfNights: number): Itinerary {
  const days: ItineraryDay[] = [];
  const totalDays = numberOfNights + 1; // nights + 1 = days

  for (let i = 1; i <= totalDays; i++) {
    days.push({
      dayNumber: i,
      items: [],
    });
  }

  return { days };
}

/**
 * Validate itinerary structure
 */
export function validateItinerary(itinerary: Itinerary): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!itinerary.days || itinerary.days.length === 0) {
    errors.push("Itinerary must have at least one day");
  }

  // Check for sequential day numbers
  const dayNumbers = itinerary.days.map((d) => d.dayNumber).sort((a, b) => a - b);
  for (let i = 0; i < dayNumbers.length; i++) {
    if (dayNumbers[i] !== i + 1) {
      errors.push(`Day numbers must be sequential. Missing day ${i + 1}`);
      break;
    }
  }

  // Check that each day has at least one item (optional, can be removed if empty days are allowed)
  // for (const day of itinerary.days) {
  //   if (day.items.length === 0) {
  //     errors.push(`Day ${day.dayNumber} has no items`);
  //   }
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}
