"use server";

import { IOption } from "@/types/common";
import { createClient } from "@/utils/supabase/server";

export async function fetchSources(dmcId: string, search: string = "") {
  const supabase = await createClient();
  let query = supabase
    .from("sources")
    .select("id,name,dmc_id")
    .or(`and(dmc_id.is.null,ta_id.is.null),dmc_id.eq.${dmcId}`)
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  const { data, error } = await query;
  if (error) return [];
  return data.map((source) => ({
    label: source.name,
    value: source.id,
    isEditable: !!source.dmc_id,
  }));
}

export async function createSource(dmcId: string, name: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sources")
    .insert([{ name, dmc_id: dmcId }])
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  return {
    data: {
      label: data.name,
      value: data.id,
      isEditable: true,
    },
  };
}

export async function updateSource(dmcId: string, sourceData: IOption) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sources")
    .update({ name: sourceData.label })
    .eq("id", sourceData.value)
    .eq("dmc_id", dmcId)
    .select("id, name")
    .single();

  if (error) return { error: error.message };

  return {
    data: {
      label: data.name,
      value: data.id,
      isEditable: true,
    },
  };
}

export async function deleteSource(dmcId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sources")
    .delete()
    .eq("id", id)
    .eq("dmc_id", dmcId);

  if (error) return { error: error.message };

  return { success: true };
}
