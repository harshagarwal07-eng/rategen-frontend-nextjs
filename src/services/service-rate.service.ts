/**
 * Service Rate Fetching Service
 *
 * This service handles fetching rates for different travel services
 * based on the classified query information.
 */

import { createClient } from "@/utils/supabase/server";
import type {
  ServiceRateQuery,
  TravelQueryInfo,
  DMCSettings,
} from "@/types/query-classification";
import { TransferType } from "@/types/query-classification";
import type { TourOperationalHourDB } from "@/types/database";

// ========================================
// Operational Days Validation Helpers
// ========================================

/**
 * Get the day of week from a date string (e.g., "2025-02-12" → "Wednesday")
 */
function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[date.getDay()];
}

/**
 * Parse operational_hours from DB (may be JSON string or array)
 */
function parseOperationalHours(
  operationalHours: TourOperationalHourDB[] | string | undefined
): TourOperationalHourDB[] | null {
  if (!operationalHours) return null;

  if (typeof operationalHours === "string") {
    try {
      return JSON.parse(operationalHours);
    } catch {
      return null;
    }
  }

  return operationalHours;
}

/**
 * Check if a tour operates on a given day of the week
 */
function tourOperatesOnDay(
  operationalHours: TourOperationalHourDB[] | string | undefined,
  dayOfWeek: string
): { operates: boolean; operatingDays?: string[] } {
  const hours = parseOperationalHours(operationalHours);

  // If no operational hours specified, tour operates every day
  if (!hours || hours.length === 0) {
    return { operates: true };
  }

  const operatingDays = hours.map((h) => h.day);
  const operates = operatingDays.some(
    (day) => day.toLowerCase() === dayOfWeek.toLowerCase()
  );

  return { operates, operatingDays };
}

export interface ServiceRates {
  service: string;
  rates: ServiceRate[];
  currency: string;
  available: boolean;
  error?: string;
}

export interface ServiceRate {
  id: string;
  name: string;
  type: string;
  ticketOnlyRate?: {
    adult: number;
    child?: number;
  };
  withTransferRate?: {
    sic?: {
      adult: number;
      child?: number;
    };
    private?: {
      [paxCount: string]: number;
    };
    perVehicle?: {
      rate: number;
      brand?: string;
      capacity?: string;
      vehicleType?: string;
    }[];
  };
  includesTransfer?: boolean;
  description?: string;
  policies?: string[];
  metadata?: {
    // Hotel-specific fields
    room_rate_per_night?: number;
    single_pp?: number;
    double_pp?: number;
    extra_bed?: number;
    child_no_bed?: number;
    season_dates?: string;
    max_occupancy?: string;
    // Can be extended for other service types
    [key: string]: any;
  };
}

export interface RateQuote {
  query: ServiceRateQuery;
  services: ServiceRates[];
  totalCost: {
    min: number;
    max: number;
    currency: string;
  };
  recommendations?: string[];
  currency?: string;
}

export class ServiceRateService {
  /**
   * Fetch rates based on the travel query information
   * ✅ Week 1 Day 5: Parallel processing for all services
   */
  public async fetchRates(
    queryInfo: TravelQueryInfo,
    dmcId: string,
    settings: DMCSettings
  ): Promise<RateQuote> {
    console.log("[ServiceRate] Fetching rates for query:", queryInfo);

    // ========================================
    // Week 1 Day 5: Parallel service fetching (3x faster!)
    // ========================================
    const servicePromises = queryInfo.services.map((service) =>
      this.fetchServiceRates(service, queryInfo, dmcId)
    );

    const servicesResults = await Promise.all(servicePromises);
    console.log(
      `[ServiceRate] Parallel fetch completed for ${servicesResults.length} services`
    );

    // Deduplicate rates across services
    const seenRateIds = new Set<string>();
    const services: ServiceRates[] = servicesResults.map((serviceRates) => {
      if (serviceRates.rates.length > 0) {
        serviceRates.rates = serviceRates.rates.filter((rate) => {
          if (seenRateIds.has(rate.id)) {
            return false; // Skip duplicate
          }
          seenRateIds.add(rate.id);
          return true;
        });
      }
      return serviceRates;
    });

    // Calculate total cost
    let totalCost = 0;
    let quoteCurrency = "USD";

    for (const serviceRates of services) {
      // ✅ AI-FIRST: Send ALL rates to LLM, let it select the right room
      // The LLM will fuzzy match room categories and calculate pricing
      if (serviceRates.available && serviceRates.rates.length > 0) {
        // Just use first rate for totalCost (informational only)
        // The LLM will recalculate based on user's actual request
        const bestRate = serviceRates.rates[0];
        const rateTotal = this.getEffectiveRate(bestRate, queryInfo, "min");
        totalCost += rateTotal;

        // Use the service's native currency
        if (serviceRates.currency) {
          quoteCurrency = serviceRates.currency;
        }
      }
    }

    const quote: RateQuote = {
      query: this.buildServiceRateQuery(queryInfo),
      services,
      totalCost: {
        min: totalCost,
        max: totalCost, // Same as min for simple quotes
        currency: quoteCurrency, // Use service's native currency
      },
      recommendations: this.generateRecommendations(queryInfo, services),
    };

    console.log("[ServiceRate] Generated quote:", {
      services: quote.services.length,
      totalCost: quote.totalCost,
      currency: quote.currency,
    });
    return quote;
  }

  /**
   * Fetch rates for a specific service
   */
  private async fetchServiceRates(
    service: string,
    queryInfo: TravelQueryInfo,
    dmcId: string
  ): Promise<ServiceRates> {
    switch (service) {
      case "tour":
        return await this.fetchTourRates(queryInfo, dmcId);
      case "hotel":
        return await this.fetchHotelRates(queryInfo, dmcId);
      case "transfer":
        return await this.fetchTransferRates(queryInfo, dmcId);
      case "attraction":
        return await this.fetchAttractionRates(queryInfo, dmcId);
      default:
        return {
          service,
          rates: [],
          currency: "SGD",
          available: false,
        };
    }
  }

  /**
   * Fetch tour rates using view and hybrid search
   */
  private async fetchTourRates(
    queryInfo: TravelQueryInfo,
    dmcId: string
  ): Promise<ServiceRates> {
    const supabase = await createClient();

    try {
      console.log("[ServiceRate] Fetching tour rates for:", {
        destination: queryInfo.destination,
        ticketsOnly: queryInfo.ticketsOnly,
        transferIncluded: queryInfo.transferIncluded,
        attractions: queryInfo.specificRequests?.attractions,
      });

      // Step 1: Vector search for semantic matching
      const { vectorSearchTours } = await import(
        "@/lib/supabase/vector-search"
      );

      // Build search query from attractions or destination
      const searchQuery =
        queryInfo.specificRequests?.attractions?.join(" ") ||
        queryInfo.destination ||
        "";

      console.log(`[ServiceRate] Vector search query: "${searchQuery}"`);

      let tourPackages: any[] = [];

      try {
        // Multi-stage search: Try high threshold first, fall back to lower if needed
        console.log(
          `[ServiceRate] Stage 1: Trying threshold 0.65 (precise matches)...`
        );

        let vectorResults = await vectorSearchTours(dmcId, searchQuery, {
          limit: 20,
          similarityThreshold: 0.65,
        });

        console.log(
          `[ServiceRate] Stage 1 found ${vectorResults.length} tour packages`
        );

        // If we got fewer than 3 results, try again with lower threshold
        if (vectorResults.length < 3) {
          console.log(
            `[ServiceRate] Stage 2: Only ${vectorResults.length} results found, retrying with threshold 0.55...`
          );

          const fallbackResults = await vectorSearchTours(dmcId, searchQuery, {
            limit: 20,
            similarityThreshold: 0.55,
          });

          console.log(
            `[ServiceRate] Stage 2 found ${fallbackResults.length} tour packages`
          );

          if (fallbackResults.length > vectorResults.length) {
            vectorResults = fallbackResults;
            console.log(
              `[ServiceRate] ✓ Using Stage 2 results (${vectorResults.length} tours)`
            );
          } else {
            console.log(
              `[ServiceRate] ✓ Keeping Stage 1 results (no improvement from fallback)`
            );
          }
        } else {
          console.log(
            `[ServiceRate] ✓ Stage 1 sufficient (${vectorResults.length} tours found)`
          );
        }

        tourPackages = vectorResults;
      } catch (searchError) {
        console.error("[ServiceRate] Vector search failed:", searchError);
        return {
          service: "tour",
          rates: [],
          currency: queryInfo.destination === "Singapore" ? "SGD" : "USD",
          available: false,
        };
      }

      // =====================================================
      // ✅ Step 2.5: Validate operational days against requested date
      // =====================================================
      const requestedDate = queryInfo.dates?.startDate;
      let operationalDayError: string | undefined;

      if (requestedDate && tourPackages.length > 0) {
        const requestedDay = getDayOfWeek(requestedDate);
        console.log(
          `[ServiceRate] Checking operational days for ${requestedDay} (${requestedDate})`
        );

        // Filter tours that operate on the requested day
        const originalCount = tourPackages.length;
        const filteredPackages: typeof tourPackages = [];
        const nonOperatingTours: { name: string; operatingDays: string[] }[] =
          [];

        for (const pkg of tourPackages) {
          const { operates, operatingDays } = tourOperatesOnDay(
            pkg.operational_hours,
            requestedDay
          );

          if (operates) {
            filteredPackages.push(pkg);
          } else if (operatingDays) {
            // Track non-operating tours for error message
            nonOperatingTours.push({
              name: pkg.tour_name,
              operatingDays,
            });
          }
        }

        console.log(
          `[ServiceRate] Operational days filter: ${filteredPackages.length}/${originalCount} tours available on ${requestedDay}`
        );

        // If ALL tours were filtered out due to operational days
        if (
          filteredPackages.length === 0 &&
          nonOperatingTours.length > 0
        ) {
          // Create error message showing which tours don't operate
          const uniqueTours = Array.from(
            new Map(nonOperatingTours.map((t) => [t.name, t])).values()
          );

          if (uniqueTours.length === 1) {
            const tour = uniqueTours[0];
            operationalDayError = `The ${tour.name} does not operate on ${requestedDay}s. It only operates on: ${tour.operatingDays.join(", ")}. Please choose a different date.`;
          } else {
            operationalDayError = `None of the requested tours operate on ${requestedDay}s:\n${uniqueTours
              .map((t) => `• ${t.name}: operates on ${t.operatingDays.join(", ")}`)
              .join("\n")}`;
          }

          console.log(`[ServiceRate] ❌ ${operationalDayError}`);
        }

        tourPackages = filteredPackages;
      }

      // If all tours filtered out due to operational days, return error
      if (operationalDayError) {
        return {
          service: "tour",
          rates: [],
          currency: queryInfo.destination === "Singapore" ? "SGD" : "USD",
          available: false,
          error: operationalDayError,
        };
      }

      const rates: ServiceRate[] = [];

      // Step 3: Process each tour package (view returns one row per package!)
      for (const tourPackage of tourPackages) {
        // Get currency from package or default
        const packageCurrency = tourPackage.currency || "USD";

        // Process each season in the package
        // ✅ CRITICAL: Parse seasons JSON string from database
        const seasons = this.parseSeasons(tourPackage.seasons);

        for (const season of seasons) {
          // Create rate entry for this package-season combination
          const packageRate: ServiceRate = {
            id: `${tourPackage.id}-${season.dates || "default"}`,
            name: `${tourPackage.tour_name} - ${tourPackage.package_name}`,
            type: "tour",
            description:
              tourPackage.package_description || tourPackage.tour_description,
            includesTransfer: season.includes_transfer || false,
          };

          // Add ticket-only rates if available (some packages have this)
          if (season.ticket_only_rate_adult || season.ticket_only_rate_child) {
            packageRate.ticketOnlyRate = {
              adult: season.ticket_only_rate_adult || 0,
              child: season.ticket_only_rate_child || 0,
            };
          }

          // Add rates with transfers
          const withTransferRate: any = {};

          // SIC rates
          if (season.sic_rate_adult || season.sic_rate_child) {
            withTransferRate.sic = {
              adult: season.sic_rate_adult || 0,
              child: season.sic_rate_child || 0,
            };
          }

          // Private rates (per pax)
          if (season.pvt_rate && Object.keys(season.pvt_rate).length > 0) {
            withTransferRate.private = season.pvt_rate;
          }

          // Per vehicle rates
          if (season.per_vehicle_rate && season.per_vehicle_rate.length > 0) {
            withTransferRate.perVehicle = season.per_vehicle_rate;
          }

          if (Object.keys(withTransferRate).length > 0) {
            packageRate.withTransferRate = withTransferRate;
          }

          // Add policies
          const policies: string[] = [];
          if (tourPackage.package_child_policy) {
            policies.push(tourPackage.package_child_policy);
          }
          if (tourPackage.tour_child_policy) {
            policies.push(tourPackage.tour_child_policy);
          }
          if (policies.length > 0) {
            packageRate.policies = policies;
          }

          // ✅ Add operational_hours to metadata for final validation in formatResponse
          const parsedOpHours = parseOperationalHours(tourPackage.operational_hours);

          // ✅ Build complete metadata with all relevant fields for AI Remarks
          packageRate.metadata = {
            ...packageRate.metadata,
            // Operational hours for scheduling
            ...(parsedOpHours && parsedOpHours.length > 0 ? { operational_hours: parsedOpHours } : {}),
            // Package remarks (AI notes about SIC availability, operational days, etc.)
            ...(tourPackage.package_remarks ? { package_remarks: tourPackage.package_remarks } : {}),
            // Tour-level remarks if available
            ...(tourPackage.remarks ? { ai_remarks: tourPackage.remarks } : {}),
            // Tour description for context
            ...(tourPackage.tour_description ? { tour_description: tourPackage.tour_description } : {}),
          };

          rates.push(packageRate);
        }
      }

      // Filter and sort rates based on user preferences
      const filteredRates = this.filterRatesByPreferences(rates, queryInfo);

      console.log("[ServiceRate] Processed tour rates:", {
        totalPackages: tourPackages.length,
        totalRates: rates.length,
        filteredRates: filteredRates.length,
        userPreferences: {
          ticketsOnly: queryInfo.ticketsOnly,
          transferIncluded: queryInfo.transferIncluded,
        },
      });

      return {
        service: "tour",
        rates: filteredRates,
        currency: tourPackages[0]?.currency || "USD",
        available: filteredRates.length > 0,
      };
    } catch (error) {
      console.error(
        "[ServiceRate] Unexpected error fetching tour rates:",
        error
      );
      return {
        service: "tour",
        rates: [],
        currency: "USD",
        available: false,
      };
    }
  }

  /**
   * Filter rates based on user preferences
   */
  private filterRatesByPreferences(
    rates: ServiceRate[],
    queryInfo: TravelQueryInfo
  ): ServiceRate[] {
    // If user explicitly wants tickets only, return ONLY ticket-only rates (no transfers)
    if (queryInfo.ticketsOnly) {
      const ticketsOnlyRates = rates.filter(
        (rate) =>
          rate.ticketOnlyRate &&
          !rate.includesTransfer &&
          !rate.withTransferRate
      );

      // If we have pure ticket-only rates, return only the best one
      if (ticketsOnlyRates.length > 0) {
        // Sort by price (lowest first) and return only the best match
        const sorted = ticketsOnlyRates.sort(
          (a, b) =>
            (a.ticketOnlyRate?.adult || 0) - (b.ticketOnlyRate?.adult || 0)
        );
        return [sorted[0]]; // Return only the best matching rate
      }

      // If no pure ticket-only rates, return cheapest rate without transfers
      const noTransferRates = rates.filter((rate) => !rate.includesTransfer);
      if (noTransferRates.length > 0) {
        const sorted = noTransferRates.sort(
          (a, b) =>
            (a.ticketOnlyRate?.adult || 0) - (b.ticketOnlyRate?.adult || 0)
        );
        return [sorted[0]]; // Return only the best matching rate
      }
    }

    // If user wants transfers included, return only the best with-transfer option
    if (queryInfo.transferIncluded) {
      const withTransferRates = rates.filter(
        (rate) => rate.includesTransfer || rate.withTransferRate
      );

      if (withTransferRates.length > 0) {
        // If user specified a transfer type, filter by that
        let filteredByType = withTransferRates;
        if (
          queryInfo.preferences?.transportType &&
          queryInfo.preferences.transportType.length > 0
        ) {
          const preferredType = queryInfo.preferences.transportType[0]; // Use first preference
          filteredByType = withTransferRates.filter((rate) => {
            if (!rate.withTransferRate) return false;
            // Check if the rate has the preferred transfer type
            if (preferredType === "private" && rate.withTransferRate.private)
              return true;
            if (preferredType === "sic" && rate.withTransferRate.sic)
              return true;
            if (
              preferredType === "per_vehicle" &&
              rate.withTransferRate.perVehicle
            )
              return true;
            return false;
          });
        }

        const ratesToSort =
          filteredByType.length > 0 ? filteredByType : withTransferRates;
        const sorted = ratesToSort.sort((a, b) => {
          const aRate = this.getEffectiveRate(a, queryInfo, "min");
          const bRate = this.getEffectiveRate(b, queryInfo, "min");
          return aRate - bRate;
        });
        return [sorted[0]]; // Return only the best matching rate
      }
    }

    // ✅ NO hardcoded filtering - trust database query + vector search
    // If user specified specific attractions, the database query and vector search
    // already filtered for them. No need for redundant JavaScript string matching.
    if (
      queryInfo.specificRequests?.attractions &&
      queryInfo.specificRequests.attractions.length > 0
    ) {
      console.log(
        "[ServiceRate] Database + vector search already filtered for specific attractions:",
        queryInfo.specificRequests.attractions
      );
      // Return all rates from DB (already filtered) sorted by price
      const sorted = rates.sort((a, b) => {
        const aRate = this.getEffectiveRate(a, queryInfo, "min");
        const bRate = this.getEffectiveRate(b, queryInfo, "min");
        return aRate - bRate;
      });
      return sorted; // Return all matches from DB
    }

    // Default: return only the best matching rate (cheapest)
    const sorted = rates.sort((a, b) => {
      const aRate = this.getEffectiveRate(a, queryInfo, "min");
      const bRate = this.getEffectiveRate(b, queryInfo, "min");
      return aRate - bRate;
    });

    // Return top 3 for general queries (not specific preferences)
    return sorted.slice(0, 3);
  }

  /**
   * Fetch hotel rates using THREE-STAGE filtering
   * ✅ NEW: Token-efficient approach (70-80% token reduction)
   *
   * Stage 1: Hotel Name Matching (Small Model) - ~600 tokens
   * Stage 2: Room Selection (Small Model) - ~900 tokens
   * Stage 3: Quote Generation - ~10,000 tokens
   *
   * Total: ~11,500 tokens vs old ~70,000 tokens
   */
  private async fetchHotelRates(
    queryInfo: TravelQueryInfo,
    dmcId: string
  ): Promise<ServiceRates> {
    try {
      console.log("[ServiceRate] Starting THREE-STAGE hotel search");
      console.log("[ServiceRate] Destination:", queryInfo.destination);

      // ========================================
      // STAGE 1: Hotel Name Matching (Small Model)
      // ========================================
      const { vectorSearchHotelNames } = await import(
        "@/lib/supabase/vector-search"
      );
      const { hotelMatcherService } = await import(
        "@/services/hotel-matcher.service"
      );

      // Build search query
      const searchQuery =
        queryInfo.specificRequests?.hotels?.join(" ") ||
        queryInfo.destination ||
        "";

      console.log(
        `[ServiceRate] Stage 1: Vector search for hotel names with query: "${searchQuery}"`
      );

      const hotelNames = await vectorSearchHotelNames(dmcId, searchQuery, {
        limit: 10,
        similarityThreshold: 0.65,
      });

      if (hotelNames.length === 0) {
        console.warn("[ServiceRate] Stage 1: No hotels found");
        return {
          service: "hotel",
          rates: [],
          currency: "USD",
          available: false,
        };
      }

      console.log(
        `[ServiceRate] Stage 1: Found ${hotelNames.length} hotel names`
      );

      // Use AI to match hotels
      const hotelMatchResult = await hotelMatcherService.matchHotels({
        query: searchQuery, // ✅ FIX: Use actual search query string, not queryInfo.toString()
        hotels: hotelNames,
        conversationHistory: [], // TODO: Pass from state if available
        userSelectedModel: queryInfo.userSelectedModel,
      });

      console.log(
        `[ServiceRate] Stage 1: AI selected ${hotelMatchResult.hotel_ids.length} hotels (confidence: ${hotelMatchResult.confidence})`
      );

      if (hotelMatchResult.hotel_ids.length === 0) {
        console.warn("[ServiceRate] Stage 1: No hotels matched");
        return {
          service: "hotel",
          rates: [],
          currency: "USD",
          available: false,
        };
      }

      // ========================================
      // STAGE 2: Room Selection (Small Model)
      // ========================================
      const { fetchRoomsForHotels } = await import(
        "@/lib/supabase/vector-search"
      );
      const { roomSelectorService } = await import(
        "@/services/room-selector.service"
      );

      console.log(
        `[ServiceRate] Stage 2: Fetching rooms for ${hotelMatchResult.hotel_ids.length} hotels`
      );

      const rooms = await fetchRoomsForHotels(hotelMatchResult.hotel_ids);

      if (rooms.length === 0) {
        console.warn(
          "[ServiceRate] Stage 2: No rooms found for matched hotels"
        );
        return {
          service: "hotel",
          rates: [],
          currency: "USD",
          available: false,
        };
      }

      console.log(`[ServiceRate] Stage 2: Found ${rooms.length} rooms`);

      // ✅ Build pax details string from travelers for capacity validation
      const partySize = this.buildPartySizeString(queryInfo.travelers);
      console.log(`[ServiceRate] Stage 2: Pax details: ${partySize}`);

      // Build room selection query - include room category if specified
      const roomQuery = queryInfo.specificRequests?.room_category
        ? `${searchQuery} - ${queryInfo.specificRequests.room_category}`
        : searchQuery;

      // Use AI to select room(s)
      const roomSelectResult = await roomSelectorService.selectRoom({
        query: roomQuery, // ✅ FIX: Use actual query string with room category, not queryInfo.toString()
        rooms,
        partySize, // ✅ Pass pax details for capacity validation
        conversationHistory: [], // TODO: Pass from state if available
      });

      console.log(
        `[ServiceRate] Stage 2: AI selected ${roomSelectResult.selections.length} rooms`
      );

      if (roomSelectResult.selections.length === 0) {
        console.warn("[ServiceRate] Stage 2: No rooms selected");
        return {
          service: "hotel",
          rates: [],
          currency: "USD",
          available: false,
        };
      }

      // ========================================
      // STAGE 2.5: Check Stop Sale Dates
      // ========================================
      // Check if requested dates fall within stop sale periods for selected rooms
      // Stop sale = room NOT AVAILABLE during those dates

      const { stopSaleCheckerService } = await import(
        "@/services/stop-sale-checker.service"
      );

      // Filter out rooms that are blocked by stop sale
      const availableSelections = [];
      const blockedRooms: string[] = [];

      for (const selection of roomSelectResult.selections) {
        // Find the room to get its stop_sale data
        const room = rooms.find((r) => r.room_id === selection.room_id);

        if (!room) {
          console.warn(
            `[ServiceRate] Stage 2.5: Room not found for selection: ${selection.room_id}`
          );
          continue;
        }

        // Parse stop sale periods (can be multi-line or comma-separated)
        const stopSalePeriods = room.stop_sale
          ? room.stop_sale
              .split(/[\n,]/)
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : [];

        console.log(
          `[ServiceRate] Stage 2.5: Checking stop sale for ${room.room_category} (${stopSalePeriods.length} periods)`
        );

        // Check if dates fall within stop sale
        const stopSaleCheck = await stopSaleCheckerService.checkStopSale({
          checkInDate: queryInfo.dates?.startDate || "",
          checkOutDate: queryInfo.dates?.endDate || "",
          nights: queryInfo.duration?.nights || 1,
          stopSalePeriods,
          userSelectedModel: queryInfo.userSelectedModel,
        });

        if (stopSaleCheck.is_available) {
          console.log(
            `[ServiceRate] Stage 2.5: ✅ ${room.room_category} is available - ${stopSaleCheck.reason}`
          );
          availableSelections.push(selection);
        } else {
          console.warn(
            `[ServiceRate] Stage 2.5: ❌ ${room.room_category} is blocked - ${stopSaleCheck.reason}`
          );
          blockedRooms.push(`${room.room_category}: ${stopSaleCheck.reason}`);
        }
      }

      // If all rooms are blocked by stop sale, return early
      if (availableSelections.length === 0) {
        console.warn(
          "[ServiceRate] Stage 2.5: All selected rooms are blocked by stop sale"
        );
        return {
          service: "hotel",
          rates: [],
          currency: "USD",
          available: false,
          error: `Room(s) not available for the requested dates:\n${blockedRooms.join(
            "\n"
          )}`,
        };
      }

      // If some rooms were blocked, log it
      if (blockedRooms.length > 0) {
        console.log(
          `[ServiceRate] Stage 2.5: ${blockedRooms.length} rooms blocked by stop sale, proceeding with ${availableSelections.length} available rooms`
        );
      }

      // ========================================
      // STAGE 3: Fetch Full Room Details for Quote
      // ========================================
      const { fetchRoomDetailsForQuote } = await import(
        "@/lib/supabase/vector-search"
      );

      console.log(
        `[ServiceRate] Stage 3: Fetching full details for ${availableSelections.length} rooms (after stop sale filter)`
      );

      const rates: ServiceRate[] = [];
      let currency = "USD";

      for (const selection of availableSelections) {
        const roomDetails = await fetchRoomDetailsForQuote(selection.room_id);

        if (!roomDetails) {
          console.warn(
            `[ServiceRate] Stage 3: Room details not found for room_id: ${selection.room_id}`
          );
          continue;
        }

        console.log(
          `[ServiceRate] Stage 3: Processing ${roomDetails.hotel_name} - ${roomDetails.room_category}`
        );

        // Process seasons (already parsed by fetchRoomDetailsForQuote)
        const seasons = Array.isArray(roomDetails.seasons)
          ? roomDetails.seasons
          : this.parseSeasons(roomDetails.seasons);

        console.log(
          `[ServiceRate] Stage 3: Found ${seasons.length} seasons for ${roomDetails.room_category}`
        );

        for (const season of seasons) {
          const hotelRate: ServiceRate = {
            id: `${roomDetails.id}-${season.dates || "default"}`,
            name: `${roomDetails.hotel_name} - ${roomDetails.room_category}`,
            type: "hotel",
            description: `${roomDetails.star_rating}-star | ${
              roomDetails.meal_plan || "Room Only"
            } | ${roomDetails.hotel_city}`,
          };

          // Hotel rates structure
          hotelRate.ticketOnlyRate = {
            adult: season.double_pp || 0,
            child: season.child_no_bed || 0,
          };

          // Store room-level rates in metadata
          hotelRate.metadata = {
            // Pricing fields
            room_rate_per_night: season.rate_per_night || 0,
            single_pp: season.single_pp || 0,
            double_pp: season.double_pp || 0,
            extra_bed_pp: season.extra_bed_pp || 0,
            child_no_bed: season.child_no_bed || 0,
            season_dates: season.dates,
            max_occupancy: roomDetails.max_occupancy,

            // ✅ Capacity validation note from room selector
            capacity_note: selection.capacity_note,

            // Early booking offers
            booking_offers: season.booking_offers || [],

            // Policy fields for LLM to interpret
            extra_bed_policy: roomDetails.extra_bed_policy || "",
            meal_plan: roomDetails.meal_plan || "Room Only",
            meal_plan_rates: this.parseMealPlanRates(
              roomDetails.meal_plan_rates
            ),
            offers: roomDetails.offers || "",
            remarks: roomDetails.remarks || "",
            age_policy: this.parseAgePolicy(roomDetails.age_policy),
            other_details: roomDetails.other_details || "",

            // Hotel context
            hotel_currency: roomDetails.hotel_currency || "USD",
            star_rating: roomDetails.star_rating,
          };

          // Add policies
          const policies: string[] = [];
          if (roomDetails.other_details) {
            policies.push(roomDetails.other_details);
          }
          if (roomDetails.cancellation_policy) {
            policies.push(`Cancellation: ${roomDetails.cancellation_policy}`);
          }
          if (policies.length > 0) {
            hotelRate.policies = policies;
          }

          rates.push(hotelRate);
        }

        currency = roomDetails.hotel_currency || "USD";
      }

      console.log(
        `[ServiceRate] Stage 3: Generated ${rates.length} rate entries from ${availableSelections.length} rooms`
      );

      return {
        service: "hotel",
        rates,
        currency,
        available: rates.length > 0,
      };
    } catch (error) {
      console.error("[ServiceRate] Error in three-stage hotel search:", error);
      return {
        service: "hotel",
        rates: [],
        currency: "USD",
        available: false,
      };
    }
  }

  /**
   * Fetch transfer rates using view and hybrid search
   */
  private async fetchTransferRates(
    queryInfo: TravelQueryInfo,
    dmcId: string
  ): Promise<ServiceRates> {
    const supabase = await createClient();

    try {
      console.log(
        "[ServiceRate] Fetching transfer rates for:",
        queryInfo.destination
      );

      // Step 1: Vector search for semantic matching
      const { vectorSearchTransfers } = await import(
        "@/lib/supabase/vector-search"
      );

      const searchQuery = queryInfo.destination || "";

      console.log(`[ServiceRate] Vector search query: "${searchQuery}"`);

      let transferPackages: any[] = [];

      try {
        // Multi-stage search: Try high threshold first, fall back to lower if needed
        console.log(
          `[ServiceRate] Stage 1: Trying threshold 0.65 (precise matches)...`
        );

        let vectorResults = await vectorSearchTransfers(dmcId, searchQuery, {
          limit: 20,
          similarityThreshold: 0.65,
        });

        console.log(
          `[ServiceRate] Stage 1 found ${vectorResults.length} transfer packages`
        );

        // If we got fewer than 3 results, try again with lower threshold
        if (vectorResults.length < 3) {
          console.log(
            `[ServiceRate] Stage 2: Only ${vectorResults.length} results found, retrying with threshold 0.55...`
          );

          const fallbackResults = await vectorSearchTransfers(
            dmcId,
            searchQuery,
            {
              limit: 20,
              similarityThreshold: 0.55,
            }
          );

          console.log(
            `[ServiceRate] Stage 2 found ${fallbackResults.length} transfer packages`
          );

          if (fallbackResults.length > vectorResults.length) {
            vectorResults = fallbackResults;
            console.log(
              `[ServiceRate] ✓ Using Stage 2 results (${vectorResults.length} transfers)`
            );
          } else {
            console.log(
              `[ServiceRate] ✓ Keeping Stage 1 results (no improvement from fallback)`
            );
          }
        } else {
          console.log(
            `[ServiceRate] ✓ Stage 1 sufficient (${vectorResults.length} transfers found)`
          );
        }

        transferPackages = vectorResults;
      } catch (searchError) {
        console.error("[ServiceRate] Vector search failed:", searchError);
        return {
          service: "transfer",
          rates: [],
          currency: "USD",
          available: false,
        };
      }

      const rates: ServiceRate[] = [];

      // Step 3: Process each transfer package
      for (const transferPackage of transferPackages) {
        // Process each season in the package
        // ✅ CRITICAL: Parse seasons JSON string from database
        const seasons = this.parseSeasons(transferPackage.seasons);

        for (const season of seasons) {
          const transferRate: ServiceRate = {
            id: `${transferPackage.id}-${season.dates || "default"}`,
            name: `${transferPackage.transfer_name} - ${transferPackage.package_name}`,
            type: "transfer",
            description:
              transferPackage.package_description ||
              transferPackage.transfer_description,
          };

          // Build transfer rates
          const withTransferRate: any = {};

          // SIC rates
          if (season.sic_rate_adult || season.sic_rate_child) {
            withTransferRate.sic = {
              adult: season.sic_rate_adult || 0,
              child: season.sic_rate_child || 0,
            };
            // Also add as ticketOnlyRate for transfers (same thing)
            transferRate.ticketOnlyRate = withTransferRate.sic;
          }

          // Private rates (per pax)
          if (season.pvt_rate && Object.keys(season.pvt_rate).length > 0) {
            withTransferRate.private = season.pvt_rate;
          }

          // Per vehicle rates
          if (season.per_vehicle_rate && season.per_vehicle_rate.length > 0) {
            withTransferRate.perVehicle = season.per_vehicle_rate;
          }

          if (Object.keys(withTransferRate).length > 0) {
            transferRate.withTransferRate = withTransferRate;
          }

          // Add policies
          const policies: string[] = [];
          if (transferPackage.package_child_policy) {
            policies.push(transferPackage.package_child_policy);
          }
          if (transferPackage.transfer_child_policy) {
            policies.push(transferPackage.transfer_child_policy);
          }
          if (policies.length > 0) {
            transferRate.policies = policies;
          }

          // ✅ Build complete metadata with all relevant fields for AI Remarks
          transferRate.metadata = {
            ...transferRate.metadata,
            // Package remarks (AI notes about availability, operational info, etc.)
            ...(transferPackage.package_remarks ? { package_remarks: transferPackage.package_remarks } : {}),
            // Transfer-level remarks if available
            ...(transferPackage.remarks ? { ai_remarks: transferPackage.remarks } : {}),
            // Transfer description for context
            ...(transferPackage.transfer_description ? { transfer_description: transferPackage.transfer_description } : {}),
          };

          rates.push(transferRate);
        }
      }

      return {
        service: "transfer",
        rates,
        currency: transferPackages[0]?.currency || "USD",
        available: rates.length > 0,
      };
    } catch (error) {
      console.error("[ServiceRate] Error fetching transfer rates:", error);
      return {
        service: "transfer",
        rates: [],
        currency: "USD",
        available: false,
      };
    }
  }

  /**
   * Fetch attraction rates using view and hybrid search
   */
  private async fetchAttractionRates(
    queryInfo: TravelQueryInfo,
    dmcId: string
  ): Promise<ServiceRates> {
    const supabase = await createClient();

    try {
      console.log(
        "[ServiceRate] Fetching attraction rates for:",
        queryInfo.destination
      );

      // Step 1: Build keyword search query on vw_tours_packages view
      // Attractions are often listed as tours (e.g., Universal Studios, Sentosa, etc.)
      let query = supabase
        .from("vw_tours_packages")
        .select("*")
        .eq("dmc_id", dmcId);

      // ✅ NO hardcoded attraction keywords - trust LLM's search_text
      const attractionKeywords = queryInfo.specificRequests?.attractions || [];
      if (attractionKeywords.length > 0) {
        const filters = attractionKeywords
          .map((keyword) => `tour_name.ilike.%${keyword}%`)
          .join(",");
        query = query.or(filters);
      } else if (queryInfo.destination) {
        // If no specific attractions, search by destination only
        // Don't guess what attractions they want - let vector search handle it
        query = query.or(
          `country.ilike.%${queryInfo.destination}%,city.ilike.%${queryInfo.destination}%`
        );
      } else {
        // No attractions specified and no destination - return empty
        console.warn(
          "[ServiceRate] No attractions or destination specified for attraction search"
        );
      }

      // Order by preferred first
      query = query.order("package_preferred", { ascending: false }).limit(20);

      const { data: keywordResults, error } = await query;

      if (error) {
        console.error("[ServiceRate] Error fetching attraction rates:", error);
        return {
          service: "attraction",
          rates: [],
          currency: "USD",
          available: false,
        };
      }

      console.log(
        `[ServiceRate] Keyword search found ${
          keywordResults?.length || 0
        } attraction packages`
      );

      // Step 2: Vector search for semantic matching (with multi-stage fallback)
      let attractionPackages: any[] = [];

      try {
        const { vectorSearchTours } = await import(
          "@/lib/supabase/vector-search"
        );

        const searchQuery =
          attractionKeywords.join(" ") || "attractions theme parks museums";

        // Multi-stage search: Try high threshold first, fall back to lower if needed
        console.log(
          `[ServiceRate] Stage 1: Trying threshold 0.65 (precise matches)...`
        );

        let vectorResults = await vectorSearchTours(dmcId, searchQuery, {
          limit: 20,
          similarityThreshold: 0.65,
        });

        console.log(
          `[ServiceRate] Stage 1 found ${vectorResults.length} attraction packages`
        );

        // If we got fewer than 3 results, try again with lower threshold
        if (vectorResults.length < 3) {
          console.log(
            `[ServiceRate] Stage 2: Only ${vectorResults.length} results found, retrying with threshold 0.55...`
          );

          const fallbackResults = await vectorSearchTours(dmcId, searchQuery, {
            limit: 20,
            similarityThreshold: 0.55,
          });

          console.log(
            `[ServiceRate] Stage 2 found ${fallbackResults.length} attraction packages`
          );

          if (fallbackResults.length > vectorResults.length) {
            vectorResults = fallbackResults;
            console.log(
              `[ServiceRate] ✓ Using Stage 2 results (${vectorResults.length} attractions)`
            );
          } else {
            console.log(
              `[ServiceRate] ✓ Keeping Stage 1 results (no improvement from fallback)`
            );
          }
        } else {
          console.log(
            `[ServiceRate] ✓ Stage 1 sufficient (${vectorResults.length} attractions found)`
          );
        }

        attractionPackages = vectorResults;
      } catch (searchError) {
        console.error("[ServiceRate] Vector search failed:", searchError);
        attractionPackages = keywordResults || [];
      }

      const rates: ServiceRate[] = [];

      // Step 3: Process each attraction package
      for (const attractionPackage of attractionPackages) {
        // Process each season in the package
        // ✅ CRITICAL: Parse seasons JSON string from database
        const seasons = this.parseSeasons(attractionPackage.seasons);

        for (const season of seasons) {
          const attractionRate: ServiceRate = {
            id: `${attractionPackage.id}-${season.dates || "default"}`,
            name: `${attractionPackage.tour_name} - ${attractionPackage.package_name}`,
            type: "attraction",
            description:
              attractionPackage.package_description ||
              attractionPackage.tour_description,
          };

          // Add ticket-only rates if available
          if (season.ticket_only_rate_adult || season.ticket_only_rate_child) {
            attractionRate.ticketOnlyRate = {
              adult: season.ticket_only_rate_adult || 0,
              child: season.ticket_only_rate_child || 0,
            };
          }

          // Some attractions may have SIC rates
          if (season.sic_rate_adult || season.sic_rate_child) {
            if (!attractionRate.ticketOnlyRate) {
              attractionRate.ticketOnlyRate = {
                adult: season.sic_rate_adult || 0,
                child: season.sic_rate_child || 0,
              };
            }
          }

          rates.push(attractionRate);
        }
      }

      return {
        service: "attraction",
        rates,
        currency: attractionPackages[0]?.currency || "USD",
        available: rates.length > 0,
      };
    } catch (error) {
      console.error("[ServiceRate] Error fetching attraction rates:", error);
      return {
        service: "attraction",
        rates: [],
        currency: "USD",
        available: false,
      };
    }
  }

  /**
   * Consolidate tour rates from multiple packages/seasons
   */
  private consolidateTourRates(packageRates: any[]): any {
    const consolidated = {
      ticketOnly: { adult: 0, child: 0 },
      sic: { adult: 0, child: 0 },
      private: {} as { [key: string]: number },
      perVehicle: [] as any[],
      includesTransfer: false,
    };

    // Find minimum rates across all packages
    packageRates.forEach((rate) => {
      // Update ticket-only rates
      if (
        rate.ticketOnly.adult < consolidated.ticketOnly.adult ||
        consolidated.ticketOnly.adult === 0
      ) {
        consolidated.ticketOnly = rate.ticketOnly;
      }

      // Update SIC rates
      if (
        rate.sic?.adult < consolidated.sic.adult ||
        consolidated.sic.adult === 0
      ) {
        consolidated.sic = rate.sic || consolidated.sic;
      }

      // Merge private rates
      Object.assign(consolidated.private, rate.private || {});

      // Merge per-vehicle rates
      if (rate.perVehicle?.length > 0) {
        consolidated.perVehicle.push(...rate.perVehicle);
      }

      // Check if any include transfer
      if (rate.includesTransfer) {
        consolidated.includesTransfer = true;
      }
    });

    return consolidated;
  }

  /**
   * Get effective rate based on user preferences
   * ✅ AI-FIRST: This returns a basic rate for informational purposes only
   * The LLM will recalculate based on actual nights, room selection, etc.
   */
  private getEffectiveRate(
    rate: ServiceRate,
    queryInfo: TravelQueryInfo,
    minMax: "min" | "max"
  ): number {
    const adults = queryInfo.travelers.adults;
    const children = queryInfo.travelers.children || 0;

    // If user explicitly wants tickets only
    if (queryInfo.ticketsOnly) {
      if (rate.ticketOnlyRate) {
        return (
          rate.ticketOnlyRate.adult * adults +
          (rate.ticketOnlyRate.child || 0) * children
        );
      }
      // If rate doesn't have ticket-only pricing but user wants tickets only,
      // return the lowest available rate
      if (rate.withTransferRate) {
        const sicRate =
          (rate.withTransferRate.sic?.adult || 0) * adults +
          (rate.withTransferRate.sic?.child || 0) * children;
        const privateRate =
          (rate.withTransferRate.private?.[`${adults}pax`] || 0) * adults; // ✅ Multiply by adults for total price
        const vehicleRate = rate.withTransferRate.perVehicle?.[0]?.rate || 0;

        return Math.min(sicRate, privateRate, vehicleRate);
      }
      return 0;
    }

    // If transfer is included or requested
    if (queryInfo.transferIncluded && rate.withTransferRate) {
      const transportType = queryInfo.preferences?.transportType?.[0];

      switch (transportType) {
        case TransferType.SIC:
          return (
            (rate.withTransferRate.sic?.adult || 0) * adults +
            (rate.withTransferRate.sic?.child || 0) * children
          );

        case TransferType.PRIVATE:
          const privateTransferRate =
            rate.withTransferRate.private?.[`${adults}pax`] || 0;
          return privateTransferRate * adults; // ✅ Multiply by adults for total price

        case TransferType.PER_VEHICLE:
          const vehicleRate = rate.withTransferRate.perVehicle?.[0]?.rate || 0;
          return vehicleRate;

        default:
          // Default to SIC if available
          if (rate.withTransferRate.sic) {
            return (
              (rate.withTransferRate.sic?.adult || 0) * adults +
              (rate.withTransferRate.sic?.child || 0) * children
            );
          }
          // Fallback to private
          const privateFallbackRate =
            rate.withTransferRate.private?.[`${adults}pax`] || 0;
          if (privateFallbackRate > 0) return privateFallbackRate * adults; // ✅ Multiply by adults for total price
          // Final fallback to per-vehicle
          return rate.withTransferRate.perVehicle?.[0]?.rate || 0;
      }
    }

    // Default to ticket-only rate if available
    if (rate.ticketOnlyRate) {
      return (
        rate.ticketOnlyRate.adult * adults +
        (rate.ticketOnlyRate.child || 0) * children
      );
    }

    // Fallback to any available rate
    if (rate.withTransferRate?.sic) {
      return (
        (rate.withTransferRate.sic?.adult || 0) * adults +
        (rate.withTransferRate.sic?.child || 0) * children
      );
    }

    if (rate.withTransferRate?.private?.[`${adults}pax`]) {
      return rate.withTransferRate.private[`${adults}pax`] * adults; // ✅ Multiply by adults for total price
    }

    if (rate.withTransferRate?.perVehicle?.[0]?.rate) {
      return rate.withTransferRate.perVehicle[0].rate;
    }

    return 0;
  }

  /**
   * Build service rate query from travel query info
   */
  private buildServiceRateQuery(queryInfo: TravelQueryInfo): ServiceRateQuery {
    return {
      service: queryInfo.services[0] || "tour", // Take first service for now
      destination: queryInfo.destination || "",
      adults: queryInfo.travelers.adults,
      children: queryInfo.travelers.children,
      transferIncluded: queryInfo.transferIncluded,
      ticketsOnly: queryInfo.ticketsOnly,
      specificAttractions: queryInfo.specificRequests?.attractions,
      specificHotels: queryInfo.specificRequests?.hotels,
      room_category: queryInfo.specificRequests?.room_category, // ✅ Room category for hotel queries
      dates:
        queryInfo.dates?.startDate && queryInfo.dates?.endDate
          ? {
              startDate: queryInfo.dates.startDate,
              endDate: queryInfo.dates.endDate,
            }
          : undefined,
    };
  }

  /**
   * Generate recommendations based on query and available rates
   * ✅ NO hardcoded recommendation logic - let response-formatter LLM handle this
   *
   * The response-formatter.service.ts already uses AI to generate personalized
   * recommendations based on all available context. No need for hardcoded rules here.
   */
  private generateRecommendations(
    queryInfo: TravelQueryInfo,
    services: ServiceRates[]
  ): string[] {
    // Return empty - let AI in response-formatter generate intelligent recommendations
    console.log(
      "[ServiceRate] Skipping hardcoded recommendations - will be generated by AI in response formatter"
    );
    return [];
  }

  /**
   * Parse meal_plan_rates JSON string safely
   * Returns array of meal plan supplements or empty array if parsing fails
   */
  private parseMealPlanRates(mealPlanRatesJson: string | object | null): any[] {
    if (!mealPlanRatesJson) return [];

    // If already an object/array, return it directly
    if (typeof mealPlanRatesJson === "object") {
      return Array.isArray(mealPlanRatesJson) ? mealPlanRatesJson : [];
    }

    // Otherwise parse the JSON string
    try {
      const parsed = JSON.parse(mealPlanRatesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("[ServiceRate] Failed to parse meal_plan_rates:", error);
      return [];
    }
  }

  /**
   * Parse age_policy JSON string safely
   * Returns age policy object or empty object if parsing fails
   */
  private parseAgePolicy(agePolicyJson: string | object | null): any {
    if (!agePolicyJson) return {};

    // If already an object, return it directly
    if (typeof agePolicyJson === "object") {
      return agePolicyJson;
    }

    // Otherwise parse the JSON string
    try {
      return JSON.parse(agePolicyJson);
    } catch (error) {
      console.warn("[ServiceRate] Failed to parse age_policy:", error);
      return {};
    }
  }

  /**
   * Parse seasons JSON string safely
   * ✅ CRITICAL FIX: Database views return seasons as JSON string, not parsed array
   * Without this, the code iterates over string characters instead of season objects,
   * causing all pricing to be $0!
   */
  private parseSeasons(seasons: any): any[] {
    if (!seasons) return [];

    // If already an array, return it directly
    if (Array.isArray(seasons)) return seasons;

    // If it's a string, try to parse it
    if (typeof seasons === "string") {
      try {
        const parsed = JSON.parse(seasons);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn("[ServiceRate] Failed to parse seasons JSON:", error);
        return [];
      }
    }

    // Unknown type, return empty array
    console.warn(
      "[ServiceRate] Unknown seasons type:",
      typeof seasons,
      seasons
    );
    return [];
  }

  /**
   * Build pax details string from travelers data for capacity validation
   * Converts travelers object to format like: "2A + 1C(5yr) + 1Teen(12yr)"
   *
   * Age classifications:
   * - Infant: 0-5 years
   * - Child (C): 6-11 years
   * - Teen: 12-17 years
   * - Adult (A): 18+ years
   */
  private buildPartySizeString(travelers: {
    adults: number;
    children?: number;
    infants?: number;
    childrenDetails?: { age: number }[];
  }): string {
    const parts: string[] = [];

    // Add adults
    if (travelers.adults > 0) {
      parts.push(`${travelers.adults}A`);
    }

    // Add children with individual ages (if available)
    if (travelers.childrenDetails && travelers.childrenDetails.length > 0) {
      for (const child of travelers.childrenDetails) {
        const age = child.age;

        if (age >= 0 && age <= 5) {
          // Infant
          parts.push(`1Infant(${age}yr)`);
        } else if (age >= 6 && age <= 11) {
          // Child
          parts.push(`1C(${age}yr)`);
        } else if (age >= 12 && age <= 17) {
          // Teen
          parts.push(`1Teen(${age}yr)`);
        } else {
          // Adult (18+) - though this should be in adults count
          parts.push(`1A(${age}yr)`);
        }
      }
    } else if (travelers.children && travelers.children > 0) {
      // Fallback: if no individual ages, just show count
      parts.push(`${travelers.children}C`);
    }

    return parts.join(" + ") || "0 travelers";
  }
}

// Export singleton instance
export const serviceRateService = new ServiceRateService();
