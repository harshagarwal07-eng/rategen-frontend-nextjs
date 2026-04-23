import { parseAsArrayOf, parseAsInteger, parseAsJson, parseAsString, parseAsStringLiteral } from "nuqs";
import { z } from "zod";

export const AGENT_VIEWS = ["kanban", "table"] as const;
export type AgentView = (typeof AGENT_VIEWS)[number];

export const agentViewParam = parseAsStringLiteral(AGENT_VIEWS);
export const DEFAULT_AGENT_VIEW: AgentView = "kanban";

const sortSchema = z.array(z.object({ id: z.string(), desc: z.boolean() }));

// Shared filters (persist across view switches via URL)
export const agentSearchParam = parseAsString.withDefault("");
export const agentSortParam = parseAsJson(sortSchema.parse).withDefault([]);
export const agentCategoriesParam = parseAsArrayOf(parseAsString).withDefault([]);

export const agentPageParam = parseAsInteger.withDefault(1);
export const agentPageSizeParam = parseAsInteger.withDefault(50);

// Combined filter params for useQueryStates (mirrors hotel/bookings pattern)
export const agentFilterParams = {
  search: agentSearchParam,
  sort: agentSortParam,
  category: agentCategoriesParam,
  page: agentPageParam,
  perPage: agentPageSizeParam,
};
