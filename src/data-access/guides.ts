"use server";

import { DatastoreSearchParams } from "@/types/datastore";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "./auth";
import { IGuidesDatastore } from "@/components/forms/schemas/guides-datastore-schema";
import { SupplierAssociation } from "@/types/suppliers";

export async function getAllGuidesByUser(params: DatastoreSearchParams) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: [], totalItems: 0 };

  const { sort, country, page = 1, perPage = 25, guide_type, currency } = params;

  const start = (page - 1) * perPage;
  const end = start + perPage - 1;

  const query = supabase
    .from("guides")
    .select(
      `*, 
      countries!guides_country_fkey(country_name), 
      cities!guides_city_fkey(city_name)`,
      {
        count: "exact",
      }
    )
    .eq("dmc_id", user.dmc.id)
    .order(sort?.[0]?.id ?? "created_at", {
      ascending: !(sort?.[0]?.desc ?? true),
    })
    .limit(perPage)
    .range(start, end);
  if (country?.length > 0) query.ilikeAnyOf("country", country);
  if (guide_type?.length > 0) query.ilikeAnyOf("guide_type", guide_type);
  if (currency?.length > 0) query.ilikeAnyOf("currency", currency);

  const { data, error, count } = await query;
  if (error) {
    console.error(`Error fetching guide for user ${user.id}: ${error.message}`);
    return { data: [], totalItems: 0 };
  }

  // Transform the data to flatten the joined field
  const transformedData =
    data?.map((item) => ({
      ...item,
      country_name: item.countries?.country_name || "N/A",
    })) || [];

  return { data: transformedData, totalItems: count ?? 0 };
}

export async function getGuideById(id: string) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { data: null, error: "User not found" };

  const { data, error } = await supabase
    .from("guides")
    .select(
      `*,
      countries!guides_country_fkey(country_name),
      cities!guides_city_fkey(city_name),
      supplier_items:rategen_supplier_items(
        id,
        supplier_id,
        supplier:rategen_suppliers(name, is_active),
        pocs:rategen_supplier_item_pocs(team_member_id, is_primary)
      )`
    )
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .single();

  if (error) {
    console.error(`Error fetching guide ${id}: ${error.message}`);
    return { data: null, error: error.message };
  }

  const supplierAssociations: SupplierAssociation[] = Object.values(
    ((data as any).supplier_items || []).reduce((acc: any, item: any) => {
      const sid = item.supplier_id;
      if (!acc[sid]) {
        acc[sid] = {
          supplier_id: sid,
          supplier_name: item.supplier?.name ?? undefined,
          is_active: item.supplier?.is_active ?? true,
          poc_ids: [],
          primary_poc_id: undefined,
          package_ids: [],
          package_names: {},
        };
      }
      (item.pocs || []).forEach((p: any) => {
        if (!acc[sid].poc_ids.includes(p.team_member_id)) acc[sid].poc_ids.push(p.team_member_id);
        if (p.is_primary) acc[sid].primary_poc_id = p.team_member_id;
      });
      return acc;
    }, {})
  ) as SupplierAssociation[];

  // Transform the data to flatten the joined field
  const transformedData = {
    ...data,
    country_name: (data as any).countries?.country_name || "N/A",
    city_name: (data as any).cities?.city_name || "N/A",
    supplier_associations: supplierAssociations,
  };

  return { data: transformedData, error: null };
}

export async function createGuide(guide: IGuidesDatastore) {
  const supabase = await createClient();

  const user = await getCurrentUser();
  if (!user) return { error: "User not found" };
  const { data, error } = await supabase
    .from("guides")
    .insert({ ...guide, state: guide.state || null, created_by: user.id, dmc_id: user.dmc.id })
    .select()
    .single();
  if (error) return { error: error.message };

  return { data };
}

export const updateGuide = async (id: string, guide: IGuidesDatastore) => {
  const supabase = await createClient();

  const user = await getCurrentUser();

  if (!user) return { error: "User not found" };

  // Remove fields that come from joins or shouldn't be updated
  const { countries, country_name, cities, city_name, supplier_items, supplier_associations, ...cleanGuide } = guide as any;

  const { data, error } = await supabase
    .from("guides")
    .update({ ...cleanGuide, state: cleanGuide.state || null, dmc_id: user.dmc.id })
    .eq("id", id)
    .eq("dmc_id", user.dmc.id)
    .select()
    .single();
  if (error) return { error: error.message };

  return { data };
};

export const deleteGuide = async (id: string) => {
  const supabase = await createClient();

  const { error } = await supabase.from("guides").delete().eq("id", id);

  if (error) return { error: error.message };

  return { data: null };
};

export const bulkDeleteGuides = async (ids: string[]) => {
  const supabase = await createClient();

  const { error } = await supabase.from("guides").delete().in("id", ids);

  if (error) return { error: error.message };

  return { data: null };
};
