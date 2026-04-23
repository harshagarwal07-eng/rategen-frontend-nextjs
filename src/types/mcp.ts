import { z } from "zod";

// MCP Call Record
export interface MCPCall {
  id: string;
  chat_id: string;
  step_id: string;
  mcp_name: string;
  webhook_url: string;
  request_payload: Record<string, any>;
  response_payload?: Record<string, any>;
  http_status?: number;
  error_message?: string;
  latency_ms?: number;
  created_at: string;
}

// MCP Configuration
export interface MCPConfig {
  name: string;
  webhook_url: string;
  timeout_ms?: number;
  max_retries?: number;
  description?: string;
}

// Available MCPs
export const MCPType = z.enum([
  "tours",
  "hotels",
  "transfers",
  "itineraries",
  "dmc-settings",
  "default-policies",
  "service-rates",
]);
export type MCPType = z.infer<typeof MCPType>;

// MCP Request/Response Types
export interface MCPSearchRequest {
  query: string;
  dmc_id?: string;
  filters?: {
    destination?: string;
    date_from?: string;
    date_to?: string;
    budget?: string;
    category?: string;
  };
}

export interface MCPSearchResponse {
  success: boolean;
  data: any[];
  total_count?: number;
  error?: string;
  latency_ms?: number;
}

// MCP Client Configuration
export interface MCPClientConfig {
  baseUrl: string;
  authToken?: string;
  defaultTimeout?: number;
  maxRetries?: number;
}

// DMC Settings Tool Types
export interface DMCSettingsRequest {
  dmc_id: string;
  setting_key?: string; // Optional specific setting to check
}

export interface DMCSettingsResponse {
  success: boolean;
  settings: {
    allow_individual_service_rates?: boolean;
    require_itinerary_before_quote?: boolean;
    minimum_booking_value?: number;
    default_markup_percentage?: number;
    [key: string]: any;
  };
  error?: string;
}

// Default Policies Tool Types
export interface DefaultPoliciesRequest {
  dmc_id: string;
  policy_type?: 'cancellation' | 'payment' | 'booking' | 'all';
}

export interface DefaultPoliciesResponse {
  success: boolean;
  policies: {
    cancellation?: string;
    payment?: string;
    booking?: string;
    terms_and_conditions?: string;
  };
  error?: string;
}

// Service Rates Tool Types
export interface ServiceRatesRequest {
  dmc_id: string;
  service_type: 'tour' | 'hotel' | 'transfer';
  service_id: string;
  date_from?: string;
  date_to?: string;
  num_people?: number;
}

export interface ServiceRatesResponse {
  success: boolean;
  data: {
    service_id: string;
    service_name: string;
    service_type: string;
    base_rate: number;
    selling_rate: number;
    currency: string;
    per_person?: boolean;
    breakdown?: {
      adult_rate?: number;
      child_rate?: number;
      extra_bed_rate?: number;
    };
  };
  error?: string;
}
