/**
 * Static email body templates for supplier booking drafts.
 * Each template returns an HTML string with [Placeholder] variables.
 * Variables are substituted from booking data when available;
 * placeholders remain for manual completion otherwise.
 */

export type EmailServiceTag = "hotel" | "transfer" | "tour" | "meal" | "guide";

// ---------------------------------------------------------------------------
// Per-service template builders
// ---------------------------------------------------------------------------

function buildHotelTemplate(): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to place the following hotel booking request:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Hotel</td><td style="padding:4px 8px">[Hotel Name]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Check-in</td><td style="padding:4px 8px">[Check-in Date]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Check-out</td><td style="padding:4px 8px">[Check-out Date]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Nights</td><td style="padding:4px 8px">[Number of Nights]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Room Type</td><td style="padding:4px 8px">[Room Type]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">[Pax Count]</td></tr>
</table>
<p>Kindly confirm availability, rates, and booking details at your earliest convenience.</p>`;
}

function buildTransferTemplate(): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to arrange the following transfer:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Transfer Type</td><td style="padding:4px 8px">[Transfer Type]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pickup Location</td><td style="padding:4px 8px">[Pickup Location]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Drop Location</td><td style="padding:4px 8px">[Drop Location]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Date</td><td style="padding:4px 8px">[Date]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Time</td><td style="padding:4px 8px">[Time]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Vehicle Type</td><td style="padding:4px 8px">[Vehicle Type]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">[Pax Count]</td></tr>
</table>
<p>Please confirm availability and provide your best rates.</p>`;
}

function buildTourTemplate(): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to book the following tour:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Tour</td><td style="padding:4px 8px">[Tour Name]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Date</td><td style="padding:4px 8px">[Date]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Time</td><td style="padding:4px 8px">[Time]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pickup Point</td><td style="padding:4px 8px">[Pickup Point]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">[Pax Count]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Special Requirements</td><td style="padding:4px 8px">[Special Requirements]</td></tr>
</table>
<p>Kindly confirm the booking and provide any additional instructions for our guests.</p>`;
}

function buildMealTemplate(): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to make the following meal reservation:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Restaurant</td><td style="padding:4px 8px">[Restaurant Name]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Date</td><td style="padding:4px 8px">[Date]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Time</td><td style="padding:4px 8px">[Time]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Meal Type</td><td style="padding:4px 8px">[Meal Type]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">[Pax Count]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Dietary Notes</td><td style="padding:4px 8px">[Dietary Notes]</td></tr>
</table>
<p>Please confirm the reservation and advise if there are any specific requirements we should be aware of.</p>`;
}

function buildGuideTemplate(): string {
  return `<p>Dear [Supplier Name],</p>
<p>We would like to arrange a guide for our guests:</p>
<table style="border-collapse:collapse;width:100%;max-width:520px">
  <tr><td style="padding:4px 8px;font-weight:600;width:160px">Language</td><td style="padding:4px 8px">[Language]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Date(s)</td><td style="padding:4px 8px">[Dates]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Duration</td><td style="padding:4px 8px">[Duration (hours)]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Meeting Point</td><td style="padding:4px 8px">[Meeting Point]</td></tr>
  <tr><td style="padding:4px 8px;font-weight:600">Pax</td><td style="padding:4px 8px">[Pax Count]</td></tr>
</table>
<p>Kindly confirm availability and the guide's details.</p>`;
}

// ---------------------------------------------------------------------------
// Template registry — open/closed: add new service types without touching logic
// ---------------------------------------------------------------------------

const TEMPLATE_BUILDERS: Record<EmailServiceTag, () => string> = {
  hotel: buildHotelTemplate,
  transfer: buildTransferTemplate,
  tour: buildTourTemplate,
  meal: buildMealTemplate,
  guide: buildGuideTemplate,
};

const SERVICE_LABELS: Record<EmailServiceTag, string> = {
  hotel: "Hotel",
  transfer: "Transfer",
  tour: "Tour",
  meal: "Meal",
  guide: "Guide",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the HTML body for a single service type.
 */
export function buildEmailTemplate(tag: EmailServiceTag): string {
  return TEMPLATE_BUILDERS[tag]();
}

/**
 * Build a combined HTML body for multiple service types.
 * Sections are separated by a labelled horizontal rule.
 */
export function buildMultiServiceEmailTemplate(tags: EmailServiceTag[]): string {
  if (tags.length === 0) return "";
  if (tags.length === 1) return buildEmailTemplate(tags[0]);

  return tags
    .map((tag, i) => {
      const heading =
        i === 0
          ? `<h3 style="margin:0 0 8px;font-size:14px;color:#444">${SERVICE_LABELS[tag]}</h3>`
          : `<hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/><h3 style="margin:0 0 8px;font-size:14px;color:#444">${SERVICE_LABELS[tag]}</h3>`;
      return heading + buildEmailTemplate(tag);
    })
    .join("\n");
}

/**
 * Subject line prefix for a booking email draft.
 * e.g. "[#AB1234 - John Smith] Booking Confirmation — Hotel, Transfer"
 */
export function buildDraftSubject(
  queryDisplayId: string,
  travelerName: string,
  serviceTags: EmailServiceTag[]
): string {
  const serviceLabel = serviceTags.map((t) => SERVICE_LABELS[t]).join(", ");
  return `[#${queryDisplayId.toUpperCase()} - ${travelerName}] Booking Confirmation — ${serviceLabel}`;
}
