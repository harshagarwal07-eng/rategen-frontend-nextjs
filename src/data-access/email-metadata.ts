"use server";

import { createClient } from "@/utils/supabase/server";

export interface DraftGenerationError {
  supplier_id: string | null;
  supplier_name: string | null;
  reason: "no_primary_contact" | "no_email" | "draft_creation_failed" | "no_gmail_connection";
}

export interface DraftGenerationStatus {
  errors: DraftGenerationError[];
}

export async function getDraftGenerationStatus(
  queryUuid: string
): Promise<{ data: DraftGenerationStatus } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("whitelabel_queries")
    .select("draft_generation_errors")
    .eq("id", queryUuid)
    .single();

  if (error) return { error: error.message };

  return {
    data: {
      errors: (data?.draft_generation_errors as DraftGenerationError[] | null) ?? [],
    },
  };
}

export type EmailMetadataInput = {
  gmailMessageId: string;
  gmailThreadId: string;
  queryId: string;
  supplierId?: string;
  serviceTags?: string[];
  isDraft?: boolean;
  dmcId: string;
};

export async function saveEmailQueryAssociation(
  input: EmailMetadataInput
): Promise<{ data: { id: string } } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_metadata")
    .upsert(
      {
        gmail_message_id: input.gmailMessageId,
        gmail_thread_id: input.gmailThreadId,
        query_id: input.queryId,
        supplier_id: input.supplierId ?? null,
        service_tags: input.serviceTags ?? [],
        is_draft: input.isDraft ?? false,
        dmc_id: input.dmcId,
      },
      { onConflict: "gmail_message_id,query_id" }
    )
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { data };
}
