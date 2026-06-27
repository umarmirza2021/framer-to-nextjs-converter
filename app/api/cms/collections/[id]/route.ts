import { handler, ok } from "@/lib/cms/api";
import { deleteCollection, getCollection, updateCollection } from "@/lib/cms/client";
import { updateCollectionSchema } from "@/lib/cms/validation";

// GET /api/cms/collections/[id] — get collection + fields
export const GET = handler(async ({ params }) => {
  return ok(await getCollection(params.id));
});

// PUT /api/cms/collections/[id] — update collection (and its fields)
export const PUT = handler(async ({ req, params }) => {
  const body = await req.json();
  const data = updateCollectionSchema.parse(body);
  return ok(await updateCollection(params.id, data));
});

// DELETE /api/cms/collections/[id] — delete collection + items (cascade)
export const DELETE = handler(async ({ params }) => {
  await deleteCollection(params.id);
  return ok({ success: true });
});
