import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { PeriskopeAuthError, getPeriskopeClientForDmc } from "@/lib/periskope/client";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Get DMC ID for this user
    const { data: member } = await supabase
      .from("dmc_team_members")
      .select("dmc_id")
      .eq("user_id", user.id)
      .single();

    if (!member?.dmc_id) {
      return NextResponse.json({
        connected: false,
        phoneId: null,
        detail: "DMC not found for your account.",
      });
    }

    const { periskopeFetch, phoneId } = await getPeriskopeClientForDmc(member.dmc_id);

    // Ping Periskope by listing chats with limit=1 — lightweight existence check
    const res = await periskopeFetch("/chats?limit=1");

    return NextResponse.json({
      connected: res.ok,
      phoneId: res.ok ? phoneId : null,
      detail: res.ok ? undefined : "WhatsApp number is not connected. Check Periskope Console.",
    });
  } catch (err) {
    if (err instanceof PeriskopeAuthError && err.reason === "notConfigured") {
      return NextResponse.json({
        connected: false,
        phoneId: null,
        detail: "Periskope is not configured. Add API key and phone ID in Settings → Integrations.",
      });
    }
    const message = err instanceof Error ? err.message : "Connection check failed.";
    return NextResponse.json({
      connected: false,
      phoneId: null,
      detail: message,
    });
  }
}
