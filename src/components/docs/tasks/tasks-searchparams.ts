import { parseAsArrayOf, parseAsString } from "nuqs/server";

export const tasksSearchParams = {
  applies_to: parseAsArrayOf(parseAsString).withDefault([]),
  timing: parseAsArrayOf(parseAsString).withDefault([]),
  status: parseAsArrayOf(parseAsString).withDefault([]),
};
