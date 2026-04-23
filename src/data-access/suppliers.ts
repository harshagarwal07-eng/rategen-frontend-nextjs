"use server";

import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { ISupplierTeamMemberData, ItemTypes, BookingMode, SupplierAssociation } from "@/types/suppliers";

export interface SupplierSearchParams {
  page?: number;
  perPage?: number;
  sort?: Array<{ id: string; desc: boolean }>;
  name?: string;
}

export async function getSupplierDetailsById(supplierId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("vw_supplier_details")
    .select(
      `
      supplier_id,
      name,
      website,
      is_active,
      category,
      booking_mode,
      address,
      city,
      city_name,
      country,
      country_name,
      created_at,
      updated_at,
      dmc_id,
      team_members
    `
    )
    .eq("supplier_id", supplierId)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (error || !data) {
    console.error(`Error fetching Supplier ${supplierId}: ${error?.message || "Supplier not found"}`);
    return { data: null, error: error?.message || "Supplier not found" };
  }

  return {
    data: {
      id: data.supplier_id,
      name: data.name,
      website: data.website,
      is_active: data.is_active,
      category: data.category,
      booking_mode: data.booking_mode,
      address: data.address,
      city: data.city,
      city_name: data.city_name,
      country: data.country,
      country_name: data.country_name,
      created_at: data.created_at,
      updated_at: data.updated_at,
      dmc_id: data.dmc_id,
      team_members: (data.team_members || []).map((member: any) => ({
        ...member,
        phone: member.phone ?? undefined,
      })),
    },
    error: null,
  };
}

export async function getAllSuppliersByUser(params: SupplierSearchParams = {}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], totalItems: 0 };

  const { sort, perPage = 25, page = 1, name } = params;
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("vw_supplier_details")
    .select(
      `
      supplier_id,
      name,
      website,
      is_active,
      created_at,
      updated_at,
      category,
      booking_mode,
      city,
      city_name,
      country,
      country_name,
      dmc_id,
      team_members
    `,
      { count: "exact" }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);

  if (name) query.ilike("name", `%${name}%`);

  const { data: viewData, error, count } = await query;

  if (error) {
    console.error(`Error fetching suppliers for user ${user.id}: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  const transformedData =
    viewData?.map((item: any) => ({
      id: item.supplier_id,
      name: item.name,
      website: item.website,
      category: item.category,
      booking_mode: item.booking_mode || "-",
      is_active: item.is_active,
      country_name: item.country_name || "-",
      city_name: item.city_name || "-",
      contacts: (item.team_members || []).map((member: any) => ({
        ...member,
        phone: member.phone ?? undefined,
      })),
      dmc_id: item.dmc_id,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

// upserts supplier + team members only, returns supplier_id and team_members with real IDs.
export async function upsertSupplierDetails(data: {
  id?: string;
  name: string;
  category?: ItemTypes[];
  website?: string;
  is_active?: boolean;
  address?: string;
  city?: string;
  country?: string;
  city_name?: string;
  country_name?: string;
  booking_mode?: BookingMode;
  team_members?: ISupplierTeamMemberData[];
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  try {
    const teamMembersJson = (data.team_members || [])
      .filter((member) => member.name?.trim() && member.email?.trim())
      .map((member) => ({
        id: member.id || crypto.randomUUID(),
        name: member.name,
        email: member.email,
        phone: member.phone || null,
        department: member.department || [],
        is_primary: member.is_primary ?? false,
      }));

    const { data: result, error } = await supabase.rpc("upsert_supplier_details", {
      p_supplier_id: data.id || null,
      p_dmc_id: user.dmc.id,
      p_name: data.name,
      p_category: data.category || [],
      p_website: data.website || null,
      p_is_active: data.is_active ?? true,
      p_address: data.address || null,
      p_city: data.city || null,
      p_country: data.country || null,
      p_city_name: data.city_name || null,
      p_country_name: data.country_name || null,
      p_booking_mode: data.booking_mode || null,
      p_team_members: teamMembersJson,
    });

    if (error) {
      console.error("Error upserting supplier details:", error.message);
      return { error: error.message };
    }

    return { data: result as { supplier_id: string; team_members: ISupplierTeamMemberData[] } };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Unexpected error upserting supplier details:", errorMessage);
    return { error: errorMessage };
  }
}

export async function deleteSupplier(supplierId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  const { error } = await supabase.from("rategen_suppliers").delete().eq("id", supplierId).eq("dmc_id", user.dmc.id);

  if (error) {
    console.error(`Error deleting supplier ${supplierId}: ${error.message}`);
    return { error: error.message };
  }

  return { error: null };
}

// ============================================
// BULK OPERATIONS
// ============================================

export async function bulkDeleteSuppliers(supplierIds: string[]) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  const { error } = await supabase.from("rategen_suppliers").delete().in("id", supplierIds).eq("dmc_id", user.dmc.id);

  if (error) {
    console.error(`Error bulk deleting suppliers: ${error.message}`);
    return { error: error.message };
  }

  return { error: null };
}

// ============================================
// LOOKUP & SEARCH FUNCTIONS
// ============================================

export async function getSupplierOptions(params?: { category?: ItemTypes; returnRaw?: boolean }) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user || !("dmc" in user)) return [];

    const { category, returnRaw = false } = params || {};

    let query = supabase
      .from("rategen_suppliers")
      .select("id, name, category")
      .eq("dmc_id", user.dmc.id)
      .eq("is_active", true)
      .order("name");

    if (category) {
      query = query.contains("category", [category]);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching supplier options:", error);
      return [];
    }

    if (returnRaw) {
      return data || [];
    }

    return (data || []).map((supplier) => ({
      label: supplier.name,
      value: supplier.id,
    }));
  } catch (error) {
    console.error("Unexpected error in getSupplierOptions:", error);
    return [];
  }
}

/** Fetch items for a supplier from vw_supplier_item_details, optionally filtered by item_type. */
export async function fetchSupplierOptions(search: string = ""): Promise<{ label: string; value: string }[]> {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user || !("dmc" in user)) return [];

    let query = supabase
      .from("rategen_suppliers")
      .select("name")
      .eq("dmc_id", user.dmc.id)
      .eq("is_active", true)
      .order("name");

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query.limit(50);
    if (error) return [];

    return (data || []).map((s) => ({ label: s.name, value: s.name }));
  } catch {
    return [];
  }
}

export async function getSupplierItems(supplierId: string, itemType?: ItemTypes) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: [], error: "User not found" };

  let query = supabase.from("vw_supplier_item_details").select("*").eq("supplier_id", supplierId);

  if (itemType) {
    query = query.eq("item_type", itemType);
  }

  const { data, error } = await query;

  if (error) return { data: [], error: error.message };

  return { data: data || [], error: null };
}

/** Insert a single supplier item + its POCs. Returns the new item id. */
export async function addSupplierItem(
  supplierId: string,
  item: {
    item_type: ItemTypes;
    hotel_id?: string | null;
    tour_id?: string | null;
    transfer_id?: string | null;
    tour_package_id?: string | null;
    transfer_package_id?: string | null;
    meal_id?: string | null;
    guide_id?: string | null;
    pocs?: Array<{ team_member_id: string; is_primary: boolean }>;
  }
) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { data: null, error: "User not found" };

  try {
    const { data, error } = await supabase.rpc("add_supplier_item", {
      p_supplier_id: supplierId,
      p_item_type: item.item_type,
      p_hotel_id: item.hotel_id ?? null,
      p_tour_id: item.tour_id ?? null,
      p_transfer_id: item.transfer_id ?? null,
      p_tour_package_id: item.tour_package_id ?? null,
      p_transfer_package_id: item.transfer_package_id ?? null,
      p_meal_id: item.meal_id ?? null,
      p_guide_id: item.guide_id ?? null,
      p_pocs: item.pocs ?? null,
    });

    if (error || !data) return { data: null, error: error?.message || "Failed to insert item" };

    return { data: { id: data.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** Delete a single supplier item by id (POCs cascade via FK). Verifies dmc ownership. */
export async function deleteSupplierItem(supplierId: string, itemId: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  const { error: ownerError } = await supabase
    .from("rategen_suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (ownerError) return { error: "Access denied" };

  const { error } = await supabase
    .from("rategen_supplier_items")
    .delete()
    .eq("id", itemId)
    .eq("supplier_id", supplierId);

  return { error: error?.message || null };
}

export async function syncSupplierAssociations(params: {
  itemType: ItemTypes;
  serviceId: string;
  associations: SupplierAssociation[];
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  const { itemType, serviceId, associations } = params;

  const { error } = await supabase.rpc("sync_supplier_items", {
    p_item_type: itemType,
    p_service_id: serviceId,
    p_dmc_id: user.dmc.id,
    p_associations: associations.map((a) => ({
      supplier_id: a.supplier_id,
      poc_ids: a.poc_ids,
      primary_poc_id: a.primary_poc_id ?? null,
      package_ids: a.package_ids ?? [],
    })),
  });

  if (error) {
    console.error("Error syncing supplier associations:", error.message);
    return { error: error.message };
  }

  return { error: null };
}

export async function getSupplierTeamMembers(supplierId: string): Promise<ISupplierTeamMemberData[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return [];

  const { data, error } = await supabase
    .from("rategen_supplier_team_members")
    .select("id, supplier_id, name, email, phone, department, is_primary")
    .eq("supplier_id", supplierId);

  if (error || !data) return [];

  return data.map((m: any) => ({
    id: m.id,
    supplier_id: m.supplier_id,
    name: m.name,
    email: m.email,
    phone: m.phone ?? undefined,
    department: m.department ?? [],
    is_primary: m.is_primary ?? false,
  }));
}

/**
 * Set a team member as the primary contact for a supplier.
 * Clears is_primary on all other members of the same supplier first,
 * then sets is_primary = true on the given member.
 */
export async function setSupplierPrimaryContact(
  supplierId: string,
  teamMemberId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user || !("dmc" in user)) return { error: "User not found" };

  // Verify supplier belongs to this DMC
  const { error: ownerError } = await supabase
    .from("rategen_suppliers")
    .select("id")
    .eq("id", supplierId)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (ownerError) return { error: "Access denied" };

  // Unset all primaries for this supplier, then set the chosen one
  const { error: unsetError } = await supabase
    .from("rategen_supplier_team_members")
    .update({ is_primary: false })
    .eq("supplier_id", supplierId);

  if (unsetError) return { error: unsetError.message };

  const { error: setError } = await supabase
    .from("rategen_supplier_team_members")
    .update({ is_primary: true })
    .eq("id", teamMemberId)
    .eq("supplier_id", supplierId);

  return { error: setError?.message ?? null };
}

export async function getSupplierOptionsWithItemId(params: {
  serviceType: ItemTypes;
  serviceId?: string | null;
  serviceParentId?: string | null;
}) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();
    if (!user || !("dmc" in user)) return [];

    const { serviceType, serviceId, serviceParentId } = params;

    let query = supabase
      .from("vw_supplier_item_details")
      .select("id, supplier_id, supplier_name")
      .eq("dmc_id", user.dmc.id)
      .eq("is_active", true)
      .eq("item_type", serviceType);

    // Match by service/package ID based on service type
    if (serviceType === "hotel" && serviceParentId) {
      query = query.eq("hotel_id", serviceParentId);
    } else if (serviceType === "tour" && serviceId) {
      query = query.eq("tour_package_id", serviceId);
    } else if (serviceType === "transfer" && serviceId) {
      query = query.eq("transfer_package_id", serviceId);
    }

    const { data, error } = await query.order("supplier_name");
    if (error) {
      console.error("Error fetching supplier options with item ID:", error);
      return [];
    }

    return (data || []).map((item: any) => ({
      label: item.supplier_name,
      value: item.supplier_id,
      supplier_item_id: item.id,
    }));
  } catch (error) {
    console.error("Unexpected error in getSupplierOptionsWithItemId:", error);
    return [];
  }
}
