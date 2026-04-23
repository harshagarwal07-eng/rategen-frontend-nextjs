"use server";

import { IOption } from "@/types/common";
import { createClient } from "@/utils/supabase/server";

export async function fetchTags(dmcId: string, search: string = "") {
  const supabase = await createClient();
  let query = supabase
    .from("tags")
    .select("id,name,dmc_id")
    .or(`dmc_id.is.null,dmc_id.eq.${dmcId}`)
    .order("name", { ascending: true });

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  const { data, error } = await query;
  if (error) return [];
  return data.map((tag) => ({
    label: tag.name,
    value: tag.id,
    isEditable: !!tag.dmc_id,
  }));
}

export async function createTag(dmcId: string, name: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
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

export async function updateTag(dmcId: string, tagData: IOption) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .update({ name: tagData.label })
    .eq("id", tagData.value)
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

export async function deleteTag(dmcId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", id)
    .eq("dmc_id", dmcId);

  if (error) return { error: error.message };

  return { success: true };
}
