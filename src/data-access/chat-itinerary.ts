"use server";

import { createClient } from "@/utils/supabase/server";

// =====================================================
// TYPES
// =====================================================

export interface ChatItinerary {
  id: string;
  chat_id: string;

  // Trip details
  destination: string;
  destination_code: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  party_size: string | null;
  adults: number;
  children: number;
  children_ages: number[] | null;

  // Status
  status: "draft" | "confirmed" | "quoted" | "booked";
  version: number;

  // Multi-option support
  option_number: number;
  recommended: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface CreateItineraryInput {
  chat_id: string;
  destination: string;
  destination_code?: string;
  check_in: string;
  check_out: string;
  nights: number;
  party_size?: string;
  adults?: number;
  children?: number;
  children_ages?: number[];
  // Multi-option support
  option_number?: number;
  recommended?: boolean;
}

export interface UpdateItineraryInput {
  status?: "draft" | "confirmed" | "quoted" | "booked";
  change_type?: string;
  change_description?: string;
}

// =====================================================
// GET OR CREATE ITINERARY
// =====================================================

/**
 * Get existing itinerary for a chat, or return null
 * @param chatId - Chat ID
 * @param optionNumber - Optional option number (defaults to 1)
 */
export async function getChatItinerary(chatId: string, optionNumber?: number): Promise<ChatItinerary | null> {
  const supabase = await createClient(true);

  let query = supabase.from("chat_itineraries").select("*").eq("chat_id", chatId);

  // If option_number specified, filter by it; otherwise get option 1
  query = query.eq("option_number", optionNumber ?? 1);

  const { data, error } = await query.single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found - not an error
      return null;
    }
    console.error("[ChatItinerary] Error fetching:", error);
    return null;
  }

  return data as ChatItinerary;
}

/**
 * Get all itinerary options for a chat
 * Returns array sorted by option_number
 */
export async function getChatItineraryOptions(chatId: string): Promise<ChatItinerary[]> {
  const supabase = await createClient(true);

  const { data, error } = await supabase
    .from("chat_itineraries")
    .select("*")
    .eq("chat_id", chatId)
    .order("option_number", { ascending: true });

  if (error) {
    console.error("[ChatItinerary] Error fetching options:", error);
    return [];
  }

  return (data || []) as ChatItinerary[];
}

/**
 * Create a new itinerary for a chat
 */
export async function createChatItinerary(input: CreateItineraryInput): Promise<ChatItinerary | null> {
  const supabase = await createClient(true);

  // Note: Activities are stored in itinerary_activities table, not here
  const { data, error } = await supabase
    .from("chat_itineraries")
    .insert({
      chat_id: input.chat_id,
      destination: input.destination,
      destination_code: input.destination_code || null,
      check_in: input.check_in,
      check_out: input.check_out,
      nights: input.nights,
      party_size: input.party_size || null,
      adults: input.adults || 2,
      children: input.children || 0,
      children_ages: input.children_ages || null,
      status: "draft",
      version: 1,
      option_number: input.option_number || 1,
      recommended: input.recommended || false,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[ChatItinerary] Error creating:", error);
    return null;
  }

  console.log(`[ChatItinerary] Created itinerary for chat ${input.chat_id}`);
  return data as ChatItinerary;
}

/**
 * Get or create itinerary for a chat
 * Returns existing if found, creates new if not (when input provided)
 */
export async function getOrCreateChatItinerary(
  chatId: string,
  input?: Omit<CreateItineraryInput, "chat_id">
): Promise<ChatItinerary | null> {
  // Try to get existing
  const existing = await getChatItinerary(chatId);
  if (existing) {
    console.log(`[ChatItinerary] Found existing itinerary v${existing.version} for chat ${chatId}`);
    return existing;
  }

  // Create new if input provided
  if (input) {
    return createChatItinerary({ chat_id: chatId, ...input });
  }

  return null;
}

// =====================================================
// UPDATE ITINERARY
// =====================================================

/**
 * Update itinerary and save history
 * @param chatId - Chat ID
 * @param updates - Fields to update
 * @param optionNumber - Option number (defaults to 1 for backward compatibility)
 */
export async function updateChatItinerary(
  chatId: string,
  updates: UpdateItineraryInput,
  optionNumber: number = 1
): Promise<ChatItinerary | null> {
  const supabase = await createClient(true);

  // First get current itinerary for this specific option
  const current = await getChatItinerary(chatId, optionNumber);
  if (!current) {
    console.error(`[ChatItinerary] No itinerary found for chat ${chatId}`);
    return null;
  }

  // Save current version to history (snapshot of itinerary_data for version tracking)
  // Only save if we have itinerary_data (required by table constraint)
  if (current.itinerary_data) {
    const { error: historyError } = await supabase.from("chat_itinerary_history").insert({
      itinerary_id: current.id,
      version: current.version,
      itinerary_data: current.itinerary_data,
      tour_selections: current.tour_selections || null,
      transfer_selections: current.transfer_selections || null,
      combo_selections: current.combo_selections || null,
      change_type: updates.change_type || "updated",
      change_description: updates.change_description || null,
    });

    if (historyError) {
      console.error("[ChatItinerary] Error saving history:", historyError);
      // Continue with update anyway
    }
  }

  // Build update object
  const updateData: Record<string, any> = {
    version: current.version + 1,
    updated_at: new Date().toISOString(),
  };

  if (updates.status) {
    updateData.status = updates.status;
  }

  // Update itinerary (filter by both chat_id AND option_number for multi-option support)
  const { data, error } = await supabase
    .from("chat_itineraries")
    .update(updateData)
    .eq("chat_id", chatId)
    .eq("option_number", optionNumber)
    .select("*")
    .single();

  if (error) {
    console.error("[ChatItinerary] Error updating:", error);
    return null;
  }

  console.log(`[ChatItinerary] Updated itinerary for chat ${chatId} to v${data.version}`);
  return data as ChatItinerary;
}

// =====================================================
// STATUS MANAGEMENT
// =====================================================

/**
 * Confirm itinerary (user approved)
 * @param chatId - Chat ID
 * @param optionNumber - Option number (defaults to 1)
 */
export async function confirmItinerary(chatId: string, optionNumber: number = 1): Promise<ChatItinerary | null> {
  return updateChatItinerary(
    chatId,
    {
      status: "confirmed",
      change_type: "confirmed",
      change_description: "User confirmed the itinerary",
    },
    optionNumber
  );
}

/**
 * Mark itinerary as quoted (rates calculated)
 * @param chatId - Chat ID
 * @param optionNumber - Option number (defaults to 1)
 */
export async function markAsQuoted(chatId: string, optionNumber: number = 1): Promise<ChatItinerary | null> {
  return updateChatItinerary(
    chatId,
    {
      status: "quoted",
      change_type: "quoted",
      change_description: "Rates calculated and presented",
    },
    optionNumber
  );
}

// =====================================================
// HISTORY OPERATIONS
// =====================================================

/**
 * Get version history for an itinerary
 * @param chatId - Chat ID
 * @param optionNumber - Option number (defaults to 1)
 */
export async function getItineraryHistory(chatId: string, optionNumber: number = 1) {
  const supabase = await createClient(true);

  // First get the itinerary for this option
  const current = await getChatItinerary(chatId, optionNumber);
  if (!current) {
    return [];
  }

  const { data, error } = await supabase
    .from("chat_itinerary_history")
    .select("*")
    .eq("itinerary_id", current.id)
    .order("version", { ascending: false });

  if (error) {
    console.error("[ChatItinerary] Error fetching history:", error);
    return [];
  }

  return data;
}

/**
 * Restore itinerary to a previous version
 * @param chatId - Chat ID
 * @param version - Version number to restore
 * @param optionNumber - Option number (defaults to 1)
 */
export async function restoreItineraryVersion(
  chatId: string,
  version: number,
  optionNumber: number = 1
): Promise<ChatItinerary | null> {
  // Note: With normalized architecture, version restore would need to restore
  // activities from a snapshot. For now, this just updates the version metadata.
  // TODO: Implement activity versioning in itinerary_activities table
  console.warn("[ChatItinerary] restoreItineraryVersion: Activity restore not yet implemented");

  return updateChatItinerary(
    chatId,
    {
      change_type: "restored",
      change_description: `Restored to version ${version}`,
    },
    optionNumber
  );
}

// =====================================================
// PREVIEW ACTIVITIES (for Add Option sheet detail view)
// =====================================================

/**
 * Fetch raw activities for a chat+option. Used for preview in Add Option sheet.
 */
export async function getActivitiesForPreview(
  chatId: string,
  optionNumber: number = 1
): Promise<Array<Record<string, any>>> {
  const supabase = await createClient(true);

  const { data, error } = await supabase
    .from("itinerary_activities")
    .select("*")
    .eq("chat_id", chatId)
    .eq("option_number", optionNumber)
    .order("day_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getActivitiesForPreview] Error:", error);
    return [];
  }

  return data || [];
}

// =====================================================
// CLONE / IMPORT OPERATIONS
// =====================================================

/**
 * Get past itineraries for a DMC (for "import from past" flow)
 * Joins with travel_agent_chats to filter by dmc_id
 */
export async function getPastItinerariesForDmc(dmcId: string, nights?: number): Promise<Array<ChatItinerary & { chat_title?: string }>> {
  const supabase = await createClient(true);

  let query = supabase
    .from("chat_itineraries")
    .select(
      `
      *,
      travel_agent_chats!inner(dmc_id, title)
    `
    )
    .eq("travel_agent_chats.dmc_id", dmcId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (nights) {
    query = query.eq("nights", nights);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getPastItinerariesForDmc] Error:", error);
    return [];
  }

  console.log("[getPastItinerariesForDmc] Data:", data.length);

  return (data || []).map((item: any) => {
    const { travel_agent_chats, ...itinerary } = item;
    return {
      ...itinerary,
      chat_title: travel_agent_chats?.title || undefined,
    };
  }) as Array<ChatItinerary & { chat_title?: string }>;
}

/**
 * Clone an itinerary (metadata + activities) from one chat to another
 * Used for "import from past itinerary" flow
 */
export async function cloneItineraryToChat(
  sourceChatId: string,
  targetChatId: string,
  sourceOptionNumber: number = 1
): Promise<ChatItinerary | null> {
  const supabase = await createClient(true);

  // 1. Get source itinerary metadata
  const source = await getChatItinerary(sourceChatId, sourceOptionNumber);
  if (!source) {
    console.error("[cloneItineraryToChat] Source itinerary not found");
    return null;
  }

  // 2. Check if target already has an itinerary (avoid duplicate key)
  const existingTarget = await getChatItinerary(targetChatId);
  if (existingTarget) {
    console.log("[cloneItineraryToChat] Target chat already has an itinerary, returning existing");
    return existingTarget;
  }

  // 3. Create new itinerary for target chat
  const newItinerary = await createChatItinerary({
    chat_id: targetChatId,
    destination: source.destination,
    destination_code: source.destination_code || undefined,
    check_in: source.check_in,
    check_out: source.check_out,
    nights: source.nights,
    party_size: source.party_size || undefined,
    adults: source.adults,
    children: source.children,
    children_ages: source.children_ages || undefined,
    option_number: 1,
    recommended: false,
  });

  if (!newItinerary) {
    console.error("[cloneItineraryToChat] Failed to create target itinerary");
    return null;
  }

  // 4. Copy all activities from source to target
  const { data: sourceActivities, error: fetchError } = await supabase
    .from("itinerary_activities")
    .select("*")
    .eq("chat_id", sourceChatId)
    .eq("option_number", sourceOptionNumber);

  if (fetchError) {
    console.error("[cloneItineraryToChat] Error fetching source activities:", fetchError);
    return newItinerary; // Return itinerary even if activities fail to copy
  }

  if (sourceActivities && sourceActivities.length > 0) {
    const clonedActivities = sourceActivities.map((activity: any) => {
      const { id, created_at, updated_at, ...rest } = activity;
      return {
        ...rest,
        chat_id: targetChatId,
        itinerary_id: newItinerary.id,
        option_number: 1,
        cost_price: 0,
        sale_price: 0,
      };
    });

    const { error: insertError } = await supabase.from("itinerary_activities").insert(clonedActivities);

    if (insertError) {
      console.error("[cloneItineraryToChat] Error copying activities:", insertError);
    } else {
      console.log(`[cloneItineraryToChat] Copied ${clonedActivities.length} activities`);
    }
  }

  return newItinerary;
}

const VALID_SERVICE_TYPES = new Set(["hotel", "tour", "transfer"]);

const SERVICE_FIELD_MAP: Record<string, (act: Record<string, any>) => Record<string, any>> = {
  hotel: (act) => ({
    hotel_name: act.name ?? null,
    rooms: act.room_type ? [{ room_category: act.room_type, quantity: 1 }] : [],
    meal_plan: act.meal_plan ?? null,
    service_parent_id: act.hotel_id ?? null,
  }),
  tour: (act) => ({
    tour_name: act.name ?? null,
    service_parent_id: act.tour_id ?? null,
  }),
  transfer: (act) => {
    // transfer_type column only allows "SIC" or "PVT" (DB check constraint)
    const validTransferTypes = ["SIC", "PVT"];
    const rawType = (act.transfer_type || "").toUpperCase();
    const transferType = validTransferTypes.includes(rawType) ? rawType : null;

    return {
      transfer_name: act.name ?? null,
      transfer_type: transferType,
      pickup_point: act.pickup_point ?? null,
      drop_point: act.drop_point ?? null,
      service_parent_id: act.transfer_id ?? null,
    };
  },
};

/**
 * Import activities from a sample itinerary (docs) content JSON.
 * Uses service role client (bypasses RLS) — same pattern as cloneItineraryToChat.
 */
export async function importSampleActivities(
  chatId: string,
  itineraryId: string,
  sampleDays: Array<{
    day?: number;
    title?: string;
    activities?: Array<Record<string, any>>;
  }>,
  checkIn: string,
  pax: { adults: number; children: number },
  optionNumber: number = 1
): Promise<number> {
  const checkInMs = new Date(checkIn + "T00:00:00").getTime();

  const rows = sampleDays.flatMap((day) => {
    const dayNumber = day.day || 1;
    const dayDateStr = new Date(checkInMs + (dayNumber - 1) * 86_400_000)
      .toISOString()
      .split("T")[0];

    return (day.activities ?? [])
      .filter((act) => VALID_SERVICE_TYPES.has(act.type))
      .map((act) => ({
        chat_id: chatId,
        itinerary_id: itineraryId,
        service_type: act.type,
        day_number: dayNumber,
        day_date: dayDateStr,
        day_title: day.title ?? null,
        option_number: optionNumber,
        adults: pax.adults,
        children: pax.children,
        teens: 0,
        infants: 0,
        children_ages: [],
        cost_price: 0,
        sale_price: 0,
        currency: act.currency || "USD",
        notes: act.description ?? null,
        images: act.image_url ? [act.image_url] : [],
        ...SERVICE_FIELD_MAP[act.type](act),
      }));
  });

  if (rows.length === 0) return 0;

  const supabase = await createClient(true);
  const { error } = await supabase.from("itinerary_activities").insert(rows);

  if (error) {
    console.error("[importSampleActivities] Error:", error);
    return 0;
  }

  return rows.length;
}

// =====================================================
// BREAKUP CLONING HELPER
// =====================================================

/**
 * Clone breakups from source activities to newly inserted activities.
 * Uses the provided supabase client (service role) for all operations.
 *
 * @param supabase - Service role supabase client
 * @param activityIdMap - Map of old activity ID → new activity ID
 * @param sourceChatId - Chat where source breakups live
 * @param targetChatId - Chat where new breakups should go
 * @param targetOptionNumber - Option number for new breakups
 */
async function cloneBreakupsForActivities(
  supabase: any,
  activityIdMap: Map<string, string>,
  sourceChatId: string,
  targetChatId: string,
  targetOptionNumber: number
): Promise<number> {
  const oldActivityIds = Array.from(activityIdMap.keys()).filter(Boolean);
  if (oldActivityIds.length === 0) return 0;

  // 1. Get message_id for new breakups (FK to travel_agent_messages)
  const { data: msgData } = await supabase
    .from("travel_agent_messages")
    .select("id")
    .eq("chat_id", targetChatId)
    .eq("role", "assistant")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!msgData?.id) {
    console.warn("[cloneBreakupsForActivities] No assistant message found for target chat, skipping breakups");
    return 0;
  }
  const messageId = msgData.id;

  // 2. Fetch source breakups for all old activity IDs
  const { data: sourceBreakups, error } = await supabase
    .from("service_breakups")
    .select("*")
    .in("activity_id", oldActivityIds);

  if (error || !sourceBreakups || sourceBreakups.length === 0) {
    console.log("[cloneBreakupsForActivities] No source breakups to clone", {
      error: error?.message,
      sourceCount: sourceBreakups?.length ?? 0,
    });
    return 0;
  }

  // 3. Clone breakups with new references
  const clonedBreakups = sourceBreakups.map((b: any) => {
    const { id, created_at, updated_at, ...rest } = b;
    return {
      ...rest,
      chat_id: targetChatId,
      message_id: messageId,
      activity_id: activityIdMap.get(b.activity_id) || b.activity_id,
      option_number: targetOptionNumber,
    };
  });

  // 4. Bulk insert
  const { data: inserted, error: insertError } = await supabase
    .from("service_breakups")
    .insert(clonedBreakups)
    .select("id");

  if (insertError) {
    console.error("[cloneBreakupsForActivities] Error inserting breakups:", insertError);
    return 0;
  }

  console.log(`[cloneBreakupsForActivities] Cloned ${inserted?.length || 0} breakups for ${oldActivityIds.length} activities`);
  return inserted?.length || 0;
}

// =====================================================
// ADD OPTION TO EXISTING CHAT
// =====================================================

type AddOptionSource =
  | { type: "scratch" }
  | { type: "clone"; sourceOptionNumber: number }
  | { type: "past"; sourceChatId: string; sourceOptionNumber: number }
  | { type: "sample"; sampleContent: any; checkIn: string; pax: { adults: number; children: number } };

/**
 * Add a new itinerary option to an existing chat.
 * Determines the next option_number automatically and creates the itinerary + activities.
 */
export async function addOptionToChat(
  chatId: string,
  source: AddOptionSource
): Promise<ChatItinerary | null> {
  const supabase = await createClient(true);

  // 1. Determine next option_number
  const existingOptions = await getChatItineraryOptions(chatId);
  if (existingOptions.length === 0) {
    console.error("[addOptionToChat] No existing options found for chat", chatId);
    return null;
  }
  const nextOptionNumber = Math.max(...existingOptions.map((o) => o.option_number)) + 1;

  // 2. Get base itinerary metadata from option 1 (or first available)
  const base = existingOptions[0];

  if (source.type === "scratch") {
    // Create empty option with same metadata
    return createChatItinerary({
      chat_id: chatId,
      destination: base.destination,
      destination_code: base.destination_code || undefined,
      check_in: base.check_in,
      check_out: base.check_out,
      nights: base.nights,
      party_size: base.party_size || undefined,
      adults: base.adults,
      children: base.children,
      children_ages: base.children_ages || undefined,
      option_number: nextOptionNumber,
      recommended: false,
    });
  }

  if (source.type === "clone") {
    // Clone activities from an existing option in the same chat
    const newItinerary = await createChatItinerary({
      chat_id: chatId,
      destination: base.destination,
      destination_code: base.destination_code || undefined,
      check_in: base.check_in,
      check_out: base.check_out,
      nights: base.nights,
      party_size: base.party_size || undefined,
      adults: base.adults,
      children: base.children,
      children_ages: base.children_ages || undefined,
      option_number: nextOptionNumber,
      recommended: false,
    });

    if (!newItinerary) return null;

    const { data: sourceActivities, error: fetchError } = await supabase
      .from("itinerary_activities")
      .select("*")
      .eq("chat_id", chatId)
      .eq("option_number", source.sourceOptionNumber);

    if (fetchError) {
      console.error("[addOptionToChat] Error fetching source activities:", fetchError);
      return newItinerary;
    }

    if (sourceActivities && sourceActivities.length > 0) {
      const clonedActivities = sourceActivities.map((activity: any) => {
        const { id, created_at, updated_at, ...rest } = activity;
        return {
          ...rest,
          itinerary_id: newItinerary.id,
          option_number: nextOptionNumber,
        };
      });

      const { data: insertedActivities, error: insertError } = await supabase
        .from("itinerary_activities")
        .insert(clonedActivities)
        .select("id");

      if (insertError) {
        console.error("[addOptionToChat] Error cloning activities:", insertError);
      } else if (insertedActivities && insertedActivities.length > 0) {
        // Build old→new activity ID map and clone breakups
        const activityIdMap = new Map<string, string>();
        sourceActivities.forEach((oldAct: any, idx: number) => {
          if (oldAct.id && insertedActivities[idx]?.id) {
            activityIdMap.set(oldAct.id, insertedActivities[idx].id);
          }
        });

        await cloneBreakupsForActivities(supabase, activityIdMap, chatId, chatId, nextOptionNumber);
      }
    }

    return newItinerary;
  }

  if (source.type === "past") {
    // Copy activities from a different chat's option
    const sourceItinerary = await getChatItinerary(source.sourceChatId, source.sourceOptionNumber);
    if (!sourceItinerary) {
      console.error("[addOptionToChat] Source itinerary not found");
      return null;
    }

    const newItinerary = await createChatItinerary({
      chat_id: chatId,
      destination: base.destination,
      destination_code: base.destination_code || undefined,
      check_in: base.check_in,
      check_out: base.check_out,
      nights: base.nights,
      party_size: base.party_size || undefined,
      adults: base.adults,
      children: base.children,
      children_ages: base.children_ages || undefined,
      option_number: nextOptionNumber,
      recommended: false,
    });

    if (!newItinerary) return null;

    const { data: sourceActivities, error: fetchError } = await supabase
      .from("itinerary_activities")
      .select("*")
      .eq("chat_id", source.sourceChatId)
      .eq("option_number", source.sourceOptionNumber);

    if (fetchError) {
      console.error("[addOptionToChat] Error fetching past activities:", fetchError);
      return newItinerary;
    }

    if (sourceActivities && sourceActivities.length > 0) {
      const clonedActivities = sourceActivities.map((activity: any) => {
        const { id, created_at, updated_at, ...rest } = activity;
        return {
          ...rest,
          chat_id: chatId,
          itinerary_id: newItinerary.id,
          option_number: nextOptionNumber,
        };
      });

      const { data: insertedActivities, error: insertError } = await supabase
        .from("itinerary_activities")
        .insert(clonedActivities)
        .select("id");

      if (insertError) {
        console.error("[addOptionToChat] Error copying past activities:", insertError);
      } else if (insertedActivities && insertedActivities.length > 0) {
        // Build old→new activity ID map and clone breakups
        const activityIdMap = new Map<string, string>();
        sourceActivities.forEach((oldAct: any, idx: number) => {
          if (oldAct.id && insertedActivities[idx]?.id) {
            activityIdMap.set(oldAct.id, insertedActivities[idx].id);
          }
        });

        await cloneBreakupsForActivities(supabase, activityIdMap, source.sourceChatId, chatId, nextOptionNumber);
      }
    }

    return newItinerary;
  }

  if (source.type === "sample") {
    let parsedContent: any = {};
    try {
      parsedContent = typeof source.sampleContent === "string" ? JSON.parse(source.sampleContent) : source.sampleContent;
    } catch {
      // not JSON
    }

    const newItinerary = await createChatItinerary({
      chat_id: chatId,
      destination: base.destination,
      destination_code: base.destination_code || undefined,
      check_in: base.check_in,
      check_out: base.check_out,
      nights: base.nights,
      party_size: base.party_size || undefined,
      adults: base.adults,
      children: base.children,
      children_ages: base.children_ages || undefined,
      option_number: nextOptionNumber,
      recommended: false,
    });

    if (!newItinerary) return null;

    if (parsedContent.days && Array.isArray(parsedContent.days)) {
      await importSampleActivities(
        chatId,
        newItinerary.id,
        parsedContent.days,
        source.checkIn,
        source.pax,
        nextOptionNumber
      );
    }

    return newItinerary;
  }

  return null;
}

// =====================================================
// DELETE OPERATIONS
// =====================================================

/**
 * Delete itinerary for a chat (also deletes history via CASCADE)
 */
export async function deleteChatItinerary(chatId: string): Promise<boolean> {
  const supabase = await createClient(true);

  const { error } = await supabase.from("chat_itineraries").delete().eq("chat_id", chatId);

  if (error) {
    console.error("[ChatItinerary] Error deleting:", error);
    return false;
  }

  console.log(`[ChatItinerary] Deleted itinerary for chat ${chatId}`);
  return true;
}
