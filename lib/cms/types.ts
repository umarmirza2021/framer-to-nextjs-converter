export const CMS_FIELD_TYPES = [
  { type: "PLAIN_TEXT", label: "Plain Text", icon: "T" },
  { type: "FORMATTED_TEXT", label: "Formatted Text", icon: "¶" },
  { type: "DATE", label: "Date", icon: "📅" },
  { type: "LINK", label: "Link", icon: "🔗" },
  { type: "IMAGE", label: "Image", icon: "🖼" },
  { type: "GALLERY", label: "Gallery", icon: "🖼+" },
  { type: "COLOR", label: "Color", icon: "🎨" },
  { type: "TOGGLE", label: "Toggle", icon: "◉" },
  { type: "NUMBER", label: "Number", icon: "#" },
  { type: "OPTION", label: "Option", icon: "▾" },
  { type: "FILE", label: "File", icon: "📄" },
  { type: "VECTOR_SET", label: "Vector Set", icon: "△" },
  { type: "REFERENCE", label: "Reference", icon: "↩" },
  { type: "MULTI_REFERENCE", label: "Multi-Reference", icon: "↩↩" },
  { type: "DIVIDER", label: "Divider", icon: "—" },
] as const;

export type CmsFieldType = (typeof CMS_FIELD_TYPES)[number]["type"];

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "item";
}

export const EMPTY_VALUE: Record<CmsFieldType, unknown> = {
  PLAIN_TEXT: "",
  FORMATTED_TEXT: "",
  DATE: "",
  LINK: { url: "", text: "" },
  IMAGE: { url: "", alt: "" },
  GALLERY: [],
  COLOR: "#000000",
  TOGGLE: false,
  NUMBER: 0,
  OPTION: "",
  FILE: { url: "", name: "" },
  VECTOR_SET: [],
  REFERENCE: "",
  MULTI_REFERENCE: [],
  DIVIDER: null,
};