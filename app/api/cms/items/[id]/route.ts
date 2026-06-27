import { handler, ok } from "@/lib/cms/api";
import { deleteItem, getItem, updateItem } from "@/lib/cms/client";
import { updateItemSchema } from "@/lib/cms/validation";

// GET /api/cms/items/[id] — get single item
export const GET = handler(async ({ params }) => {
  return ok(await getItem(params.id));
});

// PUT /api/cms/items/[id] — update item
export const PUT = handler(async ({ req, params }) => {
  const body = await req.json();
  const data = updateItemSchema.parse(body);
  return ok(await updateItem(params.id, data));
});

// DELETE /api/cms/items/[id] — delete item
export const DELETE = handler(async ({ params }) => {
  await deleteItem(params.id);
  return ok({ success: true });
});
