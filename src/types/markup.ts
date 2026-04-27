// Mirrors backend/src/modules/markup-engine/types.ts.
// Dates travel as ISO strings (YYYY-MM-DD or full ISO) — kept as strings here.

export type ServiceType =
  | "hotel"
  | "tour"
  | "transfer"
  | "meal"
  | "guide"
  | "fixed_departure"
  | "bundle";

export const SERVICE_TYPES: Exclude<ServiceType, "bundle">[] = [
  "hotel",
  "tour",
  "transfer",
  "meal",
  "guide",
  "fixed_departure",
];

export type AgentTier = "unrated" | "3_star" | "4_star" | "5_star";

export const AGENT_TIERS: AgentTier[] = ["unrated", "3_star", "4_star", "5_star"];

export const TIER_LABELS: Record<AgentTier, string> = {
  unrated: "Unrated",
  "3_star": "3-star",
  "4_star": "4-star",
  "5_star": "5-star",
};

export type Channel = "whitelabel" | "api";

export type ModifierType = "tier" | "market" | "season" | "api_client";

export const MODIFIER_TYPES: ModifierType[] = ["tier", "market", "season", "api_client"];

export type MarkupValueType = "pct" | "flat";

export type MarkupPer = "pax" | "night" | "unit" | "total";

export type PaxBreakdown = {
  adult: number;
  child: number;
  infant: number;
};

export type MarkupValue = {
  type: MarkupValueType;
  value: number;
  per?: MarkupPer;
  pax_breakdown?: PaxBreakdown;
};

export type MarkupBounds = {
  min?: number;
  max?: number;
  per: "pax" | "total";
};

export type MarkupModifier = {
  id?: string;
  modifier_type: ModifierType;
  modifier_value: string;
  adjustment: MarkupValue;
};

export type MarkupOverride = {
  id: string;
  product_id: string;
  base_markup: MarkupValue;
};

export type MarkupConfig = {
  id: string;
  service_type: ServiceType;
  bundle_id?: string;
  base_markup: MarkupValue;
  bounds?: MarkupBounds;
  is_active?: boolean;
  updated_at?: string;
  created_at?: string;
  modifiers: MarkupModifier[];
  overrides: MarkupOverride[];
};

export type MarkupConfigSummary = {
  id: string;
  service_type: ServiceType;
  bundle_id?: string;
  base_markup: MarkupValue;
  bounds?: MarkupBounds;
  is_active?: boolean;
  updated_at?: string;
  created_at?: string;
  modifier_count?: number;
};

export type MarkupBundle = {
  id: string;
  name: string;
  service_types: ServiceType[];
  bundle_config?: MarkupConfig;
  created_at?: string;
  updated_at?: string;
};

export type MarketCluster = {
  id: string;
  name: string;
  country_codes: string[];
  modifier_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type Season = {
  id: string;
  name: string;
  date_from: string; // YYYY-MM-DD
  date_to: string; // YYYY-MM-DD
  modifier_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type ApiClient = {
  id: string;
  name: string;
  is_active: boolean;
  modifier_count?: number;
  created_at?: string;
  updated_at?: string;
};

// ─── Mutation payloads ─────────────────────────────────────────────────

export type CreateConfigInput = {
  service_type: ServiceType;
  base_markup: MarkupValue;
  bounds?: MarkupBounds;
};

export type UpdateConfigInput = {
  base_markup?: MarkupValue;
  bounds?: MarkupBounds | null;
  is_active?: boolean;
};

export type UpsertModifiersInput = {
  modifier_type: ModifierType;
  rows: Array<{
    modifier_value: string;
    adjustment: MarkupValue;
  }>;
};

export type CreateOverrideInput = {
  product_id: string;
  base_markup: MarkupValue;
};

export type UpdateOverrideInput = {
  base_markup: MarkupValue;
};

export type CreateBundleInput = {
  name: string;
  service_types: ServiceType[];
  base_markup: MarkupValue;
  bounds?: MarkupBounds;
};

export type UpdateBundleInput = {
  name?: string;
  service_types?: ServiceType[];
  base_markup?: MarkupValue;
  bounds?: MarkupBounds | null;
};

export type CreateMarketClusterInput = {
  name: string;
  country_codes: string[];
};

export type UpdateMarketClusterInput = Partial<CreateMarketClusterInput>;

export type CreateSeasonInput = {
  name: string;
  date_from: string;
  date_to: string;
};

export type UpdateSeasonInput = Partial<CreateSeasonInput>;

export type CreateApiClientInput = {
  name: string;
  is_active?: boolean;
};

export type UpdateApiClientInput = Partial<{
  name: string;
  is_active: boolean;
}>;

// ─── Calculator ────────────────────────────────────────────────────────

export type CalculateMarkupInput = {
  service_type: ServiceType;
  product_id?: string;
  agent_tier: AgentTier;
  agent_market_cluster_id: string;
  booking_date_range: { from: string; to: string }; // YYYY-MM-DD
  channel: Channel;
  api_client_id?: string;
  pax: { adults: number; children: number; infants: number };
  base_cost: number;
  units?: number;
  bundle_service_types?: ServiceType[];
};

export type ComputationStepName =
  | "base"
  | "tier_modifier"
  | "market_modifier"
  | "season_modifier"
  | "season_skipped"
  | "api_client_modifier"
  | "floor"
  | "ceiling";

export type ComputationStep = {
  step: ComputationStepName;
  contribution: number;
  note?: string;
};

export type RulePath = "bundle" | "row_override" | "service_base";

export type MarkupResult = {
  final_markup: number;
  per_pax_breakdown: PaxBreakdown;
  computation_log: ComputationStep[];
  rule_path: RulePath;
};

// ─── UI helpers ────────────────────────────────────────────────────────

export const SERVICE_LABELS: Record<Exclude<ServiceType, "bundle">, string> = {
  hotel: "Hotels",
  tour: "Tours",
  transfer: "Transfers",
  meal: "Meals",
  guide: "Guides",
  fixed_departure: "Fixed Departures",
};

export const MODIFIER_LABELS: Record<ModifierType, string> = {
  tier: "Agent tier",
  market: "Market cluster",
  season: "Season",
  api_client: "API client",
};
