import { createClient } from "@/utils/supabase/server";

const PERISKOPE_API_BASE = "https://api.periskope.app/v1";

export class PeriskopeAuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 403,
    public readonly reason: string = "notConfigured"
  ) {
    super(message);
    this.name = "PeriskopeAuthError";
  }
}

export class PeriskopeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly reason?: string
  ) {
    super(message);
    this.name = "PeriskopeApiError";
  }
}

export type PeriskopeFetch = (endpoint: string, options?: RequestInit) => Promise<Response>;

function buildClient(apiKey: string, phoneId: string): { periskopeFetch: PeriskopeFetch; phoneId: string } {
  const periskopeFetch: PeriskopeFetch = async (endpoint, options = {}) => {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${PERISKOPE_API_BASE}${endpoint}`;

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-phone": phoneId,
        ...options.headers,
      },
    });
  };

  return { periskopeFetch, phoneId };
}

/**
 * Returns an authenticated Periskope client for a specific DMC.
 * Credentials are stored per-DMC in `dmc_periskope_connections`.
 * Throws PeriskopeAuthError if no connection is configured for the DMC.
 */
export async function getPeriskopeClientForDmc(
  dmcId: string
): Promise<{ periskopeFetch: PeriskopeFetch; phoneId: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dmc_periskope_connections")
    .select("api_key, phone_id")
    .eq("dmc_id", dmcId)
    .single();

  if (!data?.api_key || !data?.phone_id) {
    throw new PeriskopeAuthError(
      "WhatsApp is not configured for your organization.",
      503,
      "notConfigured"
    );
  }

  return buildClient(data.api_key, data.phone_id);
}
