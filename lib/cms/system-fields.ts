const SYSTEM_FIELD_NAMES = new Set([
  "created",
  "updated",
  "previous",
  "next",
  "created date",
  "updated date",
  "created at",
  "updated at",
  "previous item",
  "next item",
]);

const SYSTEM_FIELD_SLUGS = new Set([
  "created",
  "updated",
  "previous",
  "next",
  "created-date",
  "updated-date",
  "created-at",
  "updated-at",
  "previous-item",
  "next-item",
]);

const SYSTEM_FIELD_IDS = new Set([
  "id",
  "createdat",
  "updatedat",
  "previousitemid",
  "nextitemid",
]);

export function isFramerSystemField(field: {
  name: string;
  slug: string;
  framerFieldId?: string;
}): boolean {
  const nameNorm = field.name.trim().toLowerCase();
  const slugNorm = field.slug.trim().toLowerCase();
  const idNorm = (field.framerFieldId || "").trim().toLowerCase();

  if (SYSTEM_FIELD_NAMES.has(nameNorm)) return true;
  if (SYSTEM_FIELD_SLUGS.has(slugNorm)) return true;
  if (idNorm && SYSTEM_FIELD_IDS.has(idNorm)) return true;

  return false;
}

export function filterSystemFields<
  T extends { name: string; slug: string; framerFieldId?: string },
>(fields: T[]): T[] {
  return fields.filter((field) => !isFramerSystemField(field));
}

export function stripSystemFieldValues<
  T extends { values: Record<string, unknown> },
  F extends { name: string; slug: string; framerFieldId?: string },
>(entries: T[], fields: F[]): T[] {
  const systemSlugs = new Set(
    fields.filter(isFramerSystemField).map((field) => field.slug)
  );

  if (systemSlugs.size === 0) return entries;

  return entries.map((entry) => ({
    ...entry,
    values: Object.fromEntries(
      Object.entries(entry.values).filter(([slug]) => !systemSlugs.has(slug))
    ),
  }));
}