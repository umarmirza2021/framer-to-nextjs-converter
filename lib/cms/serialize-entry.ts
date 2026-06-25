import { normalizeEntryValues } from "@/lib/cms/entry-values";

export function serializeEntryValues(values: unknown): string {
  return JSON.stringify(normalizeEntryValues(values));
}

export function parseStoredEntryValues(raw: string): Record<string, unknown> {
  return normalizeEntryValues(raw);
}

export function mergeEntryValues(
  existing: unknown,
  incoming: unknown
): Record<string, unknown> {
  return {
    ...normalizeEntryValues(existing),
    ...normalizeEntryValues(incoming),
  };
}