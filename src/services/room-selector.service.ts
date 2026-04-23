/**
 * Room Selector Service (Stage 2 of 3-stage hotel search)
 *
 * Uses small model (gemini-2.5-flash-lite or gpt-5-nano) to intelligently
 * select the best room(s) based on user query and available rooms.
 *
 * Token usage: ~900 tokens vs being part of 60,000 token formatResponse
 *
 * Selection logic:
 * - If user specified room category (e.g., "Ocean View King"): Match by fuzzy search
 * - If user didn't specify: Select first/cheapest room
 * - Returns one room per hotel
 */

import { getInternalLLM } from "@/lib/utils/model-config";
import type { RoomSearchResult } from "@/lib/supabase/vector-search";
import { buildRoomSelectorPrompt } from "@/lib/prompts/room-selector.prompt";
import { aiLog } from "@/lib/utils/ai-logger";

export interface RoomSelectRequest {
  query: string;
  rooms: RoomSearchResult[];
  partySize?: string; // ✅ Pax Details composition (e.g., "2A + 1C(5yr) + 1Teen(12yr)")
  conversationHistory?: Array<{ role: string; content: string }>;
  roomPreference?: string; // ✅ User's room preference from query (e.g., "Garden Bungalow", "Ocean View")
}

export interface RoomSelectResult {
  selections: Array<{
    hotel_id: string;
    hotel_name: string;
    room_id: string;
    room_category: string;
    capacity_note?: string; // ✅ Optional note about capacity mismatch or multi-room suggestion
  }>;
  reasoning: string;
  usage?: { total_tokens: number };
}

export class RoomSelectorService {
  /**
   * Select best room(s) for each hotel using AI
   *
   * @param request - Select request with query, rooms, and context
   * @returns Select result with room selections for each hotel
   */
  async selectRoom(request: RoomSelectRequest): Promise<RoomSelectResult> {
    console.log(
      `[RoomSelector] Selecting from ${request.rooms.length} rooms across ${
        new Set(request.rooms.map((r) => r.hotel_id)).size
      } hotels`
    );

    // Handle no rooms case
    if (request.rooms.length === 0) {
      return {
        selections: [],
        reasoning: "No rooms available",
      };
    }

    // Use small/internal model for selection (token-efficient)
    const llm = getInternalLLM(0); // temperature=0 for deterministic

    // Build conversation context
    const conversationContext =
      request.conversationHistory
        ?.map(
          (msg) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n") || "No previous conversation";

    // Group rooms by hotel
    const roomsByHotel = new Map<string, RoomSearchResult[]>();

    request.rooms.forEach((room) => {
      if (!roomsByHotel.has(room.hotel_id)) {
        roomsByHotel.set(room.hotel_id, []);
      }
      roomsByHotel.get(room.hotel_id)!.push(room);
    });

    console.log(
      "🚀 ~ RoomSelectorService ~ selectRoom ~ roomsByHotel:",
      roomsByHotel
    );

    // Build rooms list for LLM
    const roomsList = Array.from(roomsByHotel.entries())
      .map(([hotel_id, rooms]) => {
        const hotelName = rooms[0].hotel_name;
        const roomsText = rooms
          .map(
            (r, i) =>
              `   ${i + 1}. ${r.room_category} (${r.meal_plan}, ${
                r.max_occupancy
              }) - ID: ${r.room_id}`
          )
          .join("\n");
        return `**${hotelName}** (Hotel ID: ${hotel_id}):\n${roomsText}`;
      })
      .join("\n\n");

    const prompt = buildRoomSelectorPrompt(
      conversationContext,
      request.query,
      request.partySize || "Not specified",
      roomsList,
      request.roomPreference // ✅ Pass user's room preference
    );

    // Log prompt input for debugging
    aiLog("[RoomSelector]", "LLM INVOCATION START", {
      query: request.query,
      party_size: request.partySize,
      room_preference: request.roomPreference, // ✅ Log room preference
      rooms_count: request.rooms.length,
      rooms_list_preview: roomsList.substring(0, 500),
    });

    try {
      const response = await llm.invoke(prompt);

      const content =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      // Log LLM response for debugging
      aiLog("[RoomSelector]", "LLM RESPONSE received", {
        content_length: content.length,
        content_preview: content.substring(0, 500),
      });

      // Extract JSON from response - find the first complete JSON object
      // Use bracket counting to find matching braces
      let jsonStr = "";
      let startIdx = content.indexOf("{");
      if (startIdx !== -1) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;

        for (let i = startIdx; i < content.length; i++) {
          const char = content[i];
          jsonStr += char;

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (char === "\\") {
            escapeNext = true;
            continue;
          }

          if (char === '"' && !escapeNext) {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === "{") braceCount++;
            else if (char === "}") {
              braceCount--;
              if (braceCount === 0) break; // Found complete JSON object
            }
          }
        }
      }

      if (!jsonStr || jsonStr.indexOf("{") === -1) {
        aiLog("[RoomSelector]", "LLM response NOT valid JSON", {
          full_content: content,
        });
        console.error(
          "[RoomSelector] LLM response is not valid JSON:",
          content
        );
        throw new Error("LLM response is not valid JSON");
      }

      const result = JSON.parse(jsonStr);

      // Extract token usage
      const usage =
        (response as any).usage_metadata ||
        (response as any).response_metadata?.usage;
      if (usage) {
        result.usage = {
          total_tokens: usage.total_tokens || usage.totalTokenCount || 0,
        };
      }

      console.log(`[RoomSelector] Selected ${result.selections.length} rooms`);
      console.log(
        `[RoomSelector] Token usage: ${result.usage?.total_tokens || 0}`
      );

      return result;
    } catch (error) {
      console.error("[RoomSelector] Error selecting rooms:", error);

      // Log detailed error info to ai-agent.log
      aiLog("[RoomSelector]", "LLM ERROR - falling back to first room", {
        error_message: (error as Error).message,
        error_name: (error as Error).name,
        query: request.query,
        party_size: request.partySize,
        rooms_count: request.rooms.length,
        available_rooms: request.rooms.map((r) => r.room_category),
      });

      // Fallback: return first room for each hotel
      const selections = Array.from(roomsByHotel.entries()).map(
        ([hotel_id, rooms]) => ({
          hotel_id,
          hotel_name: rooms[0].hotel_name,
          room_id: rooms[0].room_id,
          room_category: rooms[0].room_category,
        })
      );

      return {
        selections,
        reasoning: "Error in selection, using first room for each hotel",
      };
    }
  }

  /**
   * Select rooms for split stay requests using LLM-based Split Stay Agent
   * NO hardcoded patterns - all matching is done by the agent
   *
   * @param request - Room select request with split stay info
   * @param splitStay - Split stay configuration
   * @param hotelName - Name of the hotel for context
   * @param hotelId - ID of the hotel
   * @param totalNights - Total nights for the stay
   * @returns Room splits for each segment
   */
  async selectSplitStayRooms(
    request: RoomSelectRequest,
    splitStay: { splits: Array<{ room_type: string; nights: number }> },
    hotelName?: string,
    hotelId?: string,
    totalNights?: number
  ): Promise<{
    room_splits: Array<{
      room_id: string;
      room_category: string;
      nights: number;
      rate_data?: RoomSearchResult;
      match_confidence?: "high" | "medium" | "low";
      match_reasoning?: string;
    }>;
    reasoning: string;
    usage?: { total_tokens: number };
  }> {
    console.log(
      `[RoomSelector] Delegating split stay to Split Stay Agent (${splitStay.splits.length} segments)`
    );

    // Handle no rooms case
    if (request.rooms.length === 0) {
      return {
        room_splits: [],
        reasoning: "No rooms available for split stay",
      };
    }

    // Import and run the Split Stay Agent
    const { runSplitStayAgent } = await import(
      "@/lib/agents/subgraphs/split-stay-agent"
    );

    const agentResult = await runSplitStayAgent({
      user_query: request.query,
      split_stay_request: splitStay,
      available_rooms: request.rooms,
      hotel_name: hotelName || request.rooms[0]?.hotel_name || "Unknown Hotel",
      hotel_id: hotelId || request.rooms[0]?.hotel_id || "",
      total_nights: totalNights || splitStay.splits.reduce((sum, s) => sum + s.nights, 0),
    });

    console.log(
      `[RoomSelector] Split Stay Agent returned ${agentResult.room_splits.length} matches, valid: ${agentResult.is_valid_split}`
    );

    return {
      room_splits: agentResult.room_splits.map((split) => ({
        room_id: split.room_id,
        room_category: split.room_category,
        nights: split.nights,
        rate_data: split.rate_data,
        match_confidence: split.match_confidence,
        match_reasoning: split.match_reasoning,
      })),
      reasoning: agentResult.validation_message,
      usage: { total_tokens: agentResult.total_tokens },
    };
  }
}

// Export singleton instance
export const roomSelectorService = new RoomSelectorService();
