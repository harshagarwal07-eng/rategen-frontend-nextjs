import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PeriskopeAuthError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

async function requireAuth(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function getDmcIdForUser(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dmc_team_members")
    .select("dmc_id")
    .eq("user_id", userId)
    .single();
  return data?.dmc_id ?? null;
}

/**
 * POST /api/whatsapp/contacts/check
 * Body: { phones: string[] }
 * Returns: { valid: string[], invalid: string[] }
 *
 * Calls Periskope POST /contacts/check before any group / participant operation.
 * All phone numbers must be verified on WhatsApp before they are added to a group.
 */
export async function POST(req: Request) {
  const userId = await requireAuth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const phones: string[] = body.phones ?? [];

  if (phones.length === 0) {
    return NextResponse.json({ error: "phones array is required" }, { status: 400 });
  }

  try {
    const dmcId = await getDmcIdForUser(userId);
    if (!dmcId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { periskopeFetch } = await getPeriskopeClientForDmc(dmcId);

    const res = await periskopeFetch("/contacts/check", {
      method: "POST",
      body: JSON.stringify({ phones }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: errBody.message ?? "Contact check failed" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Periskope returns a map of phone → { is_wa_contact: boolean }
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const phone of phones) {
      const result = data[phone] ?? data.contacts?.[phone];
      if (result?.is_wa_contact === true) {
        valid.push(phone);
      } else {
        invalid.push(phone);
      }
    }

    return NextResponse.json({ valid, invalid });
  } catch (err) {
    if (err instanceof PeriskopeAuthError) {
      return NextResponse.json({ error: err.message, reason: err.reason }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to check contacts" },
      { status: 500 }
    );
  }
}
