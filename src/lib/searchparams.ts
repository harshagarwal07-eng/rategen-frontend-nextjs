import { createSearchParamsCache, createSerializer, parseAsInteger, parseAsJson, parseAsString } from "nuqs/server";
import { z } from "zod";

const schema = z.array(
  z.object({
    id: z.string(),
    desc: z.boolean(),
  })
);

export const searchParams = {
  search: parseAsString,
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(100),
  sort: parseAsJson(schema.parse).withDefault([]),
};

export const searchParamsCache = createSearchParamsCache(searchParams);
export const serialize = createSerializer(searchParams);
