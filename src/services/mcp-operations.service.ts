import { getMCPClient } from "@/lib/mcp/mcp-client";
import {
  vectorSearchHotels,
  vectorSearchTours,
  vectorSearchTransfers,
} from "@/lib/supabase/vector-search";

/**
 * MCP Operations Service
 *
 * Week 2 Day 5: Enhanced with hybrid vector + keyword search
 *
 * Centralizes all MCP tool interactions with proper error handling
 * and business logic separation.
 *
 * Testable dependency injection architecture
 */
export interface MCPClientInterface {
  callTool(toolName: string, args: any, options?: any): Promise<any>;
  getCacheMetrics(): any;
  getRetryMetrics(): any;
  getCircuitBreakerStates(): any;
}

export interface ServiceSearchParams {
  dmc_id: string;
  search_text: string;
  country_name: string;
}

export interface ServiceDetails {
  id: string;
  name: string;
  type: "tour" | "hotel" | "transfer";
  details: any;
  pricing?: any;
}

export interface SearchResults {
  tours: ServiceDetails[];
  hotels: ServiceDetails[];
  transfers: ServiceDetails[];
  total: number;
}

export class MCPOperationsService {
  constructor(private mcpClient: MCPClientInterface) {}

  /**
   * Search for all services (tours, hotels, transfers) in parallel
   */
  async searchAllServices(params: ServiceSearchParams): Promise<SearchResults> {
    console.log("🔍 [MCP_OPERATIONS] Searching all services:", params);

    const searchPromises = [
      this.searchTours(params),
      this.searchHotels(params),
      this.searchTransfers(params),
    ];

    try {
      const [tours, hotels, transfers] = await Promise.allSettled(
        searchPromises
      );

      const results: SearchResults = {
        tours: tours.status === "fulfilled" ? tours.value : [],
        hotels: hotels.status === "fulfilled" ? hotels.value : [],
        transfers: transfers.status === "fulfilled" ? transfers.value : [],
        total: 0,
      };

      results.total =
        results.tours.length + results.hotels.length + results.transfers.length;

      console.log(`✅ [MCP_OPERATIONS] Search completed:`, {
        tours: results.tours.length,
        hotels: results.hotels.length,
        transfers: results.transfers.length,
        total: results.total,
      });

      return results;
    } catch (error) {
      console.error("❌ [MCP_OPERATIONS] Search failed:", error);
      throw new Error(`Service search failed: ${(error as Error)?.message}`);
    }
  }

  /**
   * Search for tours
   * Week 2 Day 5: Enhanced with hybrid vector + keyword search
   */
  async searchTours(params: ServiceSearchParams): Promise<ServiceDetails[]> {
    try {
      console.log("🎟️ [MCP_OPERATIONS] Searching tours (keyword)...");
      const result = await this.mcpClient.callTool("ToursList", params);

      const keywordTours = this.parseServiceResults(result, "tour");
      console.log(`✅ [MCP_OPERATIONS] Keyword found ${keywordTours.length} tours`);

      // Vector search with multi-stage fallback
      try {
        console.log("🔍 [MCP_OPERATIONS] Stage 1: Searching tours (threshold 0.65)...");

        let vectorResults = await vectorSearchTours(params.dmc_id, params.search_text, {
          limit: 20,
          similarityThreshold: 0.65,
        });

        console.log(`🔍 [MCP_OPERATIONS] Stage 1 found ${vectorResults.length} tours`);

        // If we got fewer than 3 results, try again with lower threshold
        if (vectorResults.length < 3) {
          console.log(`🔍 [MCP_OPERATIONS] Stage 2: Retrying with threshold 0.55...`);

          const fallbackResults = await vectorSearchTours(params.dmc_id, params.search_text, {
            limit: 20,
            similarityThreshold: 0.55,
          });

          console.log(`🔍 [MCP_OPERATIONS] Stage 2 found ${fallbackResults.length} tours`);

          if (fallbackResults.length > vectorResults.length) {
            vectorResults = fallbackResults;
            console.log(`✓ [MCP_OPERATIONS] Using Stage 2 results`);
          }
        }

        console.log(`🔍 [MCP_OPERATIONS] Final: ${vectorResults.length} tours`);

        // Convert to ServiceDetails format
        const enhancedTours = vectorResults.map((tour: any) => ({
          id: tour.id,
          name: tour.tour_name || tour.name,
          type: "tour" as const,
          details: tour,
          pricing: tour.pricing,
        }));

        console.log(`✨ [MCP_OPERATIONS] Vector search results: ${enhancedTours.length} tours`);
        return enhancedTours;
      } catch (vectorError) {
        console.warn("⚠️ [MCP_OPERATIONS] Vector search failed, using keyword results only:", vectorError);
        return keywordTours;
      }
    } catch (error) {
      console.error("❌ [MCP_OPERATIONS] Tour search failed:", error);
      return [];
    }
  }

  /**
   * Search for hotels
   * Week 2 Day 5: Enhanced with hybrid vector + keyword search
   */
  async searchHotels(params: ServiceSearchParams): Promise<ServiceDetails[]> {
    try {
      console.log("🏨 [MCP_OPERATIONS] Searching hotels (keyword)...");
      const result = await this.mcpClient.callTool("HotelsList", params);

      const keywordHotels = this.parseServiceResults(result, "hotel");
      console.log(`✅ [MCP_OPERATIONS] Keyword found ${keywordHotels.length} hotels`);

      // Vector search with multi-stage fallback
      try {
        console.log("🔍 [MCP_OPERATIONS] Stage 1: Searching hotels (threshold 0.65)...");

        let vectorResults = await vectorSearchHotels(params.dmc_id, params.search_text, {
          limit: 20,
          similarityThreshold: 0.65,
        });

        console.log(`🔍 [MCP_OPERATIONS] Stage 1 found ${vectorResults.length} hotels`);

        // If we got fewer than 3 results, try again with lower threshold
        if (vectorResults.length < 3) {
          console.log(`🔍 [MCP_OPERATIONS] Stage 2: Retrying with threshold 0.55...`);

          const fallbackResults = await vectorSearchHotels(params.dmc_id, params.search_text, {
            limit: 20,
            similarityThreshold: 0.55,
          });

          console.log(`🔍 [MCP_OPERATIONS] Stage 2 found ${fallbackResults.length} hotels`);

          if (fallbackResults.length > vectorResults.length) {
            vectorResults = fallbackResults;
            console.log(`✓ [MCP_OPERATIONS] Using Stage 2 results`);
          }
        }

        console.log(`🔍 [MCP_OPERATIONS] Final: ${vectorResults.length} hotels`);

        // Convert to ServiceDetails format
        const enhancedHotels = vectorResults.map((hotel: any) => ({
          id: hotel.id,
          name: hotel.hotel_name || hotel.name,
          type: "hotel" as const,
          details: hotel,
          pricing: hotel.pricing,
        }));

        console.log(`✨ [MCP_OPERATIONS] Vector search results: ${enhancedHotels.length} hotels`);
        return enhancedHotels;
      } catch (vectorError) {
        console.warn("⚠️ [MCP_OPERATIONS] Vector search failed, using keyword results only:", vectorError);
        return keywordHotels;
      }
    } catch (error) {
      console.error("❌ [MCP_OPERATIONS] Hotel search failed:", error);
      return [];
    }
  }

  /**
   * Search for transfers
   * Week 2 Day 5: Enhanced with hybrid vector + keyword search
   */
  async searchTransfers(
    params: ServiceSearchParams
  ): Promise<ServiceDetails[]> {
    try {
      console.log("🚐 [MCP_OPERATIONS] Searching transfers (keyword)...");
      const result = await this.mcpClient.callTool("TransfersList", params);

      const keywordTransfers = this.parseServiceResults(result, "transfer");
      console.log(`✅ [MCP_OPERATIONS] Keyword found ${keywordTransfers.length} transfers`);

      // Vector search with multi-stage fallback
      try {
        console.log("🔍 [MCP_OPERATIONS] Stage 1: Searching transfers (threshold 0.65)...");

        let vectorResults = await vectorSearchTransfers(params.dmc_id, params.search_text, {
          limit: 20,
          similarityThreshold: 0.65,
        });

        console.log(`🔍 [MCP_OPERATIONS] Stage 1 found ${vectorResults.length} transfers`);

        // If we got fewer than 3 results, try again with lower threshold
        if (vectorResults.length < 3) {
          console.log(`🔍 [MCP_OPERATIONS] Stage 2: Retrying with threshold 0.55...`);

          const fallbackResults = await vectorSearchTransfers(params.dmc_id, params.search_text, {
            limit: 20,
            similarityThreshold: 0.55,
          });

          console.log(`🔍 [MCP_OPERATIONS] Stage 2 found ${fallbackResults.length} transfers`);

          if (fallbackResults.length > vectorResults.length) {
            vectorResults = fallbackResults;
            console.log(`✓ [MCP_OPERATIONS] Using Stage 2 results`);
          }
        }

        console.log(`🔍 [MCP_OPERATIONS] Final: ${vectorResults.length} transfers`);

        // Convert to ServiceDetails format
        const enhancedTransfers = vectorResults.map((transfer: any) => ({
          id: transfer.id,
          name: transfer.transfer_name || transfer.name,
          type: "transfer" as const,
          details: transfer,
          pricing: transfer.pricing,
        }));

        console.log(`✨ [MCP_OPERATIONS] Vector search results: ${enhancedTransfers.length} transfers`);
        return enhancedTransfers;
      } catch (vectorError) {
        console.warn("⚠️ [MCP_OPERATIONS] Vector search failed, using keyword results only:", vectorError);
        return keywordTransfers;
      }
    } catch (error) {
      console.error("❌ [MCP_OPERATIONS] Transfer search failed:", error);
      return [];
    }
  }

  /**
   * Get detailed information including pricing for specific services
   */
  async fetchServiceDetails(
    services: ServiceDetails[]
  ): Promise<ServiceDetails[]> {
    console.log(
      `💰 [MCP_OPERATIONS] Fetching details for ${services.length} services...`
    );

    const detailPromises = services.map(async (service) => {
      try {
        const details = await this.getServiceDetails(service.id, service.type);
        return {
          ...service,
          details,
          has_pricing: true,
        };
      } catch (error) {
        console.warn(
          `⚠️ [MCP_OPERATIONS] Failed to fetch details for ${service.id}:`,
          (error as Error)?.message
        );
        return service;
      }
    });

    const servicesWithDetails = await Promise.all(detailPromises);
    console.log(
      `✅ [MCP_OPERATIONS] Fetched details for ${
        servicesWithDetails.filter((s: any) => s.has_pricing).length
      } services`
    );

    return servicesWithDetails;
  }

  /**
   * Get details for a specific service
   */
  private async getServiceDetails(
    serviceId: string,
    serviceType: string
  ): Promise<any> {
    const toolMap = {
      tour: "GetTourDetails",
      hotel: "GetHotelDetails",
      transfer: "GetTransferDetails",
    };

    const paramKey = `${serviceType}_id`;
    const toolName = toolMap[serviceType as keyof typeof toolMap];

    if (!toolName) {
      throw new Error(`Unknown service type: ${serviceType}`);
    }

    return await this.mcpClient.callTool(toolName, { [paramKey]: serviceId });
  }

  /**
   * Parse service results from MCP responses
   */
  private parseServiceResults(
    result: any,
    type: "tour" | "hotel" | "transfer"
  ): ServiceDetails[] {
    let services: any[] = [];

    if (typeof result === "string") {
      try {
        services = JSON.parse(result);
      } catch {
        services = [];
      }
    } else if (Array.isArray(result)) {
      services = result;
    } else if (result && typeof result === "object") {
      services = result.services || result.data || [];
    }

    return services
      .map((service: any) => ({
        id:
          service.id ||
          service.tour_id ||
          service.hotel_id ||
          service.transfer_id,
        name:
          service.tour_name ||
          service.hotel_name ||
          service.transfer_name ||
          service.name ||
          "Unknown",
        type,
        details: service,
        pricing: service.pricing || service.price,
      }))
      .filter((service) => service.id);
  }

  /**
   * Get predefined itineraries
   */
  async getPredefinedItinerary(
    dmcId: string,
    countryName: string,
    noOfNights: number
  ): Promise<any> {
    try {
      console.log("🗺️ [MCP_OPERATIONS] Getting predefined itinerary...");
      const result = await this.mcpClient.callTool("ItineraryAgent", {
        dmc_id: dmcId,
        country_name: countryName,
        no_of_nights: String(noOfNights),
      });

      console.log("✅ [MCP_OPERATIONS] Got predefined itinerary");
      return result;
    } catch (error) {
      console.error(
        "❌ [MCP_OPERATIONS] Failed to get predefined itinerary:",
        error
      );
      return null;
    }
  }

  /**
   * Get DMC settings
   */
  async getDMCSettings(dmcId: string): Promise<any> {
    try {
      console.log("⚙️ [MCP_OPERATIONS] Getting DMC settings...");
      const result = await this.mcpClient.callTool("DmcSettings", {
        dmc_id: dmcId,
      });

      console.log("✅ [MCP_OPERATIONS] Got DMC settings");
      return result;
    } catch (error) {
      console.error("❌ [MCP_OPERATIONS] Failed to get DMC settings:", error);
      return {
        allow_individual_service_rates: false,
        require_itinerary_before_quote: true,
      };
    }
  }

  /**
   * Get service rates for individual service pricing
   */
  async getServiceRates(params: {
    dmc_id: string;
    service_type: "tour" | "hotel" | "transfer";
    service_id: string;
    num_people: number;
    date_from?: string;
  }): Promise<any> {
    try {
      console.log(
        `💰 [MCP_OPERATIONS] Getting rates for ${params.service_id}...`
      );
      const result = await this.mcpClient.callTool("ServiceRates", params);

      console.log("✅ [MCP_OPERATIONS] Got service rates");
      return result;
    } catch (error) {
      console.error("❌ [MCP_OPERATIONS] Failed to get service rates:", error);
      throw error;
    }
  }

  /**
   * Get DMC policies, travel themes, and sell policies
   */
  async getDMCPolicies(
    dmcId: string,
    countryName: string
  ): Promise<{
    policies?: any;
    travelTheme?: any;
    sellPolicy?: any;
  }> {
    console.log("📋 [MCP_OPERATIONS] Getting DMC policies...");

    try {
      const [policies, travelTheme, sellPolicy] = await Promise.allSettled([
        this.mcpClient.callTool("DefaultPolicies", {
          dmc_id: dmcId,
          country_name: countryName,
        }),
        this.mcpClient.callTool("DefaultTravelTheme", {
          dmc_id: dmcId,
          country_name: countryName,
        }),
        this.mcpClient.callTool("DefaultSellPolicy", {
          dmc_id: dmcId,
          country_name: countryName,
        }),
      ]);

      const result: any = {};

      if (policies.status === "fulfilled") {
        result.policies = policies.value;
      }

      if (travelTheme.status === "fulfilled") {
        result.travelTheme = travelTheme.value;
      }

      if (sellPolicy.status === "fulfilled") {
        result.sellPolicy = sellPolicy.value;
      }

      console.log("✅ [MCP_OPERATIONS] Got DMC policies");
      return result;
    } catch (error) {
      console.error("❌ [MCP_OPERATIONS] Failed to get DMC policies:", error);
      return {};
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      cache: this.mcpClient.getCacheMetrics(),
      retry: this.mcpClient.getRetryMetrics(),
      circuitBreaker: this.mcpClient.getCircuitBreakerStates(),
    };
  }
}

/**
 * Factory function to create MCPOperationsService with default dependencies
 */
export function createMCPOperationsService(): MCPOperationsService {
  const mcpClient = getMCPClient();
  return new MCPOperationsService(mcpClient);
}
