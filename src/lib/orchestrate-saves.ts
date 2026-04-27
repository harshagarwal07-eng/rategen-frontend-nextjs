// Sequential save orchestrator with try-all-aggregate-errors semantics.
//
// Use when a save flow has multiple independent steps where a mid-flow
// failure should NOT block subsequent steps from being attempted — and
// the caller wants to know exactly which items succeeded and which failed
// so partial progress can be preserved (clear dirty flags on success;
// leave failures dirty so the user can retry).
//
// Sequential by design: keeps error ordering predictable and avoids
// hammering the backend with parallel requests for callers that care
// about ordering (e.g. POST a new resource before PUTting its children).
// Parallelism would also reorder log/toast output and complicate retry
// reasoning.

export interface SaveResult<T> {
  succeeded: T[];
  failed: Array<{ item: T; error: unknown }>;
}

/** Run `saveOne` against every item sequentially. Each call is wrapped in
 *  try/catch so a thrown error is captured into `failed` without aborting
 *  the loop. The returned promise never rejects. */
export async function orchestrateSaves<T>(
  items: T[],
  saveOne: (item: T) => Promise<void>,
): Promise<SaveResult<T>> {
  const succeeded: T[] = [];
  const failed: Array<{ item: T; error: unknown }> = [];
  for (const item of items) {
    try {
      await saveOne(item);
      succeeded.push(item);
    } catch (error) {
      failed.push({ item, error });
    }
  }
  return { succeeded, failed };
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Unknown error";
}

/** Format a list of failures for a toast, e.g.
 *  `2 failed: Addon X — network error, Addon Y — validation error`.
 *  `getLabel` extracts a display name from each failed item. */
export function formatSaveErrors<T>(
  failed: Array<{ item: T; error: unknown }>,
  getLabel: (item: T) => string,
): string {
  if (failed.length === 0) return "";
  const parts = failed.map(
    ({ item, error }) => `${getLabel(item)} — ${errorMessage(error)}`,
  );
  return `${failed.length} failed: ${parts.join(", ")}`;
}
