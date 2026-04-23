/**
 * Edge Function: auto-generate-supplier-drafts
 *
 * Triggered by DB trigger when whitelabel_queries.status → 'booked'.
 * Groups confirmed bookings by supplier, resolves primary/CC contacts,
 * substitutes real booking data into templates, creates Gmail drafts,
 * applies the query Gmail label, and saves email_metadata rows.
 *
 * Input body: { query_id: string, dmc_id: string }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ServiceTag = "hotel" | "transfer" | "tour" | "meal" | "guide";

interface BookingRow {
  supplier_id: string | null;
  supplier_name: string | null;
  service_type: string | null;
  service_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  tour_date: string | null;
  pickup_date: string | null;
  drop_date: string | null;
  pax_details: { adults?: number; children?: number; children_ages?: number[] } | null;
  vehicle_type: string | null;
  restaurant_name: string | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  is_primary: boolean;
}

interface SupplierGroup {
  supplier_id: string;
  supplier_name: string;
  service_tags: ServiceTag[];
  bookings: BookingRow[];
  to_emails: string[];
  cc_emails: string[];
}

interface DraftError {
  supplier_id: string;
  supplier_name: string;
  reason: "no_primary_contact" | "no_email" | "draft_creation_failed";
}

// ---------------------------------------------------------------------------
// Template builders — parameterised with real booking data
// ---------------------------------------------------------------------------

const SERVICE_LABELS: Record<ServiceTag, string> = {
  hotel: "Hotel",
  transfer: "Transfer",
  tour: "Tour",
  meal: "Meal",
  guide: "Guide",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "TBD";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function totalPax(paxDetails: BookingRow["pax_details"]): number {
  if (!paxDetails) return 0;
  return (paxDetails.adults ?? 0) + (paxDetails.children ?? 0);
}

function buildHotelTemplate(booking: BookingRow): string {
  const nights =
    booking.check_in_date && booking.check_out_date
      ? Math.round(
          (new Date(booking.check_out_date).getTime() - new Date(booking.check_in_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

  return `<p>Dear [Supplier Name],</p>
<p>We would like to place the following hotel booking request:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Hotel</td><td style="padding:4px 8px">${booking.service_name ?? "—"}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Check-in</td><td style="padding:4px 8px">${formatDate(booking.check_in_date)}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Check-out</td><td style="padding:4px 8px">${formatDate(booking.check_out_date)}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Nights</td><td style="padding:4px 8px">${nights ?? "—"}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">${totalPax(booking.pax_details) || "—"}</td></tr>
</table>
<p>Kindly confirm availability, rates, and booking details at your earliest convenience.</p>`;
}

function buildTransferTemplate(booking: BookingRow): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to arrange the following transfer:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Transfer</td><td style="padding:4px 8px">${booking.service_name ?? "—"}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Vehicle Type</td><td style="padding:4px 8px">${booking.vehicle_type ?? "—"}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pickup Date</td><td style="padding:4px 8px">${formatDate(booking.pickup_date)}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Drop Date</td><td style="padding:4px 8px">${formatDate(booking.drop_date)}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">${totalPax(booking.pax_details) || "—"}</td></tr>
</table>
<p>Please confirm availability and provide your best rates.</p>`;
}

function buildTourTemplate(booking: BookingRow): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to book the following tour:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Tour</td><td style="padding:4px 8px">${booking.service_name ?? "—"}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Date</td><td style="padding:4px 8px">${formatDate(booking.tour_date)}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">${totalPax(booking.pax_details) || "—"}</td></tr>
</table>
<p>Kindly confirm the booking and provide any additional instructions for our guests.</p>`;
}

function buildMealTemplate(booking: BookingRow): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to make the following meal reservation:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Restaurant</td><td style="padding:4px 8px">${booking.restaurant_name ?? booking.service_name ?? "—"}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Date</td><td style="padding:4px 8px">${formatDate(booking.tour_date ?? booking.pickup_date)}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">${totalPax(booking.pax_details) || "—"}</td></tr>
</table>
<p>Please confirm the reservation and advise if there are any specific requirements we should be aware of.</p>`;
}

function buildGuideTemplate(booking: BookingRow): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to arrange a guide for our guests:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Guide</td><td style="padding:4px 8px">${booking.service_name ?? "—"}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Date(s)</td><td style="padding:4px 8px">${formatDate(booking.tour_date ?? booking.pickup_date)}</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">${totalPax(booking.pax_details) || "—"}</td></tr>
</table>
<p>Kindly confirm availability and the guide's details.</p>`;
}

type TemplateBuilder = (booking: BookingRow) => string;

const TEMPLATE_BUILDERS: Record<ServiceTag, TemplateBuilder> = {
  hotel: buildHotelTemplate,
  transfer: buildTransferTemplate,
  tour: buildTourTemplate,
  meal: buildMealTemplate,
  guide: buildGuideTemplate,
};

function buildEmailBody(group: SupplierGroup): string {
  const { service_tags, bookings } = group;
  if (service_tags.length === 0) return "";

  // Find the representative booking for each tag (first booking matching that service_type)
  const sections = service_tags.map((tag, i) => {
    const booking = bookings.find((b) => b.service_type === tag) ?? bookings[0];
    const heading =
      service_tags.length === 1
        ? ""
        : i === 0
          ? `<h3 style="margin:0 0 8px;font-size:14px;color:#444">${SERVICE_LABELS[tag]}</h3>`
          : `<hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/><h3 style="margin:0 0 8px;font-size:14px;color:#444">${SERVICE_LABELS[tag]}</h3>`;
    return heading + TEMPLATE_BUILDERS[tag](booking);
  });

  return sections.join("\n");
}

function buildSubject(queryDisplayId: string, travelerName: string, tags: ServiceTag[]): string {
  const serviceLabel = tags.map((t) => SERVICE_LABELS[t]).join(", ");
  return `[#${queryDisplayId.toUpperCase()} - ${travelerName}] Booking Confirmation — ${serviceLabel}`;
}

// ---------------------------------------------------------------------------
// RFC 2822 message builder
// ---------------------------------------------------------------------------

function buildRfc2822(params: { to: string; cc?: string; subject: string; htmlBody: string }): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const lines: string[] = [
    `To: ${params.to}`,
    ...(params.cc ? [`Cc: ${params.cc}`] : []),
    `Subject: ${params.subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    params.htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    params.htmlBody,
    "",
    `--${boundary}--`,
  ];
  return lines.join("\r\n");
}

function base64url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Gmail API helpers
// ---------------------------------------------------------------------------

async function getValidAccessToken(
  adminClient: ReturnType<typeof createClient>,
  dmcId: string
): Promise<string | null> {
  const { data: conn, error } = await adminClient
    .from("user_gmail_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("dmc_id", dmcId)
    .single();

  if (error || !conn) return null;

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh) return conn.access_token as string;
  if (!conn.refresh_token) return null;

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token as string,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) return null;

  const tokens = (await tokenRes.json()) as { access_token: string; expires_in: number };
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await adminClient
    .from("user_gmail_connections")
    .update({ access_token: tokens.access_token, token_expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq("dmc_id", dmcId);

  return tokens.access_token;
}

async function createGmailDraft(
  accessToken: string,
  raw: string
): Promise<{ messageId: string; threadId: string } | null> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw: base64url(raw) } }),
  });

  if (!res.ok) {
    console.error("Gmail draft creation failed:", await res.text());
    return null;
  }

  const data = (await res.json()) as { message: { id: string; threadId: string } };
  return { messageId: data.message.id, threadId: data.message.threadId };
}

/**
 * Ensures a Gmail label exists for the query display ID and returns its ID.
 * Creates it if missing.
 */
async function ensureGmailLabel(accessToken: string, labelName: string): Promise<string | null> {
  const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) return null;

  const listData = (await listRes.json()) as { labels: Array<{ id: string; name: string }> };
  const existing = listData.labels?.find((l) => l.name.toLowerCase() === labelName.toLowerCase());
  if (existing) return existing.id;

  const createRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: labelName }),
  });
  if (!createRes.ok) return null;

  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function applyLabelToMessage(accessToken: string, messageId: string, labelId: string): Promise<void> {
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  let queryId: string;
  let dmcId: string;

  try {
    const body = await req.json();
    queryId = body.query_id;
    dmcId = body.dmc_id;
    if (!queryId || !dmcId) throw new Error("Missing query_id or dmc_id");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400 });
  }

  console.log(`[auto-generate-supplier-drafts] query_id=${queryId} dmc_id=${dmcId}`);

  // 1. Fetch query details
  const { data: query, error: queryError } = await adminClient
    .from("whitelabel_queries")
    .select("id, query_id, traveler_name")
    .eq("id", queryId)
    .single();

  if (queryError || !query) {
    return new Response(JSON.stringify({ error: "Query not found" }), { status: 404 });
  }

  // 2. Fetch confirmed bookings with service detail columns
  const { data: bookings, error: bookingsError } = await adminClient
    .from("vw_whitelabel_booking_details")
    .select(
      "supplier_id, supplier_name, service_type, service_name, check_in_date, check_out_date, tour_date, pickup_date, drop_date, pax_details, vehicle_type, restaurant_name"
    )
    .eq("query_id", queryId)
    .eq("booking_status", "confirmed");

  if (bookingsError || !bookings?.length) {
    console.log(`[auto-generate-supplier-drafts] no confirmed bookings for query_id=${queryId}`);
    return new Response(JSON.stringify({ drafts_created: 0, message: "No confirmed bookings" }), { status: 200 });
  }

  // 3. Resolve Gmail access token
  const accessToken = await getValidAccessToken(adminClient, dmcId);
  if (!accessToken) {
    await adminClient
      .from("whitelabel_queries")
      .update({ draft_generation_errors: [{ reason: "no_gmail_connection", supplier_id: null, supplier_name: null }] })
      .eq("id", queryId);
    return new Response(JSON.stringify({ error: "No Gmail connection for DMC" }), { status: 200 });
  }

  // 4. Ensure the query Gmail label exists once (reused for all drafts)
  const queryDisplayId = query.query_id as string;
  const queryLabelId = await ensureGmailLabel(accessToken, queryDisplayId.toUpperCase());

  // 5. Group bookings by supplier
  const supplierMap = new Map<
    string,
    { supplier_name: string; service_tags: Set<ServiceTag>; bookings: BookingRow[] }
  >();

  for (const booking of bookings as BookingRow[]) {
    if (!booking.supplier_id) continue;
    const serviceType = booking.service_type as ServiceTag | null;
    if (!serviceType || !(serviceType in SERVICE_LABELS)) continue;

    if (!supplierMap.has(booking.supplier_id)) {
      supplierMap.set(booking.supplier_id, {
        supplier_name: booking.supplier_name ?? booking.supplier_id,
        service_tags: new Set(),
        bookings: [],
      });
    }
    const entry = supplierMap.get(booking.supplier_id)!;
    entry.service_tags.add(serviceType);
    entry.bookings.push(booking);
  }

  // 6. For each supplier: resolve contacts, build draft, save metadata
  const draftErrors: DraftError[] = [];
  let draftsCreated = 0;

  for (const [supplierId, { supplier_name, service_tags, bookings: supplierBookings }] of supplierMap) {
    const { data: members, error: membersError } = await adminClient
      .from("rategen_supplier_team_members")
      .select("id, name, email, is_primary")
      .eq("supplier_id", supplierId);

    if (membersError || !members) {
      draftErrors.push({ supplier_id: supplierId, supplier_name, reason: "no_email" });
      continue;
    }

    const validMembers = (members as TeamMember[]).filter((m) => m.email?.trim());
    if (!validMembers.length) {
      draftErrors.push({ supplier_id: supplierId, supplier_name, reason: "no_email" });
      continue;
    }

    const primaryMembers = validMembers.filter((m) => m.is_primary);
    if (!primaryMembers.length) {
      draftErrors.push({ supplier_id: supplierId, supplier_name, reason: "no_primary_contact" });
      continue;
    }

    const ccMembers = validMembers.filter((m) => !m.is_primary);

    const group: SupplierGroup = {
      supplier_id: supplierId,
      supplier_name,
      service_tags: Array.from(service_tags),
      bookings: supplierBookings,
      to_emails: primaryMembers.map((m) => m.email),
      cc_emails: ccMembers.map((m) => m.email),
    };

    const htmlBody = buildEmailBody(group);
    const subject = buildSubject(queryDisplayId, query.traveler_name as string, group.service_tags);
    const raw = buildRfc2822({
      to: group.to_emails.join(", "),
      cc: group.cc_emails.length ? group.cc_emails.join(", ") : undefined,
      subject,
      htmlBody,
    });

    const draft = await createGmailDraft(accessToken, raw);
    if (!draft) {
      draftErrors.push({ supplier_id: supplierId, supplier_name, reason: "draft_creation_failed" });
      continue;
    }

    // Apply query label so draft surfaces in Ops → Emails tab
    if (queryLabelId) {
      await applyLabelToMessage(accessToken, draft.messageId, queryLabelId);
    }

    await adminClient.from("email_metadata").upsert(
      {
        gmail_message_id: draft.messageId,
        gmail_thread_id: draft.threadId,
        query_id: queryId,
        supplier_id: supplierId,
        service_tags: group.service_tags,
        is_draft: true,
        dmc_id: dmcId,
      },
      { onConflict: "gmail_message_id,query_id" }
    );

    draftsCreated++;
  }

  // 7. Persist errors back to query row (clear on full success)
  await adminClient
    .from("whitelabel_queries")
    .update({ draft_generation_errors: draftErrors.length > 0 ? draftErrors : null })
    .eq("id", queryId);

  return new Response(
    JSON.stringify({ drafts_created: draftsCreated, errors: draftErrors }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
