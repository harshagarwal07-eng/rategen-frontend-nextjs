"use server";

import { createClient } from "@/utils/supabase/server";

export const generateExamples = async (formData: any, type: string) => {
  const example_for = type;
  try {
    const response = await fetch(`https://n8n.chatdmc.com/webhook/generate-example`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...formData, example_for }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || `Failed to generate examples: ${response.status}`,
      };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error("Error generating examples:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const getCountyDetailsById = async (uuid: string) => {
  const supabase = await createClient();

  const { data, error } = await supabase.from("countries").select("*").eq("id", uuid).single();

  if (error) return { error: error.message };
  return { data };
};

export const getSyncedColumns = async (entity: string[]) => {
  const supabase = await createClient();

  const { data, error } = await supabase.from("synced_columns").select("*").in("entity", entity);

  if (error) return { error: error.message };
  return { data: data.map((x) => `${x.entity}.${x.column_name}`) };
};
