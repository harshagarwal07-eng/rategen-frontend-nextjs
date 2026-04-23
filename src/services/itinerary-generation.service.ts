/**
 * Itinerary Generation Service
 *
 * This service handles generating travel itineraries either from database
 * or using AI when no suitable itinerary is found.
 */

import { createClient } from "@/utils/supabase/server";
import { getInternalLLM } from "@/lib/utils/model-config";
import type { TravelQueryInfo, GeneratedItinerary, ItineraryDay } from "@/types/query-classification";

export interface ItineraryTemplate {
  id: string;
  destination: string;
  totalDays: number;
  totalNights: number;
  title: string;
  description: string;
  days: ItineraryTemplateDay[];
  packageNames: string[];
  hotelRoomNames: string[];
  estimatedBudget?: {
    min: number;
    max: number;
    currency: string;
  };
  tags: string[];
  isPopular: boolean;
  created_at: string;
}

export interface ItineraryTemplateDay {
  day: number;
  title: string;
  description: string;
  activities: {
    time?: string;
    activity: string;
    package?: string;
    hotelRoom?: string;
    duration?: string;
    notes?: string;
  }[];
}

export interface ItineraryGenerationOptions {
  includeExactPackageNames: boolean;
  includeHotelRoomNames: boolean;
  followUserPreferences: boolean;
  customizable: boolean;
}

export class ItineraryGenerationService {
  /**
   * Generate itinerary based on query information
   * Priority: 1. Database lookup, 2. AI generation
   */
  public async generateItinerary(
    queryInfo: TravelQueryInfo,
    dmcId: string,
    dmcSettings: any, // DMCSettings type
    options: ItineraryGenerationOptions = {
      includeExactPackageNames: true,
      includeHotelRoomNames: true,
      followUserPreferences: true,
      customizable: true,
    },
    userSelectedModel?: string
  ): Promise<GeneratedItinerary> {
    console.log("[ItineraryGeneration] Generating itinerary for:", {
      destination: queryInfo.destination,
      days: queryInfo.duration?.days,
      nights: queryInfo.duration?.nights,
      services: queryInfo.services,
      adults: queryInfo.travelers?.adults,
      children: queryInfo.travelers?.children,
    });

    // ✅ Determine travel theme from policy
    const travelTheme = this.determineTravelTheme(queryInfo, dmcSettings);
    console.log(`[ItineraryGeneration] Determined travel theme: ${travelTheme}`);

    // Step 1: Try to find matching itinerary in database
    const dbItinerary = await this.findItineraryInDatabase(queryInfo, dmcId, userSelectedModel);

    if (dbItinerary) {
      console.log("[ItineraryGeneration] Found matching itinerary in database");
      return dbItinerary;
    }

    // Step 2: Generate new itinerary using exact names from DB
    console.log("[ItineraryGeneration] No matching itinerary found, generating new one");
    return await this.generateNewItinerary(queryInfo, dmcId, travelTheme, options, userSelectedModel);
  }

  /**
   * Theme determination is handled BY THE AI AGENT
   * ✅ AI-FIRST: ItineraryExtractionAgent determines theme from policy + pax
   */
  private determineTravelTheme(queryInfo: TravelQueryInfo, dmcSettings: any): string {
    // Deprecated - theme is determined by AI agent in findItineraryInDatabase
    // Keeping for backward compatibility only
    return "ai-determined";
  }

  /**
   * Find existing itinerary using AI agent (PLAN.md Step 5 Scenario B)
   * ✅ AI-FIRST: Use agent to extract itinerary from policy documents
   */
  private async findItineraryInDatabase(
    queryInfo: TravelQueryInfo,
    dmcId: string,
    userSelectedModel?: string
  ): Promise<GeneratedItinerary | null> {
    const supabase = await createClient();

    try {
      const destination = queryInfo.destination || queryInfo.destinationCode;
      const nights = queryInfo.duration?.nights;
      const adults = queryInfo.travelers?.adults || 0;
      const children = queryInfo.travelers?.children || 0;

      if (!destination || !nights) {
        console.log("[ItineraryGeneration] Missing destination or nights for itinerary extraction");
        return null;
      }

      // ✅ CRITICAL: Country filter is REQUIRED for itineraries (country-specific!)
      // Prefer country_code (ISO like "MU"), fall back to country_name
      const countryFilter = queryInfo.destinationCode || queryInfo.destination;

      if (!countryFilter) {
        console.error(
          "[ItineraryGeneration] Missing country information - cannot fetch itinerary without country filter"
        );
        return null;
      }

      // Build query with REQUIRED country filter and nights filter
      const countryField = queryInfo.destinationCode ? "country_code" : "country_name";
      console.log(
        `[ItineraryGeneration] Fetching itineraries filtered by ${countryField}: ${countryFilter}, nights: ${nights}`
      );

      const { data: docs, error } = await supabase
        .from("vw_docs")
        .select("content")
        .eq("dmc_id", dmcId)
        .eq("type", "itineraries")
        .eq("nights", nights)
        .eq(countryField, countryFilter)
        .eq("is_active", true);

      if (error || !docs || docs.length === 0) {
        console.log(`[ItineraryGeneration] No itineraries found for ${nights} nights in ${countryFilter}`);
        return null;
      }

      console.log(
        `[ItineraryGeneration] Found ${docs.length} itinerary documents for ${nights} nights, using AI to extract itinerary`
      );

      // ✅ Use AI agent to extract itinerary (NO hardcoded logic!)
      const { itineraryExtractionAgent } = await import("./agents/itinerary-extraction.agent");

      const result = await itineraryExtractionAgent.extractItinerary({
        policyDocuments: docs,
        nights,
        adults,
        children,
        destination,
        userSelectedModel,
      });

      return {
        destination,
        totalDays: nights + 1,
        totalNights: nights,
        days: result.days,
        packageNames: [],
        hotelRoomNames: [],
        notes: [`${result.theme} theme itinerary for ${nights} nights`],
      };
    } catch (error) {
      console.error("[ItineraryGeneration] Error finding itinerary in database:", error);
      return null;
    }
  }

  /**
   * Generate itinerary using LLM to parse travel_theme policy (PLAN.md Step 5)
   * ✅ SIMPLE: Let LLM extract itinerary from policy text
   */
  private async generateNewItinerary(
    queryInfo: TravelQueryInfo,
    dmcId: string,
    travelTheme: string,
    options: ItineraryGenerationOptions,
    userSelectedModel?: string
  ): Promise<GeneratedItinerary> {
    try {
      console.log(`[ItineraryGeneration] Using LLM to extract ${travelTheme} theme itinerary from itinerary template`);

      // ✅ CRITICAL: Country filter is REQUIRED for itineraries (country-specific!)
      // Prefer country_code (ISO like "MU"), fall back to country_name
      const countryFilter = queryInfo.destinationCode || queryInfo.destination;

      if (!countryFilter) {
        console.error(
          "[ItineraryGeneration] Missing country information - cannot fetch itinerary without country filter"
        );
        return this.createBasicItinerary(queryInfo);
      }

      // Build query with REQUIRED country filter and nights filter
      const supabase = await createClient();
      const nights = queryInfo.duration?.nights || 3;
      const countryField = queryInfo.destinationCode ? "country_code" : "country_name";
      console.log(
        `[ItineraryGeneration] Fetching itinerary template filtered by ${countryField}: ${countryFilter}, nights: ${nights}`
      );

      const { data: policyDoc, error } = await supabase
        .from("vw_docs")
        .select("content")
        .eq("dmc_id", dmcId)
        .eq("type", "itineraries")
        .eq("nights", nights)
        .eq(countryField, countryFilter)
        .eq("is_active", true)
        .limit(1)
        .single();

      if (error || !policyDoc) {
        console.error(
          `[ItineraryGeneration] Could not fetch itinerary template for ${nights} nights in ${countryFilter}:`,
          error
        );
        return this.createBasicItinerary(queryInfo);
      }

      console.log(
        `[ItineraryGeneration] Found itinerary template for ${nights} nights, using LLM to extract itinerary`
      );

      // Get internal model for deterministic extraction
      const llm = getInternalLLM(0); // Deterministic extraction

      const destination = queryInfo.destination || "Singapore";
      const expectedDays = nights + 1; // 3 nights = 4 days

      const prompt = `You are a travel itinerary parser. Extract the ${travelTheme} theme ${nights}-night itinerary from the policy below.

Policy:
${policyDoc.content}

Instructions:
1. Find the section for "${travelTheme} Theme" and "${nights} night" (which is ${expectedDays} days total)
2. Extract EXACTLY the itinerary text as written
3. **CRITICAL**: You MUST extract ALL ${expectedDays} days. If the policy shows Day 1, Day 2, Day 3, Day 4 - include ALL of them.
4. Return as JSON with this structure:
{
  "days": [
    { "day": 1, "activities": [{"activity": "Arrival Transfer in Singapore"}, {"activity": "Garden by the Bay tickets with transfers"}] },
    { "day": 2, "activities": [{"activity": "Sentosa Island Tour..."}] },
    ... continue for ALL ${expectedDays} days
  ]
}

CRITICAL REQUIREMENTS:
- Include ALL ${expectedDays} days (Day 1 through Day ${expectedDays})
- Do not truncate or skip any days
- Extract the EXACT text from the policy

Return ONLY the JSON, no explanation.`;

      const response = await llm.invoke(prompt);
      const content = response.content
        .toString()
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      console.log(`[ItineraryGeneration] LLM raw response:`, content.substring(0, 500));

      const parsed = JSON.parse(content);

      // Extract token usage
      const tokens = (response as any).usage_metadata?.total_tokens || 0;
      if (tokens) {
        console.log(`[ItineraryGeneration] Token usage: ${tokens}`);
      }

      console.log(`[ItineraryGeneration] Extracted ${parsed.days?.length || 0} days (expected: ${expectedDays})`);

      // ✅ Validate that we have the correct number of days
      if (parsed.days && parsed.days.length !== expectedDays) {
        console.warn(
          `[ItineraryGeneration] WARNING: Extracted ${parsed.days.length} days but expected ${expectedDays} days. Itinerary may be incomplete.`
        );
      }

      return {
        destination,
        totalDays: (nights || 3) + 1,
        totalNights: nights || 3,
        days: parsed.days || [],
        packageNames: [],
        hotelRoomNames: [],
        notes: [`${travelTheme} theme itinerary for ${nights} nights`],
        usage: tokens ? { total_tokens: tokens } : undefined,
      };
    } catch (error) {
      console.error("[ItineraryGeneration] Error using LLM to parse itinerary:", error);
      return this.createBasicItinerary(queryInfo);
    }
  }

  /**
   * Fetch available packages for the destination using view
   * ✅ NO THEME FILTERING YET - database column may not exist
   */
  private async fetchAvailablePackages(
    dmcId: string,
    destination?: string,
    travelTheme?: string // Keeping parameter for future use
  ) {
    const supabase = await createClient();

    try {
      // Use vw_tours_packages view - returns one row per package
      let query = supabase
        .from("vw_tours_packages")
        .select(
          "id, tour_id, tour_name, package_name, package_description, tour_description, country, city, package_preferred"
        )
        .eq("dmc_id", dmcId);

      // Search in tour_name, country, or city
      if (destination) {
        query = query.or(`tour_name.ilike.%${destination}%,country.ilike.%${destination}%,city.ilike.%${destination}%`);
      }

      // ⚠️ TODO: Add theme filtering ONLY after verifying tour_themes column exists
      // For now, fetch ALL packages to avoid returning empty results
      if (travelTheme) {
        console.log(
          `[ItineraryGeneration] Theme detected: ${travelTheme} (filtering not yet implemented - returning all packages)`
        );
      }

      // Order by preferred first
      query = query.order("package_preferred", { ascending: false }).limit(20);

      const { data, error } = await query;

      if (error) {
        console.error("[ItineraryGeneration] Error fetching packages:", error);
        return [];
      }

      if (!data || data.length === 0) {
        console.warn(`[ItineraryGeneration] NO packages found for destination: ${destination}`);
        return [];
      }

      console.log(`[ItineraryGeneration] Found ${data.length} packages for ${destination}`);

      // Transform to match expected structure (tour with packages)
      // Group packages by tour_id for backwards compatibility
      const packagesMap = new Map();

      for (const pkg of data || []) {
        if (!packagesMap.has(pkg.tour_id)) {
          packagesMap.set(pkg.tour_id, {
            id: pkg.tour_id,
            tour_name: pkg.tour_name,
            description: pkg.tour_description,
            packages: [],
          });
        }
        packagesMap.get(pkg.tour_id).packages.push({
          id: pkg.id,
          name: pkg.package_name,
          description: pkg.package_description,
        });
      }

      return Array.from(packagesMap.values());
    } catch (error) {
      console.error("[ItineraryGeneration] Error fetching packages:", error);
      return [];
    }
  }

  /**
   * Fetch available hotels for the destination using view
   */
  private async fetchAvailableHotels(dmcId: string, destination?: string) {
    const supabase = await createClient();

    try {
      // Use vw_hotel_rooms view - returns one row per room
      let query = supabase
        .from("vw_hotel_rooms")
        .select("id, hotel_id, hotel_name, room_category, meal_plan, star_rating, hotel_country, hotel_city, preferred")
        .eq("dmc_id", dmcId);

      // Search in hotel_name, country, or city
      if (destination) {
        query = query.or(
          `hotel_name.ilike.%${destination}%,hotel_country.ilike.%${destination}%,hotel_city.ilike.%${destination}%`
        );
      }

      // Order by preferred first, then star rating
      query = query.order("preferred", { ascending: false }).order("star_rating", { ascending: false }).limit(20);

      const { data, error } = await query;

      if (error) {
        console.error("[ItineraryGeneration] Error fetching hotels:", error);
        return [];
      }

      // Transform to match expected structure (hotel with room_types)
      // Group rooms by hotel_id for backwards compatibility
      const hotelsMap = new Map();

      for (const room of data || []) {
        if (!hotelsMap.has(room.hotel_id)) {
          hotelsMap.set(room.hotel_id, {
            id: room.hotel_id,
            hotel_name: room.hotel_name,
            description: `${room.star_rating}-star hotel in ${room.hotel_city}`,
            room_types: [],
          });
        }
        hotelsMap.get(room.hotel_id).room_types.push({
          id: room.id,
          category: room.room_category,
          meal_plan: room.meal_plan,
        });
      }

      return Array.from(hotelsMap.values());
    } catch (error) {
      console.error("[ItineraryGeneration] Error fetching hotels:", error);
      return [];
    }
  }

  /**
   * Fetch available transfers for the destination using view
   */
  private async fetchAvailableTransfers(dmcId: string, destination?: string) {
    const supabase = await createClient();

    try {
      // Use vw_transfers_packages view
      let query = supabase
        .from("vw_transfers_packages")
        .select("id, transfer_id, transfer_name, package_name, country, city, package_preferred")
        .eq("dmc_id", dmcId);

      // Search in transfer_name, country, or city
      if (destination) {
        query = query.or(
          `transfer_name.ilike.%${destination}%,country.ilike.%${destination}%,city.ilike.%${destination}%`
        );
      }

      // Order by preferred first
      query = query.order("package_preferred", { ascending: false }).limit(20);

      const { data, error } = await query;

      if (error) {
        console.error("[ItineraryGeneration] Error fetching transfers:", error);
        return [];
      }

      // Group packages by transfer_id
      const transfersMap = new Map();

      for (const pkg of data || []) {
        if (!transfersMap.has(pkg.transfer_id)) {
          transfersMap.set(pkg.transfer_id, {
            id: pkg.transfer_id,
            transfer_name: pkg.transfer_name,
            packages: [],
          });
        }
        transfersMap.get(pkg.transfer_id).packages.push({
          id: pkg.id,
          name: pkg.package_name,
        });
      }

      return Array.from(transfersMap.values());
    } catch (error) {
      console.error("[ItineraryGeneration] Error fetching transfers:", error);
      return [];
    }
  }

  /**
   * Create itinerary using ONLY exact package/hotel/transfer names from database
   * ✅ CRITICAL: NO creativity, ONLY exact names!
   */
  private createItineraryFromExactNames(
    queryInfo: TravelQueryInfo,
    availablePackages: any[],
    availableHotels: any[],
    availableTransfers: any[]
  ): GeneratedItinerary {
    const destination = queryInfo.destination || "Singapore";
    const days = queryInfo.duration?.days || 3;
    const nights = queryInfo.duration?.nights || 2;

    // ✅ Log what inventory we have
    console.log(`[ItineraryGeneration] Creating itinerary from exact names:`, {
      packages: availablePackages.length,
      hotels: availableHotels.length,
      transfers: availableTransfers.length,
    });

    if (availablePackages.length === 0) {
      console.error(`[ItineraryGeneration] CRITICAL: NO packages available for ${destination}!`);
    }
    if (availableHotels.length === 0) {
      console.warn(`[ItineraryGeneration] WARNING: NO hotels available for ${destination}`);
    }
    if (availableTransfers.length === 0) {
      console.warn(`[ItineraryGeneration] WARNING: NO transfers available for ${destination}`);
    }

    const itineraryDays: ItineraryDay[] = [];
    const packageNames: string[] = [];
    const hotelRoomNames: string[] = [];

    // Select hotel (prefer first hotel with preferred flag)
    const selectedHotel = availableHotels[0];
    const selectedRoom = selectedHotel?.room_types?.[0];
    if (selectedHotel && selectedRoom) {
      const hotelRoomName = `${selectedHotel.hotel_name} - ${selectedRoom.category}`;
      hotelRoomNames.push(hotelRoomName);
      console.log(`[ItineraryGeneration] Selected hotel: ${hotelRoomName}`);
    } else {
      console.warn(`[ItineraryGeneration] No hotel selected - check availableHotels`);
    }

    // ✅ NO hardcoded logic - just use first transfer (database already ordered)
    // Trust the database query ordering instead of hardcoded "airport" string matching
    const selectedTransfer = availableTransfers[0];

    if (selectedTransfer) {
      console.log(`[ItineraryGeneration] Selected transfer: ${selectedTransfer.transfer_name}`);
    } else {
      console.warn(`[ItineraryGeneration] No transfer selected - check availableTransfers`);
    }

    // Build day-wise itinerary using ONLY exact names
    for (let i = 1; i <= days; i++) {
      const activities: any[] = [];

      if (i === 1) {
        // Day 1: Arrival
        if (selectedTransfer) {
          const transferPackage = selectedTransfer.packages?.[0];
          if (transferPackage) {
            packageNames.push(transferPackage.name);
            activities.push({
              time: "09:00 AM",
              activity: transferPackage.name, // ✅ Exact package name
              package: transferPackage.name,
              duration: "1 hour",
            });
          }
        }

        if (selectedHotel && selectedRoom) {
          activities.push({
            time: "11:00 AM",
            activity: `Hotel check-in at ${selectedHotel.hotel_name}`,
            hotelRoom: `${selectedRoom.category} - ${selectedRoom.meal_plan}`,
            duration: "1 hour",
          });
        }

        // Add first tour package
        if (availablePackages.length > 0) {
          const firstTour = availablePackages[0];
          const firstPackage = firstTour.packages?.[0];
          if (firstPackage) {
            console.log(`[ItineraryGeneration] Day 1: Adding tour package: ${firstPackage.name}`);
            packageNames.push(firstPackage.name);
            activities.push({
              time: "02:00 PM",
              activity: firstPackage.name, // ✅ Exact package name
              package: firstPackage.name,
              duration: "4 hours",
            });
          } else {
            console.warn(`[ItineraryGeneration] Day 1: First tour has no packages!`);
          }
        } else {
          console.warn(`[ItineraryGeneration] Day 1: No packages available!`);
        }
      } else if (i === days) {
        // Last day: Departure
        // Add tour if available
        if (availablePackages.length > i - 1) {
          const tour = availablePackages[i - 1];
          const pkg = tour.packages?.[0];
          if (pkg && !packageNames.includes(pkg.name)) {
            packageNames.push(pkg.name);
            activities.push({
              time: "09:00 AM",
              activity: pkg.name, // ✅ Exact package name
              package: pkg.name,
              duration: "3 hours",
            });
          }
        }

        if (selectedHotel) {
          activities.push({
            time: "01:00 PM",
            activity: `Hotel check-out from ${selectedHotel.hotel_name}`,
            duration: "1 hour",
          });
        }

        if (selectedTransfer) {
          const transferPackage = selectedTransfer.packages?.[0];
          if (transferPackage) {
            activities.push({
              time: "03:00 PM",
              activity: transferPackage.name, // ✅ Exact package name
              package: transferPackage.name,
              duration: "1 hour",
            });
          }
        }
      } else {
        // Middle days: Full day tours
        console.log(
          `[ItineraryGeneration] Day ${i}: Checking for tours (need index ${i - 1}, have ${
            availablePackages.length
          } packages)`
        );
        if (availablePackages.length > i - 1) {
          const tour = availablePackages[i - 1];
          const pkg = tour.packages?.[0];
          if (pkg && !packageNames.includes(pkg.name)) {
            console.log(`[ItineraryGeneration] Day ${i}: Adding tour package: ${pkg.name}`);
            packageNames.push(pkg.name);
            activities.push({
              time: "09:00 AM",
              activity: pkg.name, // ✅ Exact package name
              package: pkg.name,
              duration: "8 hours",
            });
          } else if (!pkg) {
            console.warn(`[ItineraryGeneration] Day ${i}: Tour has no packages!`);
          } else {
            console.warn(`[ItineraryGeneration] Day ${i}: Package already used: ${pkg.name}`);
          }
        } else {
          console.warn(
            `[ItineraryGeneration] Day ${i}: NOT ENOUGH packages (need ${i - 1}, have ${availablePackages.length})`
          );
        }
      }

      itineraryDays.push({
        day: i,
        activities,
      });
    }

    return {
      destination,
      totalDays: days,
      totalNights: nights,
      days: itineraryDays,
      packageNames: [...new Set(packageNames)], // Remove duplicates
      hotelRoomNames,
      notes: [
        "This itinerary uses exact package names from our inventory.",
        "All services shown are available for booking.",
      ],
    };
  }

  /**
   * Create AI prompt for itinerary generation
   */
  private createItineraryPrompt(
    queryInfo: TravelQueryInfo,
    availablePackages: any[],
    availableHotels: any[],
    options: ItineraryGenerationOptions
  ): string {
    const destination = queryInfo.destination || "Singapore";
    const days = queryInfo.duration?.days || 3;
    const nights = queryInfo.duration?.nights || 2;
    const adults = queryInfo.travelers.adults;
    const children = queryInfo.travelers.children || 0;

    let prompt = `Generate a detailed day-wise travel itinerary for ${days} days and ${nights} nights in ${destination} for ${adults} adult${
      adults > 1 ? "s" : ""
    }${children > 0 ? ` and ${children} child${children > 1 ? "ren" : ""}` : ""}.

Requirements:
- Create day-wise breakdown with exact timing
- Include specific package names from available services
- Include hotel room names where applicable
- Be realistic about timing and logistics
- Include transportation details
- Mention meal times and suggestions`;

    if (options.includeExactPackageNames && availablePackages.length > 0) {
      prompt += `

Available Packages to include:
${availablePackages.map((pkg) => `- ${pkg.tour_name}: ${pkg.description}`).join("\n")}`;
    }

    if (options.includeHotelRoomNames && availableHotels.length > 0) {
      prompt += `

Available Hotels to consider:
${availableHotels.map((hotel) => `- ${hotel.hotel_name}: ${hotel.description}`).join("\n")}`;
    }

    if (queryInfo.specificRequests?.attractions && queryInfo.specificRequests.attractions.length > 0) {
      prompt += `

Must include these attractions: ${queryInfo.specificRequests.attractions.join(", ")}`;
    }

    if (queryInfo.specificRequests?.hotels && queryInfo.specificRequests.hotels.length > 0) {
      prompt += `

Must include these hotels: ${queryInfo.specificRequests.hotels.join(", ")}`;
    }

    prompt += `

Please format the response as JSON with the following structure:
{
  "destination": "Singapore",
  "totalDays": ${days},
  "totalNights": ${nights},
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "time": "09:00 AM",
          "activity": "Airport arrival and transfer",
          "package": "Airport Transfer Package",
          "duration": "1 hour"
        },
        {
          "time": "11:00 AM",
          "activity": "Hotel check-in",
          "hotelRoom": "Deluxe Room - Marina Bay Sands",
          "duration": "1 hour"
        }
      ]
    }
  ],
  "packageNames": ["Airport Transfer Package", "Universal Studios Package"],
  "hotelRoomNames": ["Deluxe Room - Marina Bay Sands"],
  "estimatedBudget": {
    "min": 500,
    "max": 1000,
    "currency": "SGD"
  }
}`;

    return prompt;
  }

  /**
   * Call AI service for itinerary generation
   */
  private async callAIService(prompt: string): Promise<any> {
    try {
      // This would integrate with your existing travel agent workflow
      // For now, return a mock response
      console.log("[ItineraryGeneration] Calling AI service with prompt length:", prompt.length);

      // Mock AI response - in real implementation, this would call your LLM
      return this.createMockAIResponse();
    } catch (error) {
      console.error("[ItineraryGeneration] Error calling AI service:", error);
      throw error;
    }
  }

  /**
   * Parse AI response into structured itinerary
   */
  private parseAIResponse(aiResponse: any, queryInfo: TravelQueryInfo): GeneratedItinerary {
    try {
      // If AI response is already structured
      if (aiResponse.days && Array.isArray(aiResponse.days)) {
        return {
          destination: aiResponse.destination || queryInfo.destination || "Singapore",
          totalDays: aiResponse.totalDays || queryInfo.duration?.days || 3,
          totalNights: aiResponse.totalNights || queryInfo.duration?.nights || 2,
          days: aiResponse.days,
          packageNames: aiResponse.packageNames || [],
          hotelRoomNames: aiResponse.hotelRoomNames || [],
          notes: aiResponse.notes,
        };
      }

      // If AI response is text, parse it (implementation would depend on AI response format)
      // For now, create basic itinerary
      return this.createBasicItinerary(queryInfo);
    } catch (error) {
      console.error("[ItineraryGeneration] Error parsing AI response:", error);
      return this.createBasicItinerary(queryInfo);
    }
  }

  /**
   * Convert database template to GeneratedItinerary format
   */
  private convertTemplateToItinerary(template: ItineraryTemplate, queryInfo: TravelQueryInfo): GeneratedItinerary {
    return {
      destination: template.destination,
      totalDays: template.totalDays,
      totalNights: template.totalNights,
      days: template.days.map((day) => ({
        day: day.day,
        date: undefined, // Can be calculated based on start date
        activities: day.activities.map((activity) => ({
          time: activity.time,
          activity: activity.activity,
          package: activity.package,
          hotelRoom: activity.hotelRoom,
          duration: activity.duration,
          notes: activity.notes,
        })),
      })),
      packageNames: template.packageNames,
      hotelRoomNames: template.hotelRoomNames,
      notes: [`Based on popular template: ${template.title}`, template.description],
    };
  }

  /**
   * Create basic itinerary as fallback
   */
  private createBasicItinerary(queryInfo: TravelQueryInfo): GeneratedItinerary {
    const destination = queryInfo.destination || "Singapore";
    const days = queryInfo.duration?.days || 3;
    const nights = queryInfo.duration?.nights || 2;

    const basicDays: ItineraryDay[] = [];

    for (let i = 1; i <= days; i++) {
      const activities = [];

      if (i === 1) {
        // First day - arrival
        activities.push({
          time: "09:00 AM",
          activity: `Airport arrival and transfer to ${destination}`,
          package: "Airport Transfer Package",
          duration: "1 hour",
        });
        activities.push({
          time: "11:00 AM",
          activity: "Hotel check-in",
          hotelRoom: "Standard Room",
          duration: "1 hour",
        });
        activities.push({
          time: "02:00 PM",
          activity: "City orientation tour",
          package: "City Highlights Tour",
          duration: "4 hours",
        });
      } else if (i === days) {
        // Last day - departure
        activities.push({
          time: "09:00 AM",
          activity: "Last-minute shopping",
          package: "Shopping Tour",
          duration: "3 hours",
        });
        activities.push({
          time: "01:00 PM",
          activity: "Hotel check-out",
          duration: "1 hour",
        });
        activities.push({
          time: "03:00 PM",
          activity: "Airport transfer",
          package: "Airport Transfer Package",
          duration: "1 hour",
        });
      } else {
        // Middle days - activities
        activities.push({
          time: "09:00 AM",
          activity: "Breakfast at hotel",
          duration: "1 hour",
        });
        activities.push({
          time: "10:00 AM",
          activity: "Main activity of the day",
          package: "Popular Tour Package",
          duration: "6 hours",
        });
        activities.push({
          time: "05:00 PM",
          activity: "Free time for personal exploration",
          duration: "2 hours",
        });
      }

      basicDays.push({
        day: i,
        activities,
      });
    }

    return {
      destination,
      totalDays: days,
      totalNights: nights,
      days: basicDays,
      packageNames: ["Airport Transfer Package", "City Highlights Tour", "Popular Tour Package", "Shopping Tour"],
      hotelRoomNames: ["Standard Room"],
      notes: [
        "This is a basic itinerary template.",
        "Customizations can be made based on your preferences.",
        "Exact package names and hotels will be confirmed during booking.",
      ],
    };
  }

  /**
   * Create mock AI response (for testing)
   */
  private createMockAIResponse(): any {
    return {
      destination: "Singapore",
      totalDays: 3,
      totalNights: 2,
      days: [
        {
          day: 1,
          activities: [
            {
              time: "09:00 AM",
              activity: "Airport arrival and transfer",
              package: "Airport Transfer Package",
              duration: "1 hour",
            },
            {
              time: "11:00 AM",
              activity: "Hotel check-in",
              hotelRoom: "Deluxe Room - Marina Bay Sands",
              duration: "1 hour",
            },
            {
              time: "02:00 PM",
              activity: "Gardens by the Bay tour",
              package: "Gardens by the Bay Package",
              duration: "4 hours",
            },
            {
              time: "07:00 PM",
              activity: "Dinner at Marina Bay",
              package: "Marina Bay Dining Package",
              duration: "2 hours",
            },
          ],
        },
        {
          day: 2,
          activities: [
            {
              time: "09:00 AM",
              activity: "Universal Studios Singapore",
              package: "Universal Studios Full Day Package",
              duration: "8 hours",
            },
            {
              time: "07:00 PM",
              activity: "Return to hotel",
              duration: "1 hour",
            },
          ],
        },
        {
          day: 3,
          activities: [
            {
              time: "09:00 AM",
              activity: "Sentosa Island tour",
              package: "Sentosa Island Explorer Package",
              duration: "4 hours",
            },
            {
              time: "02:00 PM",
              activity: "Shopping and last-minute souvenirs",
              package: "Shopping Tour Package",
              duration: "3 hours",
            },
            {
              time: "06:00 PM",
              activity: "Airport transfer",
              package: "Airport Transfer Package",
              duration: "1 hour",
            },
          ],
        },
      ],
      packageNames: [
        "Airport Transfer Package",
        "Gardens by the Bay Package",
        "Marina Bay Dining Package",
        "Universal Studios Full Day Package",
        "Sentosa Island Explorer Package",
        "Shopping Tour Package",
      ],
      hotelRoomNames: ["Deluxe Room - Marina Bay Sands"],
    };
  }
}

// Export singleton instance
export const itineraryGenerationService = new ItineraryGenerationService();
