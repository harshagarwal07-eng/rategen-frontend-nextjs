import { parseAsBoolean, parseAsStringLiteral } from "nuqs";

export const RIGHT_PANELS = ["details", "trip", "questionnaire", "ops"] as const;
export type RightPanel = (typeof RIGHT_PANELS)[number];
// null = collapsed (no panel active)
export const rightPanelParam = parseAsStringLiteral(RIGHT_PANELS);

export const OPS_TABS = ["bookings", "accounts", "emails", "tasks"] as const;
export type OpsTab = (typeof OPS_TABS)[number];
export const opsTabParam = parseAsStringLiteral(OPS_TABS).withDefault("bookings");

export const tripExpandedParam = parseAsBoolean.withDefault(false);
