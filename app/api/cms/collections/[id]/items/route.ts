import { handler, ok } from "@/lib/cms/api";
import { createItem, listItems } from "@/lib/cms/client";
import { createItemSchema } from "@/lib/cms/validation";

// GET /api/cms/collections/[id]/items — list items (with pagination)
export const GET = handler(async ({ req, params }) => {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const pageSize = Number(url.searchParams.get("pageSize")) || 50;
  const publishedParam = url.searchParams.get("published");
  const published =
    publishedParam === null ? undefined : publishedParam === "true";

  return ok(await listItems(params.id, { page, pageSize, published }));
});

// POST /api/cms/collections/[id]/items — create item
export const POST = handler(async ({ req, params }) => {
  const body = await req.json();
  const data = createItemSchema.parse(body);
  return ok(await createItem(params.id, data), 201);
});
