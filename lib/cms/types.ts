// ─────────────────────────────────────────────────────────────
// CMS type definitions (Framer-style content management)
// These mirror the Prisma models but use plain JSON-safe shapes
// for use across API routes, the admin UI, and code generation.
// ─────────────────────────────────────────────────────────────

/** Supported field types (mirrors Framer's CMS field types). */
export type CMSFieldType =
  | "text"
  | "rich-text"
  | "image"
  | "date"
  | "boolean"
  | "number"
  | "url"
  | "color"
  | "reference";

export const CMS_FIELD_TYPES: CMSFieldType[] = [
  "text",
  "rich-text",
  "image",
  "date",
  "boolean",
  "number",
  "url",
  "color",
  "reference",
];

/** How a bound layer renders its CMS value. */
export type CMSLayerType = "text" | "image" | "background-image" | "href";

/** Whether a CMS page lists many items or shows a single item. */
export type CMSPageType = "index" | "detail";

/** A collection is like a Framer CMS Collection (e.g. "Blog Posts"). */
export interface CMSCollection {
  id: string;
  name: string; // human label: "Blog Posts"
  slug: string; // url-safe: "blog-posts"
  fields: CMSField[];
  createdAt: string;
  updatedAt: string;
}

/** Each field in a collection (like Framer's field types). */
export interface CMSField {
  id: string;
  name: string; // "Cover Image", "Title", "Body", "Slug"
  key: string; // "coverImage", "title", "body", "slug"
  type: CMSFieldType;
  required: boolean;
  defaultValue?: unknown;
}

/** A single CMS record/item. */
export interface CMSItem {
  id: string;
  collectionId: string;
  slug: string; // used in URL: /blog/my-post
  data: Record<string, unknown>; // fieldKey → value
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Binding: connects a Framer layer to a CMS field. */
export interface CMSBinding {
  layerId: string; // the Framer layer ID (text/image node)
  layerType: CMSLayerType;
  collectionId: string;
  fieldKey: string; // which field this layer is bound to
  pageType: CMSPageType;
}

/** A CMS-powered page (index or detail). */
export interface CMSPage {
  id: string;
  collectionId: string;
  pageType: CMSPageType;
  framerPageId: string; // original Framer page reference
  route: string; // e.g. "/blog" or "/blog/[slug]"
  bindings: CMSBinding[];
}

// ── Helper shapes used by the API layer ──────────────────────

/** A binding row as stored in the database (includes its own id + pageId). */
export interface CMSBindingRecord extends CMSBinding {
  id: string;
  pageId: string;
}

/** Query options for listing items. */
export interface ListItemsOptions {
  published?: boolean;
  page?: number;
  pageSize?: number;
}
