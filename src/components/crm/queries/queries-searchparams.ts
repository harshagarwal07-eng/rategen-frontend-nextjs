import { parseAsArrayOf, parseAsInteger, parseAsJson, parseAsString, parseAsStringLiteral } from "nuqs";
import { z } from "zod";

export const QUERY_VIEWS = ["kanban", "table"] as const;
export type QueryView = (typeof QUERY_VIEWS)[number];

export const queryViewParam = parseAsStringLiteral(QUERY_VIEWS);
export const DEFAULT_QUERY_VIEW: QueryView = "kanban";

const sortSchema = z.array(z.object({ id: z.string(), desc: z.boolean() }));

// Shared filters (persist across view switches via URL)
export const querySearchParam = parseAsString.withDefault("");
export const querySortParam = parseAsJson(sortSchema.parse).withDefault([]);
export const queryStatusesParam = parseAsArrayOf(parseAsString).withDefault([]);
export const queryCountriesParam = parseAsArrayOf(parseAsString).withDefault([]);

export const queryPageParam = parseAsInteger.withDefault(1);
export const queryPageSizeParam = parseAsInteger.withDefault(50);

// Combined filter params for useQueryStates
export const queryFilterParams = {
  search: querySearchParam,
  sort: querySortParam,
  statuses: queryStatusesParam,
  countries: queryCountriesParam,
  page: queryPageParam,
  perPage: queryPageSizeParam,
};
