/** Convert any string into a URL-safe slug: "My Post!" -> "my-post". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Convert a label into a camelCase field key: "Cover Image" -> "coverImage". */
export function keyify(input: string): string {
  const parts = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (parts.length === 0) return "field";
  return parts
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join("");
}
