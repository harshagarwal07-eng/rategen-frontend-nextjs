import type {
  BookingMilestone,
  WelcomeTemplateVars,
  ConfirmationTemplateVars,
  ReminderTemplateVars,
} from "./types";

type TemplateBuilder<T = Record<string, unknown>> = (vars: T) => string;

function buildWelcomeMessage(vars: WelcomeTemplateVars): string {
  return [
    `👋 Welcome to your trip group!`,
    ``,
    `*Traveler:* ${vars.travelerName}`,
    `*Destination:* ${vars.destination}`,
    `*Travel Dates:* ${vars.travelDates}`,
    `*Query ID:* ${vars.queryId}`,
    ``,
    `We'll share all trip updates, documents, and coordination details here.`,
    `Feel free to ask any questions!`,
  ].join("\n");
}

function buildConfirmationMessage(vars: ConfirmationTemplateVars): string {
  const tours = vars.toursIncluded.length > 0
    ? vars.toursIncluded.map((t) => `  • ${t}`).join("\n")
    : "  None included";

  return [
    `✅ *Booking Confirmed!*`,
    ``,
    `Hi ${vars.travelerName},`,
    ``,
    `Your trip to *${vars.destination}* is confirmed. Here's a summary:`,
    ``,
    `🏨 *Hotel:* ${vars.hotel}`,
    `📅 *Check-in:* ${vars.checkIn}`,
    `📅 *Check-out:* ${vars.checkOut}`,
    `🚗 *Transfer:* ${vars.transferDetails}`,
    `🎯 *Tours:*`,
    tours,
    ``,
    `We'll send you a detailed itinerary soon!`,
  ].join("\n");
}

function buildReminderMessage(vars: ReminderTemplateVars): string {
  const daysText = vars.daysUntilTravel === 0
    ? "Today's the day! 🎉"
    : vars.daysUntilTravel === 1
      ? "Tomorrow is the day!"
      : `Your trip is in *${vars.daysUntilTravel} days*!`;

  return [
    `⏰ *Trip Reminder*`,
    ``,
    `Hi ${vars.travelerName},`,
    ``,
    daysText,
    ``,
    `*Destination:* ${vars.destination}`,
    `*Meeting Point:* ${vars.meetingPoint}`,
    `*Contact:* ${vars.contactNumber}`,
    ``,
    `Safe travels! 🌍`,
  ].join("\n");
}

function buildDayOfMessage(vars: ReminderTemplateVars): string {
  return [
    `🌅 *Your Trip Starts Today!*`,
    ``,
    `Hi ${vars.travelerName},`,
    ``,
    `Welcome to *${vars.destination}*! Here's your day plan:`,
    ``,
    `📍 *Meeting Point:* ${vars.meetingPoint}`,
    `📞 *Emergency Contact:* ${vars.contactNumber}`,
    ``,
    `Have an amazing trip! 🎉`,
  ].join("\n");
}

function buildPostTripMessage(vars: { travelerName: string; destination: string }): string {
  return [
    `🙏 *Thank You!*`,
    ``,
    `Hi ${vars.travelerName},`,
    ``,
    `We hope you had a wonderful time in *${vars.destination}*!`,
    ``,
    `We'd love to hear your feedback. Please share your experience so we can improve for future travelers.`,
    ``,
    `Until next time! ✈️`,
  ].join("\n");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MILESTONE_TEMPLATE_MAP: Record<BookingMilestone, TemplateBuilder<any>> = {
  welcome: buildWelcomeMessage,
  confirmation: buildConfirmationMessage,
  reminder7day: buildReminderMessage,
  dayOf: buildDayOfMessage,
  postTrip: buildPostTripMessage,
};

/**
 * Build a milestone message from template variables.
 * Variables are resolved from query/booking data — no AI generation.
 */
export function buildMilestoneMessage<T extends Record<string, unknown>>(
  milestone: BookingMilestone,
  vars: T
): string {
  const builder = MILESTONE_TEMPLATE_MAP[milestone];
  return builder(vars);
}
