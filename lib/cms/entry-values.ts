import type { CmsFieldType } from "@/lib/cms/types";
import { EMPTY_VALUE } from "@/lib/cms/types";

export function normalizeEntryValues(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }

  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return {};
}

export function coerceFieldValue(type: CmsFieldType, value: unknown): unknown {
  const empty = EMPTY_VALUE[type];

  if (value === undefined || value === null) {
    return empty;
  }

  switch (type) {
    case "PLAIN_TEXT":
    case "FORMATTED_TEXT":
    case "DATE":
    case "OPTION":
      return typeof value === "string" ? value : String(value);

    case "NUMBER":
      return typeof value === "number" ? value : Number(value) || 0;

    case "TOGGLE":
      return Boolean(value);

    case "COLOR":
      return typeof value === "string" ? value : "#000000";

    case "LINK": {
      if (typeof value === "string") {
        return { url: value, text: "" };
      }
      if (value && typeof value === "object") {
        const link = value as { url?: string; text?: string };
        return { url: link.url || "", text: link.text || "" };
      }
      return empty;
    }

    case "IMAGE": {
      if (typeof value === "string") {
        return { url: value, alt: "" };
      }
      if (value && typeof value === "object") {
        const image = value as { url?: string; alt?: string };
        return { url: image.url || "", alt: image.alt || "" };
      }
      return empty;
    }

    case "FILE": {
      if (typeof value === "string") {
        return { url: value, name: "" };
      }
      if (value && typeof value === "object") {
        const file = value as { url?: string; name?: string };
        return { url: file.url || "", name: file.name || "" };
      }
      return empty;
    }

    case "GALLERY":
    case "VECTOR_SET":
    case "MULTI_REFERENCE":
      return Array.isArray(value) ? value : [];

    case "REFERENCE":
      return typeof value === "string" ? value : String(value ?? "");

    default:
      return value;
  }
}

export function getEntryFieldValue(
  values: Record<string, unknown>,
  field: { slug: string; type: string }
): unknown {
  const type = field.type as CmsFieldType;
  return coerceFieldValue(type, values[field.slug]);
}